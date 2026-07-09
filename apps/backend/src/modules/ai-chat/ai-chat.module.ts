import { Module } from '@nestjs/common';
import { LeaveModule } from '../leave/leave.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [LeaveModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiToolsService],
})
export class AiChatModule {}
