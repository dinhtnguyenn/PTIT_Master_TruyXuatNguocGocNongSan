'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, Wallet, LogOut, User } from 'lucide-react';
import {
  connectWallet,
  disconnectWallet,
  isWalletDisconnected,
  truncateAddress,
  getContract,
} from '../lib/web3';
import { API_BASE_URL, isHardcodedAdmin, ROLE_LABELS, STATUS_LABELS } from '../lib/constants';
import { useToast } from './ToastProvider';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDbAdmin, setIsDbAdmin] = useState(false);

  async function checkUser(walletAddr: string) {
    const isAdm = isHardcodedAdmin(walletAddr);
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${walletAddr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          const rawRoles: string[] = Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : (data.role ? [data.role] : []);
          const isUserAdmin = isAdm || !!data.isAdmin || rawRoles.includes('ADMIN');
          setIsDbAdmin(isUserAdmin);
          const supplyChainRoles = rawRoles
            .filter((r) => r !== 'ADMIN')
            .map((r) => ROLE_LABELS[r] || r)
            .join(', ');
          setRole(supplyChainRoles || null);
          setStatus(data.status);
          return;
        }
      }
      if (isAdm) {
        setIsDbAdmin(true);
        setRole(null);
        setStatus('APPROVED');
        return;
      }
      setIsDbAdmin(false);
      setRole(null);
      setStatus(null);
    } catch (e) {
      if (isAdm) {
        setIsDbAdmin(true);
        setRole(null);
        setStatus('APPROVED');
      }
    }
  }

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await checkUser(addr);
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối ví MetaMask', 'Lỗi kết nối ví');
    } finally {
      setIsConnecting(false);
    }
  }

  function handleLogout() {
    disconnectWallet();
    setAccount(null);
    setRole(null);
    setStatus(null);
    setIsDbAdmin(false);
    router.push('/');
  }

  useEffect(() => {
    // Chỉ tự động nhận diện ví khi người dùng chưa bấm Đăng xuất
    if (!isWalletDisconnected() && typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            checkUser(accounts[0]);
          }
        })
        .catch(() => {});
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (isWalletDisconnected()) return;
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        checkUser(accounts[0]);
      } else {
        setAccount(null);
        setRole(null);
        setStatus(null);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    function onDisconnected() {
      setAccount(null);
      setRole(null);
      setStatus(null);
    }

    function onConnected(e: any) {
      if (e.detail) {
        setAccount(e.detail);
        checkUser(e.detail);
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

  // Tự động đồng bộ lại badge vai trò & trạng thái khi chuyển trang hoặc có thay đổi duyệt/đăng ký tài khoản
  useEffect(() => {
    if (!account) return;
    checkUser(account);

    function onAccountUpdated() {
      if (account) checkUser(account);
    }

    window.addEventListener('account_updated', onAccountUpdated);
    return () => {
      window.removeEventListener('account_updated', onAccountUpdated);
    };
  }, [account, pathname]);

  const isAdmin = !!account && (isHardcodedAdmin(account) || isDbAdmin);

  const navLinks = [
    { href: '/trace', label: 'Tra cứu Nguồn gốc' },
    { href: '/portal', label: 'Nhập liệu Chuỗi cung ứng' },
    { href: '/register', label: 'Đăng ký Vai trò' },
    ...(isAdmin ? [{ href: '/admin', label: 'Quản trị Hệ thống' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Agri<span className="text-emerald-600">Trace</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {account ? (
              <div className="flex items-center gap-2">
                {role && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                      status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {role}
                    {status === 'PENDING' ? ' (Chờ duyệt)' : status === 'REJECTED' ? ' (Từ chối)' : ''}
                  </span>
                )}
                <div
                  title={isAdmin ? `Quản trị viên: ${account}` : `Địa chỉ ví: ${account}`}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5 transition ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-900 border border-purple-200 font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span>{truncateAddress(account)}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất khỏi phiên làm việc"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition font-medium border border-slate-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
              >
                <Wallet className="w-3.5 h-3.5" />
                {isConnecting ? 'Đang kết nối...' : 'Kết nối Ví'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
