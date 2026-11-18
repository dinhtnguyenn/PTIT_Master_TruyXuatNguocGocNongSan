import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async seedDefaults() {
    const defaults = [
      {
        key: 'CONTRACT_ADDRESS',
        value: process.env.CONTRACT_ADDRESS || '0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6',
        description: 'Địa chỉ Smart Contract SupplyChainProof trên Polygon Amoy',
      },
      {
        key: 'RPC_URL',
        value: process.env.RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com',
        description: 'Endpoint JSON-RPC kết nối blockchain Polygon Amoy',
      },
      {
        key: 'CHAIN_ID',
        value: '80002',
        description: 'Chain ID của Polygon Amoy Testnet',
      },
      {
        key: 'CHAIN_NAME',
        value: 'Polygon Amoy',
        description: 'Tên mạng blockchain hiển thị',
      },
      {
        key: 'ADMIN_WALLETS',
        value: '0x33F34938981588Df03c8eB291C6abe75612eA49a,0xd308d759F0986aADe715d8B2bf18d58c1680b9CC',
        description: 'Danh sách địa chỉ ví Admin hệ thống (phân cách bởi dấu phẩy)',
      },
      {
        key: 'SUPERADMIN_KEY',
        value: 'agritrace_root_2026',
        description: 'Mã khóa bí mật đăng nhập trang Superadmin',
      },
      {
        key: 'SYSTEM_NAME',
        value: 'AgriTrace',
        description: 'Tên hệ thống chuỗi cung ứng nông sản',
      },
      {
        key: 'EXPLORER_URL',
        value: 'https://amoy.polygonscan.com',
        description: 'Trang tra cứu giao dịch blockchain Explorer',
      },
    ];

    for (const item of defaults) {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: item.key },
      });
      if (!existing) {
        await this.prisma.systemConfig.create({
          data: item,
        });
      }
    }
  }

  async getPublicConfig(): Promise<Record<string, string>> {
    const configs = await this.prisma.systemConfig.findMany();
    const result: Record<string, string> = {};
    for (const c of configs) {
      if (c.key !== 'SUPERADMIN_KEY') {
        result[c.key] = c.value;
      }
    }
    return result;
  }

  async getAllConfigs() {
    return this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async get(key: string): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config ? config.value : null;
  }

  async set(key: string, value: string, description?: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        ...(description ? { description } : {}),
      },
      create: {
        key,
        value,
        description,
      },
    });
  }

  async delete(key: string) {
    return this.prisma.systemConfig.delete({
      where: { key },
    });
  }

  async isAdminWallet(wallet?: string | null): Promise<boolean> {
    if (!wallet) return false;
    const adminWalletsStr = await this.get('ADMIN_WALLETS');
    if (!adminWalletsStr) return false;
    const list = adminWalletsStr.split(',').map((w) => w.trim().toLowerCase());
    return list.includes(wallet.toLowerCase());
  }

  async validateSuperadminKey(key?: string | null): Promise<boolean> {
    if (!key) return false;
    const secret = await this.get('SUPERADMIN_KEY');
    return secret === key;
  }
}
