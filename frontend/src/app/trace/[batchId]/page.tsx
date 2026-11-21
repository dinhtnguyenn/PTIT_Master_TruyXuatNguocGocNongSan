'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Download,
  AlertTriangle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  X,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  API_BASE_URL,
  STAGE_LABELS,
  getDynamicExplorerUrl,
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '../../../lib/constants';
import { getContract, truncateAddress } from '../../../lib/web3';
import CopyableAddress from '../../../components/CopyableAddress';

function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const host = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function TraceDetailPage() {
  const params = useParams();
  const batchId = params?.batchId as string;

  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [explorerUrl, setExplorerUrl] = useState<string>('https://amoy.polygonscan.com');
  const [mounted, setMounted] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openZoom(url: string, title: string) {
    setZoomImage({ url, title });
    setScale(1);
  }

  function closeZoom() {
    setZoomImage(null);
    setScale(1);
  }

  // Lắng nghe phím ESC & phím +/- để phóng to / thu nhỏ
  useEffect(() => {
    if (!zoomImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(Number((s + 0.25).toFixed(2)), 3));
      if (e.key === '-') setScale((s) => Math.max(Number((s - 0.25).toFixed(2)), 0.5));
    };

    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [zoomImage]);

  useEffect(() => {
    getDynamicExplorerUrl().then((url) => {
      if (url) setExplorerUrl(url.replace(/\/+$/, ''));
    });
  }, []);

  useEffect(() => {
    if (!batchId) return;

    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/batches/${batchId}`);
        if (!res.ok) throw new Error('Không tìm thấy thông tin');
        const data = await res.json();
        setBatch(data);

        // Sinh mã QR
        const currentUrl =
          typeof window !== 'undefined' && window.location.href
            ? window.location.href
            : `/trace/${batchId}`;
        const qrUrl = await QRCode.toDataURL(currentUrl, { width: 200, margin: 1 });
        setQrDataUrl(qrUrl);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [batchId]);

  if (loading) {
    return <div className="text-center py-20 text-xs text-slate-400">Đang tải thông tin nguồn gốc...</div>;
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h1 className="text-base font-bold text-slate-800">Không tìm thấy lô hàng</h1>
        <p className="text-xs text-slate-500 mt-1">Mã lô hàng {batchId} không tồn tại trên hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Product Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
              {batch.batchId}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                STAGE_LABELS[batch.stage]?.color || 'bg-slate-100 text-slate-700'
              }`}
            >
              {STAGE_LABELS[batch.stage]?.label || batch.stage}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{batch.productName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Loại: {batch.category || '—'} • Cập nhật: {formatDateTime(batch.updatedAt || batch.createdAt || batch.harvestDate)}
          </p>
        </div>

        {qrDataUrl && (
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => openZoom(qrDataUrl, `Mã QR sản phẩm - ${batch.batchId}`)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 hover:border-emerald-500 cursor-zoom-in transition shrink-0"
              title="Bấm để phóng to mã QR"
            >
              <img src={qrDataUrl} alt="Mã QR" className="w-14 h-14 rounded-lg transition duration-200 group-hover:scale-105" />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 flex items-center justify-center transition-colors">
                <ZoomIn className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase">Mã QR Sản Phẩm</p>
              <a
                href={qrDataUrl}
                download={`QR-${batch.batchId}.png`}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold mt-1"
              >
                <Download className="w-3 h-3" /> Tải về
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 4 DATA TABLES ACCORDING TO SPECIFICATION */}
      <div className="space-y-5">
        {/* BẢNG 1: THÔNG TIN SẢN XUẤT */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Thời gian thực hiện:{' '}
                <span className="font-mono text-slate-700">{formatDateTime(batch.createdAt)}</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Thông tin cung cấp bởi Đơn vị Sản xuất
              </h2>
            </div>
            {batch.producerTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.producerTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <p><span className="text-slate-400 font-medium">Mã lô hàng:</span> <strong className="font-mono">{batch.batchId}</strong></p>
            <p><span className="text-slate-400 font-medium">Tên sản phẩm:</span> {batch.productName}</p>
            <p><span className="text-slate-400 font-medium">Loại sản phẩm:</span> {batch.category}</p>
            <p><span className="text-slate-400 font-medium">Số lượng:</span> {batch.quantity}</p>
            <p><span className="text-slate-400 font-medium">Trọng lượng:</span> {batch.weight} kg</p>
            <p><span className="text-slate-400 font-medium">Nguồn gốc giống:</span> {batch.seedOrigin}</p>
            <p><span className="text-slate-400 font-medium">Địa điểm sản xuất:</span> {batch.productionLocation}</p>
            <p><span className="text-slate-400 font-medium">Ngày bắt đầu canh tác:</span> {formatDate(batch.cultivationStartDate)}</p>
            <p><span className="text-slate-400 font-medium">Ngày thu hoạch:</span> {formatDate(batch.harvestDate)}</p>
            <p className="flex items-center gap-1.5 flex-wrap"><span className="text-slate-400 font-medium shrink-0">Ví Nhà sản xuất:</span> <CopyableAddress address={batch.producerWallet} /></p>
            <div className="sm:col-span-2 pt-3 border-t border-slate-100">
              <span className="text-slate-400 font-medium">Vật tư nông nghiệp:</span> {batch.farmingSupplies}
            </div>
            {batch.productImageUrl && (
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-medium block mb-1.5">Ảnh nông sản / ruộng trồng:</span>
                <button
                  type="button"
                  onClick={() => openZoom(formatImageUrl(batch.productImageUrl), `Ảnh nông sản / ruộng trồng - ${batch.productName}`)}
                  className="group relative inline-block overflow-hidden rounded-xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all text-left cursor-zoom-in"
                  title="Nhấp để phóng to ảnh nông sản"
                >
                  <img
                    src={formatImageUrl(batch.productImageUrl)}
                    alt="Ảnh nông sản / ruộng trồng"
                    className="h-36 sm:h-40 max-w-full object-cover rounded-xl transition duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center rounded-xl">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5 shadow-md">
                      <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                    </span>
                  </div>
                </button>
                {batch.productImageCid && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 font-medium text-xs">Mã định danh IPFS (CID):</span>
                    <CopyableAddress
                      address={batch.productImageCid}
                      truncate={false}
                      title={`Nhấp để sao chép IPFS CID:\n${batch.productImageCid}`}
                      className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BẢNG 2: THÔNG TIN KIỂM ĐỊNH */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Thời gian thực hiện:{' '}
                <span className={`font-mono ${batch.inspectionResult ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {batch.inspectionResult ? formatDateTime(batch.issuedDate || batch.updatedAt) : 'Chưa thực hiện'}
                </span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Thông tin cung cấp bởi Đơn vị Kiểm định
              </h2>
            </div>
            {batch.inspectorTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.inspectorTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          {batch.inspectionResult ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <p><span className="text-slate-400 font-medium">Kết quả kiểm định:</span> {batch.inspectionResult}</p>
              <p><span className="text-slate-400 font-medium">Chỉ tiêu kiểm định:</span> {batch.inspectionCriteria}</p>
              <p><span className="text-slate-400 font-medium">Mã chứng nhận:</span> <span className="font-mono">{batch.certificateCode}</span></p>
              <p><span className="text-slate-400 font-medium">Loại chứng nhận:</span> {batch.certificateType}</p>
              <p><span className="text-slate-400 font-medium">Cơ quan cấp:</span> {batch.issuingAuthority}</p>
              <p><span className="text-slate-400 font-medium">Ngày cấp:</span> {formatDate(batch.issuedDate)}</p>
              <p><span className="text-slate-400 font-medium">Ngày hết hạn:</span> {formatDate(batch.expiryDate)}</p>
              <p className="flex items-center gap-1.5 flex-wrap"><span className="text-slate-400 font-medium shrink-0">Ví Đơn vị kiểm định:</span> <CopyableAddress address={batch.inspectorWallet} /></p>
              {batch.certImageUrl && (
                <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1.5">Ảnh giấy chứng nhận:</span>
                  <button
                    type="button"
                    onClick={() => openZoom(formatImageUrl(batch.certImageUrl), `Ảnh giấy chứng nhận kiểm định - ${batch.certificateCode || batch.certificateType || batch.batchId}`)}
                    className="group relative inline-block overflow-hidden rounded-xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all text-left cursor-zoom-in"
                    title="Nhấp để phóng to giấy chứng nhận"
                  >
                    <img
                      src={formatImageUrl(batch.certImageUrl)}
                      alt="Ảnh giấy chứng nhận kiểm định"
                      className="h-36 sm:h-40 max-w-full object-cover rounded-xl transition duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center rounded-xl">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5 shadow-md">
                        <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                      </span>
                    </div>
                  </button>
                  {batch.certImageCid && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-medium text-xs">Mã định danh IPFS (CID):</span>
                      <CopyableAddress
                        address={batch.certImageCid}
                        truncate={false}
                        title={`Nhấp để sao chép IPFS CID:\n${batch.certImageCid}`}
                        className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin kiểm định cho lô này.</div>
          )}
        </div>

        {/* BẢNG 3: THÔNG TIN VẬN CHUYỂN */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Thời gian thực hiện:{' '}
                <span className={`font-mono ${batch.transporterName ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {batch.transporterName ? formatDateTime(batch.completionTime || batch.departureTime) : 'Chưa thực hiện'}
                </span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Thông tin cung cấp bởi Đơn vị Vận chuyển
              </h2>
            </div>
            {batch.logisticsTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.logisticsTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          {batch.transporterName ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <p><span className="text-slate-400 font-medium">Tên đơn vị vận chuyển:</span> {batch.transporterName}</p>
              <p><span className="text-slate-400 font-medium">Thông tin liên hệ:</span> {batch.transporterContact}</p>
              <p><span className="text-slate-400 font-medium">Loại chủ thể:</span> {batch.transporterType}</p>
              <p><span className="text-slate-400 font-medium">Mã vận chuyển:</span> <span className="font-mono">{batch.shippingCode || 'Không áp dụng'}</span></p>
              <p><span className="text-slate-400 font-medium">Điểm đi:</span> {batch.originLocation}</p>
              <p><span className="text-slate-400 font-medium">Điểm đến:</span> {batch.destLocation}</p>
              <p><span className="text-slate-400 font-medium">Thời gian khởi hành:</span> {formatDateTime(batch.departureTime)}</p>
              <p><span className="text-slate-400 font-medium">Thời gian hoàn tất:</span> {formatDateTime(batch.completionTime)}</p>
              <p><span className="text-slate-400 font-medium">Nhiệt độ:</span> {batch.temperature}°C</p>
              <p><span className="text-slate-400 font-medium">Độ ẩm:</span> {batch.humidity}%</p>
              {batch.logisticsWallet && (
                <p className="flex items-center gap-1.5 flex-wrap"><span className="text-slate-400 font-medium shrink-0">Ví Đơn vị vận chuyển:</span> <CopyableAddress address={batch.logisticsWallet} /></p>
              )}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-medium">Ghi chú bảo quản:</span> {batch.storageNotes || 'Không'}
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin vận chuyển cho lô này.</div>
          )}
        </div>

        {/* BẢNG 4: THÔNG TIN PHÂN PHỐI */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Thời gian thực hiện:{' '}
                <span className={`font-mono ${batch.distributorName ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {batch.distributorName ? formatDateTime(batch.receivedTime) : 'Chưa thực hiện'}
                </span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Thông tin cung cấp bởi Đơn vị Phân phối
              </h2>
            </div>
            {batch.distributorTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.distributorTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          {batch.distributorName ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <p><span className="text-slate-400 font-medium">Tên đơn vị phân phối:</span> {batch.distributorName}</p>
              <p><span className="text-slate-400 font-medium">Thông tin liên hệ:</span> {batch.distributorContact}</p>
              <p><span className="text-slate-400 font-medium">Loại chủ thể:</span> {batch.distributorType}</p>
              <p><span className="text-slate-400 font-medium">Thời gian tiếp nhận:</span> {formatDateTime(batch.receivedTime)}</p>
              <p><span className="text-slate-400 font-medium">Số lượng thực nhận:</span> {batch.actualQuantity}</p>
              <p><span className="text-slate-400 font-medium">Trọng lượng thực nhận:</span> {batch.actualWeight} kg</p>
              {batch.distributorWallet && (
                <p className="flex items-center gap-1.5 flex-wrap"><span className="text-slate-400 font-medium shrink-0">Ví Đơn vị phân phối:</span> <CopyableAddress address={batch.distributorWallet} /></p>
              )}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-medium">Ghi chú tiếp nhận:</span> {batch.receiptNotes || 'Không'}
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin phân phối cho lô này.</div>
          )}
        </div>
      </div>

      {/* MODAL PHÓNG TO HÌNH ẢNH (IMAGE LIGHTBOX) */}
      {mounted && zoomImage && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeZoom();
          }}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Thanh tiêu đề & điều khiển */}
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 text-white pb-3 border-b border-white/10 shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate text-white">{zoomImage.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{batch.batchId} • {batch.productName}</p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(Number((s - 0.25).toFixed(2)), 0.5))}
                disabled={scale <= 0.5}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition text-white"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setScale(1)}
                className="px-2 py-1 text-xs font-mono font-semibold rounded-lg bg-white/10 hover:bg-white/20 transition text-emerald-400 min-w-[52px] text-center"
                title="Khôi phục kích thước 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setScale((s) => Math.min(Number((s + 0.25).toFixed(2)), 3))}
                disabled={scale >= 3}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition text-white"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setScale(1)}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white hidden sm:inline-flex"
                title="Đặt lại (100%)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <a
                href={zoomImage.url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
                title="Tải ảnh gốc về máy"
              >
                <Download className="w-4 h-4" />
              </a>

              <a
                href={zoomImage.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white hidden sm:inline-flex"
                title="Mở trong tab mới"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={closeZoom}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-rose-600/90 text-white transition ml-1"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vùng xem ảnh phóng to */}
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) closeZoom();
            }}
            className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 my-auto"
          >
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.15s ease-out',
              }}
              onClick={() => setScale((s) => (s === 1 ? 1.75 : 1))}
              className={`max-w-[92vw] max-h-[75vh] object-contain rounded-xl shadow-2xl select-none transition-shadow ${
                scale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'
              }`}
            />
          </div>

          {/* Hướng dẫn thao tác */}
          <div className="w-full text-center py-2 text-[11px] text-slate-400 select-none shrink-0 border-t border-white/10">
            <span>Nhấp vào ảnh để phóng to/thu nhỏ nhanh • Nhấn phím Esc hoặc bấm ra ngoài để đóng</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
