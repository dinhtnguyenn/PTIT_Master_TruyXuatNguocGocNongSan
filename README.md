# HỆ THỐNG TRUY XUẤT NGUỒN GỐC NÔNG SẢN TRÊN NỀN TẢNG BLOCKCHAIN (AGRITRACE)
**Hệ Thống Quản Lý & Minh Bạch Hóa Chuỗi Cung Ứng Nông Sản Dựa Trên Hợp Đồng Thông Minh Polygon & Kiến Trúc Lưu Trữ Lai**

---

## 📌 1. Giới thiệu Tổng quan & Giá trị Cốt lõi

Hệ thống **AgriTrace** là giải pháp số hóa toàn diện quy trình quản lý, giám sát và truy xuất nguồn gốc nông sản theo chuỗi cung ứng khép kín từ nông trại đến bàn ăn. Hệ thống ứng dụng công nghệ **Blockchain (Polygon Amoy Testnet)** kết hợp kiến trúc **Lưu trữ Lai (Hybrid On-chain / Off-chain)** nhằm đạt được ba mục tiêu chiến lược:

1. **Tính Bất biến & Chống Gian lận (Data Integrity)**: Các mốc sự kiện quan trọng trong chuỗi cung ứng được băm chuẩn tắc (SHA-256) và ghi nhận trực tiếp vào Smart Contract. Dữ liệu khi đã lên chuỗi không thể bị chỉnh sửa hay làm giả bởi bất kỳ bên nào.
2. **Minh bạch Phân quyền (Decentralized RBAC)**: Mỗi chủ thể tham gia (Sản xuất, Kiểm định, Vận chuyển, Phân phối) sở hữu một địa chỉ ví Web3 (MetaMask) độc lập, được Quản trị viên cấp quyền chính thức trên Smart Contract (`grantRole`).
3. **Hiệu năng Cao & Tối ưu Chi phí (Cost & Performance Optimization)**:
   - **Database Off-chain (PostgreSQL 16)**: Lưu trữ đầy đủ chi tiết nghiệp vụ biểu mẫu (thông tin giống cây trồng, nhật ký canh tác, số hiệu chứng chỉ an toàn, điều kiện nhiệt độ xe lạnh, ảnh nông sản...).
   - **Smart Contract On-chain**: Chỉ lưu các mốc bằng chứng cốt lõi (`batchId`, `stage`, `dataHash`, `signer`, `timestamp`), giúp giảm thiểu tối đa phí gas giao dịch.
   - **Cơ chế Đối soát Bất biến 1:1**: Khi người tiêu dùng quét Mã QR, ứng dụng tự động lấy dữ liệu từ cơ sở dữ liệu, băm lại theo thuật toán chuẩn và gọi RPC Smart Contract để đối chiếu 1:1, hiển thị chứng nhận tích xanh tức thì.

---

## 🌐 2. Thông tin Triển khai Thực tế (Production Live Deployment)

Hệ thống hiện đang vận hành ổn định trên máy chủ VPS độc lập với chứng chỉ bảo mật SSL tự động:

