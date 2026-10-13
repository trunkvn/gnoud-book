import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BusinessesService } from './businesses.service.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';

@ApiTags('Business')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @ApiOperation({ summary: 'Xem thông tin cơ sở của tôi' })
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.businessesService.requireForOwner(user.id);
  }

  @ApiOperation({ summary: 'Sửa tên, mô tả, múi giờ của cơ sở' })
  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(user.id, dto);
  }
}
