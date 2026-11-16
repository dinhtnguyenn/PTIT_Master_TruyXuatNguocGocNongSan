import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  QrCode,
  Sprout,
  CheckCircle,
  Truck,
  Store,
  ArrowRight,
  Database,
  Lock,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const supplyChainSteps = [
    {
      icon: Sprout,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      step: 'Bước 1',
      title: 'Sản Xuất (Producer)',
      desc: 'Khởi tạo mã lô, ghi nhận nguồn giống, quá trình canh tác, vật tư nông nghiệp và thời điểm thu hoạch.',
    },
    {
      icon: CheckCircle,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      step: 'Bước 2',
      title: 'Kiểm Định (Inspector)',
      desc: 'Tiến hành lấy mẫu, kiểm tra chỉ tiêu an toàn và cấp giấy chứng nhận chất lượng (VietGAP, GlobalGAP...).',
    },
    {
      icon: Truck,
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      step: 'Bước 3',
      title: 'Vận Chuyển (Logistics)',
      desc: 'Ghi nhận lộ trình di chuyển từ vườn đến kho, giám sát nhiệt độ và độ ẩm bảo quản lạnh xuyên suốt.',
    },
    {
      icon: Store,
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      step: 'Bước 4',
      title: 'Phân Phối (Distributor)',
      desc: 'Tiếp nhận nông sản, kiểm tra số lượng và trọng lượng thực tế trước khi xuất ra quầy kệ siêu thị.',
    },
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Đề tài Thạc sĩ: Ứng dụng Blockchain trong Chuỗi Cung Ứng Nông Sản
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Minh Bạch Nguồn Gốc Nông Sản Bằng <span className="text-brand-600">Smart Contract</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Mỗi đơn vị tham gia đăng ký một ví điện tử riêng để ký dữ liệu chính chủ. Dữ liệu được băm SHA-256 và lưu đối soát trên Blockchain Polygon, giúp người mua quét QR là thấy ngay toàn bộ hành trình nông sản tin cậy.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/trace"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-2xl shadow-sm transition"
          >
            <QrCode className="w-4 h-4" /> Tra Cứu Nông Sản Ngay
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm rounded-2xl transition"
          >
            Cổng Chuỗi Cung Ứng (Theo Ví) <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-2xl transition"
          >
            Đăng Ký Ví Mới
          </Link>
        </div>
      </section>

      {/* 4 Steps Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">4 Giai Đoạn Chuỗi Cung Ứng Chuẩn Hóa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Dữ liệu mỗi bước được ký số bởi ví chính chủ và lưu băm trên Smart Contract
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {supplyChainSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl border ${step.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">{step.step}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Kiến trúc kỹ thuật nổi bật */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-wider block mb-2">
              Kiến trúc Lưu trữ Lai (Hybrid Architecture)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 leading-tight">
              An Toàn Tuyệt Đối: Kết Hợp CSDL Tốc Độ Cao & Bằng Chứng Bất Biến
            </h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-white">Database (PostgreSQL / SQLite):</strong> Lưu trữ trực tiếp toàn bộ dữ liệu form chi tiết và đường dẫn ảnh trên Server riêng, cho tốc độ tải trang chỉ trong vài mili-giây.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-white">Smart Contract (Polygon EVM):</strong> Lưu mã băm SHA-256 (`dataHash`), địa chỉ ví người ký và mốc thời gian khối. Bất kỳ ai lén sửa dữ liệu trong CSDL sẽ bị phát hiện ngay khi đối soát mã băm.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
