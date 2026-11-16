import { PrismaClient } from '@prisma/client';
import { computeSha256 } from '../src/hash.util';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING SAMPLE DATA ---');

  // 1. Tạo các tài khoản ví mẫu theo từng vai trò
  const producerWallet = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
  const inspectorWallet = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
  const logisticsWallet = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';
  const distributorWallet = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65';
  const adminWallet = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

  // Seed Admin
  await prisma.userAccount.upsert({
    where: { walletAddress: adminWallet },
    update: {},
    create: {
      walletAddress: adminWallet,
      role: 'ADMIN',
      organizationName: 'Ban Quản Trị Hệ Thống PTIT',
      contactInfo: 'admin@ptit.edu.vn - 024.3754.7890',
      status: 'APPROVED',
      txHashGrantRole: '0xadmin-genesis-hash',
    },
  });

  // Seed Producer
  await prisma.userAccount.upsert({
    where: { walletAddress: producerWallet },
    update: {},
    create: {
      walletAddress: producerWallet,
      role: 'PRODUCER',
      organizationName: 'Hợp Tác Xã Xoài Cát Hòa Lộc Tiền Giang',
      contactInfo: '0912.345.678 - Ấp Hòa, Xã Hòa Hưng, Huyện Cái Bè, Tiền Giang',
      status: 'APPROVED',
      txHashGrantRole: '0xmock-grant-role-producer',
    },
  });

  // Seed Inspector
  await prisma.userAccount.upsert({
    where: { walletAddress: inspectorWallet },
    update: {},
    create: {
      walletAddress: inspectorWallet,
      role: 'INSPECTOR',
      organizationName: 'Trung Tâm Chứng Nhận & Giám Định Nông Nghiệp Vinacert',
      contactInfo: '028.3999.8888 - contact@vinacert.vn - Q. Tân Bình, TP.HCM',
      status: 'APPROVED',
      txHashGrantRole: '0xmock-grant-role-inspector',
    },
  });

  // Seed Logistics
  await prisma.userAccount.upsert({
    where: { walletAddress: logisticsWallet },
    update: {},
    create: {
      walletAddress: logisticsWallet,
      role: 'LOGISTICS',
      organizationName: 'Công Ty Vận Tải Lạnh Mekong Cold Chain',
      contactInfo: '0903.111.222 - support@mekongcold.vn - TP. Mỹ Tho, Tiền Giang',
      status: 'APPROVED',
      txHashGrantRole: '0xmock-grant-role-logistics',
    },
  });

  // Seed Distributor
  await prisma.userAccount.upsert({
    where: { walletAddress: distributorWallet },
    update: {},
    create: {
      walletAddress: distributorWallet,
      role: 'DISTRIBUTOR',
      organizationName: 'Hệ Thống Siêu Thị Co.opmart Hà Nội',
      contactInfo: '1900.555.568 - contact@coopmart.vn - Q. Hà Đông, Hà Nội',
      status: 'APPROVED',
      txHashGrantRole: '0xmock-grant-role-distributor',
    },
  });

  // 2. Tạo lô hàng mẫu hoàn chỉnh qua cả 4 giai đoạn
  const sampleBatchId = 'BATCH-2024-HOALOC-001';

  const producerPayload = {
    batchId: sampleBatchId,
    productName: 'Xoài Cát Hòa Lộc (Tiêu chuẩn xuất khẩu)',
    category: 'Trái cây ăn quả đặc sản',
    quantity: 1500,
    weight: 3000,
    seedOrigin: 'Cây giống ghép thuần chủng Viện Cây ăn quả miền Nam',
    farmingSupplies: 'Phân hữu cơ vi sinh trùn quế, chế phẩm sinh học thảo mộc phòng trừ rầy',
    productionLocation: 'Vùng chuyên canh Xoài Cát Hòa Hưng, Huyện Cái Bè, Tiền Giang',
    cultivationStartDate: '2024-01-10T00:00:00.000Z',
    harvestDate: '2024-05-15T00:00:00.000Z',
    productImageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800',
    producerWallet: producerWallet,
  };

  const inspectorPayload = {
    batchId: sampleBatchId,
    inspectionResult: 'Đạt 100% tiêu chuẩn An toàn thực phẩm VietGAP & không dư lượng thuốc BVTV',
    inspectionCriteria: 'Dư lượng kim loại nặng (Pb, Cd), hoạt chất BVTV nhóm cúc, vi sinh E.Coli, Salmonella',
    certificateCode: 'CERT-VGAP-2024-9988',
    certificateType: 'VietGAP Trồng Trọt',
    issuingAuthority: 'Sở Nông nghiệp & PTNT Tiền Giang phối hợp Vinacert',
    issuedDate: '2024-05-16T00:00:00.000Z',
    expiryDate: '2025-05-16T00:00:00.000Z',
    certImageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800',
    inspectorWallet: inspectorWallet,
  };

  const logisticsPayload = {
    batchId: sampleBatchId,
    transporterName: 'Đội xe chuyên dụng Mekong Cold Chain (Biển số: 63C-123.45)',
    transporterContact: 'Tài xế Nguyễn Văn An - SĐT: 0918.889.999',
    transporterType: 'Tổ chức',
    shippingCode: 'SHIP-MK-2024-0501',
    originLocation: 'Kho thu hoạch HTX Hòa Hưng, Huyện Cái Bè, Tiền Giang',
    destLocation: 'Tổng kho phân phối Co.opmart Miền Bắc, KCN Quang Minh, Hà Nội',
    departureTime: '2024-05-17T08:00:00.000Z',
    completionTime: '2024-05-18T18:00:00.000Z',
    temperature: 13.5,
    humidity: 85.0,
    storageNotes: 'Nhiệt độ container lạnh duy trì từ 12°C - 15°C, thông gió định kỳ',
    logisticsWallet: logisticsWallet,
  };

  const distributorPayload = {
    batchId: sampleBatchId,
    distributorName: 'Siêu thị Co.opmart Hà Đông (Công ty TNHH Phân phối Saigon Co.op)',
    distributorContact: '024.3355.6677 - Số 10 Trần Phú, Hà Đông, Hà Nội',
    distributorType: 'Tổ chức',
    receivedTime: '2024-05-19T07:30:00.000Z',
    actualQuantity: 1500,
    actualWeight: 3000,
    receiptNotes: 'Tiếp nhận đủ 1.500 thùng (3.000 kg). Kiểm tra mẫu ngẫu nhiên: vỏ vàng đều, độ brix > 17%, không dập nát.',
    distributorWallet: distributorWallet,
  };

  const pHash = computeSha256(producerPayload);
  const iHash = computeSha256(inspectorPayload);
  const lHash = computeSha256(logisticsPayload);
  const dHash = computeSha256(distributorPayload);

  await prisma.batch.upsert({
    where: { batchId: sampleBatchId },
    update: {},
    create: {
      batchId: sampleBatchId,
      productName: producerPayload.productName,
      category: producerPayload.category,
      quantity: producerPayload.quantity,
      weight: producerPayload.weight,
      seedOrigin: producerPayload.seedOrigin,
      farmingSupplies: producerPayload.farmingSupplies,
      productionLocation: producerPayload.productionLocation,
      cultivationStartDate: new Date(producerPayload.cultivationStartDate),
      harvestDate: new Date(producerPayload.harvestDate),
      productImageUrl: producerPayload.productImageUrl,
      producerDataHash: pHash,
      producerTxHash: '0x71a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80',
      producerWallet: producerWallet,

      inspectionResult: inspectorPayload.inspectionResult,
      inspectionCriteria: inspectorPayload.inspectionCriteria,
      certificateCode: inspectorPayload.certificateCode,
      certificateType: inspectorPayload.certificateType,
      issuingAuthority: inspectorPayload.issuingAuthority,
      issuedDate: new Date(inspectorPayload.issuedDate),
      expiryDate: new Date(inspectorPayload.expiryDate),
      certImageUrl: inspectorPayload.certImageUrl,
      inspectorDataHash: iHash,
      inspectorTxHash: '0x82b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091',
      inspectorWallet: inspectorWallet,

      transporterName: logisticsPayload.transporterName,
      transporterContact: logisticsPayload.transporterContact,
      transporterType: logisticsPayload.transporterType,
      shippingCode: logisticsPayload.shippingCode,
      originLocation: logisticsPayload.originLocation,
      destLocation: logisticsPayload.destLocation,
      departureTime: new Date(logisticsPayload.departureTime),
      completionTime: new Date(logisticsPayload.completionTime),
      temperature: logisticsPayload.temperature,
      humidity: logisticsPayload.humidity,
      storageNotes: logisticsPayload.storageNotes,
      logisticsDataHash: lHash,
      logisticsTxHash: '0x93c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2',
      logisticsWallet: logisticsWallet,

      distributorName: distributorPayload.distributorName,
      distributorContact: distributorPayload.distributorContact,
      distributorType: distributorPayload.distributorType,
      receivedTime: new Date(distributorPayload.receivedTime),
      actualQuantity: distributorPayload.actualQuantity,
      actualWeight: distributorPayload.actualWeight,
      receiptNotes: distributorPayload.receiptNotes,
      distributorDataHash: dHash,
      distributorTxHash: '0xa4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3',
      distributorWallet: distributorWallet,

      stage: 'DELIVERED',
      createdByAddress: producerWallet,
    },
  });

  console.log('✅ Seed dữ liệu mẫu thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
