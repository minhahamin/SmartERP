import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DocumentFolderDto } from './dto/document-folder.dto';

@Injectable()
export class DocumentFoldersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(requester: AuthUser) {
    return this.prisma.documentFolder.findMany({
      where: { companyId: requester.companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, requester: AuthUser) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id, companyId: requester.companyId },
    });
    if (!folder) throw new NotFoundException('폴더를 찾을 수 없습니다.');
    return folder;
  }

  create(dto: DocumentFolderDto, requester: AuthUser) {
    return this.prisma.documentFolder.create({ data: { name: dto.name, companyId: requester.companyId } });
  }

  async update(id: string, dto: DocumentFolderDto, requester: AuthUser) {
    await this.findOne(id, requester);
    return this.prisma.documentFolder.update({ where: { id }, data: { name: dto.name } });
  }

  /** 문서가 남아있는 폴더는 삭제할 수 없다 */
  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    const documentCount = await this.prisma.document.count({ where: { folderId: id } });
    if (documentCount > 0) throw new BadRequestException('폴더에 문서가 남아있으면 삭제할 수 없습니다.');

    await this.prisma.documentFolder.delete({ where: { id } });
    return { success: true };
  }
}
