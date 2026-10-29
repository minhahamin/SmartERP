import { Global, Module } from '@nestjs/common';
import { PolicyService } from './services/policy.service';
import { MailService } from './services/mail.service';
import { JobLockService } from './services/job-lock.service';
import { NotifierService } from './services/notifier.service';

@Global()
@Module({
  providers: [PolicyService, MailService, JobLockService, NotifierService],
  exports: [PolicyService, MailService, JobLockService, NotifierService],
})
export class CommonModule {}
