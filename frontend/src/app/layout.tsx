import './globals.css';
import Navbar from '../components/Navbar';
import { ToastProvider } from '../components/ToastProvider';

export const metadata = {
  title: 'AgriTrace - Hệ Thống Truy Xuất Nguồn Gốc Nông Sản',
  description: 'Truy xuất nguồn gốc chuỗi cung ứng nông sản trên nền tảng Blockchain Polygon',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <ToastProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            <div className="max-w-6xl mx-auto px-4">
              <p>© {new Date().getFullYear()} Hệ Thống Truy Xuất Nguồn Gốc Nông Sản Chuỗi Cung Ứng</p>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
