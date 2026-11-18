# HỆ THỐNG TRUY XUẤT NGUỒN GỐC NÔNG SẢN TRÊN BLOCKCHAIN (AGRITRACE)
**Ứng dụng Công nghệ Blockchain trong Quản lý & Truy xuất Nguồn gốc Chuỗi Cung Ứng Nông Sản**

---

## 📌 1. Giới thiệu tổng quan

Hệ thống **AgriTrace** được xây dựng theo **Kiến trúc Lưu trữ Lai (Hybrid On-chain / Off-chain)** nhằm đảm bảo tính toàn vẹn dữ liệu, minh bạch nguồn gốc và tối ưu chi phí vận hành:
* **Mỗi Role một ví riêng biệt**: Mỗi đối tượng tham gia chuỗi cung ứng (`Producer`, `Inspector`, `Logistics`, `Distributor`, `Admin`) sở hữu một địa chỉ ví Web3 (MetaMask) độc lập.
* **Xác thực chính chủ On-chain**: Đơn vị kết nối ví $\rightarrow$ Đăng ký hồ sơ $\rightarrow$ Admin phê duyệt và cấp quyền trực tiếp trên Smart Contract (`grantRole`).
* **Lưu trữ dữ liệu tối ưu**:
  * **Database Off-chain (PostgreSQL 16)**: Lưu trữ 100% các trường dữ liệu biểu mẫu chi tiết (Bảng 1, Bảng 2, Bảng 3, Bảng 4 theo quy định) và hình ảnh nông sản / chứng nhận.
  * **Smart Contract On-chain (Polygon Amoy Testnet)**: Lưu trữ các mốc thông tin bất biến gồm `batchId`, `currentStage`, `dataHash` (mã băm SHA-256 chuẩn tắc), `signer` (địa chỉ ví chính chủ ký) và `timestamp` của block.
* **Kiểm chứng bất biến 1:1**: Khi người tiêu dùng quét mã QR, trình duyệt tự động lấy dữ liệu từ DB và gọi RPC Smart Contract để đối soát mã băm 1:1, hiển thị huy hiệu xác thực tính toàn vẹn tức thì.

---

## 🌐 2. Thông tin Triển khai Hệ thống Thực tế (Live Deployment)

