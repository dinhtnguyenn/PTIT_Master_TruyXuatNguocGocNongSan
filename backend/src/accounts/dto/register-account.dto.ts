import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class RegisterAccountDto {
  @IsNotEmpty({ message: 'Địa chỉ ví không được để trống' })
  @IsString()
  walletAddress: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  roles?: string[];

  @IsNotEmpty({ message: 'Tên tổ chức/cá nhân không được để trống' })
  @IsString()
  organizationName: string;

  @IsNotEmpty({ message: 'Thông tin liên hệ không được để trống' })
  @IsString()
  contactInfo: string;
}
