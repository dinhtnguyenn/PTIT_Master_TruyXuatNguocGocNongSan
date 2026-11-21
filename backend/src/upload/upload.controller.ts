import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { computeIpfsCidV0, pinFileToPinata } from './ipfs.util';

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/)) {
          return callback(
            new BadRequestException('Chỉ chấp nhận file ảnh (JPG, PNG, WebP) hoặc PDF!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file tải lên');
    }
    const fileUrl = `/uploads/${file.filename}`;
    const fileBuffer = fs.readFileSync(file.path);
    let cid = computeIpfsCidV0(fileBuffer);

    // Nếu có cấu hình Pinata, đồng bộ lên Pinata IPFS
    const pinataRes = await pinFileToPinata(fileBuffer, file.originalname);
    if (pinataRes?.cid) {
      cid = pinataRes.cid;
    }

    return {
      success: true,
      filename: file.filename,
      url: pinataRes?.gatewayUrl || fileUrl,
      localUrl: fileUrl,
      cid: cid,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
