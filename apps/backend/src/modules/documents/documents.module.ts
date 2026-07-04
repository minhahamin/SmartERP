import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentFoldersController } from './document-folders.controller';
import { DocumentFoldersService } from './document-folders.service';

@Module({
  imports: [RagModule],
  controllers: [DocumentsController, DocumentFoldersController],
  providers: [DocumentsService, DocumentFoldersService],
  exports: [DocumentsService, DocumentFoldersService],
})
export class DocumentsModule {}
