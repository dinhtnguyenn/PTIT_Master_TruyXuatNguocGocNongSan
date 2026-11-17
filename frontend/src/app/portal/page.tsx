'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { connectWallet, getContract, truncateAddress, isWalletDisconnected, getGasOverrides } from '../../lib/web3';
import { API_BASE_URL, ROLE_LABELS, ADMIN_ADDRESS } from '../../lib/constants';

export default function SupplyChainPortalPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string; txHash?: string } | null>(null);

  // Form Producer (Bảng 1)
  const [producerForm, setProducerForm] = useState({
    batchId: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    productName: '',
    category: '',
    quantity: 100,
    weight: 200,
    seedOrigin: '',
    farmingSupplies: '',
    productionLocation: '',
    cultivationStartDate: '',
    harvestDate: '',
    productImageUrl: '',
  });

  // Form Inspector (Bảng 2)
  const [inspectorForm, setInspectorForm] = useState({
    batchId: '',
    inspectionResult: 'Đạt tiêu chuẩn an toàn',
    inspectionCriteria: 'Dư lượng thuốc BVTV, vi sinh vật',
    certificateCode: `CERT-${Math.floor(100000 + Math.random() * 900000)}`,
    certificateType: 'VietGAP',
    issuingAuthority: '',
    issuedDate: '',
    expiryDate: '',
    certImageUrl: '',
  });

  // Form Logistics (Bảng 3)
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
    temperature: 20.0,
    humidity: 70.0,
    storageNotes: '',
  });

  // Form Distributor (Bảng 4)
  const [distributorForm, setDistributorForm] = useState({
    batchId: '',
    distributorName: '',
    distributorContact: '',
    distributorType: 'Tổ chức',
    receivedTime: '',
    actualQuantity: 100,
    actualWeight: 200,
    receiptNotes: '',
  });

  async function loadUser(addr: string) {
    setLoading(true);
    try {
      if (addr.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        setUserData({ role: 'ADMIN', status: 'APPROVED', organizationName: 'Ban Quản Trị' });
        loadBatches();
        return;
      }
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          setUserData(data);
        } else {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      loadBatches();
    } catch (err) {
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
    } catch (err) {}
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
        const fullUrl = `${API_BASE_URL.replace('/api', '')}${data.url}`;
        if (target === 'product') {
          setProducerForm((prev) => ({ ...prev, productImageUrl: fullUrl }));
        } else {
          setInspectorForm((prev) => ({ ...prev, certImageUrl: fullUrl }));
        }
        alert('Tải ảnh lên thành công!');
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
    if (isWalletDisconnected()) {
      setLoading(false);
    } else if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            loadUser(accounts[0]);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (isWalletDisconnected()) return;
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

    function onDisconnected() {
      setAccount(null);
      setUserData(null);
    }

    function onConnected(e: any) {
      if (e.detail) {
        setAccount(e.detail);
        loadUser(e.detail);
      }
    }

    window.addEventListener('wallet_disconnected', onDisconnected);
    window.addEventListener('wallet_connected', onConnected);
    return () => {
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, []);

  // 1. Submit Producer Form
  async function submitProducer(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/producer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...producerForm, producerWallet: account }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu');

      const contract = await getContract(true);
      const gasOverrides = await getGasOverrides();
      const tx = await contract.recordProduction(
        producerForm.batchId,
        producerForm.productName,
        result.dataHash,
        gasOverrides
      );
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${producerForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'CREATED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Đã tạo lô hàng '${producerForm.batchId}' và ghi nhận trên Blockchain!`,
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
      alert('Vui lòng chọn mã lô cần kiểm định!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/inspector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inspectorForm, inspectorWallet: account }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu');

      const contract = await getContract(true);
      const gasOverrides = await getGasOverrides();
      const tx = await contract.recordInspection(inspectorForm.batchId, result.dataHash, gasOverrides);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${inspectorForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'INSPECTED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Kiểm định lô hàng '${inspectorForm.batchId}' thành công!`,
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
      alert('Vui lòng chọn mã lô cần vận chuyển!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...logisticsForm, logisticsWallet: account }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu');

      const contract = await getContract(true);
      const gasOverrides = await getGasOverrides();
      const tx = await contract.recordLogistics(logisticsForm.batchId, result.dataHash, gasOverrides);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${logisticsForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'IN_TRANSIT', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Ghi nhận vận chuyển lô hàng '${logisticsForm.batchId}' thành công!`,
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
      alert('Vui lòng chọn mã lô tiếp nhận!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/batches/distributor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...distributorForm, distributorWallet: account }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Lỗi lưu dữ liệu');

      const contract = await getContract(true);
      const gasOverrides = await getGasOverrides();
      const tx = await contract.recordDistribution(distributorForm.batchId, result.dataHash, gasOverrides);
      const receipt = await tx.wait();

      await fetch(`${API_BASE_URL}/batches/${distributorForm.batchId}/tx`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'DELIVERED', txHash: receipt.hash }),
      });

      setStatusAlert({
        type: 'success',
        message: `Tiếp nhận phân phối lô hàng '${distributorForm.batchId}' thành công!`,
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
    return <div className="text-center py-20 text-xs text-slate-400">Đang kiểm tra quyền hạn ví...</div>;
  }

  if (!account) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center mb-3">
          <Wallet className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Yêu cầu kết nối Ví MetaMask</h1>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Vui lòng kết nối ví đã được cấp quyền để hiển thị form nhập liệu tương ứng.
        </p>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
        >
          Kết nối Ví ngay
        </button>
      </div>
    );
  }

  if (!userData || userData.status !== 'APPROVED') {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-slate-900">Ví chưa được duyệt</h1>
        <p className="text-xs text-slate-500 mt-1">
          Địa chỉ ví <span className="font-mono">{truncateAddress(account)}</span> đang chờ Admin duyệt hoặc chưa đăng ký.
        </p>
        <div className="mt-4">
          <Link
            href="/register"
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Đến trang Đăng ký $\rightarrow$
          </Link>
        </div>
      </div>
    );
  }

  const role = userData.role;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Actor Bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase">
            {ROLE_LABELS[role] || role}
          </span>
          <p className="text-sm font-bold text-slate-900">{userData.organizationName}</p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          {truncateAddress(account)}
        </span>
      </div>

      {statusAlert && (
        <div
          className={`p-3.5 rounded-xl text-xs border ${
            statusAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <p className="font-semibold">{statusAlert.message}</p>
          {statusAlert.txHash && (
            <p className="font-mono text-[11px] mt-0.5">TxHash: {statusAlert.txHash}</p>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM 1: PRODUCER (BẢNG 1) */}
      {/* ========================================================================= */}
      {role === 'PRODUCER' && (
        <form onSubmit={submitProducer} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Bảng 1: Thông tin cung cấp bởi Producer (Đơn vị Sản xuất)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mã lô sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.batchId}
                onChange={(e) => setProducerForm({ ...producerForm, batchId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tên sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.productName}
                onChange={(e) => setProducerForm({ ...producerForm, productName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loại sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.category}
                onChange={(e) => setProducerForm({ ...producerForm, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số lượng *</label>
                <input
                  type="number"
                  required
                  value={producerForm.quantity}
                  onChange={(e) => setProducerForm({ ...producerForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Trọng lượng (kg) *</label>
                <input
                  type="number"
                  required
                  value={producerForm.weight}
                  onChange={(e) => setProducerForm({ ...producerForm, weight: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Nguồn gốc giống *</label>
              <input
                type="text"
                required
                value={producerForm.seedOrigin}
                onChange={(e) => setProducerForm({ ...producerForm, seedOrigin: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Địa điểm sản xuất *</label>
              <input
                type="text"
                required
                value={producerForm.productionLocation}
                onChange={(e) => setProducerForm({ ...producerForm, productionLocation: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Ngày bắt đầu canh tác *</label>
              <input
                type="date"
                required
                value={producerForm.cultivationStartDate}
                onChange={(e) => setProducerForm({ ...producerForm, cultivationStartDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Ngày thu hoạch *</label>
              <input
                type="date"
                required
                value={producerForm.harvestDate}
                onChange={(e) => setProducerForm({ ...producerForm, harvestDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Vật tư nông nghiệp đã sử dụng *</label>
              <textarea
                rows={2}
                required
                value={producerForm.farmingSupplies}
                onChange={(e) => setProducerForm({ ...producerForm, farmingSupplies: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Ảnh nông sản / ruộng trồng</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'product')}
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
          >
            {submitting ? 'Đang gửi giao dịch lên Blockchain...' : 'Lưu & Ký Blockchain (Khởi tạo Lô hàng)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 2: INSPECTOR (BẢNG 2) */}
      {/* ========================================================================= */}
      {role === 'INSPECTOR' && (
        <form onSubmit={submitInspector} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Bảng 2: Thông tin cung cấp bởi Inspector (Đơn vị Kiểm định)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Chọn Lô sản phẩm *</label>
              <select
                required
                value={inspectorForm.batchId}
                onChange={(e) => setInspectorForm({ ...inspectorForm, batchId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">-- Chọn lô cần kiểm định --</option>
                {activeBatches.filter((b) => b.stage === 'CREATED').map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} - {b.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Kết quả kiểm định *</label>
              <input
                type="text"
                required
                value={inspectorForm.inspectionResult}
                onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionResult: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mã chứng nhận *</label>
              <input
                type="text"
                required
                value={inspectorForm.certificateCode}
                onChange={(e) => setInspectorForm({ ...inspectorForm, certificateCode: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loại chứng nhận *</label>
              <input
                type="text"
                required
                value={inspectorForm.certificateType}
                onChange={(e) => setInspectorForm({ ...inspectorForm, certificateType: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Cơ quan cấp *</label>
              <input
                type="text"
                required
                value={inspectorForm.issuingAuthority}
                onChange={(e) => setInspectorForm({ ...inspectorForm, issuingAuthority: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngày cấp *</label>
                <input
                  type="date"
                  required
                  value={inspectorForm.issuedDate}
                  onChange={(e) => setInspectorForm({ ...inspectorForm, issuedDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngày hết hạn *</label>
                <input
                  type="date"
                  required
                  value={inspectorForm.expiryDate}
                  onChange={(e) => setInspectorForm({ ...inspectorForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Chỉ tiêu kiểm định *</label>
              <textarea
                rows={2}
                required
                value={inspectorForm.inspectionCriteria}
                onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionCriteria: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Ảnh giấy chứng nhận</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cert')}
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
          >
            {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Xác nhận Kiểm định)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 3: LOGISTICS (BẢNG 3) */}
      {/* ========================================================================= */}
      {role === 'LOGISTICS' && (
        <form onSubmit={submitLogistics} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Bảng 3: Thông tin cung cấp bởi Logistics (Đơn vị Vận chuyển)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Chọn Lô hàng đã kiểm định *</label>
              <select
                required
                value={logisticsForm.batchId}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, batchId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">-- Chọn lô cần vận chuyển --</option>
                {activeBatches.filter((b) => b.stage === 'INSPECTED').map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} - {b.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tên đơn vị vận chuyển *</label>
              <input
                type="text"
                required
                value={logisticsForm.transporterName}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Thông tin liên hệ *</label>
              <input
                type="text"
                required
                value={logisticsForm.transporterContact}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterContact: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loại chủ thể *</label>
              <select
                value={logisticsForm.transporterType}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterType: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="Tổ chức">Tổ chức</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mã vận chuyển *</label>
              <input
                type="text"
                required
                value={logisticsForm.shippingCode}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, shippingCode: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Điểm đi *</label>
              <input
                type="text"
                required
                value={logisticsForm.originLocation}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, originLocation: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Điểm đến *</label>
              <input
                type="text"
                required
                value={logisticsForm.destLocation}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, destLocation: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">TG khởi hành *</label>
                <input
                  type="datetime-local"
                  required
                  value={logisticsForm.departureTime}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, departureTime: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">TG hoàn tất *</label>
                <input
                  type="datetime-local"
                  required
                  value={logisticsForm.completionTime}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, completionTime: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nhiệt độ (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={logisticsForm.temperature}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, temperature: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Độ ẩm (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={logisticsForm.humidity}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, humidity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Ghi chú bảo quản</label>
              <input
                type="text"
                value={logisticsForm.storageNotes}
                onChange={(e) => setLogisticsForm({ ...logisticsForm, storageNotes: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition"
          >
            {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Xác nhận Vận chuyển)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 4: DISTRIBUTOR (BẢNG 4) */}
      {/* ========================================================================= */}
      {role === 'DISTRIBUTOR' && (
        <form onSubmit={submitDistributor} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Bảng 4: Thông tin cung cấp bởi Distributor (Đơn vị Phân phối)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Chọn Lô hàng đang vận chuyển *</label>
              <select
                required
                value={distributorForm.batchId}
                onChange={(e) => setDistributorForm({ ...distributorForm, batchId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">-- Chọn lô tiếp nhận --</option>
                {activeBatches.filter((b) => b.stage === 'IN_TRANSIT').map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} - {b.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tên đơn vị phân phối *</label>
              <input
                type="text"
                required
                value={distributorForm.distributorName}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Thông tin liên hệ *</label>
              <input
                type="text"
                required
                value={distributorForm.distributorContact}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorContact: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loại chủ thể *</label>
              <select
                value={distributorForm.distributorType}
                onChange={(e) => setDistributorForm({ ...distributorForm, distributorType: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="Tổ chức">Tổ chức</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Thời gian tiếp nhận *</label>
              <input
                type="datetime-local"
                required
                value={distributorForm.receivedTime}
                onChange={(e) => setDistributorForm({ ...distributorForm, receivedTime: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số lượng thực nhận *</label>
                <input
                  type="number"
                  required
                  value={distributorForm.actualQuantity}
                  onChange={(e) => setDistributorForm({ ...distributorForm, actualQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Trọng lượng thực nhận (kg) *</label>
                <input
                  type="number"
                  required
                  value={distributorForm.actualWeight}
                  onChange={(e) => setDistributorForm({ ...distributorForm, actualWeight: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Ghi chú tiếp nhận</label>
              <input
                type="text"
                value={distributorForm.receiptNotes}
                onChange={(e) => setDistributorForm({ ...distributorForm, receiptNotes: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition"
          >
            {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Tiếp nhận Phân phối)'}
          </button>
        </form>
      )}
    </div>
  );
}
