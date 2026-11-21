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
    phoneNumber: '',
    email: '',
  });
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quản trị viên cập nhật vai trò cho tài khoản
  const [selectedRoleForUpdate, setSelectedRoleForUpdate] = useState<string>('PRODUCER');
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);

  async function checkExisting(addr: string) {
    const isAdm = isHardcodedAdmin(addr);
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.status || isAdm)) {
          if (isAdm) {
            data.status = 'APPROVED';
            data.phoneNumber = '';
            data.email = '';
          }
          setExistingAccount(data);
          const r = Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles[0]
            : (data.role ? data.role : 'PRODUCER');
          setSelectedRoleForUpdate(r);
          return;
        }
      }
      if (isAdm) {
        setExistingAccount({
          walletAddress: addr,
          role: 'PRODUCER',
          roles: ['PRODUCER'],
          status: 'APPROVED',
          organizationName: 'Quản trị Hệ thống',
          phoneNumber: '',
          email: '',
        });
        setSelectedRoleForUpdate('PRODUCER');
      } else {
        setExistingAccount(null);
      }
    } catch (err) {
      if (isAdm) {
        setExistingAccount({
          walletAddress: addr,
          role: 'PRODUCER',
          roles: ['PRODUCER'],
          status: 'APPROVED',
          organizationName: 'Quản trị Hệ thống',
          phoneNumber: '',
          email: '',
        });
        setSelectedRoleForUpdate('PRODUCER');
      } else {
        setExistingAccount(null);
      }
    }
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
    // Chỉ tự động kiểm tra tài khoản khi người dùng chưa bấm đăng xuất
    if (!isWalletDisconnected() && typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            checkExisting(accounts[0]);
          }
        })
        .catch(() => {});
    }

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

    if (typeof window !== 'undefined' && window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
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
      if (typeof window !== 'undefined' && window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
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
    if (!formData.phoneNumber.trim()) {
      toast.warning('Vui lòng nhập số điện thoại liên hệ!');
      return;
    }
    if (!formData.email.trim()) {
      toast.warning('Vui lòng nhập email liên hệ!');
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
          role: formData.role,
          roles: [formData.role],
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim(),
          organizationName: ROLE_LABELS[formData.role] || formData.role,
          contactInfo: `Số điện thoại: ${formData.phoneNumber.trim()} • Email: ${formData.email.trim()}`,
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
    if (!account) return;
    if (!selectedRoleForUpdate) {
      toast.warning('Vui lòng chọn 1 vai trò!');
      return;
    }

    setIsUpdatingRoles(true);
    try {
      const readProvider = await getProvider();
      const contractAddress = await getDynamicContractAddress();
      const readContract = new ethers.Contract(contractAddress, CONTRACT_ABI, readProvider);

      // 1. Đồng bộ vai trò trên Smart Contract Polygon Amoy
      // Chỉ cần cấp quyền vai trò mới (grantRole) nếu ví chưa có trên Blockchain (Tối đa 1 lần xác nhận ví duy nhất!)
      const targetRoleHash = (ROLE_HASHES as any)[selectedRoleForUpdate];
      if (targetRoleHash) {
        let hasOnChain = false;
        try {
          hasOnChain = await readContract.hasRole(targetRoleHash, account);
        } catch (_) {}

        if (!hasOnChain) {
          await sendContractTx('grantRole', [targetRoleHash, account]);
        }
      }

      // 2. Cập nhật vai trò vào CSDL
      const targetId = existingAccount?.id || account;
      const res = await fetch(`${API_BASE_URL}/accounts/${targetId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: [selectedRoleForUpdate] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi cập nhật Cơ sở dữ liệu');
      }

      toast.success(
        `Đã chuyển sang vai trò ${ROLE_LABELS[selectedRoleForUpdate]} thành công! Bạn có thể vào Cổng nhập liệu để sử dụng ngay.`,
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

  const isAdmin = !!account && (isHardcodedAdmin(account) || existingAccount?.isAdmin);
  const activeAccount = existingAccount || (isAdmin && account ? {
    walletAddress: account,
    role: selectedRoleForUpdate || 'PRODUCER',
    roles: [selectedRoleForUpdate || 'PRODUCER'],
    status: 'APPROVED',
    organizationName: 'Quản trị Hệ thống',
  } : null);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">
          {isAdmin ? 'Thiết Lập Vai Trò Thử Nghiệm' : 'Đăng Ký Ví Chuỗi Cung Ứng'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isAdmin
            ? 'Chế độ Quản trị viên: Lựa chọn vai trò chuỗi cung ứng để kiểm thử trực tiếp các luồng nhập liệu.'
            : 'Đăng ký địa chỉ ví để được Quản trị viên cấp quyền ký dữ liệu trên Blockchain.'}
        </p>
      </div>

      {/* Wallet Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500 font-medium">
            {isAdmin ? 'Ví Quản trị viên:' : 'Ví kết nối:'}
          </span>
          <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">
            {account ? account : 'Chưa kết nối ví'}
          </p>
        </div>
        {!account && (
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            Kết nối Ví ngay
          </button>
        )}
      </div>

      {/* Current Status if already registered or Admin */}
      {activeAccount && (
        <div
          className={`rounded-xl p-5 border text-xs space-y-4 ${
            activeAccount.status === 'APPROVED'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : activeAccount.status === 'PENDING'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}
        >
          {!isAdmin && (
            <div className="flex items-center gap-2 font-semibold">
              {activeAccount.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {activeAccount.status === 'PENDING' && <Clock className="w-4 h-4 text-amber-600" />}
              {activeAccount.status === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span className="text-sm font-bold">
                {activeAccount.status === 'APPROVED' && 'Tài khoản đã được duyệt!'}
                {activeAccount.status === 'PENDING' && 'Hồ sơ đang chờ Quản trị viên duyệt'}
                {activeAccount.status === 'REJECTED' && 'Hồ sơ bị từ chối'}
              </span>
            </div>
          )}

          <div>
            <p className="text-slate-800">
              Vai trò hiện tại:{' '}
              <strong>
                {((Array.isArray(activeAccount.roles) && activeAccount.roles.length > 0)
                  ? activeAccount.roles
                  : [activeAccount.role || selectedRoleForUpdate || 'PRODUCER']
                )
                  .map((r: string) => ROLE_LABELS[r] || r)
                  .join(', ')}
              </strong>
            </p>
            {!isAdmin && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 mt-1">
                {activeAccount.phoneNumber && (
                  <span>
                    <strong className="text-slate-500">Số điện thoại:</strong> {activeAccount.phoneNumber}
                  </span>
                )}
                {activeAccount.email && (
                  <span>
                    <strong className="text-slate-500">Email:</strong> {activeAccount.email}
                  </span>
                )}
              </div>
            )}
          </div>

          {(activeAccount.status === 'APPROVED' || isAdmin) && (
            <div>
              <Link
                href="/portal"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
              >
                Vào cổng nhập liệu chuỗi cung ứng <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* GIAO DIỆN CẬP NHẬT VAI TRÒ DÀNH CHO QUẢN TRỊ VIÊN */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-xs">
                  Cập nhật vai trò tài khoản
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'PRODUCER', label: 'Đơn vị Sản xuất' },
                  { id: 'INSPECTOR', label: 'Đơn vị Kiểm định' },
                  { id: 'LOGISTICS', label: 'Đơn vị Vận chuyển' },
                  { id: 'DISTRIBUTOR', label: 'Đơn vị Phân phối' },
                ].map((r) => {
                  const isChecked = selectedRoleForUpdate === r.id;
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="updateRoleOption"
                        value={r.id}
                        checked={isChecked}
                        onChange={() => setSelectedRoleForUpdate(r.id)}
                        className="border-slate-300 text-purple-600 focus:ring-purple-500"
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
                    <span>Đang đồng bộ vai trò On-chain & Cơ sở dữ liệu...</span>
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

      {/* Registration Form (Chỉ hiển thị cho người dùng thông thường khi ví chưa đăng ký hoặc bị từ chối) */}
      {!isAdmin && (!existingAccount || existingAccount.status === 'REJECTED') && (
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
            <label className="block text-slate-700 font-bold mb-2">
              Vai trò đăng ký tham gia (Chọn 1 trong 4 vai trò) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'PRODUCER', label: 'Đơn vị Sản xuất' },
                { id: 'INSPECTOR', label: 'Đơn vị Kiểm định' },
                { id: 'LOGISTICS', label: 'Đơn vị Vận chuyển' },
                { id: 'DISTRIBUTOR', label: 'Đơn vị Phân phối' },
              ].map((r) => {
                const isChecked = formData.role === r.id;
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="registerRoleSelection"
                      value={r.id}
                      checked={isChecked}
                      onChange={() => setFormData({ ...formData, role: r.id })}
                      className="border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Số điện thoại liên hệ *</label>
              <input
                type="tel"
                required
                placeholder="Ví dụ: 0912345678"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Địa chỉ Email liên hệ *</label>
              <input
                type="email"
                required
                placeholder="Ví dụ: contact@nongsan.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !account}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold transition text-xs"
          >
            {loading ? 'Đang gửi...' : 'Gửi Hồ Sơ Đăng Ký'}
          </button>
        </form>
      )}
    </div>
  );
}
