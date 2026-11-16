# HỆ THỐNG TRUY XUẤT NGUỒN GỐC NÔNG SẢN TRÊN BLOCKCHAIN
**Đề tài Thạc sĩ:** Ứng dụng Công nghệ Blockchain trong Quản lý & Truy xuất Nguồn gốc Chuỗi Cung Ứng Nông Sản  
**Học viện Công nghệ Bưu chính Viễn thông (PTIT)**

---

## 📌 Giới thiệu hệ thống

Hệ thống được xây dựng theo **Kiến trúc Lưu trữ Lai (Hybrid On-chain / Off-chain)** nhằm đảm bảo tính toàn vẹn, chống làm giả thông tin và tối ưu chi phí vận hành:
* **Mỗi Role một ví riêng biệt**: Mỗi đối tượng tham gia chuỗi cung ứng (`Producer`, `Inspector`, `Logistics`, `Distributor`, `Admin`) đều sở hữu một địa chỉ ví MetaMask độc lập.
* **Quy trình Đăng ký & Duyệt chính chủ**: Đơn vị kết nối ví $\rightarrow$ Gửi thông tin đăng ký $\rightarrow$ Admin thẩm định và thực hiện cấp quyền on-chain (`grantRole`) qua MetaMask của Admin.
* **Lưu trữ dữ liệu**:
  * **Database (PostgreSQL / SQLite)**: Lưu trữ trực tiếp toàn bộ 100% các trường dữ liệu theo tài liệu gốc (Bảng 1, Bảng 2, Bảng 3, Bảng 4).
  * **Server riêng**: Lưu trữ các file ảnh (ảnh nông sản, ảnh chứng nhận) và cung cấp link truy cập qua `/uploads/...`.
  * **Smart Contract (Polygon EVM)**: Lưu trữ các mốc thông tin đối chiếu gồm `batchId`, `currentStage`, `dataHash` (mã băm SHA-256), `signer` (địa chỉ ví người ký) và `timestamp` của block.
* **Giao diện Người dùng (User Side)**:
  * **Form 1 - Đăng ký tài khoản**: Đăng ký ví và thông tin doanh nghiệp, chờ duyệt.
  * **4 Form Chuỗi Cung Ứng**: Khi kết nối ví, hệ thống tự động phát hiện vai trò của ví đó để mở đúng Form tương ứng:
    * *Ví Producer* $\rightarrow$ Form Bảng 1 (Sản xuất, canh tác, thu hoạch).
    * *Ví Inspector* $\rightarrow$ Form Bảng 2 (Kiểm định, cấp chứng nhận).
    * *Ví Logistics* $\rightarrow$ Form Bảng 3 (Vận chuyển, nhiệt độ, độ ẩm bảo quản).
    * *Ví Distributor* $\rightarrow$ Form Bảng 4 (Tiếp nhận hàng hóa, kiểm đếm số lượng/khối lượng).
  * **Form Tra cứu Nguồn gốc (End User)**: Người mua hàng chỉ cần quét tem QR hoặc nhập mã lô. Trình duyệt tự động lấy dữ liệu từ DB và gọi RPC Smart Contract để đối soát mã băm 1:1, hiển thị tích xanh xác thực toàn vẹn 100%.
* **Giao diện Quản trị (Admin Side)**:
  * **Duyệt Account**: Phê duyệt hoặc từ chối các ví đăng ký vai trò, kích hoạt giao dịch cấp quyền on-chain.
  * **Xem Thống Kê**: Thống kê số lượng đối tác theo vai trò, tiến độ các lô nông sản theo giai đoạn và lịch sử giao dịch.

---

## 🚀 Cấu trúc thư mục dự án

