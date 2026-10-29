import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';

const KST = 'Asia/Seoul';

/**
 * 매일 도는 업무 자동화의 진입점. 각 작업은 회사 단위로 advisory 락을 잡고 실행되므로(JobLockService)
 * 인스턴스가 늘어도 중복 실행되지 않고, 한 회사의 실패가 다른 회사 처리를 막지 않는다.
 * AUTOMATION_ENABLED=false 로 전체를 끌 수 있다(로컬 개발·테스트용).
 */
@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseOrders: PurchaseOrdersService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('AUTOMATION_ENABLED') !== 'false';
  }

  /** 출근 전에 안전재고 미달 품목의 발주 초안을 만들어 둔다 */
  @Cron('0 30 8 * * *', { timeZone: KST })
  async generatePurchaseDrafts() {
    await this.forEachCompany('발주 초안 생성', (companyId) =>
      this.purchaseOrders.generateDraftsForCompany(companyId),
    );
  }

  private async forEachCompany(label: string, job: (companyId: string) => Promise<unknown>) {
    if (!this.enabled) return;
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const { id } of companies) {
      try {
        await job(id);
      } catch (error) {
        this.logger.error(`${label} 실패 company=${id}`, error instanceof Error ? error.stack : String(error));
      }
    }
  }
}
