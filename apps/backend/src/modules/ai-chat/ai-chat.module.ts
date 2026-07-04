import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, AiToolsService],
})
export class AiChatModule {}
