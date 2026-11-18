import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [SuperadminController],
  providers: [SuperadminService, PrismaService],
  exports: [SuperadminService],
})
export class SuperadminModule {}