```
PTIT_Master_TruyXuatNguocGocNongSan/
├── contracts/                  # Hợp đồng thông minh Solidity & Hardhat
│   ├── contracts/
│   │   └── SupplyChainProof.sol # Smart Contract phân quyền AccessControl & lưu băm
│   ├── test/
│   │   └── SupplyChainProof.test.js # Bộ kiểm thử tự động (Unit Tests)
│   └── scripts/
│       └── deploy.js            # Kịch bản triển khai mạng Local / Polygon Amoy
├── backend/                    # REST API NestJS & CSDL Prisma
│   ├── src/
│   │   ├── accounts/           # Quản lý tài khoản và xét duyệt ví
│   │   ├── batches/            # Quản lý 4 giai đoạn chuỗi cung ứng
│   │   ├── upload/             # API upload ảnh lên server riêng
│   │   ├── hash.util.ts        # Thuật toán tính băm SHA-256 chuẩn tắc
│   │   └── prisma.service.ts
│   └── prisma/
│       ├── schema.prisma       # Cấu trúc CSDL chuẩn theo tài liệu gốc
│       └── seed.ts             # Dữ liệu mẫu hoàn chỉnh 4 chặng
├── frontend/                   # Ứng dụng Web Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Trang chủ giới thiệu hệ thống
│       │   ├── register/       # Form 1: Đăng ký ví
│       │   ├── portal/         # Form 2, 3, 4, 5: 4 Form nghiệp vụ theo vai trò ví
│       │   ├── trace/          # Form 6: Tra cứu nguồn gốc & quét QR
│       │   └── admin/          # Quản trị duyệt account & thống kê
│       ├── components/
│       └── lib/                # Tích hợp Web3, MetaMask & Ethers.js
└── shared/
    └── contract-deployment.json # ABI và địa chỉ Smart Contract
```

---

## 🛠 Hướng dẫn chạy hệ thống

### 1. Khởi động Smart Contract & Node Blockchain
Mở Terminal 1:
```bash
cd contracts
# Chạy local node (Cung cấp sẵn 20 ví thử nghiệm có sẵn 10.000 ETH/POL)
npx hardhat node
```

Mở Terminal 2 (Triển khai Smart Contract lên node):
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
*(Nếu muốn chạy kiểm thử Smart Contract: `npx hardhat test`)*

---

### 2. Khởi động Backend API (NestJS)
Mở Terminal 3:
```bash
cd backend
npm run start:dev
```
* **API Endpoint:** `http://localhost:4000/api`
* **Swagger API Docs:** `http://localhost:4000/api/docs`

---

### 3. Khởi động Frontend Web (Next.js)
Mở Terminal 4:
```bash
cd frontend
npm run dev
```
* **Giao diện Web:** `http://localhost:3000`

---

## 📱 Các tài khoản ví mẫu thử nghiệm

Hệ thống đã chuẩn bị sẵn dữ liệu mẫu trong DB với các ví sau (tương ứng với các Private Key có sẵn của Hardhat Node):

| Vai trò | Tên đơn vị | Địa chỉ ví | Chức năng |
| :--- | :--- | :--- | :--- |
| **Admin** | Ban Quản Trị Hệ Thống PTIT | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` | Duyệt ví, cấp quyền on-chain, xem thống kê |
| **Producer** | HTX Xoài Cát Hòa Lộc | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | Form Bảng 1: Tạo lô, canh tác, thu hoạch |
| **Inspector** | Trung Tâm Vinacert | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | Form Bảng 2: Kiểm định chất lượng |
| **Logistics** | Vận tải Mekong Cold Chain | `0x90f79bf6eb2c4f870365e785982e1f101e93b906` | Form Bảng 3: Vận chuyển, nhiệt độ, độ ẩm |
| **Distributor** | Siêu thị Co.opmart Hà Đông | `0x15d34aaf54267db7d7c367839aaf71a00a2c6a65` | Form Bảng 4: Tiếp nhận tại điểm bán |
| **End User** | Người tiêu dùng | Không cần ví | Quét QR hoặc tra cứu tại `/trace/BATCH-2024-HOALOC-001` |
