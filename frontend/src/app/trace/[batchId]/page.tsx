'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE_URL, STAGE_LABELS, getDynamicExplorerUrl } from '../../../lib/constants';
import { getContract, truncateAddress } from '../../../lib/web3';

function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const host = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatDate(dateValue?: any): string {
  if (!dateValue) return 'Chưa cập nhật';
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? 'Chưa cập nhật' : d.toLocaleDateString('vi-VN');
}

function formatDateTime(dateValue?: any): string {
  if (!dateValue) return 'Chưa cập nhật';
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? 'Chưa cập nhật' : d.toLocaleString('vi-VN');
}

export default function TraceDetailPage() {
  const params = useParams();
  const batchId = params?.batchId as string;

  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verified, setVerified] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string>('https://amoy.polygonscan.com');

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

        // Đối chiếu với Smart Contract trên Polygon Amoy
        try {
          const contract = await getContract(false);
          const proof = await contract.getBatchProof(batchId);
          let isValid = false;
          if (
            data.producerDataHash &&
            proof.production.dataHash.toLowerCase() === data.producerDataHash.toLowerCase()
          ) {
            isValid = true;
          }
          if (
            data.inspectorDataHash &&
            proof.inspection.dataHash.toLowerCase() !== data.inspectorDataHash.toLowerCase()
          ) {
            isValid = false;
          }
          if (
            data.logisticsDataHash &&
            proof.logistics.dataHash.toLowerCase() !== data.logisticsDataHash.toLowerCase()
          ) {
            isValid = false;
          }
          if (
            data.distributorDataHash &&
            proof.distribution.dataHash.toLowerCase() !== data.distributorDataHash.toLowerCase()
          ) {
            isValid = false;
          }
          setVerified(isValid);
        } catch (err) {}
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
        <h1 className="text-base font-bold text-slate-800">Không tìm thấy mã lô</h1>
        <p className="text-xs text-slate-500 mt-1">Mã lô {batchId} không tồn tại trên hệ thống.</p>
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
            Loại: {batch.category} • Số lượng: {batch.quantity} • Trọng lượng: {batch.weight} kg
          </p>
        </div>

        {qrDataUrl && (
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <img src={qrDataUrl} alt="Mã QR" className="w-14 h-14 rounded" />
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

      {/* Blockchain Verification Badge */}
      <div
        className={`rounded-xl p-3.5 border flex items-center justify-between text-xs ${
          verified
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {verified ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span>
            {verified
              ? 'Dữ liệu được xác thực toàn vẹn trên Blockchain Polygon'
              : 'Dữ liệu đang được đồng bộ và xác thực trên hệ thống'}
          </span>
        </div>
        {batch.producerTxHash && (
          <a
            href={`${explorerUrl}/tx/${batch.producerTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1"
          >
            Giao dịch: {truncateAddress(batch.producerTxHash)} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* 4 DATA TABLES ACCORDING TO SPECIFICATION */}
      <div className="space-y-5">
        {/* BẢNG 1: THÔNG TIN SẢN XUẤT */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Bảng 1: Thông tin cung cấp bởi Đơn vị Sản xuất
            </h2>
            {batch.producerTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.producerTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <p><span className="text-slate-400 font-medium">Mã lô sản phẩm:</span> <strong className="font-mono">{batch.batchId}</strong></p>
            <p><span className="text-slate-400 font-medium">Tên sản phẩm:</span> {batch.productName}</p>
            <p><span className="text-slate-400 font-medium">Loại sản phẩm:</span> {batch.category}</p>
            <p><span className="text-slate-400 font-medium">Số lượng:</span> {batch.quantity}</p>
            <p><span className="text-slate-400 font-medium">Trọng lượng:</span> {batch.weight} kg</p>
            <p><span className="text-slate-400 font-medium">Nguồn gốc giống:</span> {batch.seedOrigin}</p>
            <p><span className="text-slate-400 font-medium">Địa điểm sản xuất:</span> {batch.productionLocation}</p>
            <p><span className="text-slate-400 font-medium">Ngày bắt đầu canh tác:</span> {formatDate(batch.cultivationStartDate)}</p>
            <p><span className="text-slate-400 font-medium">Ngày thu hoạch:</span> {formatDate(batch.harvestDate)}</p>
            <p><span className="text-slate-400 font-medium">Ví Nhà sản xuất:</span> <span className="font-mono">{truncateAddress(batch.producerWallet)}</span></p>
            <div className="sm:col-span-2 pt-1 border-t border-slate-100">
              <span className="text-slate-400 font-medium">Vật tư nông nghiệp:</span> {batch.farmingSupplies}
            </div>
            {batch.productImageUrl && (
              <div className="sm:col-span-2 pt-2">
                <span className="text-slate-400 font-medium block mb-1">Ảnh nông sản / ruộng trồng:</span>
                <img src={formatImageUrl(batch.productImageUrl)} alt="Ảnh sản phẩm" className="h-32 object-cover rounded-lg border border-slate-200" />
              </div>
            )}
          </div>
        </div>

        {/* BẢNG 2: THÔNG TIN KIỂM ĐỊNH */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thông tin cung cấp bởi Đơn vị Kiểm định
            </h2>
            {batch.inspectorTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.inspectorTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Giao dịch Blockchain
              </a>
            )}
          </div>
          {batch.inspectionResult ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <p><span className="text-slate-400 font-medium">Kết quả kiểm định:</span> <strong>{batch.inspectionResult}</strong></p>
              <p><span className="text-slate-400 font-medium">Chỉ tiêu kiểm định:</span> {batch.inspectionCriteria}</p>
              <p><span className="text-slate-400 font-medium">Mã chứng nhận:</span> <strong className="font-mono">{batch.certificateCode}</strong></p>
              <p><span className="text-slate-400 font-medium">Loại chứng nhận:</span> {batch.certificateType}</p>
              <p><span className="text-slate-400 font-medium">Cơ quan cấp:</span> {batch.issuingAuthority}</p>
              <p><span className="text-slate-400 font-medium">Ngày cấp:</span> {formatDate(batch.issuedDate)}</p>
              <p><span className="text-slate-400 font-medium">Ngày hết hạn:</span> {formatDate(batch.expiryDate)}</p>
              <p><span className="text-slate-400 font-medium">Ví Đơn vị kiểm định:</span> <span className="font-mono">{truncateAddress(batch.inspectorWallet)}</span></p>
              {batch.certImageUrl && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Ảnh giấy chứng nhận:</span>
                  <img src={formatImageUrl(batch.certImageUrl)} alt="Chứng nhận" className="h-32 object-cover rounded-lg border border-slate-200" />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin kiểm định cho lô này.</div>
          )}
        </div>

        {/* BẢNG 3: THÔNG TIN VẬN CHUYỂN */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thông tin cung cấp bởi Đơn vị Vận chuyển
            </h2>
            {batch.logisticsTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.logisticsTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1"
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
              <p><span className="text-slate-400 font-medium">Mã vận chuyển:</span> <strong className="font-mono">{batch.shippingCode}</strong></p>
              <p><span className="text-slate-400 font-medium">Điểm đi:</span> {batch.originLocation}</p>
              <p><span className="text-slate-400 font-medium">Điểm đến:</span> {batch.destLocation}</p>
              <p><span className="text-slate-400 font-medium">Thời gian khởi hành:</span> {formatDateTime(batch.departureTime)}</p>
              <p><span className="text-slate-400 font-medium">Thời gian hoàn tất:</span> {formatDateTime(batch.completionTime)}</p>
              <p><span className="text-slate-400 font-medium">Nhiệt độ:</span> {batch.temperature}°C</p>
              <p><span className="text-slate-400 font-medium">Độ ẩm:</span> {batch.humidity}%</p>
              <p className="sm:col-span-2"><span className="text-slate-400 font-medium">Ghi chú bảo quản:</span> {batch.storageNotes || 'Không'}</p>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin vận chuyển cho lô này.</div>
          )}
        </div>

        {/* BẢNG 4: THÔNG TIN PHÂN PHỐI */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thông tin cung cấp bởi Đơn vị Phân phối
            </h2>
            {batch.distributorTxHash && (
              <a
                href={`${explorerUrl}/tx/${batch.distributorTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1"
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
              <p className="sm:col-span-2"><span className="text-slate-400 font-medium">Ghi chú tiếp nhận:</span> {batch.receiptNotes}</p>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 italic">Chưa có thông tin phân phối cho lô này.</div>
          )}
        </div>
      </div>
    </div>
  );
}
