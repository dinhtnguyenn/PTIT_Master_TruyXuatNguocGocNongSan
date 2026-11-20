import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { UpdateAccountStatusDto } from './dto/approve-account.dto';
import { ConfigService } from '../config/config.service';
import { HARDCODED_ADMIN_WALLETS, isHardcodedAdmin } from '../admin.constants';

const ALLOWED_SUPPLY_CHAIN_ROLES = ['PRODUCER', 'INSPECTOR', 'LOGISTICS', 'DISTRIBUTOR'];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  PRODUCER: 'Đơn vị Sản xuất',
  INSPECTOR: 'Đơn vị Kiểm định',
  LOGISTICS: 'Đơn vị Vận chuyển',
  DISTRIBUTOR: 'Đơn vị Phân phối',
};

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

      // Tự động đảm bảo 2 ví Admin gán cứng luôn tồn tại với status: APPROVED và không lưu SĐT, Email
      await this.ensureHardcodedAdmins();

      // Tự động phân tách SĐT, Email, Địa chỉ từ contactInfo cho các tài khoản cũ
      const existingAccounts = await this.prisma.userAccount.findMany();
      for (const acc of existingAccounts) {
        if ((!acc.phoneNumber || !acc.email || !acc.address) && acc.contactInfo) {
          const parts = acc.contactInfo.split(' - ').map((s) => s.trim());
          const phone = parts[0] || '';
          const mail = parts.length > 2 ? parts[1] : (parts[1]?.includes('@') ? parts[1] : '');
          const addr = parts.length > 2 ? parts.slice(2).join(' - ') : (parts[1]?.includes('@') ? '' : (parts[1] || ''));
          await this.prisma.userAccount.update({
            where: { id: acc.id },
            data: {
              phoneNumber: acc.phoneNumber || phone,
              email: acc.email || mail,
              address: acc.address || addr,
            },
          });
        }
      }
      console.log('✅ Đã đồng bộ CSDL: chỉ lưu 4 vai trò chuỗi cung ứng, đã tách riêng SĐT, Email, Địa chỉ');
    } catch (e) {
      console.warn('Lưu ý dọn dẹp role ADMIN:', e);
    }
  }

  async ensureHardcodedAdmins() {
    for (const adminWallet of HARDCODED_ADMIN_WALLETS) {
      const existing = await this.prisma.userAccount.findUnique({
        where: { walletAddress: adminWallet },
      });
      if (!existing) {
        await this.prisma.userAccount.create({
          data: {
            walletAddress: adminWallet,
            role: 'PRODUCER',
            roles: ['PRODUCER'],
            organizationName: 'Quản trị Hệ thống',
            status: 'APPROVED',
            phoneNumber: '',
            email: '',
            address: '',
            contactInfo: '',
          },
        });
      } else {
        await this.prisma.userAccount.update({
          where: { id: existing.id },
          data: {
            status: 'APPROVED',
            phoneNumber: '',
            email: '',
            address: '',
            contactInfo: '',
          },
        });
      }
    }
  }

  async register(dto: RegisterAccountDto) {
    const normalizedWallet = dto.walletAddress.toLowerCase();

    // Đối với ví Admin gán cứng: không lưu SĐT và Email, không gửi hồ sơ duyệt, luôn APPROVED
    if (isHardcodedAdmin(normalizedWallet)) {
      let rawRoles: string[] = [];
      if (Array.isArray(dto.roles) && dto.roles.length > 0) {
        rawRoles = Array.from(new Set(dto.roles));
      } else if (dto.role) {
        rawRoles = [dto.role];
      } else {
        rawRoles = ['PRODUCER'];
      }
      const roles = rawRoles.filter((r) => ALLOWED_SUPPLY_CHAIN_ROLES.includes(r));
      if (roles.length === 0) roles.push('PRODUCER');
      const primaryRole = roles[0];

      return this.prisma.userAccount.upsert({
        where: { walletAddress: normalizedWallet },
        create: {
          walletAddress: normalizedWallet,
          role: primaryRole,
          roles,
          organizationName: 'Quản trị Hệ thống',
          phoneNumber: '',
          email: '',
          address: '',
          contactInfo: '',
          status: 'APPROVED',
        },
        update: {
          role: primaryRole,
          roles,
          status: 'APPROVED',
          phoneNumber: '',
          email: '',
          address: '',
          contactInfo: '',
        },
      });
    }

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

    const phoneNumber = (dto.phoneNumber || '').trim();
    const email = (dto.email || '').trim();
    const address = (dto.address || '').trim();
    const orgName = (dto.organizationName || '').trim() || ROLE_DISPLAY_NAMES[primaryRole] || 'Đơn vị chuỗi cung ứng';
    const contactInfo = dto.contactInfo?.trim() || [phoneNumber, email, address].filter(Boolean).join(' - ');

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
          organizationName: orgName,
          phoneNumber,
          email,
          address,
          contactInfo,
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
        organizationName: orgName,
        phoneNumber,
        email,
        address,
        contactInfo,
        status: 'PENDING',
      },
    });
  }

  async getByWallet(walletAddress: string) {
    const normalized = walletAddress.toLowerCase();
    const isAdmin = isHardcodedAdmin(normalized);

    let account = await this.prisma.userAccount.findUnique({
      where: { walletAddress: normalized },
    });

    // Nếu là Admin gán cứng: luôn đảm bảo tài khoản tồn tại trong DB, status luôn APPROVED, không lưu SĐT/Email
    if (isAdmin) {
      if (!account) {
        account = await this.prisma.userAccount.create({
          data: {
            walletAddress: normalized,
            role: 'PRODUCER',
            roles: ['PRODUCER'],
            organizationName: 'Quản trị Hệ thống',
            status: 'APPROVED',
            phoneNumber: '',
            email: '',
            address: '',
            contactInfo: '',
          },
        });
      } else if (account.status !== 'APPROVED' || account.phoneNumber || account.email) {
        account = await this.prisma.userAccount.update({
          where: { id: account.id },
          data: {
            status: 'APPROVED',
            phoneNumber: '',
            email: '',
            address: '',
            contactInfo: '',
          },
        });
      }
    }

    if (!account) {
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
      roles: userRoles.length > 0 ? userRoles : ['PRODUCER'],
      phoneNumber: isAdmin ? '' : (account.phoneNumber || ''),
      email: isAdmin ? '' : (account.email || ''),
      isAdmin,
      isRegistered: true,
      status: 'APPROVED',
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

    // Khi lọc danh sách chờ duyệt (PENDING), tuyệt đối không bao gồm ví Quản trị viên
    if (status === 'PENDING') {
      where.walletAddress = {
        notIn: HARDCODED_ADMIN_WALLETS,
      };
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

  async updateRoles(idOrWallet: string, roles: string[]) {
    const account = await this.prisma.userAccount.findFirst({
      where: {
        OR: [
          { id: idOrWallet },
          { walletAddress: idOrWallet.toLowerCase() },
        ],
      },
    });
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    let rawRoles: string[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      rawRoles = Array.from(new Set(roles));
    } else {
      rawRoles = ['PRODUCER'];
    }

    const validRoles = rawRoles.filter((r) => ALLOWED_SUPPLY_CHAIN_ROLES.includes(r));
    if (validRoles.length === 0) {
      throw new BadRequestException('Tài khoản phải có ít nhất một vai trò chuỗi cung ứng hợp lệ!');
    }

    const isAdmin = isHardcodedAdmin(account.walletAddress);

    return this.prisma.userAccount.update({
      where: { id: account.id },
      data: {
        roles: validRoles,
        role: validRoles[0],
        status: 'APPROVED',
        ...(isAdmin ? { phoneNumber: '', email: '', address: '', contactInfo: '' } : {}),
      },
    });
  }

  async getStats() {
    const total = await this.prisma.userAccount.count();
    const pending = await this.prisma.userAccount.count({
      where: {
        status: 'PENDING',
        walletAddress: { notIn: HARDCODED_ADMIN_WALLETS },
      },
    });
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
