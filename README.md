# HỆ THỐNG TRUY XUẤT NGUỒN GỐC NÔNG SẢN TRÊN BLOCKCHAIN
**Đề tài Thạc sĩ:** Ứng dụng Công nghệ Blockchain trong Quản lý & Truy xuất Nguồn gốc Chuỗi Cung Ứng Nông Sản  
**Học viện Công nghệ Bưu chính Viễn thông (PTIT)**

---

## 📌 1. Giới thiệu tổng quan

Hệ thống được xây dựng theo **Kiến trúc Lưu trữ Lai (Hybrid On-chain / Off-chain)** nhằm đảm bảo tính toàn vẹn dữ liệu, minh bạch nguồn gốc và tối ưu chi phí vận hành:
* **Mỗi Role một ví riêng biệt**: Mỗi đối tượng tham gia chuỗi cung ứng (`Producer`, `Inspector`, `Logistics`, `Distributor`, `Admin`) sở hữu một địa chỉ ví MetaMask độc lập.
* **Xác thực chính chủ On-chain**: Đơn vị kết nối ví $\rightarrow$ Đăng ký hồ sơ $\rightarrow$ Admin phê duyệt và cấp quyền trực tiếp trên Smart Contract (`grantRole`).
* **Lưu trữ dữ liệu**:
  * **Database (PostgreSQL trên Supabase / SQLite)**: Lưu trữ 100% các trường dữ liệu biểu mẫu chi tiết theo đúng tài liệu đính kèm (Bảng 1, Bảng 2, Bảng 3, Bảng 4) và đường dẫn ảnh.
  * **Smart Contract (Polygon Amoy Testnet)**: Lưu trữ các mốc thông tin đối chiếu gồm `batchId`, `currentStage`, `dataHash` (mã băm SHA-256), `signer` (địa chỉ ví chính chủ ký) và `timestamp` của block.
* **Kiểm chứng bất biến**: Khi người tiêu dùng quét mã QR, trình duyệt tự động lấy dữ liệu từ DB và gọi RPC Smart Contract để đối soát mã băm 1:1, hiển thị tích xanh xác minh toàn vẹn.

---

## 🌐 2. Thông tin Triển khai Trực tuyến (Live Deployment)

