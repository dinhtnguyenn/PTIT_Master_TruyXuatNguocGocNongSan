'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
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
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkExisting(accounts[0]);
          }
        })
        .catch(() => {});

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
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');

      setStatusMessage({
        type: 'success',
        text: 'Gửi hồ sơ thành công! Vui lòng chờ Admin phê duyệt.',
      });
      await checkExisting(account);
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
          Đăng ký địa chỉ ví để được Admin cấp quyền ký dữ liệu trên Blockchain.
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
              {existingAccount.status === 'PENDING' && 'Hồ sơ đang chờ Admin duyệt'}
              {existingAccount.status === 'REJECTED' && 'Hồ sơ bị từ chối'}
            </span>
          </div>
          <p className="mt-1">
            Vai trò: <strong>{ROLE_LABELS[existingAccount.role]}</strong> • Đơn vị: {existingAccount.organizationName}
          </p>
          {existingAccount.status === 'APPROVED' && (
            <Link
              href="/portal"
              className="mt-3 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
            >
              Vào cổng nhập liệu <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Registration Form */}
      {(!existingAccount || existingAccount.status === 'REJECTED') && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
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
            <label className="block text-slate-600 font-medium mb-1">Vai trò đăng ký *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="PRODUCER">Đơn vị Sản xuất (Producer)</option>
              <option value="INSPECTOR">Đơn vị Kiểm định (Inspector)</option>
              <option value="LOGISTICS">Đơn vị Vận chuyển (Logistics)</option>
              <option value="DISTRIBUTOR">Đơn vị Phân phối (Distributor)</option>
            </select>
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

          <div>
            <label className="block text-slate-600 font-medium mb-1">Thông tin liên hệ (SĐT, Email, Địa chỉ) *</label>
            <textarea
              rows={2}
              required
              placeholder="VD: 0912345678 - contact@domain.vn - Tiền Giang"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !account}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold transition"
          >
            {loading ? 'Đang gửi...' : 'Gửi Hồ Sơ Đăng Ký'}
          </button>
        </form>
      )}
    </div>
  );
}
