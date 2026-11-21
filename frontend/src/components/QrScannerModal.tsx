'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Camera, Upload, X, AlertCircle, Loader2 } from 'lucide-react';
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
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

  async function handleSuccess(decodedText: string) {
    await stopCamera();
    const batchId = extractBatchId(decodedText);
    handleCloseModal();
    if (onScanSuccess) {
      onScanSuccess(batchId);
    } else {
      router.push(`/trace/${batchId}`);
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        // ignore cleanup error
      }
      scannerRef.current = null;
    }
    const container = document.getElementById(readerId);
    if (container) {
      container.innerHTML = '';
    }
    setScanning(false);
  }

  async function startCamera() {
    setCameraError(null);
    setScanning(true);
    try {
      await stopCamera();

      // Kiểm tra container có tồn tại trong DOM không
      const container = document.getElementById(readerId);
      if (!container) return;
      container.innerHTML = '';

      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
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
      setCameraError(
        'Không thể truy cập camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc chuyển sang tab "Tải ảnh mã QR".'
      );
    }
  }

  // Chuyển tab an toàn và reset lỗi riêng biệt
  function switchTab(tab: 'camera' | 'file') {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'file') {
      stopCamera();
    } else {
      setFileError(null);
    }
  }

  // Quét từ file ảnh upload
  async function handleFileScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsProcessingFile(true);

    let html5QrCode: Html5Qrcode | null = null;
    try {
      html5QrCode = new Html5Qrcode('file-scanner-temp');
      // showImage = false để không can thiệp vẽ canvas vào DOM
      const decodedText = await html5QrCode.scanFile(file, false);
      await handleSuccess(decodedText);
    } catch (err: any) {
      console.warn('Lỗi giải mã ảnh QR:', err);
      setFileError('Không tìm thấy mã QR trong ảnh này. Vui lòng chọn ảnh khác rõ nét hơn.');
    } finally {
      if (html5QrCode) {
        try {
          await html5QrCode.clear();
        } catch (_) {}
      }
      const tempEl = document.getElementById('file-scanner-temp');
      if (tempEl) {
        tempEl.innerHTML = '';
      }
      // Reset input value để cho phép chọn lại cùng file hoặc file khác
      e.target.value = '';
      setIsProcessingFile(false);
    }
  }

  function handleCloseModal() {
    stopCamera();
    setCameraError(null);
    setFileError(null);
    onClose();
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" /> {title || 'Quét Mã QR'}
          </h2>
          <button
            onClick={handleCloseModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 text-xs font-semibold">
          <button
            onClick={() => switchTab('camera')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Dùng Camera
          </button>
          <button
            onClick={() => switchTab('file')}
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
          {/* Element ẩn cố định phục vụ quét ảnh file - không xung đột với container camera */}
          <div id="file-scanner-temp" className="hidden" aria-hidden="true" style={{ display: 'none' }} />

          {activeTab === 'camera' ? (
            <div key="camera-tab-view" className="space-y-3">
              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div
                id={readerId}
                className="w-full bg-black rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center"
              />
              <p className="text-center text-[11px] text-slate-500">
                Hướng camera vào mã QR trên bao bì sản phẩm nông sản
              </p>
            </div>
          ) : (
            <div key="file-tab-view" className="space-y-3">
              {fileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="text-center">
                <label
                  htmlFor="qr-file-input"
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition ${
                    isProcessingFile
                      ? 'border-emerald-300 bg-emerald-50/40 cursor-wait'
                      : 'border-slate-300 hover:border-emerald-500 cursor-pointer bg-slate-50 hover:bg-emerald-50/30'
                  }`}
                >
                  {isProcessingFile ? (
                    <>
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                      <span className="text-xs font-semibold text-emerald-700">Đang quét mã QR từ ảnh...</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Vui lòng chờ trong giây lát</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-semibold text-slate-700">Bấm để chọn ảnh chứa mã QR</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ ảnh JPG, PNG, WebP</span>
                    </>
                  )}
                </label>
                <input
                  id="qr-file-input"
                  type="file"
                  accept="image/*"
                  disabled={isProcessingFile}
                  onChange={handleFileScan}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
