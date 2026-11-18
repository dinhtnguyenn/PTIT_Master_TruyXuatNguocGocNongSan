'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, CheckCircle2, Clock, AlertTriangle, ArrowRight, PlusCircle, Sparkles, X } from 'lucide-react';
import { ethers } from 'ethers';
import { connectWallet, truncateAddress, isWalletDisconnected } from '../../lib/web3';
import { API_BASE_URL, ROLE_LABELS } from '../../lib/constants';

export default function RegisterPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: 'PRODUCER',
    roles: ['PRODUCER'] as string[],
    organizationName: '',
    phoneNumber: '',
    email: '',
    address: '',
  });
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRegisteringAnother, setIsRegisteringAnother] = useState(false);
  const [manualWallet, setManualWallet] = useState('');

  async function checkExisting(addr: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          setExistingAccount(data);
        } else {
          setExistingAccount(null);
        }
      } else {
        setExistingAccount(null);
      }
    } catch (err) {}
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
    if (isWalletDisconnected()) {
      return;
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            checkExisting(accounts[0]);
          }
        })
        .catch(() => {});

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (isWalletDisconnected()) return;
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkExisting(accounts[0]);
        } else {
          setAccount(null);
          setExistingAccount(null);
        }
      });
    }

    function onDisconnected() {
      setAccount(null);
      setExistingAccount(null);
    }

    function onConnected(e: any) {
      if (e.detail) {
        setAccount(e.detail);
        checkExisting(e.detail);
      }
    }

    window.addEventListener('wallet_disconnected', onDisconnected);
    window.addEventListener('wallet_connected', onConnected);
    return () => {
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetWallet = isRegisteringAnother && manualWallet.trim() ? manualWallet.trim() : account;
    if (!targetWallet) {
      setStatusMessage({ type: 'error', text: 'Vui lòng kết nối ví MetaMask hoặc nhập địa chỉ ví đăng ký!' });
      return;
    }
    if (!ethers.isAddress(targetWallet)) {
      setStatusMessage({ type: 'error', text: 'Địa chỉ ví không hợp lệ (Phải là định dạng Ethereum 0x...)!' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: targetWallet.toLowerCase(),
          roles: formData.roles,
          role: formData.roles[0] || 'PRODUCER',
          organizationName: formData.organizationName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          address: formData.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');

      setStatusMessage({
        type: 'success',
        text: `Gửi hồ sơ thành công cho ví ${truncateAddress(targetWallet)}! Trạng thái: Chờ duyệt. Hãy vào trang Quản Trị (/admin) để phê duyệt.`,
      });

      if (!isRegisteringAnother && account) {
        await checkExisting(account);
      } else {
        setManualWallet('');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('account_updated'));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">Đăng Ký Ví Chuỗi Cung Ứng</h1>
        <p className="text-xs text-slate-500 mt-1">
          Đăng ký địa chỉ ví để được Quản trị viên cấp quyền ký dữ liệu trên Blockchain.
        </p>
      </div>

      {/* Wallet Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500 font-medium">Ví kết nối:</span>
          <p className="font-mono text-slate-900 mt-0.5">
            {account ? account : 'Chưa kết nối ví'}
          </p>
        </div>
        {!account && (
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            Kết nối MetaMask
          </button>
        )}
      </div>

      {/* Current Status if already registered */}
      {existingAccount && (
        <div
          className={`rounded-xl p-4 border text-xs ${
            existingAccount.status === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : existingAccount.status === 'PENDING'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {existingAccount.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {existingAccount.status === 'PENDING' && <Clock className="w-4 h-4 text-amber-600" />}
            {existingAccount.status === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>
              {existingAccount.status === 'APPROVED' && 'Tài khoản đã được duyệt!'}
              {existingAccount.status === 'PENDING' && 'Hồ sơ đang chờ Quản trị viên duyệt'}
              {existingAccount.status === 'REJECTED' && 'Hồ sơ bị từ chối'}
            </span>
          </div>
          <p className="mt-1">
            Vai trò: <strong>{ROLE_LABELS[existingAccount.role] || existingAccount.role}</strong> • Đơn vị: {existingAccount.organizationName}
          </p>
          {(existingAccount.phoneNumber || existingAccount.email || existingAccount.address) && (
            <p className="text-[11px] text-slate-600 mt-1">
              {existingAccount.phoneNumber && <span>SĐT: {existingAccount.phoneNumber} </span>}
              {existingAccount.email && <span>• Email: {existingAccount.email} </span>}
              {existingAccount.address && <span>• Địa chỉ: {existingAccount.address}</span>}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {existingAccount.status === 'APPROVED' && (
              <Link
                href="/portal"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                Vào cổng nhập liệu <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setIsRegisteringAnother(true);
                setManualWallet('');
              }}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs border border-slate-300 shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              Đăng ký thêm ví đối tác khác (Hoặc tạo ví thử nghiệm)
            </button>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {(!existingAccount || existingAccount.status === 'REJECTED' || isRegisteringAnother) && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          {isRegisteringAnother && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-semibold text-slate-800">
                Chế độ: Đăng ký ví đối tác mới / Tạo ví thử nghiệm
              </span>
              <button
                type="button"
                onClick={() => setIsRegisteringAnother(false)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Đóng
              </button>
            </div>
          )}

          {isRegisteringAnother && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 font-medium">Địa chỉ ví đối tác cần đăng ký *</label>
                <button
                  type="button"
                  onClick={() => {
                    const randomWallet = ethers.Wallet.createRandom().address;
                    setManualWallet(randomWallet);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <Sparkles className="w-3 h-3" /> Tạo ngẫu nhiên ví thử nghiệm
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="0x..."
                value={manualWallet}
                onChange={(e) => setManualWallet(e.target.value)}
                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ví này sau khi gửi sẽ xuất hiện ở mục <strong>Chờ duyệt</strong> trong trang Quản trị để bạn dùng ví Quản trị viên phê duyệt trên Blockchain.
              </p>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-lg ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div>
            <label className="block text-slate-600 font-medium mb-1.5">
              Vai trò đăng ký tham gia (Có thể chọn một hoặc nhiều vai trò) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {[
                { id: 'PRODUCER', label: 'Đơn vị Sản xuất' },
                { id: 'INSPECTOR', label: 'Đơn vị Kiểm định' },
                { id: 'LOGISTICS', label: 'Đơn vị Vận chuyển' },
                { id: 'DISTRIBUTOR', label: 'Đơn vị Phân phối' },
              ].map((r) => {
                const isChecked = formData.roles.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        let newRoles: string[];
                        if (e.target.checked) {
                          newRoles = [...formData.roles, r.id];
                        } else {
                          newRoles = formData.roles.filter((x) => x !== r.id);
                        }
                        if (newRoles.length === 0) newRoles = [r.id];
                        setFormData({ ...formData, roles: newRoles, role: newRoles[0] });
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className={isChecked ? 'font-bold text-slate-900' : 'text-slate-600'}>
                      {r.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Tên cá nhân / tổ chức *</label>
            <input
              type="text"
              required
              placeholder="VD: Hợp tác xã Nông nghiệp Hòa Lộc"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Số điện thoại liên hệ *</label>
              <input
                type="tel"
                required
                placeholder="VD: 0912345678"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Địa chỉ Email liên hệ *</label>
              <input
                type="email"
                required
                placeholder="VD: contact@nongsan.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Địa chỉ cơ sở sản xuất / Trụ sở *</label>
            <input
              type="text"
              required
              placeholder="VD: Ấp Hòa, Xã Hòa Hưng, Huyện Cái Bè, Tiền Giang"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!account && !manualWallet.trim())}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold transition"
          >
            {loading ? 'Đang gửi...' : 'Gửi Hồ Sơ Đăng Ký'}
          </button>
        </form>
      )}
    </div>
  );
}
