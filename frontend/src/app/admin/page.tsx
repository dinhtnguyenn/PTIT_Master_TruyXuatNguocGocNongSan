'use client';

import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Wallet, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { connectWallet, getContract, truncateAddress, isWalletDisconnected, getGasOverrides, formatBlockchainError } from '../../lib/web3';
import { API_BASE_URL, ROLE_HASHES, ROLE_LABELS, STATUS_LABELS, isHardcodedAdmin } from '../../lib/constants';

export default function AdminPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'APPROVAL' | 'STATS'>('APPROVAL');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [accountStats, setAccountStats] = useState<any>(null);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function checkAdmin(addr: string) {
    setAccount(addr);
    const isAdm = isHardcodedAdmin(addr);
    setIsAdminUser(isAdm);
    loadAll();
  }

  async function loadAll() {
    setLoading(true);
    try {
      const accRes = await fetch(`${API_BASE_URL}/accounts?status=${filterStatus}`);
      if (accRes.ok) setAccounts(await accRes.json());

      const accStatRes = await fetch(`${API_BASE_URL}/accounts/stats`);
      if (accStatRes.ok) setAccountStats(await accStatRes.json());

      const bStatRes = await fetch(`${API_BASE_URL}/batches/stats`);
      if (bStatRes.ok) setBatchStats(await bStatRes.json());
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isWalletDisconnected()) {
      setLoading(false);
    } else if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accs: string[]) => {
          if (accs.length > 0 && !isWalletDisconnected()) checkAdmin(accs[0]);
          else setLoading(false);
        })
        .catch(() => setLoading(false));

      window.ethereum.on('accountsChanged', (accs: string[]) => {
        if (isWalletDisconnected()) return;
        if (accs.length > 0) checkAdmin(accs[0]);
        else setAccount(null);
      });
    } else {
      setLoading(false);
    }

    function onDisconnected() {
      setAccount(null);
    }

    function onConnected(e: any) {
      if (e.detail) checkAdmin(e.detail);
    }

    window.addEventListener('wallet_disconnected', onDisconnected);
    window.addEventListener('wallet_connected', onConnected);
    return () => {
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, [filterStatus]);

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      checkAdmin(addr);
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối ví');
    }
  }

  async function handleApprove(userAcc: any) {
    if (!account) return;
    setActionLoadingId(userAcc.id);
    try {
      const targetRoles: string[] = (Array.isArray(userAcc.roles) && userAcc.roles.length > 0)
        ? userAcc.roles
        : [userAcc.role];

      const contract = await getContract(true);
      const gasOverrides = await getGasOverrides();
      let lastTxHash = '';

      for (const r of targetRoles) {
        const roleKey = r as keyof typeof ROLE_HASHES;
        const roleHash = ROLE_HASHES[roleKey];
        if (roleHash) {
          const tx = await contract.grantRole(roleHash, userAcc.walletAddress, gasOverrides);
          const receipt = await tx.wait();
          lastTxHash = receipt.hash;
        }
      }

      const res = await fetch(`${API_BASE_URL}/accounts/${userAcc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          txHashGrantRole: lastTxHash || null,
        }),
      });

      if (!res.ok) throw new Error('Không thể cập nhật CSDL');

      alert(`Đã cấp quyền trên Blockchain cho ví ${truncateAddress(userAcc.walletAddress)}!`);
      loadAll();
    } catch (err: any) {
      console.error('Lỗi phê duyệt:', err);
      alert('Lỗi phê duyệt: ' + formatBlockchainError(err));
    } finally {
      setActionLoadingId(null);
    }
  }

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
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <h1 className="text-base font-bold text-slate-900 mb-2">Trang Quản Trị Hệ Thống</h1>
        <p className="text-xs text-slate-500 mb-5">Vui lòng kết nối ví Quản trị viên để tiếp tục.</p>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
        >
          Kết nối Ví Quản trị viên
        </button>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-slate-900 mb-2">Quyền Truy Cập Bị Từ Chối</h1>
        <p className="text-xs text-slate-500 mb-2">
          Ví đang kết nối (<span className="font-mono text-slate-700">{truncateAddress(account)}</span>) không thuộc danh sách 2 ví Quản trị viên của hệ thống.
        </p>
        <p className="text-[11px] text-slate-400">
          Chức năng Quản trị chỉ khả dụng khi kết nối đúng địa chỉ ví Quản trị viên trên MetaMask.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900">Quản Trị Hệ Thống</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-3 h-3" /> Ví Quản trị viên
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{account}</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('APPROVAL')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'APPROVAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Duyệt Tài Khoản
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'STATS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Thống Kê
          </button>
        </div>
      </div>

      {/* TAB 1: DUYỆT TÀI KHOẢN */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterStatus === st
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st === 'PENDING' && `Chờ duyệt (${accountStats?.pending || 0})`}
                {st === 'APPROVED' && `Đã duyệt (${accountStats?.approved || 0})`}
                {st === 'REJECTED' && `Từ chối (${accountStats?.rejected || 0})`}
              </button>
            ))}
            <button
              onClick={loadAll}
              className="ml-auto p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Đang tải...</div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Không có hồ sơ nào ở trạng thái {STATUS_LABELS[filterStatus] || filterStatus}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tên Đơn vị</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3">Địa chỉ ví</th>
                      <th className="py-2.5 px-3">Thông tin liên hệ</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{acc.organizationName}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {((Array.isArray(acc.roles) && acc.roles.length > 0) ? acc.roles : [acc.role]).map((r: string) => (
                              <span key={r} className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                {ROLE_LABELS[r] || r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">
                          {truncateAddress(acc.walletAddress)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs">
                          {acc.phoneNumber && <div><span className="text-slate-400 font-medium">SĐT:</span> {acc.phoneNumber}</div>}
                          {acc.email && <div><span className="text-slate-400 font-medium">Email:</span> {acc.email}</div>}
                          {acc.address && <div><span className="text-slate-400 font-medium">Địa chỉ:</span> {acc.address}</div>}
                          {!acc.phoneNumber && !acc.email && !acc.address && <div>{acc.contactInfo || '—'}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {acc.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                disabled={actionLoadingId === acc.id}
                                onClick={() => handleApprove(acc)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px]"
                              >
                                {actionLoadingId === acc.id ? 'Đang cấp...' : 'Duyệt'}
                              </button>
                              <button
                                disabled={actionLoadingId === acc.id}
                                onClick={() => handleReject(acc.id)}
                                className="px-2 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded font-semibold text-[11px]"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">
                              {STATUS_LABELS[acc.status] || acc.status}
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

      {/* TAB 2: THỐNG KÊ */}
      {activeTab === 'STATS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 font-medium">Tổng Tài khoản</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{accountStats?.total || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 font-medium">Tổng Lô hàng</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{batchStats?.total || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 font-medium">Đang Vận chuyển</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{batchStats?.byStage?.inTransit || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 font-medium">Đã Tiếp nhận Điểm bán</span>
              <p className="text-2xl font-bold text-purple-600 mt-1">{batchStats?.byStage?.delivered || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 pb-1 border-b">Tài khoản theo Vai trò</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị Sản xuất</span>
                  <span className="font-bold">{accountStats?.byRole?.producers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị Kiểm định</span>
                  <span className="font-bold">{accountStats?.byRole?.inspectors || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị Vận chuyển</span>
                  <span className="font-bold">{accountStats?.byRole?.logistics || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị Phân phối</span>
                  <span className="font-bold">{accountStats?.byRole?.distributors || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 pb-1 border-b">Tiến độ Lô hàng</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã sản xuất (Mới tạo)</span>
                  <span className="font-bold text-blue-600">{batchStats?.byStage?.created || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã kiểm định</span>
                  <span className="font-bold text-emerald-600">{batchStats?.byStage?.inspected || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đang vận chuyển</span>
                  <span className="font-bold text-amber-600">{batchStats?.byStage?.inTransit || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã tiếp nhận phân phối</span>
                  <span className="font-bold text-purple-600">{batchStats?.byStage?.delivered || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
