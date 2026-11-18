import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { UpdateAccountStatusDto } from './dto/approve-account.dto';
import { ConfigService } from '../config/config.service';
import { isHardcodedAdmin } from '../admin.constants';

const ALLOWED_SUPPLY_CHAIN_ROLES = ['PRODUCER', 'INSPECTOR', 'LOGISTICS', 'DISTRIBUTOR'];

@Injectable()
export class AccountsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // CSDL chỉ lưu 4 vai trò của ví chuỗi cung ứng, loại bỏ vai trò ADMIN khỏi bảng UserAccount
      await this.prisma.userAccount.deleteMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { roles: { has: 'ADMIN' } },
          ],
        },
      });
      console.log('✅ Đã đồng bộ CSDL: chỉ lưu 4 vai trò chuỗi cung ứng (PRODUCER, INSPECTOR, LOGISTICS, DISTRIBUTOR), không lưu role ADMIN');
    } catch (e) {
      console.warn('Lưu ý dọn dẹp role ADMIN:', e);
    }
  }

  async register(dto: RegisterAccountDto) {
    const normalizedWallet = dto.walletAddress.toLowerCase();
    const existing = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    // Xử lý roles: chỉ chấp nhận 4 role chuỗi cung ứng
    let rawRoles: string[] = [];
    if (Array.isArray(dto.roles) && dto.roles.length > 0) {
      rawRoles = Array.from(new Set(dto.roles));
    } else if (dto.role) {
      rawRoles = [dto.role];
    } else {
      rawRoles = ['PRODUCER'];
    }

    const roles = rawRoles.filter((r) => ALLOWED_SUPPLY_CHAIN_ROLES.includes(r));
    if (roles.length === 0) {
      roles.push('PRODUCER');
    }
    const primaryRole = roles[0];

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
    const isAdmin = isHardcodedAdmin(normalized);

    const account = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalized },
    });

    if (!account) {
      if (isAdmin) {
        return {
          walletAddress: normalized,
          isAdmin: true,
          isRegistered: false,
          status: null,
          role: null,
          roles: [],
        };
      }
      return null;
    }

    // Đảm bảo roles chỉ gồm các vai trò chuỗi cung ứng hợp lệ
    let userRoles = Array.isArray(account.roles) && account.roles.length > 0
      ? [...account.roles]
      : (account.role ? [account.role] : []);

    userRoles = userRoles.filter((r) => ALLOWED_SUPPLY_CHAIN_ROLES.includes(r));
    const primaryRole = userRoles[0] || (ALLOWED_SUPPLY_CHAIN_ROLES.includes(account.role) ? account.role : 'PRODUCER');

    return {
      ...account,
      role: primaryRole,
      roles: userRoles,
      isAdmin,
      isRegistered: true,
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
