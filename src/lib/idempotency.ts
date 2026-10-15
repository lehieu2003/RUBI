import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';

// A payment, shells handed out and a production batch add to a balance, so
// the same submission reaching the server twice (a retry after a lost
// response, a second device) must not be written twice. The client sends an
// Idempotency-Key header, one random value per submission, reused when it
// resends that submission. Without the header nothing changes.
//
// The key row is inserted first in the write's own transaction. A resend that
// arrives later finds it and gets the first answer back; one that arrives at
// the same moment waits on the unique (factory, key) index, fails when the
// first commits, and is then answered the same way.

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const MAX_KEY_LENGTH = 100;

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
    const key = request.headers.get(IDEMPOTENCY_HEADER);
    if (key === null) return new Idempotency(null);
    if (key.trim().length === 0 || key.length > MAX_KEY_LENGTH) {
      return apiError(`${IDEMPOTENCY_HEADER} không hợp lệ (1-${MAX_KEY_LENGTH} ký tự)`, 400);
    }
    const requestHash = createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
    return new Idempotency({ factoryId, key, scope, requestHash });
  }

  /**
   * Runs the write, unless this submission was already written: then its
   * first answer is returned (or 422 when the key belongs to another one).
   */
  async run(write: () => Promise<NextResponse>): Promise<NextResponse> {
    const earlier = await this.replay();
    if (earlier) return earlier;
    try {
      return await write();
    } catch (error) {
      // A resend running at the same moment fails on the key once the
      // first one commits: answer it like the first.
      const first = await this.replay();
      if (first) return first;
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
    const where = { factoryId_key: { factoryId: this.claim.factoryId, key: this.claim.key } };
    if (response.status >= 300) {
      await tx.idempotencyKey.delete({ where });
      return response;
    }
    const body = (await response.clone().json()) as Prisma.InputJsonValue;
    await tx.idempotencyKey.update({ where, data: { status: response.status, response: body } });
    return response;
  }

  private async replay(): Promise<NextResponse | null> {
    if (!this.claim) return null;
    const { factoryId, key, scope, requestHash } = this.claim;
    const stored = await prisma.idempotencyKey.findUnique({ where: { factoryId_key: { factoryId, key } } });
    if (!stored || stored.status === null) return null;
    if (stored.scope !== scope || stored.requestHash !== requestHash) {
      return apiError(
        `${IDEMPOTENCY_HEADER} này đã được dùng cho một yêu cầu khác`,
        422,
        'IDEMPOTENCY_KEY_REUSED'
      );
    }
    return NextResponse.json(stored.response, { status: stored.status });
  }
}
