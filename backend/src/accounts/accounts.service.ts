import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { UpdateAccountStatusDto } from './dto/approve-account.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterAccountDto) {
    const normalizedWallet = dto.walletAddress.toLowerCase();
    const existing = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    // Xử lý roles: ưu tiên mảng roles, nếu không có thì lấy dto.role
    let roles: string[] = [];
    if (Array.isArray(dto.roles) && dto.roles.length > 0) {
      roles = Array.from(new Set(dto.roles));
    } else if (dto.role) {
      roles = [dto.role];
    } else {
      roles = ['PRODUCER'];
    }
    const primaryRole = roles[0] || 'PRODUCER';

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
          role: primaryRole,
          roles: roles,
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
        role: primaryRole,
        roles: roles,
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

    const isConfigAdmin = await this.configService.isAdminWallet(normalized);

    if (!account) {
      if (isConfigAdmin) {
        // Tự động trả về quyền Admin nếu ví nằm trong danh sách Admin cấu hình trên DB
        return {
          id: 'admin-' + normalized.slice(2, 10),
          walletAddress: normalized,
          role: 'ADMIN',
          roles: ['ADMIN'],
          organizationName: 'Ban Quản Trị Hệ Thống AgriTrace',
          contactInfo: 'admin@voting.io.vn',
          status: 'APPROVED',
          isAdmin: true,
          txHashGrantRole: null,
        };
      }
      return null;
    }

    // Đảm bảo roles luôn có dữ liệu
    let userRoles = Array.isArray(account.roles) && account.roles.length > 0
      ? [...account.roles]
      : (account.role ? [account.role] : []);

    if (isConfigAdmin && !userRoles.includes('ADMIN')) {
      userRoles.push('ADMIN');
    }

    const isAdmin = userRoles.includes('ADMIN') || account.role === 'ADMIN' || isConfigAdmin;

    return {
      ...account,
      roles: userRoles,
      isAdmin,
    };
  }

  async findAll(status?: string, role?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (role) {
      where.OR = [
        { role },
        { roles: { has: role } },
      ];
    }

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

    const producers = await this.prisma.userAccount.count({
      where: {
        status: 'APPROVED',
        OR: [{ role: 'PRODUCER' }, { roles: { has: 'PRODUCER' } }],
      },
    });
    const inspectors = await this.prisma.userAccount.count({
      where: {
        status: 'APPROVED',
        OR: [{ role: 'INSPECTOR' }, { roles: { has: 'INSPECTOR' } }],
      },
    });
    const logistics = await this.prisma.userAccount.count({
      where: {
        status: 'APPROVED',
        OR: [{ role: 'LOGISTICS' }, { roles: { has: 'LOGISTICS' } }],
      },
    });
    const distributors = await this.prisma.userAccount.count({
      where: {
        status: 'APPROVED',
        OR: [{ role: 'DISTRIBUTOR' }, { roles: { has: 'DISTRIBUTOR' } }],
      },
    });

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
