import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { computeSha256 } from '../hash.util';
import { CreateProducerBatchDto } from './dto/create-producer-batch.dto';
import { InspectBatchDto } from './dto/inspect-batch.dto';
import { TransportBatchDto } from './dto/transport-batch.dto';
import { DistributeBatchDto } from './dto/distribute-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  private checkPermission(user: any, requiredRole: string): boolean {
    if (!user || user.status !== 'APPROVED') return false;
    if (user.role === requiredRole || user.role === 'ADMIN') return true;
    if (Array.isArray(user.roles)) {
      if (user.roles.includes(requiredRole) || user.roles.includes('ADMIN')) return true;
    }
    return false;
  }

  // 1. PRODUCER: Khởi tạo lô sản phẩm
  async recordProducer(dto: CreateProducerBatchDto) {
    const wallet = dto.producerWallet.toLowerCase();
    const user = await this.prisma.userAccount.findUnique({
      where: { walletAddress: wallet },
    });
    if (!this.checkPermission(user, 'PRODUCER')) {
      throw new BadRequestException('Ví chưa được phê duyệt với vai trò Nhà sản xuất (PRODUCER)!');
    }

    const existing = await this.prisma.batch.findUnique({
      where: { batchId: dto.batchId },
    });
    if (existing) {
      throw new BadRequestException(`Mã lô hàng '${dto.batchId}' đã tồn tại!`);
    }

    // Payload chuẩn đối chiếu của Bảng 1
    const payload = {
      batchId: dto.batchId,
      productName: dto.productName,
      category: dto.category,
      quantity: dto.quantity,
      weight: dto.weight,
      seedOrigin: dto.seedOrigin,
      farmingSupplies: dto.farmingSupplies,
      productionLocation: dto.productionLocation,
      cultivationStartDate: dto.cultivationStartDate,
      harvestDate: dto.harvestDate,
      productImageUrl: dto.productImageUrl || '',
      producerWallet: wallet,
    };

    const dataHash = computeSha256(payload);

    const batch = await this.prisma.batch.create({
      data: {
        batchId: dto.batchId,
        productName: dto.productName,
        category: dto.category,
        quantity: dto.quantity,
        weight: dto.weight,
        seedOrigin: dto.seedOrigin,
        farmingSupplies: dto.farmingSupplies,
        productionLocation: dto.productionLocation,
        cultivationStartDate: new Date(dto.cultivationStartDate),
        harvestDate: new Date(dto.harvestDate),
        productImageUrl: dto.productImageUrl,
        producerDataHash: dataHash,
        producerTxHash: dto.producerTxHash || null,
        producerWallet: wallet,
        stage: 'CREATED',
        createdByAddress: wallet,
      },
    });

    return {
      batch,
      dataHash,
    };
  }

  // 2. INSPECTOR: Ghi nhận kiểm định
  async recordInspector(dto: InspectBatchDto) {
    const wallet = dto.inspectorWallet.toLowerCase();
    const user = await this.prisma.userAccount.findUnique({
      where: { walletAddress: wallet },
    });
    if (!this.checkPermission(user, 'INSPECTOR')) {
      throw new BadRequestException('Ví chưa được phê duyệt với vai trò Đơn vị kiểm định (INSPECTOR)!');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { batchId: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Không tìm thấy mã lô hàng '${dto.batchId}'!`);
    }
    if (batch.stage !== 'CREATED') {
      throw new BadRequestException(`Lô hàng không ở trạng thái hợp lệ để kiểm định (Hiện tại: ${batch.stage})!`);
    }

    // Payload chuẩn đối chiếu của Bảng 2
    const payload = {
      batchId: dto.batchId,
      inspectionResult: dto.inspectionResult,
      inspectionCriteria: dto.inspectionCriteria,
      certificateCode: dto.certificateCode,
      certificateType: dto.certificateType,
      issuingAuthority: dto.issuingAuthority,
      issuedDate: dto.issuedDate,
      expiryDate: dto.expiryDate,
      certImageUrl: dto.certImageUrl || '',
      inspectorWallet: wallet,
    };

    const dataHash = computeSha256(payload);

    const updated = await this.prisma.batch.update({
      where: { batchId: dto.batchId },
      data: {
        inspectionResult: dto.inspectionResult,
        inspectionCriteria: dto.inspectionCriteria,
        certificateCode: dto.certificateCode,
        certificateType: dto.certificateType,
        issuingAuthority: dto.issuingAuthority,
        issuedDate: new Date(dto.issuedDate),
        expiryDate: new Date(dto.expiryDate),
        certImageUrl: dto.certImageUrl,
        inspectorDataHash: dataHash,
        inspectorTxHash: dto.inspectorTxHash || null,
        inspectorWallet: wallet,
        stage: 'INSPECTED',
      },
    });

    return {
      batch: updated,
      dataHash,
    };
  }

  // 3. LOGISTICS: Ghi nhận vận chuyển
  async recordLogistics(dto: TransportBatchDto) {
    const wallet = dto.logisticsWallet.toLowerCase();
    const user = await this.prisma.userAccount.findUnique({
      where: { walletAddress: wallet },
    });
    if (!this.checkPermission(user, 'LOGISTICS')) {
      throw new BadRequestException('Ví chưa được phê duyệt với vai trò Đơn vị vận chuyển (LOGISTICS)!');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { batchId: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Không tìm thấy mã lô hàng '${dto.batchId}'!`);
    }
    if (batch.stage !== 'INSPECTED') {
      throw new BadRequestException(`Lô hàng chưa hoàn tất kiểm định (Hiện tại: ${batch.stage})!`);
    }

    // Payload chuẩn đối chiếu của Bảng 3
    const payload = {
      batchId: dto.batchId,
      transporterName: dto.transporterName,
      transporterContact: dto.transporterContact,
      transporterType: dto.transporterType,
      shippingCode: dto.shippingCode,
      originLocation: dto.originLocation,
      destLocation: dto.destLocation,
      departureTime: dto.departureTime,
      completionTime: dto.completionTime,
      temperature: dto.temperature,
      humidity: dto.humidity,
      storageNotes: dto.storageNotes || '',
      logisticsWallet: wallet,
    };

    const dataHash = computeSha256(payload);

    const updated = await this.prisma.batch.update({
      where: { batchId: dto.batchId },
      data: {
        transporterName: dto.transporterName,
        transporterContact: dto.transporterContact,
        transporterType: dto.transporterType,
        shippingCode: dto.shippingCode,
        originLocation: dto.originLocation,
        destLocation: dto.destLocation,
        departureTime: new Date(dto.departureTime),
        completionTime: new Date(dto.completionTime),
        temperature: dto.temperature,
        humidity: dto.humidity,
        storageNotes: dto.storageNotes,
        logisticsDataHash: dataHash,
        logisticsTxHash: dto.logisticsTxHash || null,
        logisticsWallet: wallet,
        stage: 'IN_TRANSIT',
      },
    });

    return {
      batch: updated,
      dataHash,
    };
  }

  // 4. DISTRIBUTOR: Ghi nhận phân phối
  async recordDistributor(dto: DistributeBatchDto) {
    const wallet = dto.distributorWallet.toLowerCase();
    const user = await this.prisma.userAccount.findUnique({
      where: { walletAddress: wallet },
    });
    if (!this.checkPermission(user, 'DISTRIBUTOR')) {
      throw new BadRequestException('Ví chưa được phê duyệt với vai trò Đơn vị phân phối (DISTRIBUTOR)!');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { batchId: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Không tìm thấy mã lô hàng '${dto.batchId}'!`);
    }
    if (batch.stage !== 'IN_TRANSIT') {
      throw new BadRequestException(`Lô hàng chưa được vận chuyển (Hiện tại: ${batch.stage})!`);
    }

    // Payload chuẩn đối chiếu của Bảng 4
    const payload = {
      batchId: dto.batchId,
      distributorName: dto.distributorName,
      distributorContact: dto.distributorContact,
      distributorType: dto.distributorType,
      receivedTime: dto.receivedTime,
      actualQuantity: dto.actualQuantity,
      actualWeight: dto.actualWeight,
      receiptNotes: dto.receiptNotes || '',
      distributorWallet: wallet,
    };

    const dataHash = computeSha256(payload);

    const updated = await this.prisma.batch.update({
      where: { batchId: dto.batchId },
      data: {
        distributorName: dto.distributorName,
        distributorContact: dto.distributorContact,
        distributorType: dto.distributorType,
        receivedTime: new Date(dto.receivedTime),
        actualQuantity: dto.actualQuantity,
        actualWeight: dto.actualWeight,
        receiptNotes: dto.receiptNotes,
        distributorDataHash: dataHash,
        distributorTxHash: dto.distributorTxHash || null,
        distributorWallet: wallet,
        stage: 'DELIVERED',
      },
    });

    return {
      batch: updated,
      dataHash,
    };
  }

  // Cập nhật txHash sau khi người dùng ký giao dịch trên MetaMask
  async updateTxHash(batchId: string, stage: string, txHash: string) {
    const data: any = {};
    if (stage === 'CREATED') data.producerTxHash = txHash;
    if (stage === 'INSPECTED') data.inspectorTxHash = txHash;
    if (stage === 'IN_TRANSIT') data.logisticsTxHash = txHash;
    if (stage === 'DELIVERED') data.distributorTxHash = txHash;

    return this.prisma.batch.update({
      where: { batchId },
      data,
    });
  }

  async findAll(stage?: string) {
    const where: any = {};
    if (stage) where.stage = stage;
    return this.prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { creator: true },
    });
  }

  async findByBatchId(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { batchId },
      include: { creator: true },
    });
    if (!batch) {
      throw new NotFoundException(`Không tìm thấy mã lô hàng '${batchId}'!`);
    }
    return batch;
  }

  async getStats() {
    const total = await this.prisma.batch.count();
    const created = await this.prisma.batch.count({ where: { stage: 'CREATED' } });
    const inspected = await this.prisma.batch.count({ where: { stage: 'INSPECTED' } });
    const inTransit = await this.prisma.batch.count({ where: { stage: 'IN_TRANSIT' } });
    const delivered = await this.prisma.batch.count({ where: { stage: 'DELIVERED' } });

    const recentBatches = await this.prisma.batch.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        batchId: true,
        productName: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        producerTxHash: true,
        distributorTxHash: true,
      },
    });

    return {
      total,
      byStage: {
        created,
        inspected,
        inTransit,
        delivered,
      },
      recentBatches,
    };
  }
}