| Thành phần | Nền tảng | Địa chỉ / URL |
| :--- | :--- | :--- |
| **Smart Contract** | Polygon Amoy Testnet | `0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6` |
| **Blockchain Explorer** | Amoy PolygonScan | [Xem Hợp Đồng Trên PolygonScan](https://amoy.polygonscan.com/address/0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6) |
| **RPC Network** | Polygon Amoy | `https://polygon-amoy.drpc.org` (Chain ID: `80002`) |
| **Backend API** | Render.com (NestJS) | `https://<ten-app>.onrender.com/api` |
| **Keep-alive Ping** | cron-job.com | `https://<ten-app>.onrender.com/ping` |
| **Database** | Supabase Cloud | PostgreSQL (Connection Pooler IPv4) |
| **Frontend Web** | Vercel (Next.js 14) | `https://<ten-app>.vercel.app` |

---

## 📖 3. Hướng dẫn sử dụng từng bước theo thứ tự từng Role

Chuỗi cung ứng vận hành tuần tự qua 5 giai đoạn:

```
[Khởi tạo & Duyệt quyền] ──> [1. Producer] ──> [2. Inspector] ──> [3. Logistics] ──> [4. Distributor] ──> [5. End User Quét QR]
       (Admin)               (Tạo lô hàng)    (Kiểm định)       (Vận chuyển)       (Phân phối)          (Xác thực)
```

---

### BƯỚC 0: ĐĂNG KÝ VÍ & PHÊ DUYỆT (ONBOARDING)

#### Dành cho đơn vị tham gia mới (Producer, Inspector, Logistics, Distributor):
1. Cài đặt tiện ích **MetaMask** trên trình duyệt và thêm mạng **Polygon Amoy Testnet** (RPC: `https://polygon-amoy.drpc.org`, Chain ID: `80002`).
2. Truy cập trang web $\rightarrow$ Bấm **"Đăng ký Ví"** (`/register`).
3. Bấm **"Kết nối MetaMask"** để nhận diện địa chỉ ví cá nhân.
4. Chọn vai trò muốn tham gia (`PRODUCER`, `INSPECTOR`, `LOGISTICS`, hoặc `DISTRIBUTOR`).
5. Điền: Tên cá nhân/tổ chức và Thông tin liên hệ (SĐT, Email, Địa chỉ) $\rightarrow$ Bấm **"Gửi Hồ Sơ Đăng Ký"**.
6. Hồ sơ sẽ ở trạng thái **`PENDING` (Chờ duyệt)** cho đến khi Admin phê duyệt.

#### Dành cho Admin (Quản trị viên):
1. Chuyển MetaMask sang **ví Admin** (ví đã deploy contract).
2. Truy cập mục **"Quản trị"** (`/admin`).
3. Tại tab **"Duyệt Tài Khoản"**, xem danh sách các hồ sơ đang ở trạng thái `Chờ duyệt`.
4. Bấm nút **"Duyệt"**:
   * MetaMask sẽ hiện popup yêu cầu Admin xác nhận giao dịch gọi hàm `grantRole` trên Smart Contract.
   * Sau khi giao dịch hoàn tất trên Polygon, tài khoản được cấp quyền on-chain và chuyển sang trạng thái **`APPROVED`**.

---

### BƯỚC 1: ĐƠN VỊ SẢN XUẤT (PRODUCER) - KHỞI TẠO LÔ NÔNG SẢN

1. Chuyển MetaMask sang **ví Producer** (đã được Admin duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** (`/portal`). Hệ thống tự động nhận diện ví và hiển thị **Form Bảng 1**.
3. Điền đầy đủ thông tin sản xuất theo tài liệu:
   * **Thông tin định danh:** Mã lô sản phẩm (`batchId`), Tên sản phẩm, Loại sản phẩm, Số lượng, Trọng lượng (kg).
   * **Thông tin canh tác & thu hoạch:** Nguồn gốc giống, Vật tư nông nghiệp (phân bón, thuốc BVTV đã dùng), Địa điểm sản xuất, Ngày bắt đầu canh tác, Ngày thu hoạch.
   * **Ảnh minh chứng:** Tải ảnh nông sản hoặc ruộng trồng lên hệ thống.
4. Bấm **"Lưu & Ký Blockchain (Khởi tạo Lô hàng)"**:
   * Hệ thống tự động băm dữ liệu thành mã SHA-256 (`dataHash`).
   * MetaMask mở popup yêu cầu ký giao dịch `recordProduction(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`CREATED` (Đã sản xuất)**.

---

### BƯỚC 2: ĐƠN VỊ KIỂM ĐỊNH (INSPECTOR) - ĐÁNH GIÁ CHẤT LƯỢNG

1. Chuyển MetaMask sang **ví Inspector** (đã được Admin duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** (`/portal`). Hệ thống tự động hiển thị **Form Bảng 2**.
3. Tại ô **"Chọn Lô sản phẩm"**, chọn mã lô hàng vừa được Producer tạo (ở trạng thái `CREATED`).
4. Điền thông tin kiểm định & chứng nhận:
   * **Thông tin kiểm định:** Kết quả kiểm định, Chỉ tiêu kiểm định đã đánh giá.
   * **Thông tin chứng nhận:** Mã chứng nhận, Loại chứng nhận (VietGAP, GlobalGAP...), Cơ quan cấp, Ngày cấp, Ngày hết hạn.
   * **Ảnh chứng chỉ:** Tải ảnh scan giấy chứng nhận an toàn thực phẩm lên server.
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Kiểm định)"**:
   * MetaMask mở popup yêu cầu ký giao dịch `recordInspection(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`INSPECTED` (Đã kiểm định)**.

---

### BƯỚC 3: ĐƠN VỊ VẬN CHUYỂN (LOGISTICS) - GHI NHẬN HÀNH TRÌNH

1. Chuyển MetaMask sang **ví Logistics** (đã được Admin duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** (`/portal`). Hệ thống tự động hiển thị **Form Bảng 3**.
3. Tại ô **"Chọn Lô hàng"**, chọn lô đã hoàn tất kiểm định (ở trạng thái `INSPECTED`).
4. Điền thông tin vận chuyển & điều kiện bảo quản:
   * **Đơn vị vận chuyển:** Tên đơn vị, Thông tin liên hệ, Loại chủ thể (Cá nhân hoặc Tổ chức).
   * **Hành trình:** Mã vận chuyển, Điểm đi, Điểm đến, Thời gian khởi hành, Thời gian hoàn tất.
   * **Điều kiện bảo quản:** Nhiệt độ ghi nhận (°C), Độ ẩm ghi nhận (%), Ghi chú bảo quản.
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Vận chuyển)"**:
   * MetaMask mở popup yêu cầu ký giao dịch `recordLogistics(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`IN_TRANSIT` (Đang vận chuyển)**.

---

### BƯỚC 4: ĐƠN VỊ PHÂN PHỐI (DISTRIBUTOR) - TIẾP NHẬN HÀNG HÓA

1. Chuyển MetaMask sang **ví Distributor** (đã được Admin duyệt).
2. Vào mục **"Nhập liệu Chuỗi cung ứng"** (`/portal`). Hệ thống tự động hiển thị **Form Bảng 4**.
3. Tại ô **"Chọn Lô hàng"**, chọn lô đang trên đường vận chuyển (ở trạng thái `IN_TRANSIT`).
4. Điền thông tin tiếp nhận hàng hóa:
   * **Đơn vị phân phối:** Tên đơn vị phân phối (siêu thị, cửa hàng), Thông tin liên hệ, Loại chủ thể.
   * **Thông tin tiếp nhận:** Thời gian tiếp nhận, Số lượng thực nhận, Trọng lượng thực nhận (kg), Ghi chú tiếp nhận (tình trạng bao bì, quy cách).
5. Bấm **"Lưu & Ký Blockchain (Tiếp nhận Phân phối)"**:
   * MetaMask mở popup yêu cầu ký giao dịch `recordDistribution(...)`.
   * Giao dịch hoàn tất $\rightarrow$ Lô hàng chuyển sang trạng thái **`DELIVERED` (Đã tiếp nhận phân phối)**.

---

### BƯỚC 5: NGƯỜI MUA HÀNG (END USER) - QUÉT MÃ QR & TRA CỨU

1. **Không yêu cầu ví, không cần đăng nhập**:
   * Người mua dùng Camera điện thoại hoặc Zalo quét tem mã QR dán trên sản phẩm, hoặc truy cập trang chủ và nhập mã lô hàng.
2. **Xem tiến trình minh bạch**:
   * Giao diện hiển thị trực quan toàn bộ 4 giai đoạn từ lúc gieo giống, chăm bón, thu hoạch, kiểm định chất lượng, hành trình nhiệt độ vận chuyển đến điểm siêu thị phân phối.
3. **Đối soát mã băm tự động**:
   * Trình duyệt tự động đối chiếu mã băm dữ liệu với Smart Contract trên Polygon Amoy.
   * Hiển thị huy hiệu **Tích xanh: "Dữ liệu được xác thực toàn vẹn trên Blockchain Polygon"** kèm mã băm giao dịch (TxHash) có thể bấm vào để xem trực tiếp trên PolygonScan.
   * Cho phép tải file ảnh tem QR gốc để in tem nhãn.

---

### TÍNH NĂNG ĐĂNG XUẤT (DISCONNECT WALLET)
* Người dùng có thể bấm nút **"Đăng xuất"** (biểu tượng cạnh địa chỉ ví trên thanh Navbar) bất cứ lúc nào để kết thúc phiên làm việc.
* Sau khi đăng xuất, hệ thống sẽ ngắt kết nối an toàn và ngăn MetaMask tự động đăng nhập lại khi F5 trang.

---

## 💻 4. Hướng dẫn chạy thử nghiệm Local (Dành cho Lập trình viên)

```bash
# 1. Cài đặt các gói phụ thuộc
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install

# 2. Khởi động Backend (Port 4000)
cd backend
npm run start:dev

# 3. Khởi động Frontend (Port 3000)
cd frontend
npm run dev
```

* Truy cập Giao diện Web: `http://localhost:3000`
* Swagger API Documentation: `http://localhost:4000/api/docs`
* Endpoint Ping giữ server: `http://localhost:4000/ping`
