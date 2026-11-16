import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class DistributeBatchDto {
  @IsNotEmpty({ message: 'Mã lô sản phẩm không được để trống' })
  @IsString()
  batchId: string;

  @IsNotEmpty({ message: 'Tên đơn vị phân phối không được để trống' })
  @IsString()
  distributorName: string;

  @IsNotEmpty({ message: 'Thông tin liên hệ không được để trống' })
  @IsString()
  distributorContact: string;

  @IsNotEmpty({ message: 'Loại chủ thể không được để trống' })
  @IsString()
  distributorType: string; // Cá nhân hoặc Tổ chức

  @IsNotEmpty({ message: 'Thời gian tiếp nhận không được để trống' })
  @IsString()
  receivedTime: string;

  @IsNotEmpty({ message: 'Số lượng thực nhận không được để trống' })
  @IsNumber()
  actualQuantity: number;

  @IsNotEmpty({ message: 'Trọng lượng thực nhận không được để trống' })
  @IsNumber()
  actualWeight: number;

  @IsOptional()
  @IsString()
  receiptNotes?: string;

  @IsNotEmpty({ message: 'Địa chỉ ví Distributor không được để trống' })
  @IsString()
  distributorWallet: string;

  @IsOptional()
  @IsString()
  distributorTxHash?: string;
}
