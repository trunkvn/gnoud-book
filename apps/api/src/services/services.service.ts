import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businesses: BusinessesService,
  ) {}

  async list(userId: string) {
    const business = await this.businesses.requireForOwner(userId);
    return this.prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateServiceDto) {
    const business = await this.businesses.requireForOwner(userId);
    return this.prisma.service.create({
      data: {
        businessId: business.id,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        currency: dto.currency, // bỏ trống thì database dùng mặc định VND
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.findOwned(userId, id);
    return this.prisma.service.update({ where: { id: service.id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const service = await this.findOwned(userId, id);

    const appointments = await this.prisma.appointment.count({
      where: { serviceId: service.id },
    });
    if (appointments > 0) {
      throw new ConflictException(
        'Dịch vụ đã có lịch hẹn nên không thể xoá. Hãy tắt dịch vụ (active = false) thay vì xoá.',
      );
    }
    await this.prisma.service.delete({ where: { id: service.id } });
  }

  // Chỉ tìm trong cơ sở của chính người dùng. Dịch vụ của người khác cũng trả 404
  // (không báo "không có quyền") để không lộ việc id đó có tồn tại.
  private async findOwned(userId: string, id: string) {
    const business = await this.businesses.requireForOwner(userId);
    const service = await this.prisma.service.findFirst({
      where: { id, businessId: business.id },
    });
    if (!service) {
      throw new NotFoundException('Không tìm thấy dịch vụ');
    }
    return service;
  }
}