| Thành phần | Công nghệ / Nền tảng | Địa chỉ / URL Truy cập |
| :--- | :--- | :--- |
| **Tên miền Chính thức (HTTPS)** | Let's Encrypt SSL | [https://voting.io.vn/](https://voting.io.vn/) |
| **Địa chỉ IP VPS** | Ubuntu Linux Server | `180.93.136.201` (Port 80/443) |
| **Giao diện Người dùng (Frontend)** | Next.js 14 Standalone | [https://voting.io.vn/](https://voting.io.vn/) |
| **Cổng Nhập liệu Chuỗi Cung ứng** | Supply Chain Portal | [https://voting.io.vn/portal](https://voting.io.vn/portal) |
| **Trang Đăng ký Vai trò** | Wallet Onboarding & Testing | [https://voting.io.vn/register](https://voting.io.vn/register) |
| **Trang Tra cứu Nguồn gốc** | Public Traceability | [https://voting.io.vn/trace](https://voting.io.vn/trace) |
| **Trang Quản trị Hệ thống** | Admin Dashboard | [https://voting.io.vn/admin](https://voting.io.vn/admin) |
| **Quản trị Toàn diện Cơ sở Dữ liệu** | Superadmin Dashboard | [https://voting.io.vn/superadmin](https://voting.io.vn/superadmin) |
| **Backend API Engine** | NestJS Production | `https://voting.io.vn/api` |
| **Tài liệu API Swagger** | OpenAPI Specification | `https://voting.io.vn/api/docs` |
| **Kiểm tra Trạng thái (Healthcheck)** | Keep-alive Ping Endpoint | [https://voting.io.vn/ping](https://voting.io.vn/ping) |
| **Smart Contract** | Solidity 0.8.24 (`SupplyChainProof`) | `0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6` |
| **Mạng Blockchain** | Polygon Amoy Testnet | Chain ID: `80002` |
| **Khám phá Khối (Block Explorer)** | PolygonScan Amoy | [Xem Hợp đồng Trên PolygonScan](https://amoy.polygonscan.com/address/0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6) |
| **RPC Endpoint** | Polygon Amoy RPC | `https://polygon-amoy-bor-rpc.publicnode.com` |

---

## 🏗️ 3. Kiến Trúc Hạ Tầng & Quy trình CI/CD

Toàn bộ giải pháp được container hóa bằng **Docker Compose** và vận hành thông qua cụm Nginx Reverse Proxy:

```
[Internet User / Web Browser / Mobile Camera]
                       │
                       ▼ (HTTPS / Port 443)
┌─────────────────────────────────────────────────────────────┐
│                       agritrace-nginx                       │
│             (Nginx Alpine Reverse Proxy + SSL)              │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Proxy Pass /)               │ (Proxy Pass /api & /uploads)
               ▼                              ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│     agritrace-frontend      │ │      agritrace-backend      │
│  (Next.js 14 Standalone)    │ │     (NestJS API Server)     │
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │ (Prisma ORM)
                                               ▼
                                ┌─────────────────────────────┐
                                │        agritrace-db         │
                                │   (PostgreSQL 16 Alpine)    │
                                └─────────────────────────────┘
```

* **CI/CD Tự Động (GitHub Actions)**:
  * Khi cập nhật code trên nhánh `main`, quy trình [.github/workflows/deploy.yml](.github/workflows/deploy.yml) tự động kích hoạt.
  * Tự động kết nối SSH vào VPS qua khóa mã hóa, cập nhật mã nguồn và thực hiện build lại container.
  * Hỗ trợ triển khai **Zero-Downtime**: Ứng dụng luôn sẵn sàng phục vụ, không làm gián đoạn người dùng khi cập nhật phiên bản mới.

---

## 👥 4. Mô Hình Phân Quyền & Quản Lý Tài Khoản (RBAC)

Hệ thống thiết lập phân định rõ ràng giữa các chủ thể chuỗi cung ứng và cấp độ quản trị:

### 4.1. Bốn Vai trò Chuỗi Cung ứng (Supply Chain Roles)
1. **Đơn vị Sản xuất (`PRODUCER`)**: Khởi tạo lô nông sản, ghi nhận thông tin canh tác, giống, vật tư, ngày thu hoạch, ảnh chụp sản phẩm và sinh Mã QR.
2. **Đơn vị Kiểm định (`INSPECTOR`)**: Quét Mã QR lô hàng để tiếp nhận, đánh giá chất lượng (dư lượng thuốc BVTV, vi sinh), nhập số hiệu giấy chứng nhận an toàn thực phẩm thực tế và ảnh scan chứng chỉ.
3. **Đơn vị Vận chuyển (`LOGISTICS`)**: Quét Mã QR lô hàng để nhận kiện, ghi nhận nhật trình vận chuyển (điểm đi, điểm đến, thời gian) và điều kiện bảo quản xe lạnh (nhiệt độ, độ ẩm).
4. **Đơn vị Phân phối (`DISTRIBUTOR`)**: Quét Mã QR để tiếp nhận hàng tại quầy kệ siêu thị/điểm bán lẻ, xác nhận số lượng/trọng lượng thực nhận, hoàn tất vòng đời chuỗi cung ứng.

### 4.2. Hai Cấp độ Quản trị (Administration)
1. **Quản trị Hệ thống (`/admin`)**:
   - Dành cho ví Admin duyệt danh sách hồ sơ người dùng chờ cấp quyền (`PENDING` $\rightarrow$ `APPROVED`).
   - Tự động gọi hàm `grantRole` trên Smart Contract Polygon Amoy để cấp quyền on-chain chính thức.
2. **Quản trị Toàn diện Cơ sở Dữ liệu (`/superadmin`)**:
   - Đăng nhập an toàn bằng Secret Key quản trị hoặc kết nối trực tiếp ví Admin.
   - Thống kê thời gian thực toàn bộ người dùng, lô hàng và cấu hình động.
   - Hỗ trợ thao tác CRUD dữ liệu toàn diện (chỉnh sửa trực tiếp thông tin lô hàng, trạng thái, người dùng).
   - Quản lý tham số cấu hình động (`SystemConfig`): cập nhật địa chỉ hợp đồng, URL RPC, Explorer...
   - Tính năng **Xóa / Làm sạch CSDL (Clean Database)** nhanh chóng phục vụ kiểm thử hệ thống.

### 4.3. Cơ chế Ví Admin Gán Cứng (Hardcoded Admin Wallets)
Hệ thống thiết lập sẵn 2 địa chỉ ví Quản trị viên tối cao:
* `0xd308d759F0986aADe715d8B2bf18d58c1680b9CC`
* `0x33F34938981588Df03c8eB291C6abe75612eA49a`

**Đặc quyền của ví Admin:**
- Tự động kích hoạt trạng thái `APPROVED` vĩnh viễn, không bao giờ rơi vào danh sách chờ duyệt.
- Tuyệt đối không lưu các trường dữ liệu cá nhân (`phoneNumber`, `email`) trong cơ sở dữ liệu.
- Được định danh trực quan trên Navbar với huy hiệu tím kèm biểu tượng khiên bảo mật (`ShieldCheck`).
- Khi truy cập trang **Đăng ký Vai trò (`/register`)**, giao diện tự động chuyển sang chế độ **"Thiết Lập Vai Trò Thử Nghiệm"**, cho phép Admin lựa chọn và đồng bộ tức thì vai trò muốn test (Sản xuất, Kiểm định, Vận chuyển, Phân phối) trực tiếp lên Blockchain mà không cần gửi hồ sơ.

---

## 🔄 5. Hướng Dẫn Quy Trình Vận Hành 5 Bước Chuẩn

Chuỗi cung ứng vận hành theo thứ tự tuyến tính nghiêm ngặt:
$$\text{Khởi tạo (Producer)} \longrightarrow \text{Kiểm định (Inspector)} \longrightarrow \text{Vận chuyển (Logistics)} \longrightarrow \text{Phân phối (Distributor)} \longrightarrow \text{Tra cứu (End User)}$$

---

### BƯỚC 0: ĐĂNG KÝ VÍ & PHÊ DUYỆT (ONBOARDING)

#### Đối với đơn vị thành viên mới:
1. Cài đặt tiện ích **MetaMask** trên trình duyệt, kết nối mạng **Polygon Amoy Testnet** (Chain ID: `80002`).
2. Truy cập [https://voting.io.vn/register](https://voting.io.vn/register) và bấm **"Kết nối MetaMask"**.
3. Chọn vai trò đăng ký (`Đơn vị Sản xuất`, `Đơn vị Kiểm định`, `Đơn vị Vận chuyển`, hoặc `Đơn vị Phân phối`).
4. Nhập Số điện thoại và Email liên hệ $\rightarrow$ Nhấn **"Gửi Hồ Sơ Đăng Ký"**.
5. Hồ sơ sẽ ở trạng thái **Chờ duyệt (`PENDING`)**.

#### Đối với Quản trị viên:
1. Đăng nhập bằng ví Admin, truy cập [https://voting.io.vn/admin](https://voting.io.vn/admin).
2. Tại danh sách hồ sơ chờ duyệt, bấm nút **"Duyệt"**.
3. MetaMask hiển thị xác nhận giao dịch cấp quyền on-chain `grantRole` với mức phí gas tối ưu (`maxPriorityFeePerGas: 30 Gwei`).
4. Giao dịch thành công $\rightarrow$ Ví người dùng được chuyển trạng thái sang **Đã duyệt (`APPROVED`)** và có thể đăng nhập nhập liệu ngay.

---

### BƯỚC 1: ĐƠN VỊ SẢN XUẤT - KHỞI TẠO LÔ NÔNG SẢN

1. Kết nối ví Producer đã duyệt tại [https://voting.io.vn/portal](https://voting.io.vn/portal).
2. Hệ thống tự động mở biểu mẫu **"Thông tin cung cấp bởi Đơn vị Sản xuất"**.
3. Điền thông tin lô hàng:
   - **Thông tin định danh:** Mã lô (tự động gợi ý `BATCH-YYYY-XXXX`), Tên sản phẩm, Loại nông sản, Số lượng, Trọng lượng (kg).
   - **Thông tin canh tác:** Nguồn gốc giống, Vật tư nông nghiệp (phân bón, thuốc sinh học), Địa điểm sản xuất, Ngày gieo trồng, Ngày thu hoạch.
   - **Hình ảnh:** Tải ảnh chụp thực tế nông sản lên hệ thống.
4. Bấm **"Lưu & Ký Blockchain (Khởi tạo Lô hàng)"**:
   - Hệ thống tính mã băm SHA-256 dữ liệu và kích hoạt popup MetaMask để ký giao dịch `recordProduction`.
   - Sau khi giao dịch được xác nhận trên Polygon, lô hàng chuyển sang giai đoạn **`1. Đã sản xuất`**.
   - Hộp thoại hiển thị **Mã QR** hiện ra: Hỗ trợ người dùng xem trước, bấm **"Tải ảnh Mã QR về máy"** (file `ma-qr-[batchId].png`) hoặc bấm **"Sao chép Mã Lô"**.

---

### BƯỚC 2: ĐƠN VỊ KIỂM ĐỊNH - ĐÁNH GIÁ CHẤT LƯỢNG

1. Kết nối ví Inspector tại [https://voting.io.vn/portal](https://voting.io.vn/portal).
2. Bấm nút **"Quét mã QR"** (mở Camera trực tiếp hoặc tải file ảnh chứa Mã QR lô hàng).
3. Hệ thống tự động kiểm tra trên Blockchain:
   - Nếu lô hàng hợp lệ và đang ở giai đoạn `1. Đã sản xuất`, hệ thống xác nhận và mở khóa biểu mẫu **"Thông tin cung cấp bởi Đơn vị Kiểm định"**.
   - Nếu lô hàng chưa sản xuất hoặc đã kiểm định trước đó, hệ thống sẽ chặn và hiển thị sơ đồ quy trình trực quan (các khâu đã xong được tô xám, khâu cần làm hiện tại được tô xanh).
4. Điền thông tin kiểm định:
   - Kết quả kiểm định, Chỉ tiêu đánh giá (dư lượng thuốc BVTV, kim loại nặng, vi sinh...).
   - **Mã chứng nhận:** Nhập trực tiếp số hiệu trên giấy chứng nhận thực tế (ví dụ: `CERT-2026-089`, `VG-HN-12345`).
   - Loại chứng nhận (VietGAP, GlobalGAP, Hữu cơ...), Cơ quan cấp, Ngày cấp, Ngày hết hạn.
   - Tải file ảnh scan giấy chứng nhận an toàn thực phẩm.
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Kiểm định)"** $\rightarrow$ Ký giao dịch `recordInspection` $\rightarrow$ Lô hàng chuyển sang giai đoạn **`2. Đã kiểm định`**.

---

### BƯỚC 3: ĐƠN VỊ VẬN CHUYỂN - GHI NHẬN HÀNH TRÌNH BẢO QUẢN

1. Kết nối ví Logistics tại [https://voting.io.vn/portal](https://voting.io.vn/portal).
2. Bấm **"Quét mã QR"** của lô hàng cần tiếp nhận vận chuyển.
3. Hệ thống đối soát trên Blockchain: Lô hàng bắt buộc phải hoàn thành kiểm định (`2. Đã kiểm định`) thì mới mở khóa biểu mẫu **"Thông tin cung cấp bởi Đơn vị Vận chuyển"**.
4. Điền thông tin logistics:
   - Tên đơn vị vận chuyển, Thông tin liên hệ, Loại hình vận chuyển.
   - Mã vận đơn, Điểm xuất phát (Điểm đi), Điểm giao nhận (Điểm đến).
   - Thời gian khởi hành, Thời gian hoàn tất dự kiến.
   - **Điều kiện bảo quản:** Nhiệt độ thùng xe lạnh (°C), Độ ẩm không khí (%).
5. Bấm **"Lưu & Ký Blockchain (Xác nhận Vận chuyển)"** $\rightarrow$ Ký giao dịch `recordLogistics` $\rightarrow$ Lô hàng chuyển sang giai đoạn **`3. Đang vận chuyển`**.

---

### BƯỚC 4: ĐƠN VỊ PHÂN PHỐI - TIẾP NHẬN HÀNG HÓA TẠI ĐIỂM BÁN

1. Kết nối ví Distributor tại [https://voting.io.vn/portal](https://voting.io.vn/portal).
2. Bấm **"Quét mã QR"** của kiện hàng khi hàng về đến kho / siêu thị.
3. Hệ thống đối soát trên Blockchain: Đảm bảo lô hàng đã qua khâu vận chuyển (`3. Đang vận chuyển`) trước khi mở biểu mẫu **"Thông tin cung cấp bởi Đơn vị Phân phối"**.
4. Điền thông tin tiếp nhận:
   - Tên đơn vị phân phối / Siêu thị, Thông tin liên hệ, Địa chỉ phân phối.
   - Thời gian tiếp nhận thực tế, Số lượng thực nhận, Trọng lượng thực nhận (kg).
   - Đánh giá chất lượng bao bì khi nhận hàng.
5. Bấm **"Lưu & Ký Blockchain (Tiếp nhận Phân phối)"** $\rightarrow$ Ký giao dịch `recordDistribution` $\rightarrow$ Lô hàng chuyển sang giai đoạn **`4. Đã phân phối`** (kết thúc trọn vẹn chuỗi cung ứng).

---

### BƯỚC 5: NGƯỜI TIÊU DÙNG - QUÉT MÃ QR & TRA CỨU BẤT BIẾN

1. **Không yêu cầu ví Web3, không cần đăng nhập tài khoản**:
   - Người tiêu dùng chỉ cần dùng camera điện thoại quét Mã QR trên bao bì sản phẩm hoặc truy cập trực tiếp [https://voting.io.vn/trace](https://voting.io.vn/trace) và nhập mã lô hàng.
2. **Hiển thị Toàn bộ Lịch sử Chuỗi Cung ứng**:
   - Chi tiết nguồn gốc xuất xứ, giống cây, địa điểm trồng trọt.
   - Giấy chứng nhận an toàn thực phẩm, ảnh scan kết quả kiểm định.
   - Toàn bộ hành trình xe lạnh, biểu đồ nhiệt độ bảo quản trong suốt quá trình di chuyển.
   - Thời gian và địa điểm bày bán tại siêu thị.
3. **Đối chiếu Tính Toàn Vẹn Tự Động (Tamper-proof Verification)**:
   - Trình duyệt tự động lấy dữ liệu từ cơ sở dữ liệu, tính toán mã băm SHA-256 theo đúng thứ tự chuẩn tắc, sau đó gửi yêu cầu truy vấn trực tiếp đến Smart Contract trên Polygon Amoy.
   - Nếu mã băm khớp 100%: Hiển thị chứng nhận tích xanh **"Dữ liệu được xác thực toàn vẹn trên Blockchain Polygon"** kèm liên kết trực tiếp đến mã giao dịch trên PolygonScan.
   - Nếu dữ liệu bị can thiệp sai lệch: Hệ thống lập tức cảnh báo phát hiện dữ liệu không đồng nhất.

---

## 🎨 6. Điểm Nổi Bật Về Giao Diện & Trải Nghiệm Người Dùng (UX/UI Highlights)

* **Chuẩn hóa Thuật ngữ Thân thiện:**
  - Đồng bộ sử dụng cụm từ chuẩn **"Mã QR"** trên toàn bộ hệ thống giao diện, bỏ các từ ghép gây nhầm lẫn.
  - Thay thế cách gọi "Bảng 1, Bảng 2, Bảng 3, Bảng 4" bằng các tiêu đề nghiệp vụ rõ ràng: *"Thông tin cung cấp bởi Đơn vị Sản xuất/Kiểm định/Vận chuyển/Phân phối"*.
  - Nhãn giai đoạn súc tích, lược bỏ hậu tố tiếng Anh không cần thiết: `1. Đã sản xuất`, `2. Đã kiểm định`, `3. Đang vận chuyển`, `4. Đã phân phối`.
* **Thanh Tiến Trình Trực Quan Thông Minh (Visual Process Flow):**
  - Khi quét mã lô hàng chưa đến lượt, hệ thống hiển thị thanh sơ đồ quy trình trực quan:
    - **Màu xám:** Các giai đoạn đã hoàn thành trên Blockchain.
    - **Màu xanh:** Nổi bật rõ giai đoạn cần làm tiếp theo hiện tại.
    - **Màu trắng:** Các khâu tiếp theo chưa tới lượt.
* **Hệ thống Modal Độc Lập Chuẩn React Portal:**
  - Tất cả các hộp thoại (Mã QR lô hàng, Camera Quét QR, Hộp thoại xác nhận, Quản trị) sử dụng `createPortal` mount trực tiếp vào `document.body`.
  - Thiết lập thuộc tính `!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999]`, cam kết lớp phủ mờ (backdrop overlay) phủ kín 100% viewport, không bị khoảng hở mép trên.
  - Tự động khóa cuộn trang (`body overflow: hidden`) khi mở modal, chống xê dịch giao diện.
* **Định danh Ví & Quản trị Tinh tế:**
  - Thanh Navbar hiển thị riêng biệt nhãn vai trò được duyệt và hộp địa chỉ ví.
  - Ví Admin có viền tím nổi bật kèm biểu tượng khiên bảo mật, phân biệt rõ ràng với ví thành viên thông thường.
* **Hệ thống Font Chữ & Thiết Kế Hiện Đại:**
  - Bộ font tiếng Việt chuẩn: `Be Vietnam Pro` cho tiêu đề và nội dung chính, kết hợp `JetBrains Mono` cho các mã băm, địa chỉ ví, mã lô hàng.

---

## 💻 7. Hướng Dẫn Cài Đặt & Chạy Thử Nghiệm

### 7.1. Chạy Toàn bộ Hệ thống bằng Docker Compose (Khuyên dùng)

```bash
# 1. Clone mã nguồn dự án
git clone https://github.com/dinhtnguyenn/PTIT_Master_TruyXuatNguocGocNongSan.git
cd PTIT_Master_TruyXuatNguocGocNongSan

# 2. Khởi chạy toàn bộ hệ thống (PostgreSQL, Backend, Frontend, Nginx)
docker compose up --build -d

# 3. Kiểm tra trạng thái các container
docker compose ps
```

* **Frontend Web:** `http://localhost:3000` (hoặc cổng cấu hình Nginx `http://localhost`)
* **Backend API:** `http://localhost:4000/api`
* **Swagger API Docs:** `http://localhost:4000/api/docs`

---

### 7.2. Chạy Thủ công Từng Thành phần (Development Mode)

#### Yêu cầu môi trường:
* Node.js $\ge$ 18.x
* PostgreSQL 16
* Trình duyệt hỗ trợ tiện ích MetaMask

#### Bước 1: Khởi động Cơ sở Dữ liệu & Backend
```bash
cd backend
npm install

# Thiết lập file cấu hình môi trường (.env)
cp .env.example .env

# Chạy migrate Prisma schema
npx prisma db push

# Chạy server Backend ở chế độ phát triển
npm run start:dev
```

#### Bước 2: Khởi động Frontend
```bash
cd ../frontend
npm install

# Thiết lập file cấu hình môi trường (.env.local)
cp .env.example .env.local

# Chạy máy chủ Next.js dev server
npm run dev
```

#### Bước 3: Biên dịch Smart Contract (Nếu muốn redeploy)
```bash
cd ../contracts
npm install

# Biên dịch hợp đồng thông minh
npx hardhat compile

# Deploy lên mạng Polygon Amoy Testnet
npx hardhat run scripts/deploy.js --network amoy
```

---

## 📂 8. Cấu Trúc Thư Mục Dự Án

```
PTIT_Master_TruyXuatNguocGocNongSan/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD tự động deploy lên VPS qua GitHub Actions
├── backend/                      # Mã nguồn NestJS RESTful API
│   ├── src/
│   │   ├── accounts/             # Quản lý tài khoản ví, xét duyệt hồ sơ & RBAC
│   │   ├── batches/              # Quản lý lô nông sản, băm dữ liệu & đối soát on-chain
│   │   ├── config/               # Cấu hình tham số hệ thống động (SystemConfig)
│   │   ├── superadmin/           # Dashboard toàn diện & dọn dẹp cơ sở dữ liệu
│   │   ├── prisma/               # Schema định nghĩa CSDL PostgreSQL
│   │   └── main.ts               # Điểm khởi chạy NestJS engine
│   └── Dockerfile
├── frontend/                     # Mã nguồn Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Trang chủ giới thiệu & cổng tra cứu nhanh
│   │   │   ├── portal/           # Cổng nhập liệu chuỗi cung ứng (4 vai trò)
│   │   │   ├── trace/            # Tra cứu nguồn gốc & đối soát tính toàn vẹn 1:1
│   │   │   ├── register/         # Đăng ký hồ sơ & Chế độ đổi vai trò test của Admin
│   │   │   ├── admin/            # Quản trị viên phê duyệt hồ sơ & cấp quyền on-chain
│   │   │   └── superadmin/       # Quản trị cơ sở dữ liệu toàn diện
│   │   ├── components/           # Navbar, QrScannerModal, ToastProvider...
│   │   └── lib/                  # Web3 helper, Ethers v6, Contract ABI & cấu hình
│   └── Dockerfile
├── contracts/                    # Mã nguồn Smart Contract & Script Hardhat
│   ├── contracts/
│   │   └── SupplyChainProof.sol  # Smart Contract lõi lưu trữ bằng chứng bất biến
│   ├── scripts/
│   │   └── deploy.js             # Script deploy tự động lên mạng Polygon Amoy
│   └── hardhat.config.js
├── nginx/
│   └── nginx.conf                # Cấu hình Nginx Reverse Proxy, SSL & Routing
├── docker-compose.yml            # Cấu hình triển khai toàn bộ ứng dụng
└── README.md                     # Tài liệu hướng dẫn toàn diện của dự án
```

---

## 📄 9. Thông Tin Học Thuật & Bản Quyền

* **Đề tài:** Ứng dụng Công nghệ Blockchain trong Quản lý & Truy xuất Nguồn gốc Chuỗi Cung ứng Nông sản.
* **Đơn vị:** Học viện Công nghệ Bưu chính Viễn thông (PTIT).
* **Bản quyền:** Dự án phục vụ mục đích nghiên cứu học thuật và thực tiễn, phân phối theo giấy phép mã nguồn mở MIT.
