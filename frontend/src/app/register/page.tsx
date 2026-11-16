'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Wallet, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { connectWallet, truncateAddress } from '../../lib/web3';
import { API_BASE_URL, ROLE_LABELS } from '../../lib/constants';

export default function RegisterPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: 'PRODUCER',
    organizationName: '',
    contactInfo: '',
  });
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function checkExisting(addr: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`);
      if (res.ok) {
        const data = await res.json();
        setExistingAccount(data);
      } else {
        setExistingAccount(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await checkExisting(addr);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Không thể kết nối ví' });
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkExisting(accounts[0]);
          }
        })
        .catch(console.error);

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkExisting(accounts[0]);
        } else {
          setAccount(null);
          setExistingAccount(null);
        }
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) {
      setStatusMessage({ type: 'error', text: 'Vui lòng kết nối ví MetaMask trước!' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account,
          role: formData.role,
          organizationName: formData.organizationName,
          contactInfo: formData.contactInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      setStatusMessage({
        type: 'success',
        text: 'Đăng ký hồ sơ thành công! Vui lòng chờ Admin thẩm định và cấp quyền trên Blockchain.',
      });
      await checkExisting(account);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Đăng ký Ví Tham Gia Chuỗi Cung Ứng</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
          Mỗi vai trò (Sản xuất, Kiểm định, Vận chuyển, Phân phối) cần đăng ký một ví MetaMask riêng để xác thực chính chủ và ký dữ liệu.
        </p>
      </div>

      {/* Box Kết nối ví */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Trạng thái ví kết nối</h2>
            {account ? (
              <p className="text-sm font-mono text-slate-900 mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                {account}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-1">Chưa kết nối ví MetaMask</p>
            )}
          </div>
          {!account ? (
            <button
              onClick={handleConnect}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <Wallet className="w-4 h-4" /> Kết nối MetaMask
            </button>
          ) : (
            <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-mono">
              Đã kết nối ({truncateAddress(account)})
            </div>
          )}
        </div>
      </div>

      {/* Thông báo nếu đã có hồ sơ */}
      {existingAccount && (
        <div
          className={`rounded-2xl p-6 mb-6 border ${
            existingAccount.status === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : existingAccount.status === 'PENDING'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {existingAccount.status === 'APPROVED' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : existingAccount.status === 'PENDING' ? (
              <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-base">
                {existingAccount.status === 'APPROVED' && 'Hồ sơ đã được phê duyệt!'}
                {existingAccount.status === 'PENDING' && 'Hồ sơ đang chờ Admin phê duyệt'}
                {existingAccount.status === 'REJECTED' && 'Hồ sơ bị từ chối'}
              </h3>
              <p className="text-sm mt-1 opacity-90">
                Vai trò đăng ký: <strong>{ROLE_LABELS[existingAccount.role]}</strong> • Tên: {existingAccount.organizationName}
              </p>
              {existingAccount.status === 'APPROVED' && (
                <div className="mt-3">
                  <a
                    href="/portal"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    Vào Cổng Chuỗi Cung Ứng ngay <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Đăng ký */}
      {(!existingAccount || existingAccount.status === 'REJECTED') && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-6 pb-2 border-b border-slate-100">
            Thông tin Đơn vị Tham gia
          </h2>

          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-sm mb-6 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Vai trò đề nghị đăng ký <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="PRODUCER">Đơn vị Sản xuất (Producer)</option>
                <option value="INSPECTOR">Đơn vị Kiểm định (Inspector)</option>
                <option value="LOGISTICS">Đơn vị Vận chuyển (Logistics)</option>
                <option value="DISTRIBUTOR">Đơn vị Phân phối (Distributor)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tên cá nhân / tổ chức <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: HTX Nông nghiệp Sạch Hòa Lộc, Trung tâm Kiểm định Vinacert..."
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Thông tin liên hệ (SĐT, Email, Địa chỉ) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ví dụ: 0912345678 - contact@hoaloc.vn - Ấp Hòa, Xã Hòa Hưng, Cái Bè, Tiền Giang"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !account}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-medium text-sm transition shadow-sm"
            >
              {loading ? 'Đang gửi hồ sơ...' : 'Gửi Hồ Sơ Đăng Ký'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
