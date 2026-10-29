/**
 * 이미 업로드된(또는 시드된) PDF 문서를 청크 분할·임베딩해 document_chunks에 다시 적재한다.
 * 사용: npm run rag:reindex
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RagService } from '../src/modules/rag/rag.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const rag = app.get(RagService);

  const documents = await prisma.document.findMany({
    where: { fileType: 'application/pdf' },
    select: { id: true, title: true },
  });

  for (const [i, document] of documents.entries()) {
    await rag.indexDocument(document.id);
    const { indexStatus } = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    console.log(`[${i + 1}/${documents.length}] ${indexStatus} ${document.title}`);
  }
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
