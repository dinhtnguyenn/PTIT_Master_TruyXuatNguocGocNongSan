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

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;
}
