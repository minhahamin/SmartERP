import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 자동화 작업이 인스턴스가 둘 이상 떠 있어도 한 번만 실행되게 하는 락. 세션 락은 커넥션 풀에서 풀리는 시점을
 * 보장하기 어려워, 트랜잭션이 끝나면 자동으로 해제되는 advisory xact 락을 쓴다.
 * 락을 못 잡으면 다른 인스턴스가 실행 중이라는 뜻이므로 조용히 건너뛴다.
 */
@Injectable()
export class JobLockService {
  constructor(private readonly prisma: PrismaService) {}

  async runExclusive<T>(name: string, fn: () => Promise<T>): Promise<{ ran: true; result: T } | { ran: false }> {
    return this.prisma.$transaction(
      async (tx) => {
        const [row] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext(${name})) AS locked`;
        if (!row?.locked) return { ran: false as const };
        return { ran: true as const, result: await fn() };
      },
      { timeout: 120_000, maxWait: 5_000 },
    );
  }
}
