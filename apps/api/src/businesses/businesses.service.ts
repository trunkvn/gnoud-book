import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateBusinessDto } from './dto/update-business.dto.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** MVP: mỗi chủ cơ sở làm việc với cơ sở đầu tiên của họ. */
  async requireForOwner(ownerId: string) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
    if (!business) {
      throw new NotFoundException('Bạn chưa có cở sở nào');
    }
    return business;
  }

  async update(ownerId: string, dto: UpdateBusinessDto) {
    const business = await this.requireForOwner(ownerId);
    return this.prisma.business.update({
      where: { id: business.id },
      data: dto,
    });
  }
}
