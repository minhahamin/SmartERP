-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_folders_companyId_name_key" ON "document_folders"("companyId", "name");

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
