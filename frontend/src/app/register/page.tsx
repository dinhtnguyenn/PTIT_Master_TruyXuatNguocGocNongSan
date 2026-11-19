'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { ethers } from 'ethers';
import {
  connectWallet,
  truncateAddress,
  isWalletDisconnected,
  getProvider,
  sendContractTx,
  formatBlockchainError,
} from '../../lib/web3';
import {
  API_BASE_URL,
  ROLE_LABELS,
  ROLE_HASHES,
  CONTRACT_ABI,
  isHardcodedAdmin,
  getDynamicContractAddress,
} from '../../lib/constants';
import { useToast } from '../../components/ToastProvider';

export default function RegisterPage() {
  const { toast } = useToast();
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

  // Quản trị viên cập nhật vai trò cho tài khoản
  const [selectedRolesForUpdate, setSelectedRolesForUpdate] = useState<string[]>([]);
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);

  async function checkExisting(addr: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          setExistingAccount(data);
          const r = Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : (data.role ? [data.role] : ['PRODUCER']);
          setSelectedRolesForUpdate(r);
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
      toast.error(err.message || 'Không thể kết nối ví', 'Lỗi kết nối ví');
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

      const handleAccountsChanged = (accounts: string[]) => {
        if (isWalletDisconnected()) return;
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkExisting(accounts[0]);
        } else {
          setAccount(null);
          setExistingAccount(null);
        }
      };

      if (window.ethereum?.on) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      }
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
    if (!account) {
      toast.warning('Vui lòng kết nối ví MetaMask trước khi đăng ký!');
      return;
    }
    if (!ethers.isAddress(account)) {
      toast.error('Địa chỉ ví không hợp lệ!');
      return;
    }
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account.toLowerCase(),
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

      toast.success(
        `Gửi hồ sơ thành công cho ví ${truncateAddress(account)}! Trạng thái: Chờ duyệt.`,
        'Đăng ký thành công'
      );
      setStatusMessage({
        type: 'success',
        text: `Gửi hồ sơ thành công! Trạng thái: Chờ duyệt. Hãy vào trang Quản Trị (/admin) để phê duyệt.`,
      });

      await checkExisting(account);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('account_updated'));
      }
    } catch (err: any) {
      const msg = err.message || 'Lỗi gửi hồ sơ đăng ký';
      setStatusMessage({ type: 'error', text: msg });
      toast.error(msg, 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  // Quản trị viên cập nhật vai trò trực tiếp cho account
  async function handleUpdateRoles() {
    if (!account || !existingAccount) return;
    if (selectedRolesForUpdate.length === 0) {
      toast.warning('Tài khoản phải giữ lại ít nhất 1 vai trò!');
      return;
    }

    setIsUpdatingRoles(true);
    try {
      const readProvider = await getProvider();
      const contractAddress = await getDynamicContractAddress();
      const readContract = new ethers.Contract(contractAddress, CONTRACT_ABI, readProvider);

      const allRoles = [
        { key: 'PRODUCER', hash: ROLE_HASHES.PRODUCER, label: 'Đơn vị Sản xuất' },
        { key: 'INSPECTOR', hash: ROLE_HASHES.INSPECTOR, label: 'Đơn vị Kiểm định' },
        { key: 'LOGISTICS', hash: ROLE_HASHES.LOGISTICS, label: 'Đơn vị Vận chuyển' },
        { key: 'DISTRIBUTOR', hash: ROLE_HASHES.DISTRIBUTOR, label: 'Đơn vị Phân phối' },
      ];

      // 1. Đồng bộ vai trò trên Smart Contract Polygon Amoy
      for (const r of allRoles) {
        const shouldHave = selectedRolesForUpdate.includes(r.key);
        let hasOnChain = false;
        try {
          hasOnChain = await readContract.hasRole(r.hash, existingAccount.walletAddress);
        } catch (_) {}

        if (shouldHave && !hasOnChain) {
          await sendContractTx('grantRole', [r.hash, existingAccount.walletAddress]);
        } else if (!shouldHave && hasOnChain) {
          await sendContractTx('revokeRole', [r.hash, existingAccount.walletAddress]);
        }
      }

      // 2. Cập nhật vai trò vào CSDL
      const res = await fetch(`${API_BASE_URL}/accounts/${existingAccount.id}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRolesForUpdate }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi cập nhật CSDL');
      }

      toast.success(
        'Đã cập nhật vai trò thành công trên Blockchain và Hệ thống! Bạn có thể vào Cổng nhập liệu để thử nghiệm ngay.',
        'Cập nhật thành công'
      );

      // 3. Thông báo đồng bộ Navbar & reload lại dữ liệu
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('account_updated'));
      }
      await checkExisting(account);
    } catch (err: any) {
      console.error('Lỗi cập nhật vai trò:', err);
      toast.error(formatBlockchainError(err), 'Lỗi cập nhật');
    } finally {
      setIsUpdatingRoles(false);
    }
  }

  const isAdmin = isHardcodedAdmin(account) || existingAccount?.isAdmin;

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
          className={`rounded-xl p-5 border text-xs space-y-4 ${
            existingAccount.status === 'APPROVED'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : existingAccount.status === 'PENDING'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {existingAccount.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {existingAccount.status === 'PENDING' && <Clock className="w-4 h-4 text-amber-600" />}
            {existingAccount.status === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span className="text-sm font-bold">
              {existingAccount.status === 'APPROVED' && 'Tài khoản đã được duyệt!'}
              {existingAccount.status === 'PENDING' && 'Hồ sơ đang chờ Quản trị viên duyệt'}
              {existingAccount.status === 'REJECTED' && 'Hồ sơ bị từ chối'}
            </span>
          </div>

          <div>
            <p>
              Vai trò hiện tại:{' '}
              <strong>
                {((Array.isArray(existingAccount.roles) && existingAccount.roles.length > 0)
                  ? existingAccount.roles
                  : [existingAccount.role]
                )
                  .map((r: string) => ROLE_LABELS[r] || r)
                  .join(', ')}
              </strong>{' '}
              • Đơn vị: <strong>{existingAccount.organizationName}</strong>
            </p>
            {(existingAccount.phoneNumber || existingAccount.email || existingAccount.address) && (
              <p className="text-[11px] text-slate-600 mt-1">
                {existingAccount.phoneNumber && <span>SĐT: {existingAccount.phoneNumber} </span>}
                {existingAccount.email && <span>• Email: {existingAccount.email} </span>}
                {existingAccount.address && <span>• Địa chỉ: {existingAccount.address}</span>}
              </p>
            )}
          </div>

          {existingAccount.status === 'APPROVED' && (
            <div>
              <Link
                href="/portal"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
              >
                Vào cổng nhập liệu chuỗi cung ứng <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* GIAO DIỆN CẬP NHẬT VAI TRÒ DÀNH CHO QUẢN TRỊ VIÊN ĐỂ DỄ DÀNG TEST ROLE */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-700" />
                  <h3 className="font-bold text-slate-900 text-xs">
                    Cập nhật vai trò tài khoản (Dành cho Quản trị viên thử nghiệm)
                  </h3>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  Quyền Quản trị
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tích chọn các vai trò bạn muốn cấp cho ví này để thử nghiệm đồng thời nhiều công đoạn trên Cổng nhập liệu (/portal):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'PRODUCER', label: 'Đơn vị Sản xuất' },
                  { id: 'INSPECTOR', label: 'Đơn vị Kiểm định' },
                  { id: 'LOGISTICS', label: 'Đơn vị Vận chuyển' },
                  { id: 'DISTRIBUTOR', label: 'Đơn vị Phân phối' },
                ].map((r) => {
                  const isChecked = selectedRolesForUpdate.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let updated: string[];
                          if (e.target.checked) {
                            updated = [...selectedRolesForUpdate, r.id];
                          } else {
                            updated = selectedRolesForUpdate.filter((x) => x !== r.id);
                          }
                          if (updated.length === 0) {
                            toast.warning('Tài khoản phải giữ lại ít nhất 1 vai trò!');
                            return;
                          }
                          setSelectedRolesForUpdate(updated);
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isUpdatingRoles}
                onClick={handleUpdateRoles}
                className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                {isUpdatingRoles ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang đồng bộ vai trò On-chain & CSDL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưu & Đồng bộ vai trò On-chain</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Registration Form (Chỉ hiển thị khi ví chưa đăng ký hoặc bị từ chối) */}
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
