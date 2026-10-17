import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { IDEMPOTENCY_HEADER } from '@/lib/contracts/common';

// A payment, shells handed out and a production batch add to a balance, and
// every order taken is a new order, so the same submission reaching the server twice (a retry after a lost
// response, a second device) must not be written twice. The client sends an
// Idempotency-Key header, one random value per submission, reused when it
// resends that submission. Without the header nothing changes.
//
// The key row is inserted first in the write's own transaction. A resend that
// arrives later finds it and gets the first answer back; one that arrives at
// the same moment waits on the unique (factory, key) index, fails when the
// first commits, and is then answered the same way.

const MAX_KEY_LENGTH = 100;

export const INVALID_IDEMPOTENCY_KEY = `${IDEMPOTENCY_HEADER} không hợp lệ (1-${MAX_KEY_LENGTH} ký tự)`;
export const IDEMPOTENCY_KEY_REUSED_MESSAGE = `${IDEMPOTENCY_HEADER} này đã được dùng cho một yêu cầu khác`;

/** The first answer to a submission, or 'reused' when the key belongs to another request. */
export type Earlier = { status: number; body: Prisma.JsonValue } | 'reused';

/** The main client or the client of an open transaction. */
type KeyDb = Pick<typeof prisma, 'idempotencyKey'>;

interface Claim {
  factoryId: string;
  key: string;
  scope: string;
  requestHash: string;
}

export class Idempotency {
  private constructor(private readonly claim: Claim | null) {}

  /**
   * Reads the header of a write. `scope` names the write ("METHOD path"),
   * `body` is the validated request body. Answers 400 for a malformed key.
   */
  static from(request: Request, factoryId: string, scope: string, body: unknown): Idempotency | NextResponse {
    const idempotency = Idempotency.forKey(request.headers.get(IDEMPOTENCY_HEADER), factoryId, scope, body);
    return idempotency ?? apiError(INVALID_IDEMPOTENCY_KEY, 400);
  }

  /**
   * The same for a key handed over directly (a server action): no key means
   * no protection, as without the header. `null` for a malformed key.
   */
  static forKey(key: unknown, factoryId: string, scope: string, body: unknown): Idempotency | null {
    if (key === null || key === undefined) return new Idempotency(null);
    if (typeof key !== 'string' || key.trim().length === 0 || key.length > MAX_KEY_LENGTH) return null;
    const requestHash = createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
    return new Idempotency({ factoryId, key, scope, requestHash });
  }

  /**
   * Runs the write, unless this submission was already written: then its
   * first answer is returned (or 422 when the key belongs to another one).
   */
  async run(write: () => Promise<NextResponse>): Promise<NextResponse> {
    return this.runWith(write, (earlier) =>
      earlier === 'reused'
        ? apiError(IDEMPOTENCY_KEY_REUSED_MESSAGE, 422, 'IDEMPOTENCY_KEY_REUSED')
        : NextResponse.json(earlier.body, { status: earlier.status })
    );
  }

  /** `run` for a write that does not answer with a NextResponse: `answer` turns an earlier answer into its result. */
  async runWith<T>(write: () => Promise<T>, answer: (earlier: Earlier) => T): Promise<T> {
    const earlier = await this.earlier();
    if (earlier) return answer(earlier);
    try {
      return await write();
    } catch (error) {
      // A resend running at the same moment fails on the key once the
      // first one commits: answer it like the first.
      const first = await this.earlier();
      if (first) return answer(first);
      throw error;
    }
  }

  /** First statement of the write's transaction: claims the key. */
  async begin(tx: KeyDb): Promise<void> {
    if (!this.claim) return;
    await tx.idempotencyKey.create({ data: this.claim });
  }

  /**
   * Last statement of the transaction: keeps the answer with the key. A
   * refusal (not 2xx) is not kept, so the user can correct it and resend.
   */
  async finish(tx: KeyDb, response: NextResponse): Promise<NextResponse> {
    if (!this.claim) return response;
    if (response.status >= 300) {
      await tx.idempotencyKey.delete({ where: this.where() });
      return response;
    }
    await this.keep(tx, response.status, (await response.clone().json()) as Prisma.InputJsonValue);
    return response;
  }

  /** Last statement of the transaction of a successful write: keeps its answer with the key. */
  async keep(tx: KeyDb, status: number, body: Prisma.InputJsonValue): Promise<void> {
    if (!this.claim) return;
    await tx.idempotencyKey.update({ where: this.where(), data: { status, response: body } });
  }

  private where() {
    const { factoryId, key } = this.claim!;
    return { factoryId_key: { factoryId, key } };
  }

  private async earlier(): Promise<Earlier | null> {
    if (!this.claim) return null;
    const { scope, requestHash } = this.claim;
    const stored = await prisma.idempotencyKey.findUnique({ where: this.where() });
    if (!stored || stored.status === null) return null;
    if (stored.scope !== scope || stored.requestHash !== requestHash) return 'reused';
    return { status: stored.status, body: stored.response };
  }
}
