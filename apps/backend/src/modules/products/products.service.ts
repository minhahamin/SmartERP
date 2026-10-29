import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import { detectImageType } from '../../common/utils/image-type';
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
    // Content-Type과 파일명은 클라이언트가 정하는 값이라(.html을 image/png로 위장 가능) 믿지 않고
    // 파일 내용(매직 넘버)으로 종류를 판별한다. 파일명도 원본을 쓰지 않고 서버가 확장자까지 정한다.
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('PNG, JPG, GIF, WEBP 이미지만 업로드할 수 있습니다.');
    }
    const fileName = `${randomUUID()}.${detected.ext}`;
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
