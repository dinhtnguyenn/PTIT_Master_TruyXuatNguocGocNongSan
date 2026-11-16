'use client';

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  CheckCircle,
  Truck,
  Store,
  Wallet,
  Upload,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { connectWallet, getContract, truncateAddress } from '../../lib/web3';
import { API_BASE_URL, ROLE_LABELS, ADMIN_ADDRESS } from '../../lib/constants';

export default function SupplyChainPortalPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string; txHash?: string } | null>(null);

  // 1. Form Producer State (Bảng 1)
  const [producerForm, setProducerForm] = useState({
    batchId: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    productName: '',
    category: 'Trái cây',
    quantity: 1000,
    weight: 2000,
    seedOrigin: '',
    farmingSupplies: '',
    productionLocation: '',
    cultivationStartDate: '',
    harvestDate: '',
    productImageUrl: '',
  });

  // 2. Form Inspector State (Bảng 2)
  const [inspectorForm, setInspectorForm] = useState({
    batchId: '',
    inspectionResult: 'Đạt tiêu chuẩn an toàn thực phẩm VietGAP',
    inspectionCriteria: 'Dư lượng thuốc BVTV, hàm lượng kim loại nặng và vi sinh vật gây hại',
    certificateCode: `CERT-${Math.floor(100000 + Math.random() * 900000)}`,
    certificateType: 'VietGAP',
    issuingAuthority: 'Trung tâm Giám định & Chứng nhận Vinacert',
    issuedDate: '',
    expiryDate: '',
    certImageUrl: '',
  });

  // 3. Form Logistics State (Bảng 3)
  const [logisticsForm, setLogisticsForm] = useState({
    batchId: '',
    transporterName: '',
    transporterContact: '',
    transporterType: 'Tổ chức',
    shippingCode: `SHIP-${Math.floor(100000 + Math.random() * 900000)}`,
    originLocation: '',
    destLocation: '',
    departureTime: '',
    completionTime: '',
    temperature: 15.5,
    humidity: 75.0,
    storageNotes: 'Bảo quản container lạnh nhiệt độ ổn định',
  });

  // 4. Form Distributor State (Bảng 4)
  const [distributorForm, setDistributorForm] = useState({
    batchId: '',
    distributorName: '',
    distributorContact: '',
    distributorType: 'Tổ chức',
    receivedTime: '',
    actualQuantity: 1000,
    actualWeight: 2000,
    receiptNotes: 'Hàng nguyên tem mác, bao bì không rách vỡ, chất lượng tươi tốt',
  });

  async function loadUser(addr: string) {
    setLoading(true);
    try {
      if (addr.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        setUserData({ role: 'ADMIN', status: 'APPROVED', organizationName: 'Hệ thống Quản trị PTIT' });
        loadBatches();
        return;
      }
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        setUserData(null);
      }
      loadBatches();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBatches() {
    try {
      const res = await fetch(`${API_BASE_URL}/batches`);
      if (res.ok) {
        const data = await res.json();
        setActiveBatches(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFileUpload(file: File, target: 'product' | 'cert') {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const fullUrl = `http://localhost:4000${data.url}`;
        if (target === 'product') {
          setProducerForm((prev) => ({ ...prev, productImageUrl: fullUrl }));
        } else {
          setInspectorForm((prev) => ({ ...prev, certImageUrl: fullUrl }));
        }
        alert('Tải ảnh lên Server thành công!');
      } else {
        alert(data.message || 'Lỗi tải ảnh');
      }
    } catch (err: any) {
      alert('Không thể tải ảnh: ' + err.message);
    }
  }

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await loadUser(addr);
    } catch (err: any) {
      alert(err.message || 'Không thể kết nối ví');
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            loadUser(accounts[0]);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadUser(accounts[0]);
        } else {
          setAccount(null);
          setUserData(null);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  // 1. Submit Producer Form
  async function submitProducer(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSubmitting(true);
    setStatusAlert(null);

    try {
      // B1: Gửi lên Backend để lưu DB và nhận dataHash chuẩn
      const res = await fetch(`${API_BASE_URL}/batches/producer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...producerForm,
          producerWallet: account,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu Backend');

      const dataHash = result.dataHash;

      // B2: Kích hoạt MetaMask gọi Smart Contract
      const contract = await getContract(true);
      const tx = await contract.recordProduction(
        producerForm.batchId,
        producerForm.productName,
        dataHash
      );
      const receipt = await tx.wait();

      // B3: Cập nhật txHash lên Backend
      await fetch(`${API_BASE_URL}/batches/${producerForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'CREATED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Khởi tạo lô hàng '${producerForm.batchId}' và ghi nhận lên Blockchain thành công!`,
        txHash: receipt.hash,
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Submit Inspector Form
  async function submitInspector(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!inspectorForm.batchId) {
      alert('Vui lòng chọn hoặc nhập mã lô hàng cần kiểm định!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/inspector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inspectorForm,
          inspectorWallet: account,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu kiểm định');

      const dataHash = result.dataHash;

      // Smart Contract call
      const contract = await getContract(true);
      const tx = await contract.recordInspection(inspectorForm.batchId, dataHash);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${inspectorForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'INSPECTED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Kiểm định lô hàng '${inspectorForm.batchId}' đã được ghi nhận trên Blockchain!`,
        txHash: receipt.hash,
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Submit Logistics Form
  async function submitLogistics(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!logisticsForm.batchId) {
      alert('Vui lòng chọn mã lô hàng cần vận chuyển!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logisticsForm,
          logisticsWallet: account,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu vận chuyển');

      const dataHash = result.dataHash;

      // Smart Contract call
      const contract = await getContract(true);
      const tx = await contract.recordLogistics(logisticsForm.batchId, dataHash);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${logisticsForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'IN_TRANSIT', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Hành trình vận chuyển lô hàng '${logisticsForm.batchId}' đã được ghi nhận trên Blockchain!`,
        txHash: receipt.hash,
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Submit Distributor Form
  async function submitDistributor(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!distributorForm.batchId) {
      alert('Vui lòng chọn mã lô hàng tiếp nhận!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/distributor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...distributorForm,
          distributorWallet: account,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu phân phối');

      const dataHash = result.dataHash;

      // Smart Contract call
      const contract = await getContract(true);
      const tx = await contract.recordDistribution(distributorForm.batchId, dataHash);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${distributorForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'DELIVERED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Tiếp nhận phân phối lô hàng '${distributorForm.batchId}' đã hoàn tất và lưu trên Blockchain!`,
        txHash: receipt.hash,
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        Đang tải thông tin tài khoản và phân quyền ví...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-brand-100 text-brand-700 mx-auto flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Cổng Nhập Liệu Chuỗi Cung Ứng</h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          Vui lòng kết nối ví MetaMask đã được đăng ký và phê duyệt để hệ thống hiển thị biểu mẫu nghiệp vụ tương ứng với vai trò của bạn.
        </p>
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
        >
          <Wallet className="w-4 h-4" /> Kết nối MetaMask Ngay
        </button>
      </div>
    );
  }

  if (!userData || userData.status !== 'APPROVED') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Tài khoản chưa được phê duyệt</h1>
        <p className="text-sm text-slate-600 mt-2">
          Địa chỉ ví <span className="font-mono text-slate-800">{truncateAddress(account)}</span>{' '}
          {userData ? (
            <>đang ở trạng thái <strong>{userData.status}</strong> cho vai trò <strong>{ROLE_LABELS[userData.role]}</strong>.</>
          ) : (
            'chưa được đăng ký trong hệ thống.'
          )}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition"
          >
            Đến Trang Đăng Ký <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const role = userData.role;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header Chào Mừng theo Role */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
            {ROLE_LABELS[role] || role}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{userData.organizationName}</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Ví: {account}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã xác minh chính chủ on-chain
        </div>
      </div>

      {statusAlert && (
        <div
          className={`p-4 rounded-2xl text-sm mb-6 border ${
            statusAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <p className="font-semibold">{statusAlert.message}</p>
          {statusAlert.txHash && (
            <p className="text-xs font-mono mt-1 break-all">
              Mã giao dịch (TxHash): <strong>{statusAlert.txHash}</strong>
            </p>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FORM PRODUCER (BẢNG 1 - TÀI LIỆU GỐC) */}
      {/* ========================================================================= */}
      {role === 'PRODUCER' && (
        <form onSubmit={submitProducer} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bảng 1: Thông tin cung cấp bởi Producer</h2>
              <p className="text-xs text-slate-500">Khởi tạo thông tin định danh lô, canh tác và thu hoạch</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã lô sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.batchId}
                onChange={(e) => setProducerForm({ ...producerForm, batchId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tên sản phẩm *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Xoài Cát Hòa Lộc"
                value={producerForm.productName}
                onChange={(e) => setProducerForm({ ...producerForm, productName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Loại sản phẩm *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Trái cây ăn quả"
                value={producerForm.category}
                onChange={(e) => setProducerForm({ ...producerForm, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Số lượng *</label>
                <input
                  type="number"
                  required
                  value={producerForm.quantity}
                  onChange={(e) => setProducerForm({ ...producerForm, quantity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trọng lượng (kg) *</label>
                <input
                  type="number"
                  required
                  value={producerForm.weight}
                  onChange={(e) => setProducerForm({ ...producerForm, weight: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nguồn gốc giống *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Giống xoài ghép đầu dòng Cái Bè"
                value={producerForm.seedOrigin}
                onChange={(e) => setProducerForm({ ...producerForm, seedOrigin: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Địa điểm sản xuất *</label>
              <input
                type="text"
                required
                placeholder="Địa chỉ hoặc tọa độ khu vực sản xuất"
                value={producerForm.productionLocation}
                onChange={(e) => setProducerForm({ ...producerForm, productionLocation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ngày bắt đầu canh tác *</label>
              <input
                type="date"
                required
                value={producerForm.cultivationStartDate}
                onChange={(e) => setProducerForm({ ...producerForm, cultivationStartDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ngày thu hoạch *</label>
              <input
                type="date"
                required
                value={producerForm.harvestDate}
                onChange={(e) => setProducerForm({ ...producerForm, harvestDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vật tư nông nghiệp đã sử dụng *</label>
            <textarea
              rows={2}
              required
              placeholder="Các loại phân bón hữu cơ, thuốc bảo vệ thực vật sinh học đã sử dụng..."
              value={producerForm.farmingSupplies}
              onChange={(e) => setProducerForm({ ...producerForm, farmingSupplies: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ảnh nông sản / vườn trồng (Lưu Server)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'product')}
              className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            {producerForm.productImageUrl && (
              <p className="text-xs text-emerald-600 mt-1 font-mono truncate">Ảnh đã upload: {producerForm.productImageUrl}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow"
          >
            {submitting ? 'Đang ký giao dịch trên MetaMask...' : 'Ký & Ghi Blockchain (Khởi tạo Lô hàng)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 2. FORM INSPECTOR (BẢNG 2 - TÀI LIỆU GỐC) */}
      {/* ========================================================================= */}
      {role === 'INSPECTOR' && (
        <form onSubmit={submitInspector} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bảng 2: Thông tin cung cấp bởi Inspector</h2>
              <p className="text-xs text-slate-500">Đánh giá chất lượng sản phẩm và cấp chứng nhận an toàn</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã lô sản phẩm cần kiểm định *</label>
              <select
                required
                value={inspectorForm.batchId}
                onChange={(e) => setInspectorForm({ ...inspectorForm, batchId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Chọn lô hàng cần kiểm định --</option>
                {activeBatches
                  .filter((b) => b.stage === 'CREATED')
                  .map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} - {b.productName} ({b.weight} kg)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Kết quả kiểm định *</label>
              <input
                type="text"
                required
                value={inspectorForm.inspectionResult}
                onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionResult: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã chứng nhận *</label>
              <input
                type="text"
                required
                value={inspectorForm.certificateCode}
                onChange={(e) => setInspectorForm({ ...inspectorForm, certificateCode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Loại chứng nhận *</label>
              <input
                type="text"
                required
                value={inspectorForm.certificateType}
                onChange={(e) => setInspectorForm({ ...inspectorForm, certificateType: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cơ quan cấp *</label>
              <input
                type="text"
                required
                value={inspectorForm.issuingAuthority}
                onChange={(e) => setInspectorForm({ ...inspectorForm, issuingAuthority: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ngày cấp *</label>
                <input
                  type="date"
                  required
                  value={inspectorForm.issuedDate}
                  onChange={(e) => setInspectorForm({ ...inspectorForm, issuedDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ngày hết hạn *</label>
                <input
                  type="date"
                  required
                  value={inspectorForm.expiryDate}
                  onChange={(e) => setInspectorForm({ ...inspectorForm, expiryDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Chỉ tiêu kiểm định *</label>
            <textarea
              rows={2}
              required
              value={inspectorForm.inspectionCriteria}
              onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionCriteria: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ảnh chứng nhận (Lưu Server)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cert')}
              className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {inspectorForm.certImageUrl && (
              <p className="text-xs text-blue-600 mt-1 font-mono truncate">File đã upload: {inspectorForm.certImageUrl}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow"
          >
            {submitting ? 'Đang ký giao dịch trên MetaMask...' : 'Ký & Ghi Blockchain (Xác nhận Kiểm định)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 3. FORM LOGISTICS (BẢNG 3 - TÀI LIỆU GỐC) */}
      {/* ========================================================================= */}
      {role === 'LOGISTICS' && (
        <form onSubmit={submitLogistics} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bảng 3: Thông tin cung cấp bởi Logistics</h2>
              <p className="text-xs text-slate-500">Ghi nhận hành trình vận chuyển và điều kiện bảo quản nhiệt độ, độ ẩm</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã lô sản phẩm vận chuyển *</label>
              <select
                required
                value={logisticsForm.batchId}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, batchId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Chọn lô hàng đã kiểm định --</option>
                {activeBatches
                  .filter((b) => b.stage === 'INSPECTED')
                  .map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} - {b.productName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tên đơn vị vận chuyển *</label>
              <input
                type="text"
                required
                placeholder="Tên cá nhân hoặc tổ chức"
                value={logisticsForm.transporterName}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Thông tin liên hệ *</label>
              <input
                type="text"
                required
                placeholder="SĐT, Email tài xế/đơn vị"
                value={logisticsForm.transporterContact}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterContact: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Loại chủ thể *</label>
              <select
                value={logisticsForm.transporterType}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterType: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Tổ chức">Tổ chức</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã vận chuyển (nếu có)</label>
              <input
                type="text"
                required
                value={logisticsForm.shippingCode}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, shippingCode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Điểm đi *</label>
              <input
                type="text"
                required
                placeholder="Địa điểm bắt đầu vận chuyển"
                value={logisticsForm.originLocation}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, originLocation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Điểm đến *</label>
              <input
                type="text"
                required
                placeholder="Địa điểm tiếp nhận hàng hóa"
                value={logisticsForm.destLocation}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, destLocation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">TG khởi hành *</label>
                <input
                  type="datetime-local"
                  required
                  value={logisticsForm.departureTime}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, departureTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">TG hoàn tất *</label>
                <input
                  type="datetime-local"
                  required
                  value={logisticsForm.completionTime}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, completionTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nhiệt độ (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={logisticsForm.temperature}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, temperature: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Độ ẩm (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={logisticsForm.humidity}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, humidity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ghi chú bảo quản</label>
              <input
                type="text"
                value={logisticsForm.storageNotes}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, storageNotes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition shadow"
          >
            {submitting ? 'Đang ký giao dịch trên MetaMask...' : 'Ký & Ghi Blockchain (Xác nhận Vận chuyển)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 4. FORM DISTRIBUTOR (BẢNG 4 - TÀI LIỆU GỐC) */}
      {/* ========================================================================= */}
      {role === 'DISTRIBUTOR' && (
        <form onSubmit={submitDistributor} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bảng 4: Thông tin cung cấp bởi Distributor</h2>
              <p className="text-xs text-slate-500">Tiếp nhận hàng hóa, kiểm tra số lượng/trọng lượng thực nhận</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mã lô sản phẩm tiếp nhận *</label>
              <select
                required
                value={distributorForm.batchId}
                onChange={(e) => setDistributorForm({ ...distributorForm, batchId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Chọn lô hàng đang vận chuyển --</option>
                {activeBatches
                  .filter((b) => b.stage === 'IN_TRANSIT')
                  .map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} - {b.productName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tên đơn vị phân phối *</label>
              <input
                type="text"
                required
                placeholder="Tên cá nhân hoặc tổ chức phân phối"
                value={distributorForm.distributorName}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Thông tin liên hệ *</label>
              <input
                type="text"
                required
                value={distributorForm.distributorContact}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorContact: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Loại chủ thể phân phối *</label>
              <select
                value={distributorForm.distributorType}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorType: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Tổ chức">Tổ chức</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Thời gian tiếp nhận *</label>
              <input
                type="datetime-local"
                required
                value={distributorForm.receivedTime}
                onChange={(e) => setDistributorForm({ ...distributorForm, receivedTime: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Số lượng thực nhận *</label>
                <input
                  type="number"
                  required
                  value={distributorForm.actualQuantity}
                  onChange={(e) => setDistributorForm({ ...distributorForm, actualQuantity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trọng lượng nhận (kg) *</label>
                <input
                  type="number"
                  required
                  value={distributorForm.actualWeight}
                  onChange={(e) => setDistributorForm({ ...distributorForm, actualWeight: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ghi chú tiếp nhận</label>
            <textarea
              rows={2}
              value={distributorForm.receiptNotes}
              onChange={(e) => setDistributorForm({ ...distributorForm, receiptNotes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition shadow"
          >
            {submitting ? 'Đang ký giao dịch trên MetaMask...' : 'Ký & Ghi Blockchain (Tiếp nhận & Mở bán)'}
          </button>
        </form>
      )}
    </div>
  );
}
