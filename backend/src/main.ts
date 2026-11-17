import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép CORS để Frontend Next.js gọi API
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Tự động kiểm tra tính hợp lệ của DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Tiền tố API chung (loại trừ ping để có thể gọi trực tiếp /ping)
  app.setGlobalPrefix('api', {
    exclude: ['ping'],
  });

  // Cấu hình tài liệu Swagger UI
  const config = new DocumentBuilder()
    .setTitle('PTIT Agri Supply Chain API')
    .setDescription('REST API hệ thống truy xuất nguồn gốc nông sản tương tác Blockchain')
    .setVersion('1.0')
    .addTag('accounts', 'Quản lý đăng ký và xét duyệt tài khoản theo vai trò ví')
    .addTag('batches', 'Quản lý tiến trình 4 giai đoạn chuỗi cung ứng và mã băm đối soát')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`====================================================`);
  console.log(`🚀 Backend API đang chạy tại: http://localhost:${port}/api`);
  console.log(`📚 Swagger API Docs tại:       http://localhost:${port}/api/docs`);
  console.log(`====================================================`);
}
bootstrap();
