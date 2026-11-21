import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProducerBatchDto {
  @IsNotEmpty({ message: 'Mã lô hàng không được để trống' })
  @IsString()
  batchId: string;

  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  productName: string;

  @IsNotEmpty({ message: 'Loại sản phẩm không được để trống' })
  @IsString()
  category: string;

  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsNumber()
  quantity: number;

  @IsNotEmpty({ message: 'Trọng lượng không được để trống' })
  @IsNumber()
  weight: number;

  @IsNotEmpty({ message: 'Nguồn gốc giống không được để trống' })
  @IsString()
  seedOrigin: string;

  @IsNotEmpty({ message: 'Vật tư nông nghiệp không được để trống' })
  @IsString()
  farmingSupplies: string;

  @IsNotEmpty({ message: 'Địa điểm sản xuất không được để trống' })
  @IsString()
  productionLocation: string;

  @IsNotEmpty({ message: 'Ngày bắt đầu canh tác không được để trống' })
  @IsString()
  cultivationStartDate: string;

  @IsNotEmpty({ message: 'Ngày thu hoạch không được để trống' })
  @IsString()
  harvestDate: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsString()
  productImageCid?: string;

  @IsNotEmpty({ message: 'Địa chỉ ví Producer không được để trống' })
  @IsString()
  producerWallet: string;

  @IsOptional()
  @IsString()
  producerTxHash?: string;
}
