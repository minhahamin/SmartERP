import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { PayrollModule } from '../payroll/payroll.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AttendanceModule, PayrollModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
