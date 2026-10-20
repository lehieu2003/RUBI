import { Prisma } from '@prisma/client';

// Postgres cancels one of two Serializable transactions that overlap (P2034).
// The cancelled one wrote nothing, so it is simply run again.
export const MAX_SERIALIZABLE_ATTEMPTS = 3;

export async function retryIfCancelled<T>(
  run: () => Promise<T>,
  maxAttempts = MAX_SERIALIZABLE_ATTEMPTS
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const cancelled =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!cancelled || attempt >= maxAttempts) throw error;
    }
  }
}