| Thành phần | Nền tảng / Công nghệ | Địa chỉ / URL |
| :--- | :--- | :--- |
| **Tên miền Chính thức (HTTPS)** | Let's Encrypt SSL | [https://voting.io.vn/](https://voting.io.vn/) |
| **Địa chỉ IP VPS** | Ubuntu Linux Server | `180.93.136.201` (Port 80/443) |
| **Giao diện Web (Frontend)** | Next.js 14 Standalone | [https://voting.io.vn/](https://voting.io.vn/) |
| **Tra cứu Lô hàng Mẫu** | Public Traceability | [https://voting.io.vn/trace/BATCH-2024-HOALOC-001](https://voting.io.vn/trace/BATCH-2024-HOALOC-001) |
| **Backend API Engine** | NestJS Production | `https://voting.io.vn/api` |
| **Healthcheck & Ping** | Keep-alive Endpoint | [https://voting.io.vn/ping](https://voting.io.vn/ping) |
| **Cơ sở dữ liệu** | PostgreSQL 16 Alpine | Lưu trữ trên VPS với Docker Volume lâu dài |
| **Reverse Proxy** | Nginx Alpine | Điều hướng tải, bảo mật SSL, tự động gia hạn certbot |
| **Smart Contract** | Polygon Amoy Testnet | `0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6` |
| **Blockchain Explorer** | Amoy PolygonScan | [Xem Hợp Đồng Trên PolygonScan](https://amoy.polygonscan.com/address/0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6) |
| **RPC Network** | Polygon Amoy | `https://polygon-amoy-bor-rpc.publicnode.com` (Chain ID: `80002`) |

---

## 🏗️ 3. Kiến Trúc Hạ Tầng & CI/CD Tự Động

Toàn bộ hệ thống được container hóa bằng **Docker Compose** và vận hành trên VPS độc lập, đảm bảo hiệu năng cao, ổn định lâu dài và không bị giới hạn:

```
[Internet User / Browser]
           │
           ▼ (HTTPS / Port 443)
┌────────────────────────────────────────────────────────┐
│                   agritrace-nginx                      │
│             (Nginx Reverse Proxy + SSL)                │
└──────────────┬─────────────────────────┬───────────────┘
               │ (Proxy /)               │ (Proxy /api/ & /uploads/)
               ▼                         ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│     agritrace-frontend     │ │    agritrace-backend    │
│    (Next.js Standalone)    │ │   (NestJS API Engine)   │
└────────────────────────────┘ └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │       agritrace-db      │
                               │  (PostgreSQL 16 Alpine) │
                               └─────────────────────────┘
```

* **Quy trình CI/CD tự động (GitHub Actions)**:
  * Khi push code lên nhánh `main`, file [.github/workflows/deploy.yml](.github/workflows/deploy.yml) sẽ tự động kích hoạt.
  * Xác thực qua **SSH Deploy Key** an toàn, kéo mã nguồn mới nhất về VPS.
  * Tự động build và cập nhật container theo phương thức **Zero-Downtime** (hoán đổi container trong 0.5s không làm gián đoạn người dùng).

---

## 📖 4. Hướng dẫn sử dụng từng bước theo thứ tự từng Role

Chuỗi cung ứng vận hành tuần tự qua 5 giai đoạn:

```
[Khởi tạo & Duyệt quyền] ──> [1. Producer] ──> [2. Inspector] ──> [3. Logistics] ──> [4. Distributor] ──> [5. End User Quét QR]
       (Admin)               (Tạo lô hàng)    (Kiểm định)       (Vận chuyển)       (Phân phối)          (Xác thực)
```

---

### BƯỚC 0: ĐĂNG KÝ VÍ & PHÊ DUYỆT (ONBOARDING)

#### Dành cho đơn vị tham gia mới (Producer, Inspector, Logistics, Distributor):
1. Cài đặt tiện ích **MetaMask** trên trình duyệt và thêm mạng **Polygon Amoy Testnet**:
   * **Network Name:** Polygon Amoy Testnet
   * **RPC URL:** `https://polygon-amoy-bor-rpc.publicnode.com`
   * **Chain ID:** `80002`
   * **Currency Symbol:** `POL`
   * **Block Explorer:** `https://amoy.polygonscan.com/`
2. Truy cập [https://voting.io.vn/register](https://voting.io.vn/register).
3. Bấm **"Kết nối MetaMask"** để nhận diện địa chỉ ví cá nhân.
4. Chọn vai trò muốn tham gia (`PRODUCER`, `INSPECTOR`, `LOGISTICS`, hoặc `DISTRIBUTOR`).
5. Điền: Tên cá nhân/tổ chức và Thông tin liên hệ (SĐT, Email, Địa chỉ) $\rightarrow$ Bấm **"Gửi Hồ Sơ Đăng Ký"**.
6. Hồ sơ sẽ ở trạng thái **`PENDING` (Chờ duyệt)** cho đến khi Admin phê duyệt.

#### Dành cho Admin (Quản trị viên):
1. Chuyển MetaMask sang **ví Admin**.
2. Truy cập mục **"Quản trị"** ([https://voting.io.vn/admin](https://voting.io.vn/admin)).
3. Xem danh sách hồ sơ tại tab **"Duyệt Tài Khoản"**.
4. Bấm nút **"Duyệt"**:
   * MetaMask sẽ hiện popup xác nhận gọi hàm `grantRole` trên Smart Contract.
   * Hệ thống tự động thiết lập mức phí gas tối ưu (`maxPriorityFeePerGas: 30 Gwei`) đảm bảo giao dịch không bị từ chối trên mạng Amoy.
   * Sau khi giao dịch hoàn tất trên Polygon, tài khoản được cấp quyền on-chain và chuyển trạng thái sang **`APPROVED`**.

---

### BƯỚC 1: ĐƠN VỊ SẢN XUẤT (PRODUCER) - KHỞI TẠO LÔ NÔNG SẢN

1. Chuyển MetaMask sang **ví Producer** (đã được Admin phê duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** ([https://voting.io.vn/portal](https://voting.io.vn/portal)). Hệ thống tự động nhận diện ví và mở **Form Bảng 1**.
3. Điền thông tin sản xuất:
   * **Thông tin định danh:** Mã lô sản phẩm (`batchId`), Tên sản phẩm, Loại sản phẩm, Số lượng, Trọng lượng (kg).
   * **Thông tin canh tác & thu hoạch:** Nguồn gốc giống, Vật tư nông nghiệp (phân bón, chế phẩm sinh học), Địa điểm sản xuất, Ngày bắt đầu canh tác, Ngày thu hoạch.
   * **Ảnh minh chứng:** Tải ảnh chụp thực tế nông sản lên hệ thống.
4. Bấm **"Lưu & Ký Blockchain (Khởi tạo Lô hàng)"**:
   * Hệ thống tự động băm dữ liệu theo thứ tự chuẩn tắc thành mã SHA-256 (`dataHash`).
   * MetaMask mở popup ký giao dịch `recordProduction(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`CREATED` (Đã sản xuất)**.

---

### BƯỚC 2: ĐƠN VỊ KIỂM ĐỊNH (INSPECTOR) - ĐÁNH GIÁ CHẤT LƯỢNG

1. Chuyển MetaMask sang **ví Inspector** (đã được Admin phê duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** ([https://voting.io.vn/portal](https://voting.io.vn/portal)). Hệ thống tự động mở **Form Bảng 2**.
3. Chọn mã lô hàng cần kiểm định (đang ở trạng thái `CREATED`).
4. Điền thông tin kiểm định & chứng nhận:
   * **Kiểm định:** Kết quả kiểm định, Chỉ tiêu đánh giá (dư lượng thuốc BVTV, kim loại nặng, vi sinh...).
   * **Chứng nhận:** Mã chứng nhận, Loại chứng nhận (VietGAP, GlobalGAP, Hữu cơ...), Cơ quan cấp, Ngày cấp, Ngày hết hạn.
   * **Ảnh scan:** Tải file ảnh chứng chỉ an toàn thực phẩm.
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Kiểm định)"**:
   * MetaMask mở popup ký giao dịch `recordInspection(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`INSPECTED` (Đã kiểm định)**.

---

### BƯỚC 3: ĐƠN VỊ VẬN CHUYỂN (LOGISTICS) - GHI NHẬN HÀNH TRÌNH

1. Chuyển MetaMask sang **ví Logistics** (đã được Admin phê duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** ([https://voting.io.vn/portal](https://voting.io.vn/portal)). Hệ thống hiển thị **Form Bảng 3**.
3. Chọn lô hàng đã hoàn tất kiểm định (ở trạng thái `INSPECTED`).
4. Điền thông tin vận chuyển & điều kiện bảo quản:
   * **Đơn vị vận chuyển:** Tên đơn vị / tài xế, Thông tin liên hệ, Loại hình (Cá nhân / Doanh nghiệp).
   * **Hành trình:** Mã vận chuyển, Điểm đi, Điểm đến, Thời gian khởi hành, Thời gian hoàn tất.
   * **Điều kiện bảo quản:** Nhiệt độ (°C), Độ ẩm (%), Ghi chú điều kiện xe lạnh.
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Vận chuyển)"**:
   * MetaMask mở popup ký giao dịch `recordLogistics(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`IN_TRANSIT` (Đang vận chuyển)**.

---

### BƯỚC 4: ĐƠN VỊ PHÂN PHỐI (DISTRIBUTOR) - TIẾP NHẬN HÀNG HÓA

1. Chuyển MetaMask sang **ví Distributor** (đã được Admin phê duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** ([https://voting.io.vn/portal](https://voting.io.vn/portal)). Hệ thống hiển thị **Form Bảng 4**.
3. Chọn lô hàng đang vận chuyển (ở trạng thái `IN_TRANSIT`).
4. Điền thông tin tiếp nhận hàng hóa:
   * **Đơn vị tiếp nhận:** Tên siêu thị / chuỗi bán lẻ, Địa chỉ, Người phụ trách.
   * **Thông tin nhận:** Thời gian tiếp nhận, Số lượng thực tế, Trọng lượng thực tế (kg), Ghi chú kiểm tra quy cách bao bì.
5. Bấm **"Lưu & Ký Blockchain (Tiếp nhận Phân phối)"**:
   * MetaMask mở popup ký giao dịch `recordDistribution(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`DELIVERED` (Đã tiếp nhận phân phối)**.

---

### BƯỚC 5: NGƯỜI MUA HÀNG (END USER) - QUÉT MÃ QR & TRA CỨU

1. **Không yêu cầu ví, không cần đăng nhập**:
   * Người tiêu dùng có thể bấm trực tiếp nút **"Quét QR"** trên trang [https://voting.io.vn/trace](https://voting.io.vn/trace) để mở camera quét tem trên sản phẩm, hoặc gõ mã lô hàng vào ô tìm kiếm.
2. **Xem tiến trình minh bạch 4 bước**:
   * Giao diện trực quan hoá toàn bộ lịch sử từ đồng ruộng, kết quả xét nghiệm mẫu, nhật trình xe bảo quản lạnh đến quầy kệ siêu thị.
3. **Đối soát tính toàn vẹn On-chain tự động**:
   * Hệ thống tự động tính mã băm SHA-256 từ cơ sở dữ liệu và gọi hàm `getBatch(...)` trên Smart Contract Polygon Amoy để đối chiếu.
   * Hiển thị huy hiệu **Tích xanh: "Dữ liệu được xác thực toàn vẹn trên Blockchain Polygon"** kèm mã băm giao dịch (TxHash) liên kết trực tiếp tới PolygonScan.
   * Cung cấp nút tải tem mã QR chất lượng cao để dán lên bao bì sản phẩm.

---

### TÍNH NĂNG ĐĂNG XUẤT (DISCONNECT WALLET)
* Người dùng có thể nhấn nút **"Đăng xuất"** bên cạnh địa chỉ ví trên thanh điều hướng Navbar bất cứ lúc nào.
* Hệ thống sẽ ngắt kết nối an toàn, xóa trạng thái cache phiên và ngăn MetaMask tự động đăng nhập lại khi tải lại trang.

---

## 💻 5. Hướng dẫn Chạy Thử Nghiệm Local (Dành cho Lập trình viên)

```bash
# 1. Clone mã nguồn
git clone https://github.com/dinhtnguyenn/PTIT_Master_TruyXuatNguocGocNongSan.git
cd PTIT_Master_TruyXuatNguocGocNongSan

# 2. Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
docker compose up --build -d

# Hoặc chạy thủ công từng phần:
# Cài đặt contracts:
cd contracts && npm install
# Chạy Backend (Port 4000):
cd ../backend && npm install && npm run start:dev
# Chạy Frontend (Port 3000):
cd ../frontend && npm install && npm run dev
```

* **Web UI Local:** `http://localhost:3000`
* **Backend API Local:** `http://localhost:4000/api`
* **Swagger API Docs:** `http://localhost:4000/api/docs`
