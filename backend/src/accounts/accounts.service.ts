import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { UpdateAccountStatusDto } from './dto/approve-account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterAccountDto) {
    const normalizedWallet = dto.walletAddress.toLowerCase();
    const existing = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new BadRequestException('Địa chỉ ví này đã được phê duyệt trong hệ thống!');
      }
      if (existing.status === 'PENDING') {
        throw new BadRequestException('Hồ sơ đăng ký của ví này đang chờ Admin phê duyệt!');
      }
      // Nếu trước đó bị REJECTED thì cho phép đăng ký lại
      return this.prisma.userAccount.update({
        where: { walletAddress: normalizedWallet },
        data: {
          role: dto.role,
          organizationName: dto.organizationName,
          contactInfo: dto.contactInfo,
          status: 'PENDING',
          txHashGrantRole: null,
        },
      });
    }

    return this.prisma.userAccount.create({
      data: {
        walletAddress: normalizedWallet,
        role: dto.role,
        organizationName: dto.organizationName,
        contactInfo: dto.contactInfo,
        status: 'PENDING',
      },
    });
  }

  async getByWallet(walletAddress: string) {
    const normalized = walletAddress.toLowerCase();
    const account = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalized },
    });
    return account;
  }

  async findAll(status?: string, role?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    return this.prisma.userAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateAccountStatusDto) {
    const account = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return this.prisma.userAccount.update({
      where: { id },
      data: {
        status: dto.status,
        txHashGrantRole: dto.txHashGrantRole || account.txHashGrantRole,
      },
    });
  }

  async getStats() {
    const total = await this.prisma.userAccount.count();
    const pending = await this.prisma.userAccount.count({ where: { status: 'PENDING' } });
    const approved = await this.prisma.userAccount.count({ where: { status: 'APPROVED' } });
    const rejected = await this.prisma.userAccount.count({ where: { status: 'REJECTED' } });

    const producers = await this.prisma.userAccount.count({ where: { role: 'PRODUCER', status: 'APPROVED' } });
    const inspectors = await this.prisma.userAccount.count({ where: { role: 'INSPECTOR', status: 'APPROVED' } });
    const logistics = await this.prisma.userAccount.count({ where: { role: 'LOGISTICS', status: 'APPROVED' } });
    const distributors = await this.prisma.userAccount.count({ where: { role: 'DISTRIBUTOR', status: 'APPROVED' } });

    return {
      total,
      pending,
      approved,
      rejected,
      byRole: {
        producers,
        inspectors,
        logistics,
        distributors,
      },
    };
  }
}
