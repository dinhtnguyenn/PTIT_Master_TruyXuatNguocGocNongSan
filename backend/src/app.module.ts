import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { AccountsModule } from './accounts/accounts.module';
import { BatchesModule } from './batches/batches.module';
import { UploadController } from './upload/upload.controller';
import { ConfigModule } from './config/config.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/api/uploads',
    }),
    ConfigModule,
    AccountsModule,
    BatchesModule,
    SuperadminModule,
  ],
  controllers: [AppController, UploadController],
  providers: [PrismaService],
})
export class AppModule {}
