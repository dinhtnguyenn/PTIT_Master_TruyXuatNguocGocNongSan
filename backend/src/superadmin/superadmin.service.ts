import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '../config/config.service';
import { isHardcodedAdmin } from '../admin.constants';

@Injectable()
export class SuperadminService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // 1. Xác thực quyền truy cập Superadmin (qua Wallet Admin hoặc Secret Key)
  async verifyAccess(walletAddress?: string, superadminKey?: string): Promise<{ authorized: boolean; reason?: string }> {
    if (superadminKey) {
      const isValidKey = await this.configService.validateSuperadminKey(superadminKey);
      if (isValidKey) return { authorized: true };
    }

    if (walletAddress) {
      const normalized = walletAddress.toLowerCase();
      if (isHardcodedAdmin(normalized)) return { authorized: true };
      const isConfigAdmin = await this.configService.isAdminWallet(normalized);
      if (isConfigAdmin) return { authorized: true };
    }

    return { authorized: false, reason: 'Yêu cầu kết nối Ví Admin hoặc nhập Mã bí mật Superadmin chính xác.' };
  }

  // 2. Thống kê tổng quan tất cả các bảng
  async getOverview() {
    const [totalUsers, totalBatches, totalConfigs] = await Promise.all([
      this.prisma.userAccount.count(),
      this.prisma.batch.count(),
      this.prisma.systemConfig.count(),
    ]);

    const usersByStatus = {
      pending: await this.prisma.userAccount.count({ where: { status: 'PENDING' } }),
      approved: await this.prisma.userAccount.count({ where: { status: 'APPROVED' } }),
      rejected: await this.prisma.userAccount.count({ where: { status: 'REJECTED' } }),
    };

    const batchesByStage = {
      created: await this.prisma.batch.count({ where: { stage: 'CREATED' } }),
      inspected: await this.prisma.batch.count({ where: { stage: 'INSPECTED' } }),
      inTransit: await this.prisma.batch.count({ where: { stage: 'IN_TRANSIT' } }),
      delivered: await this.prisma.batch.count({ where: { stage: 'DELIVERED' } }),
    };

    return {
      totalUsers,
      totalBatches,
      totalConfigs,
      usersByStatus,
      batchesByStage,
    };
  }

  // 3. CRUD BẢNG UserAccount (Người dùng & Phân quyền)
  async getAllUsers(query?: { search?: string; status?: string; role?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.role) {
      where.OR = [
        { role: query.role },
        { roles: { has: query.role } },
      ];
    }
    if (query?.search) {
      where.OR = [
        { walletAddress: { contains: query.search.toLowerCase() } },
        { organizationName: { contains: query.search, mode: 'insensitive' } },
        { contactInfo: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.userAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { batchesProduced: true },
        },
      },
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    return user;
  }

  async createUser(data: {
    walletAddress: string;
    roles?: string[];
    role?: string;
    organizationName: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    contactInfo?: string;
    status?: string;
    txHashGrantRole?: string;
  }) {
    const normalizedWallet = data.walletAddress.trim().toLowerCase();
    const existing = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalizedWallet },
    });
    if (existing) throw new BadRequestException(`Địa chỉ ví ${normalizedWallet} đã tồn tại trong Cơ sở dữ liệu!`);

    let roles = Array.isArray(data.roles) && data.roles.length > 0 ? Array.from(new Set(data.roles)) : [];
    if (roles.length === 0 && data.role) roles = [data.role];
    if (roles.length === 0) roles = ['PRODUCER'];

    const phone = (data.phoneNumber || '').trim();
    const mail = (data.email || '').trim();
    const addr = (data.address || '').trim();
    const contact = data.contactInfo?.trim() || [phone, mail, addr].filter(Boolean).join(' - ');

    return this.prisma.userAccount.create({
      data: {
        walletAddress: normalizedWallet,
        role: roles[0] || 'PRODUCER',
        roles: roles,
        organizationName: data.organizationName,
        phoneNumber: phone,
        email: mail,
        address: addr,
        contactInfo: contact,
        status: data.status || 'APPROVED',
        txHashGrantRole: data.txHashGrantRole || null,
      },
    });
  }

  async updateUser(id: string, data: {
    walletAddress?: string;
    roles?: string[];
    role?: string;
    organizationName?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    contactInfo?: string;
    status?: string;
    txHashGrantRole?: string;
  }) {
    const user = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng');

    const updateData: any = {};
    if (data.walletAddress) {
      updateData.walletAddress = data.walletAddress.trim().toLowerCase();
    }
    if (data.roles !== undefined) {
      updateData.roles = Array.from(new Set(data.roles));
      if (updateData.roles.length > 0) {
        updateData.role = updateData.roles[0];
      }
    }
    if (data.role && data.roles === undefined) {
      updateData.role = data.role;
      updateData.roles = [data.role];
    }
    if (data.organizationName !== undefined) updateData.organizationName = data.organizationName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contactInfo !== undefined) {
      updateData.contactInfo = data.contactInfo;
    } else if (data.phoneNumber !== undefined || data.email !== undefined || data.address !== undefined) {
      const p = data.phoneNumber !== undefined ? data.phoneNumber : user.phoneNumber;
      const m = data.email !== undefined ? data.email : user.email;
      const a = data.address !== undefined ? data.address : user.address;
      updateData.contactInfo = [p, m, a].filter(Boolean).join(' - ');
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.txHashGrantRole !== undefined) updateData.txHashGrantRole = data.txHashGrantRole;

    return this.prisma.userAccount.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Xóa liên kết hoặc xóa cascade nếu có lô hàng
    return this.prisma.userAccount.delete({
      where: { id },
    });
  }

  // 4. CRUD BẢNG Batch (Lô hàng nông sản)
  async getAllBatches(query?: { search?: string; stage?: string }) {
    const where: any = {};
    if (query?.stage) where.stage = query.stage;
    if (query?.search) {
      where.OR = [
        { batchId: { contains: query.search, mode: 'insensitive' } },
        { productName: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
        { producerWallet: { contains: query.search.toLowerCase() } },
      ];
    }

    return this.prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            organizationName: true,
            walletAddress: true,
          },
        },
      },
    });
  }

  async getBatchById(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!batch) throw new NotFoundException('Không tìm thấy lô hàng');
    return batch;
  }

  async createBatch(data: any) {
    const existing = await this.prisma.batch.findUnique({
      where: { batchId: data.batchId },
    });
    if (existing) throw new BadRequestException(`Mã lô hàng '${data.batchId}' đã tồn tại!`);

    // Đảm bảo creator tồn tại trong UserAccount
    const creatorWallet = (data.createdByAddress || data.producerWallet || '').toLowerCase();
    let creator = await this.prisma.userAccount.findUnique({
      where: { walletAddress: creatorWallet },
    });
    if (!creator) {
      creator = await this.prisma.userAccount.create({
        data: {
          walletAddress: creatorWallet,
          role: 'PRODUCER',
          roles: ['PRODUCER'],
          organizationName: 'Nhà sản xuất ' + data.productName,
          contactInfo: 'N/A',
          status: 'APPROVED',
        },
      });
    }

    return this.prisma.batch.create({
      data: {
        batchId: data.batchId,
        stage: data.stage || 'CREATED',
        productName: data.productName,
        category: data.category || 'Nông sản',
        quantity: Number(data.quantity) || 1,
        weight: Number(data.weight) || 1,
        seedOrigin: data.seedOrigin || 'N/A',
        farmingSupplies: data.farmingSupplies || 'N/A',
        productionLocation: data.productionLocation || 'Việt Nam',
        cultivationStartDate: data.cultivationStartDate ? new Date(data.cultivationStartDate) : new Date(),
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : new Date(),
        productImageUrl: data.productImageUrl || null,
        productImageCid: data.productImageCid || null,
        producerWallet: data.producerWallet || creatorWallet,
        producerTxHash: data.producerTxHash || null,
        producerDataHash: data.producerDataHash || null,

        inspectionResult: data.inspectionResult || null,
        inspectionCriteria: data.inspectionCriteria || null,
        certificateCode: data.certificateCode || null,
        certificateType: data.certificateType || null,
        issuingAuthority: data.issuingAuthority || null,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        certImageUrl: data.certImageUrl || null,
        certImageCid: data.certImageCid || null,
        inspectorWallet: data.inspectorWallet || null,
        inspectorTxHash: data.inspectorTxHash || null,
        inspectorDataHash: data.inspectorDataHash || null,

        transporterName: data.transporterName || null,
        transporterContact: data.transporterContact || null,
        transporterType: data.transporterType || null,
        shippingCode: data.shippingCode || null,
        originLocation: data.originLocation || null,
        destLocation: data.destLocation || null,
        departureTime: data.departureTime ? new Date(data.departureTime) : null,
        completionTime: data.completionTime ? new Date(data.completionTime) : null,
        temperature: data.temperature !== undefined && data.temperature !== '' ? Number(data.temperature) : null,
        humidity: data.humidity !== undefined && data.humidity !== '' ? Number(data.humidity) : null,
        storageNotes: data.storageNotes || null,
        logisticsWallet: data.logisticsWallet || null,
        logisticsTxHash: data.logisticsTxHash || null,
        logisticsDataHash: data.logisticsDataHash || null,

        distributorName: data.distributorName || null,
        distributorContact: data.distributorContact || null,
        distributorType: data.distributorType || null,
        receivedTime: data.receivedTime ? new Date(data.receivedTime) : null,
        actualQuantity: data.actualQuantity !== undefined && data.actualQuantity !== '' ? Number(data.actualQuantity) : null,
        actualWeight: data.actualWeight !== undefined && data.actualWeight !== '' ? Number(data.actualWeight) : null,
        receiptNotes: data.receiptNotes || null,
        distributorWallet: data.distributorWallet || null,
        distributorTxHash: data.distributorTxHash || null,
        distributorDataHash: data.distributorDataHash || null,

        createdByAddress: creator.walletAddress,
      },
    });
  }

  async updateBatch(id: string, data: any) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô hàng');

    const updateData: any = {};
    const stringFields = [
      'productName', 'category', 'seedOrigin', 'farmingSupplies', 'productionLocation', 'productImageUrl', 'productImageCid',
      'producerWallet', 'producerTxHash', 'producerDataHash', 'stage',
      'inspectionResult', 'inspectionCriteria', 'certificateCode', 'certificateType', 'issuingAuthority',
      'certImageUrl', 'certImageCid', 'inspectorWallet', 'inspectorTxHash', 'inspectorDataHash',
      'transporterName', 'transporterContact', 'transporterType', 'shippingCode', 'originLocation', 'destLocation',
      'storageNotes', 'logisticsWallet', 'logisticsTxHash', 'logisticsDataHash',
      'distributorName', 'distributorContact', 'distributorType', 'receiptNotes',
      'distributorWallet', 'distributorTxHash', 'distributorDataHash',
    ];

    for (const f of stringFields) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }

    const numberFields = ['quantity', 'weight', 'temperature', 'humidity', 'actualQuantity', 'actualWeight'];
    for (const f of numberFields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f] === null || data[f] === '' ? null : Number(data[f]);
      }
    }

    const dateFields = [
      'cultivationStartDate', 'harvestDate', 'issuedDate', 'expiryDate',
      'departureTime', 'completionTime', 'receivedTime',
    ];
    for (const f of dateFields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f] ? new Date(data[f]) : null;
      }
    }

    return this.prisma.batch.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteBatch(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô hàng');

    return this.prisma.batch.delete({
      where: { id },
    });
  }

  // 5. CRUD BẢNG SystemConfig (Cấu hình hệ thống động)
  async getAllConfigs() {
    return this.configService.getAllConfigs();
  }

  async upsertConfig(key: string, value: string, description?: string) {
    return this.configService.set(key, value, description);
  }

  async deleteConfig(key: string) {
    return this.configService.delete(key);
  }

  // 6. XÓA TOÀN BỘ DỮ LIỆU CSDL (Clean Database phục vụ kiểm thử)
  async cleanDatabase() {
    // Xóa toàn bộ Batch trước (do có quan hệ khóa ngoại trỏ tới UserAccount)
    const deletedBatches = await this.prisma.batch.deleteMany();
    // Xóa toàn bộ tài khoản người dùng
    const deletedUsers = await this.prisma.userAccount.deleteMany();

    return {
      success: true,
      message: `Đã xóa toàn bộ dữ liệu CSDL thành công (${deletedBatches.count} lô hàng, ${deletedUsers.count} tài khoản người dùng).`,
      deletedBatches: deletedBatches.count,
      deletedUsers: deletedUsers.count,
    };
  }
}
