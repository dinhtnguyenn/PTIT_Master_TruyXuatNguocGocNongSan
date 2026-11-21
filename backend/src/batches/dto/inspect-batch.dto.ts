import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class InspectBatchDto {
  @IsNotEmpty({ message: 'Mã lô hàng không được để trống' })
  @IsString()
  batchId: string;

  @IsNotEmpty({ message: 'Kết quả kiểm định không được để trống' })
  @IsString()
  inspectionResult: string;

  @IsNotEmpty({ message: 'Chỉ tiêu kiểm định không được để trống' })
  @IsString()
  inspectionCriteria: string;

  @IsNotEmpty({ message: 'Mã chứng nhận không được để trống' })
  @IsString()
  certificateCode: string;

  @IsNotEmpty({ message: 'Loại chứng nhận không được để trống' })
  @IsString()
  certificateType: string;

  @IsNotEmpty({ message: 'Cơ quan cấp không được để trống' })
  @IsString()
  issuingAuthority: string;

  @IsNotEmpty({ message: 'Ngày cấp không được để trống' })
  @IsString()
  issuedDate: string;

  @IsNotEmpty({ message: 'Ngày hết hạn không được để trống' })
  @IsString()
  expiryDate: string;

  @IsOptional()
  @IsString()
  certImageUrl?: string;

  @IsNotEmpty({ message: 'Địa chỉ ví Inspector không được để trống' })
  @IsString()
  inspectorWallet: string;

  @IsOptional()
  @IsString()
  inspectorTxHash?: string;
}
