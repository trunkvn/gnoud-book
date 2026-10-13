import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  // bcrypt chỉ dùng tối đa 72 byte đầu của mật khẩu
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @MaxLength(100)
  businessName: string;
}
