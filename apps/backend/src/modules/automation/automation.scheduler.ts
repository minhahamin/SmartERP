import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { ReportsService } from '../reports/reports.service';
import { ProductionDelayNotifier } from './production-delay.notifier';

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
    private readonly productionDelay: ProductionDelayNotifier,
    private readonly reports: ReportsService,
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

  /** 출근 시간에 납기를 넘긴 생산 오더를 담당자·관리자에게 알린다 */
  @Cron('0 0 9 * * *', { timeZone: KST })
  async notifyProductionDelays() {
    await this.forEachCompany('생산 지연 알림', (companyId) => this.productionDelay.notifyForCompany(companyId));
  }

  /** 매월 1일에 지난달 경영 리포트를 만들어 두고 관리자에게 알린다(AI 호출은 회사당 월 1회) */
  @Cron('0 30 9 1 * *', { timeZone: KST })
  async generateMonthlyReport() {
    await this.forEachCompany('월간 리포트 생성', (companyId) => this.reports.generateLastMonthForCompany(companyId));
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
