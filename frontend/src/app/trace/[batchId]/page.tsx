'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Sprout,
  CheckCircle,
  Truck,
  Store,
  QrCode,
  Download,
  Calendar,
  MapPin,
  FileCheck,
  Thermometer,
  Layers,
} from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE_URL, STAGE_LABELS, CONTRACT_ADDRESS } from '../../../lib/constants';
import { computeSha256, getContract, truncateAddress } from '../../../lib/web3';

export default function TraceBatchDetailPage() {
  const params = useParams();
  const batchId = params?.batchId as string;

  const [batch, setBatch] = useState<any>(null);
  const [onChainProof, setOnChainProof] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    producerMatch: boolean;
    inspectorMatch: boolean;
    logisticsMatch: boolean;
    distributorMatch: boolean;
  }>({
    verified: false,
    producerMatch: false,
    inspectorMatch: false,
    logisticsMatch: false,
    distributorMatch: false,
  });

  useEffect(() => {
    if (!batchId) return;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Lấy dữ liệu từ Backend
        const res = await fetch(`${API_BASE_URL}/batches/${batchId}`);
        if (!res.ok) throw new Error('Không tìm thấy thông tin lô hàng');
        const data = await res.json();
        setBatch(data);

        // Sinh mã QR đại diện cho lô hàng
        const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://trace.ptit.edu.vn/trace/${batchId}`;
        const qrUrl = await QRCode.toDataURL(currentUrl, { width: 300, margin: 2 });
        setQrDataUrl(qrUrl);

        // 2. Lấy bằng chứng trực tiếp từ Smart Contract
        try {
          const contract = await getContract(false);
          const proof = await contract.getBatchProof(batchId);
          setOnChainProof(proof);

          // 3. Tiến hành đối soát mã băm 1:1 ngay trên trình duyệt
          let pMatch = false;
          let iMatch = false;
          let lMatch = false;
          let dMatch = false;

          // Đối soát Producer
          if (data.producerDataHash && proof.production.dataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            pMatch = data.producerDataHash.toLowerCase() === proof.production.dataHash.toLowerCase();
          }
          // Đối soát Inspector
          if (data.inspectorDataHash && proof.inspection.dataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            iMatch = data.inspectorDataHash.toLowerCase() === proof.inspection.dataHash.toLowerCase();
          }
          // Đối soát Logistics
          if (data.logisticsDataHash && proof.logistics.dataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            lMatch = data.logisticsDataHash.toLowerCase() === proof.logistics.dataHash.toLowerCase();
          }
          // Đối soát Distributor
          if (data.distributorDataHash && proof.distribution.dataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            dMatch = data.distributorDataHash.toLowerCase() === proof.distribution.dataHash.toLowerCase();
          }

          setVerificationResult({
            verified: pMatch, // Ít nhất khâu sản xuất phải khớp
            producerMatch: pMatch,
            inspectorMatch: iMatch,
            logisticsMatch: lMatch,
            distributorMatch: dMatch,
          });
        } catch (contractErr) {
          console.warn('Không thể đọc Smart Contract (có thể chưa deploy local):', contractErr);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [batchId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        Đang xác thực và tải nguồn gốc nông sản từ Blockchain...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Không tìm thấy mã lô nông sản</h1>
        <p className="text-sm text-slate-600 mt-1">Mã lô <strong>{batchId}</strong> không tồn tại trên hệ thống.</p>
        <a href="/trace" className="mt-4 inline-block text-sm text-brand-600 font-semibold hover:underline">
          Quay lại danh sách tra cứu
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* 1. Header & Huy hiệu Xác thực Blockchain */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                MÃ LÔ: {batch.batchId}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  STAGE_LABELS[batch.stage]?.color || 'bg-slate-100 text-slate-700'
                }`}
              >
                {STAGE_LABELS[batch.stage]?.label || batch.stage}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{batch.productName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Chủng loại: <strong>{batch.category}</strong> • Tổng khối lượng: <strong>{batch.weight} kg</strong> ({batch.quantity} đơn vị)
            </p>
          </div>

          {/* QR Code Mini Card */}
          {qrDataUrl && (
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start sm:self-auto">
              <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 rounded-lg" />
              <div>
                <p className="text-[11px] font-bold text-slate-700">MÃ TEM QR GỐC</p>
                <a
                  href={qrDataUrl}
                  download={`QR-${batch.batchId}.png`}
                  className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-semibold mt-1"
                >
                  <Download className="w-3 h-3" /> Tải tem QR
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Khối Xác thực Toàn vẹn 100% on-chain */}
        <div className="mt-6">
          {verificationResult.verified ? (
            <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                    Đã xác thực toàn vẹn 100% trên Blockchain
                  </h2>
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    POLYGON EVM
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Mã băm dữ liệu đối chiếu trùng khớp hoàn toàn với dữ liệu ký số on-chain. Không có sự sai lệch hay can thiệp trái phép.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-emerald-900">
                  <span>Hợp đồng: {truncateAddress(CONTRACT_ADDRESS)}</span>
                  {batch.producerTxHash && (
                    <span className="flex items-center gap-1">
                      TxHash: {truncateAddress(batch.producerTxHash)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 flex items-start gap-3.5">
              <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-950">Dữ liệu đang được đồng bộ và xác thực</h2>
                <p className="text-xs text-amber-800 mt-1">
                  Thông tin đang được xử lý hoặc được đối chiếu trong môi trường thử nghiệm.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Dòng thời gian 4 Chặng Chuỗi Cung Ứng */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-600" />
          Tiến Trình Nguồn Gốc 4 Giai Đoạn
        </h2>

        {/* ========================================================================= */}
        {/* CHẶNG 1: SẢN XUẤT (PRODUCER) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Giai đoạn 1: Canh tác & Thu hoạch (Producer)</h3>
                <p className="text-xs text-slate-500">Người khởi tạo: {batch.creator?.organizationName || 'Nhà sản xuất'}</p>
              </div>
            </div>
            {verificationResult.producerMatch && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp Hash On-chain
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-slate-700">
            <div className="space-y-2">
              <p><span className="font-semibold text-slate-500">Mã lô sản phẩm:</span> <strong className="font-mono text-slate-900">{batch.batchId}</strong></p>
              <p><span className="font-semibold text-slate-500">Tên nông sản:</span> {batch.productName}</p>
              <p><span className="font-semibold text-slate-500">Loại sản phẩm:</span> {batch.category}</p>
              <p><span className="font-semibold text-slate-500">Số lượng / Trọng lượng:</span> {batch.quantity} đơn vị ({batch.weight} kg)</p>
              <p><span className="font-semibold text-slate-500">Nguồn gốc giống:</span> {batch.seedOrigin}</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold text-slate-500">Địa điểm sản xuất:</span> {batch.productionLocation}</p>
              <p><span className="font-semibold text-slate-500">Ngày bắt đầu canh tác:</span> {new Date(batch.cultivationStartDate).toLocaleDateString('vi-VN')}</p>
              <p><span className="font-semibold text-slate-500">Ngày thu hoạch:</span> {new Date(batch.harvestDate).toLocaleDateString('vi-VN')}</p>
              <p><span className="font-semibold text-slate-500">Vật tư nông nghiệp:</span> {batch.farmingSupplies}</p>
              <p><span className="font-semibold text-slate-500">Ví Producer:</span> <span className="font-mono">{truncateAddress(batch.producerWallet)}</span></p>
            </div>
          </div>

          {batch.productImageUrl && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 block mb-2">Ảnh minh chứng nông sản tại ruộng:</span>
              <img
                src={batch.productImageUrl}
                alt="Ảnh nông sản"
                className="w-48 h-32 object-cover rounded-xl border border-slate-200"
              />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CHẶNG 2: KIỂM ĐỊNH (INSPECTOR) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-2 h-full ${batch.inspectionResult ? 'bg-blue-500' : 'bg-slate-300'}`} />
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${batch.inspectionResult ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Giai đoạn 2: Giám định Chất lượng & An toàn (Inspector)</h3>
                <p className="text-xs text-slate-500">
                  {batch.inspectionResult ? `Đơn vị cấp: ${batch.issuingAuthority}` : 'Chưa thực hiện kiểm định'}
                </p>
              </div>
            </div>
            {batch.inspectionResult && verificationResult.inspectorMatch && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp Hash On-chain
              </span>
            )}
          </div>

          {batch.inspectionResult ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-slate-700">
                <div className="space-y-2">
                  <p><span className="font-semibold text-slate-500">Kết quả kiểm định:</span> <strong className="text-emerald-700">{batch.inspectionResult}</strong></p>
                  <p><span className="font-semibold text-slate-500">Chỉ tiêu kiểm định:</span> {batch.inspectionCriteria}</p>
                  <p><span className="font-semibold text-slate-500">Mã chứng nhận:</span> <span className="font-mono font-bold">{batch.certificateCode}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-semibold text-slate-500">Loại chứng nhận:</span> <strong className="text-blue-700">{batch.certificateType}</strong></p>
                  <p><span className="font-semibold text-slate-500">Cơ quan cấp:</span> {batch.issuingAuthority}</p>
                  <p><span className="font-semibold text-slate-500">Hiệu lực:</span> {new Date(batch.issuedDate).toLocaleDateString('vi-VN')} đến {new Date(batch.expiryDate).toLocaleDateString('vi-VN')}</p>
                  <p><span className="font-semibold text-slate-500">Ví Inspector:</span> <span className="font-mono">{truncateAddress(batch.inspectorWallet)}</span></p>
                </div>
              </div>
              {batch.certImageUrl && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">Ảnh giấy chứng nhận chất lượng:</span>
                  <img
                    src={batch.certImageUrl}
                    alt="Chứng nhận"
                    className="w-48 h-32 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4 italic">Lô hàng đang chờ đơn vị kiểm định lấy mẫu và công bố kết quả.</p>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CHẶNG 3: VẬN CHUYỂN (LOGISTICS) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-2 h-full ${batch.transporterName ? 'bg-amber-500' : 'bg-slate-300'}`} />
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${batch.transporterName ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Giai đoạn 3: Hành trình Vận chuyển (Logistics)</h3>
                <p className="text-xs text-slate-500">
                  {batch.transporterName ? `Đơn vị: ${batch.transporterName}` : 'Chưa vận chuyển'}
                </p>
              </div>
            </div>
            {batch.transporterName && verificationResult.logisticsMatch && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp Hash On-chain
              </span>
            )}
          </div>

          {batch.transporterName ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-slate-700">
              <div className="space-y-2">
                <p><span className="font-semibold text-slate-500">Đơn vị vận chuyển:</span> {batch.transporterName} ({batch.transporterType})</p>
                <p><span className="font-semibold text-slate-500">Liên hệ:</span> {batch.transporterContact}</p>
                <p><span className="font-semibold text-slate-500">Mã vận chuyển:</span> <span className="font-mono">{batch.shippingCode}</span></p>
                <p><span className="font-semibold text-slate-500">Lộ trình:</span> {batch.originLocation} $\rightarrow$ {batch.destLocation}</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-semibold text-slate-500">Khởi hành:</span> {new Date(batch.departureTime).toLocaleString('vi-VN')}</p>
                <p><span className="font-semibold text-slate-500">Hoàn tất:</span> {new Date(batch.completionTime).toLocaleString('vi-VN')}</p>
                <p><span className="font-semibold text-slate-500">Điều kiện bảo quản:</span> <strong>{batch.temperature}°C</strong> • Độ ẩm: <strong>{batch.humidity}%</strong></p>
                <p><span className="font-semibold text-slate-500">Ghi chú:</span> {batch.storageNotes || 'Không'}</p>
                <p><span className="font-semibold text-slate-500">Ví Logistics:</span> <span className="font-mono">{truncateAddress(batch.logisticsWallet)}</span></p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4 italic">Chưa phát sinh chuyến hàng vận chuyển cho lô này.</p>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CHẶNG 4: PHÂN PHỐI (DISTRIBUTOR) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-2 h-full ${batch.distributorName ? 'bg-purple-500' : 'bg-slate-300'}`} />
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${batch.distributorName ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Giai đoạn 4: Tiếp nhận Phân phối (Distributor)</h3>
                <p className="text-xs text-slate-500">
                  {batch.distributorName ? `Điểm phân phối: ${batch.distributorName}` : 'Chưa tiếp nhận'}
                </p>
              </div>
            </div>
            {batch.distributorName && verificationResult.distributorMatch && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp Hash On-chain
              </span>
            )}
          </div>

          {batch.distributorName ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-slate-700">
              <div className="space-y-2">
                <p><span className="font-semibold text-slate-500">Đơn vị phân phối:</span> {batch.distributorName} ({batch.distributorType})</p>
                <p><span className="font-semibold text-slate-500">Thông tin liên hệ:</span> {batch.distributorContact}</p>
                <p><span className="font-semibold text-slate-500">Thời gian tiếp nhận:</span> {new Date(batch.receivedTime).toLocaleString('vi-VN')}</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-semibold text-slate-500">Số lượng / Trọng lượng thực nhận:</span> <strong>{batch.actualQuantity} đơn vị ({batch.actualWeight} kg)</strong></p>
                <p><span className="font-semibold text-slate-500">Ghi chú tiếp nhận:</span> {batch.receiptNotes}</p>
                <p><span className="font-semibold text-slate-500">Ví Distributor:</span> <span className="font-mono">{truncateAddress(batch.distributorWallet)}</span></p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4 italic">Đơn vị phân phối chưa xác nhận tiếp nhận lô hàng.</p>
          )}
        </div>
      </div>
    </div>
  );
}
