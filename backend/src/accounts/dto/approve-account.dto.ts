import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  txHashGrantRole?: string;
}
