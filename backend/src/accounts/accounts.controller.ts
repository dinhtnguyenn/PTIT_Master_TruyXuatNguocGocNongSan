import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { UpdateAccountStatusDto } from './dto/approve-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('register')
  register(@Body() dto: RegisterAccountDto) {
    return this.accountsService.register(dto);
  }

  @Get('me/:walletAddress')
  async getMe(@Param('walletAddress') walletAddress: string) {
    const account = await this.accountsService.getByWallet(walletAddress);
    return account || { exists: false, role: null };
  }

  @Get('stats')
  getStats() {
    return this.accountsService.getStats();
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('role') role?: string) {
    return this.accountsService.findAll(status, role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.accountsService.updateStatus(id, dto);
  }
}
