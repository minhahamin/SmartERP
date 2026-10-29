import { Module } from '@nestjs/common';
// 이 프로젝트의 일정 관리 모듈(ScheduleModule)과 이름이 겹쳐서 별칭을 쓴다
import { ScheduleModule as CronModule } from '@nestjs/schedule';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { ReportsModule } from '../reports/reports.module';
import { AiChatModule } from '../ai-chat/ai-chat.module';
import { AutomationScheduler } from './automation.scheduler';
import { AnomalyDetector } from './anomaly-detector';
import { ProductionDelayNotifier } from './production-delay.notifier';

@Module({
  imports: [CronModule.forRoot(), PurchaseOrdersModule, ReportsModule, AiChatModule],
  providers: [AutomationScheduler, ProductionDelayNotifier, AnomalyDetector],
})
export class AutomationModule {}
