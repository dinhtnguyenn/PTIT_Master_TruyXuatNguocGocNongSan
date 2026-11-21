import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class TransportBatchDto {
  @IsNotEmpty({ message: 'Mã lô hàng không được để trống' })
  @IsString()
  batchId: string;

  @IsNotEmpty({ message: 'Tên đơn vị vận chuyển không được để trống' })
  @IsString()
  transporterName: string;

  @IsNotEmpty({ message: 'Thông tin liên hệ không được để trống' })
  @IsString()
  transporterContact: string;

  @IsNotEmpty({ message: 'Loại chủ thể không được để trống' })
  @IsString()
  transporterType: string; // Cá nhân hoặc Tổ chức

  @IsNotEmpty({ message: 'Mã vận chuyển không được để trống' })
  @IsString()
  shippingCode: string;

  @IsNotEmpty({ message: 'Điểm đi không được để trống' })
  @IsString()
  originLocation: string;

  @IsNotEmpty({ message: 'Điểm đến không được để trống' })
  @IsString()
  destLocation: string;

  @IsNotEmpty({ message: 'Thời gian khởi hành không được để trống' })
  @IsString()
  departureTime: string;

  @IsNotEmpty({ message: 'Thời gian hoàn tất không được để trống' })
  @IsString()
  completionTime: string;

  @IsNotEmpty({ message: 'Nhiệt độ không được để trống' })
  @IsNumber()
  temperature: number;

  @IsNotEmpty({ message: 'Độ ẩm không được để trống' })
  @IsNumber()
  humidity: number;

  @IsOptional()
  @IsString()
  storageNotes?: string;

  @IsNotEmpty({ message: 'Địa chỉ ví Logistics không được để trống' })
  @IsString()
  logisticsWallet: string;

  @IsOptional()
  @IsString()
  logisticsTxHash?: string;
}
