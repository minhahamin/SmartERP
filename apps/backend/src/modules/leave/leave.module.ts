import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveService } from './leave.service';

@Module({
  controllers: [LeaveController, LeaveBalanceController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
