import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'PTIT AgriTrace - Truy xuất Nguồn gốc Nông sản trên Blockchain',
  description: 'Hệ thống web tương tác Smart Contract Polygon phục vụ truy xuất nguồn gốc nông sản',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-600">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-medium text-slate-700">Đề tài Thạc sĩ: Ứng dụng Blockchain trong Truy xuất Nguồn gốc Nông sản</p>
            <p className="mt-1 text-slate-600">Học viện Công nghệ Bưu chính Viễn thông (PTIT) • Smart Contract trên Polygon EVM</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
