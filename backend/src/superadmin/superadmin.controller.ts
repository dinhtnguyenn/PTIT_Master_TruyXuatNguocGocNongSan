import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { SuperadminService } from './superadmin.service';

@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  private async checkAuth(wallet?: string, key?: string) {
    const res = await this.superadminService.verifyAccess(wallet, key);
    if (!res.authorized) {
      throw new UnauthorizedException(res.reason || 'Không có quyền truy cập Superadmin');
    }
  }

  // Xác thực đăng nhập
  @Post('auth')
  async authenticate(@Body() body: { walletAddress?: string; superadminKey?: string }) {
    const res = await this.superadminService.verifyAccess(body.walletAddress, body.superadminKey);
    if (!res.authorized) {
      throw new UnauthorizedException(res.reason);
    }
    return { success: true, message: 'Xác thực Superadmin thành công' };
  }

  // Thống kê tổng quan
  @Get('overview')
  async getOverview(
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getOverview();
  }

  // --- CRUD USER ACCOUNT ---
  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getAllUsers({ search, status, role });
  }

  @Get('users/:id')
  async getUser(
    @Param('id') id: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getUserById(id);
  }

  @Post('users')
  async createUser(
    @Body() body: any,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.createUser(body);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.updateUser(id, body);
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.deleteUser(id);
  }

  // --- CRUD BATCH ---
  @Get('batches')
  async getBatches(
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getAllBatches({ search, stage });
  }

  @Get('batches/:id')
  async getBatch(
    @Param('id') id: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getBatchById(id);
  }

  @Post('batches')
  async createBatch(
    @Body() body: any,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.createBatch(body);
  }

  @Put('batches/:id')
  async updateBatch(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.updateBatch(id, body);
  }

  @Delete('batches/:id')
  async deleteBatch(
    @Param('id') id: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.deleteBatch(id);
  }

  // --- CRUD SYSTEM CONFIG ---
  @Get('configs')
  async getConfigs(
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.getAllConfigs();
  }

  @Post('configs')
  async createConfig(
    @Body() body: { key: string; value: string; description?: string },
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.upsertConfig(body.key, body.value, body.description);
  }

  @Put('configs/:key')
  async updateConfig(
    @Param('key') configKey: string,
    @Body() body: { value: string; description?: string },
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.upsertConfig(configKey, body.value, body.description);
  }

  @Delete('configs/:key')
  async deleteConfig(
    @Param('key') configKey: string,
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.deleteConfig(configKey);
  }

  // --- XÓA TOÀN BỘ CƠ SỞ DỮ LIỆU ---
  @Post('clean-database')
  async cleanDatabase(
    @Headers('x-wallet-address') wallet?: string,
    @Headers('x-superadmin-key') key?: string,
  ) {
    await this.checkAuth(wallet, key);
    return this.superadminService.cleanDatabase();
  }
}
