/*
  Warnings:

  - You are about to alter the column `days` on the `leave_requests` table. The data in that column could be lost. The data in that column will be cast from `Decimal(4,1)` to `Decimal(4,2)`.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'HALF_DAY_AM';
ALTER TYPE "LeaveType" ADD VALUE 'HALF_DAY_PM';
ALTER TYPE "LeaveType" ADD VALUE 'HOURLY';

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "days" SET DATA TYPE DECIMAL(4,2);
