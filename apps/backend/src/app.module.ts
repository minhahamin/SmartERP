import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesModule } from './modules/roles/roles.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { ProductionModule } from './modules/production/production.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { RagModule } from './modules/rag/rag.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    RolesModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    ScheduleModule,
    PartnersModule,
    ProductsModule,
    InventoryModule,
    StockMovementsModule,
    ProductionModule,
    DocumentsModule,
    AnnouncementsModule,
    StatisticsModule,
    RagModule,
    AiChatModule,
  ],
  providers: [
    // docs/12.5 — 1차: 인증(JwtAuthGuard) → 2차: 권한(PermissionsGuard) → 3차: Throttle
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // docs/08.1 — 공통 응답 envelope, docs/07 7.6 #7 — 민감 액션 AuditLog 비동기 기록
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
