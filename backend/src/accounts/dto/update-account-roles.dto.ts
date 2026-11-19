import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class UpdateAccountRolesDto {
  @IsArray({ message: 'Danh sách vai trò phải là mảng chuỗi' })
  @ArrayNotEmpty({ message: 'Danh sách vai trò không được để trống' })
  @IsString({ each: true, message: 'Mỗi vai trò phải là chuỗi' })
  roles: string[];
}
