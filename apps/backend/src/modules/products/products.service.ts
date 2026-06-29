import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateProductDto, PRICE_FIELDS, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const product = await this.prisma.product.findFirst({ where: { id, companyId: requester.companyId } });
    if (!product) throw new NotFoundException('제품을 찾을 수 없습니다.');
    return product;
  }

  async create(dto: CreateProductDto, requester: AuthUser) {
    const sku = dto.sku ?? (await this.nextSku(requester.companyId));
    return this.prisma.product.create({ data: { ...dto, sku, companyId: requester.companyId } });
  }

  async update(id: string, dto: UpdateProductDto, requester: AuthUser) {
    await this.findOne(id, requester);
    const data = { ...dto };
    if (requester.roleName === 'SALES_MANAGER') {
      for (const field of PRICE_FIELDS) delete data[field];
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    const stockCount = await this.prisma.inventory.count({ where: { productId: id, quantity: { gt: 0 } } });
    if (stockCount > 0) throw new BadRequestException('재고가 남아있는 제품은 삭제할 수 없습니다.');

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async uploadImage(id: string, file: Express.Multer.File, requester: AuthUser) {
    if (!file) throw new BadRequestException('업로드할 이미지가 없습니다.');
    await this.findOne(id, requester);

    await mkdir(UPLOAD_DIR, { recursive: true });
    // multer는 multipart 파일명을 latin1로 디코딩한다 — 브라우저가 보낸 한글 등 비ASCII 원본 파일명은
    // 그대로 쓰면 깨지므로 utf8로 다시 해석한다.
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const fileName = `${randomUUID()}-${originalName}`;
    await writeFile(join(UPLOAD_DIR, fileName), file.buffer);

    return this.prisma.product.update({
      where: { id },
      data: { imageUrl: `/uploads/products/${fileName}` },
    });
  }

  private async nextSku(companyId: string): Promise<string> {
    const count = await this.prisma.product.count({ where: { companyId } });
    return `PRD-${1000 + count}`;
  }
}
