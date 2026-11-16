'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  Shield,
  Clock,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { connectWallet, getContract, truncateAddress } from '../../lib/web3';
import { API_BASE_URL, ROLE_HASHES, ROLE_LABELS, ADMIN_ADDRESS } from '../../lib/constants';

export default function AdminPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'APPROVAL' | 'STATS'>('APPROVAL');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [accountStats, setAccountStats] = useState<any>(null);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function checkAdmin(addr: string) {
    setAccount(addr);
    loadAll();
  }

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Tải danh sách tài khoản theo bộ lọc
      const accRes = await fetch(`${API_BASE_URL}/accounts?status=${filterStatus}`);
      if (accRes.ok) setAccounts(await accRes.json());

      // 2. Tải thống kê tài khoản
      const accStatRes = await fetch(`${API_BASE_URL}/accounts/stats`);
      if (accStatRes.ok) setAccountStats(await accStatRes.json());

      // 3. Tải thống kê lô hàng
      const bStatRes = await fetch(`${API_BASE_URL}/batches/stats`);
      if (bStatRes.ok) setBatchStats(await bStatRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accs: string[]) => {
          if (accs.length > 0) checkAdmin(accs[0]);
          else setLoading(false);
        })
        .catch(() => setLoading(false));

      window.ethereum.on('accountsChanged', (accs: string[]) => {
        if (accs.length > 0) checkAdmin(accs[0]);
        else setAccount(null);
      });
    } else {
      setLoading(false);
    }
  }, [filterStatus]);

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      checkAdmin(addr);
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối ví');
    }
  }

  // Admin bấm Duyệt tài khoản: Gửi grantRole lên Smart Contract rồi cập nhật DB
  async function handleApprove(userAcc: any) {
    if (!account) return;
    setActionLoadingId(userAcc.id);
    try {
      const roleKey = userAcc.role as keyof typeof ROLE_HASHES;
      const roleHash = ROLE_HASHES[roleKey];
      if (!roleHash) throw new Error('Vai trò không hợp lệ');

      // 1. Gửi giao dịch cấp quyền on-chain qua MetaMask của Admin
      const contract = await getContract(true);
      const tx = await contract.grantRole(roleHash, userAcc.walletAddress);
      const receipt = await tx.wait();

      // 2. Cập nhật trạng thái trên Backend API
      const res = await fetch(`${API_BASE_URL}/accounts/${userAcc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          txHashGrantRole: receipt.hash,
        }),
      });

      if (!res.ok) throw new Error('Không thể cập nhật CSDL');

      alert(`Đã phê duyệt và cấp quyền On-chain cho ví ${truncateAddress(userAcc.walletAddress)} thành công!`);
      loadAll();
    } catch (err: any) {
      alert('Lỗi phê duyệt: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Admin từ chối tài khoản
  async function handleReject(id: string) {
    if (!confirm('Bạn có chắc chắn muốn từ chối hồ sơ này?')) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (!res.ok) throw new Error('Lỗi cập nhật CSDL');
      loadAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!account) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Shield className="w-14 h-14 text-brand-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-slate-900">Bảng Quản Trị Hệ Thống</h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          Vui lòng kết nối ví Admin để thực hiện cấp quyền on-chain và theo dõi số liệu thống kê.
        </p>
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <Wallet className="w-4 h-4" /> Kết nối Ví Admin
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
              Quyền Quản Trị Hệ Thống
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Quản Trị Chuỗi Cung Ứng & Phân Quyền On-Chain</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">Ví Admin: {account}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('APPROVAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'APPROVAL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Duyệt Account
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'STATS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Xem Thống Kê
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DUYỆT ACCOUNT */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-6">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterStatus === st
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st === 'PENDING' && `Chờ duyệt (${accountStats?.pending || 0})`}
                {st === 'APPROVED' && `Đã duyệt (${accountStats?.approved || 0})`}
                {st === 'REJECTED' && `Đã từ chối (${accountStats?.rejected || 0})`}
              </button>
            ))}
            <button
              onClick={loadAll}
              className="ml-auto p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Account Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Đang tải danh sách hồ sơ...</div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Không có hồ sơ nào ở trạng thái <strong>{filterStatus}</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tên Tổ Chức / Cá Nhân</th>
                      <th className="py-3 px-4">Vai Trò Đề Nghị</th>
                      <th className="py-3 px-4">Địa Chỉ Ví</th>
                      <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                      <th className="py-3 px-4">Ngày Gửi</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{acc.organizationName}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {ROLE_LABELS[acc.role] || acc.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">
                          {truncateAddress(acc.walletAddress)}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate" title={acc.contactInfo}>
                          {acc.contactInfo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(acc.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {acc.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={actionLoadingId === acc.id}
                                onClick={() => handleApprove(acc)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition"
                              >
                                {actionLoadingId === acc.id ? 'Đang cấp on-chain...' : 'Duyệt'}
                              </button>
                              <button
                                disabled={actionLoadingId === acc.id}
                                onClick={() => handleReject(acc.id)}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-semibold rounded-lg text-xs transition"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                                acc.status === 'APPROVED'
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-rose-700 bg-rose-50'
                              }`}
                            >
                              {acc.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: XEM THỐNG KÊ (DASHBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'STATS' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tổng Tài Khoản</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{accountStats?.total || 0}</p>
              <span className="text-[11px] text-emerald-600 font-medium">
                {accountStats?.approved || 0} đã duyệt on-chain
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tổng Lô Nông Sản</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{batchStats?.total || 0}</p>
              <span className="text-[11px] text-brand-600 font-medium">Lô hàng trong chuỗi</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Đang Vận Chuyển</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">
                {batchStats?.byStage?.inTransit || 0}
              </p>
              <span className="text-[11px] text-slate-500">Giám sát nhiệt độ/độ ẩm</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Đã Tiếp Nhận Điểm Bán</span>
              <p className="text-3xl font-extrabold text-purple-600 mt-1">
                {batchStats?.byStage?.delivered || 0}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Sẵn sàng đến người mua</span>
            </div>
          </div>

          {/* Phân bổ Role & Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Phân Bổ Đối Tác Theo Vai Trò</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Đơn vị Sản xuất (Producer)</span>
                  <span className="font-bold text-slate-900">{accountStats?.byRole?.producers || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Đơn vị Kiểm định (Inspector)</span>
                  <span className="font-bold text-slate-900">{accountStats?.byRole?.inspectors || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Đơn vị Vận chuyển (Logistics)</span>
                  <span className="font-bold text-slate-900">{accountStats?.byRole?.logistics || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Đơn vị Phân phối (Distributor)</span>
                  <span className="font-bold text-slate-900">{accountStats?.byRole?.distributors || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Tiến Độ Các Lô Nông Sản</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Mới khởi tạo (Sản xuất xong)</span>
                  <span className="font-bold text-blue-700">{batchStats?.byStage?.created || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Đã kiểm định (Cấp chứng nhận)</span>
                  <span className="font-bold text-emerald-700">{batchStats?.byStage?.inspected || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Đang trên đường vận chuyển</span>
                  <span className="font-bold text-amber-700">{batchStats?.byStage?.inTransit || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Đã tiếp nhận tại điểm phân phối</span>
                  <span className="font-bold text-purple-700">{batchStats?.byStage?.delivered || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lô hàng mới cập nhật */}
          {batchStats?.recentBatches && batchStats.recentBatches.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Các Lô Hàng Gần Nhất</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {batchStats.recentBatches.map((b: any) => (
                  <div key={b.batchId} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{b.productName}</p>
                      <span className="font-mono text-slate-600">{b.batchId}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-800">
                        {b.stage}
                      </span>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(b.updatedAt).toLocaleTimeString('vi-VN')} {new Date(b.updatedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
