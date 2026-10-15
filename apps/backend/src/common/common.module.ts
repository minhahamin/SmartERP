import { Global, Module } from '@nestjs/common';
import { PolicyService } from './services/policy.service';
import { MailService } from './services/mail.service';

@Global()
@Module({
  providers: [PolicyService, MailService],
  exports: [PolicyService, MailService],
})
export class CommonModule {}
