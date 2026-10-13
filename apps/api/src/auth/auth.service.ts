import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { slugify } from '../common/slugify.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 10;

// Dùng để so sánh mật khẩu khi email không tồn tại, để thời gian phản hồi
// không tiết lộ email nào đã đăng ký.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

type UserWithBusinesses = Prisma.UserGetPayload<{
  include: { businesses: true };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const businessName = dto.businessName.trim();
    const slug = await this.generateUniqueSlug(businessName);

    try {
      // Tạo User và Business trong cùng một lệnh: hoặc cả hai thành công, hoặc không có gì.
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name.trim(),
          businesses: { create: { name: businessName, slug } },
        },
        include: { businesses: true },
      });
      return this.issueToken(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email hoặc đường dẫn đã tồn tại');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
      include: { businesses: true },
    });

    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issueToken(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { businesses: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return toAuthUser(user);
  }

  private async issueToken(user: UserWithBusinesses) {
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: toAuthUser(user) };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'business';
    let candidate = base;
    while (await this.prisma.business.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${randomBytes(2).toString('hex')}`;
    }
    return candidate;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Chỉ trả về những gì client cần – tuyệt đối không có passwordHash.
function toAuthUser(user: UserWithBusinesses) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    businesses: user.businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      timezone: b.timezone,
    })),
  };
}
