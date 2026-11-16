import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class RegisterAccountDto {
  @IsNotEmpty({ message: 'Địa chỉ ví không được để trống' })
  @IsString()
  walletAddress: string;

  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsIn(['PRODUCER', 'INSPECTOR', 'LOGISTICS', 'DISTRIBUTOR'], {
    message: 'Vai trò phải là PRODUCER, INSPECTOR, LOGISTICS, hoặc DISTRIBUTOR',
  })
  role: string;

  @IsNotEmpty({ message: 'Tên tổ chức/cá nhân không được để trống' })
  @IsString()
  organizationName: string;

  @IsNotEmpty({ message: 'Thông tin liên hệ không được để trống' })
  @IsString()
  contactInfo: string;
}
