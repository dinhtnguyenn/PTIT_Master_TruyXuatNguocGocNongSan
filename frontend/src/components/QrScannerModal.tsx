'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (batchId: string) => void;
  title?: string;
}

export default function QrScannerModal({ isOpen, onClose, onScanSuccess, title }: QrScannerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'qr-reader-container';

  function extractBatchId(scannedText: string): string {
    const text = scannedText.trim();
    // Nếu là URL dạng .../trace/BATCH-...
    if (text.includes('/trace/')) {
      const parts = text.split('/trace/');
      if (parts[1]) {
        return parts[1].split('?')[0].split('#')[0].trim();
      }
    }
    // Nếu là chuỗi text thuần
    return text;
  }

  function handleSuccess(decodedText: string) {
    stopCamera();
    const batchId = extractBatchId(decodedText);
    onClose();
    if (onScanSuccess) {
      onScanSuccess(batchId);
    } else {
      router.push(`/trace/${batchId}`);
    }
  }

  async function startCamera() {
    setErrorMsg(null);
    setScanning(true);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Lỗi quét từng frame thì bỏ qua
        }
      );
    } catch (err: any) {
      console.warn('Lỗi mở camera:', err);
      setScanning(false);
      setErrorMsg(
        'Không thể truy cập camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc chuyển sang tab "Tải ảnh mã QR".'
      );
    }
  }

  async function stopCamera() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {}
    }
    setScanning(false);
  }

  // Quét từ file ảnh upload
  async function handleFileScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleSuccess(decodedText);
    } catch (err: any) {
      setErrorMsg('Không tìm thấy mã QR hợp lệ trong hình ảnh này. Vui lòng thử lại với ảnh rõ nét hơn.');
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" /> {title || 'Quét Tem Mã QR'}
          </h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Dùng Camera
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Tải ảnh mã QR
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div className="space-y-3">
              <div
                id={readerId}
                className="w-full bg-black rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center"
              />
              <p className="text-center text-[11px] text-slate-500">
                Hướng camera vào tem QR trên bao bì sản phẩm nông sản
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4 text-center">
              <div id="file-scanner-temp" className="hidden" />
              <label
                htmlFor="qr-file-input"
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition"
              >
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Bấm để chọn ảnh chứa mã QR</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ ảnh JPG, PNG, WebP</span>
              </label>
              <input
                id="qr-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
