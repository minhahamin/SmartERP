import { Module } from '@nestjs/common';
import { LeaveModule } from '../leave/leave.module';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { ProductionModule } from '../production/production.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [LeaveModule, AnnouncementsModule, ProductionModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiToolsService],
})
export class AiChatModule {}
