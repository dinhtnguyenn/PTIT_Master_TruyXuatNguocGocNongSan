'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, Wallet, LogOut } from 'lucide-react';
import {
  connectWallet,
  disconnectWallet,
  isWalletDisconnected,
  truncateAddress,
  getContract,
} from '../lib/web3';
import { API_BASE_URL } from '../lib/constants';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function checkUser(walletAddr: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${walletAddr}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          if (data.isAdmin || data.roles?.includes('ADMIN') || data.role === 'ADMIN') {
            setRole('ADMIN');
          } else if (Array.isArray(data.roles) && data.roles.length > 1) {
            setRole(data.roles.join(', '));
          } else {
            setRole(data.role || (data.roles && data.roles[0]) || null);
          }
          setStatus(data.status);
          return;
        }
      }
      try {
        const contract = await getContract(false);
        const onChainRole = await contract.getUserRole(walletAddr);
        if (onChainRole && onChainRole !== 'NONE') {
          setRole(onChainRole);
          setStatus('APPROVED');
          return;
        }
      } catch (err) {}
      setRole(null);
      setStatus(null);
    } catch (e) {}
  }

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await checkUser(addr);
    } catch (err: any) {
      alert(err.message || 'Không thể kết nối ví');
    } finally {
      setIsConnecting(false);
    }
  }

  function handleLogout() {
    disconnectWallet();
    setAccount(null);
    setRole(null);
    setStatus(null);
    router.push('/');
  }

  useEffect(() => {
    // Nếu người dùng đã bấm Đăng xuất trước đó, không tự động nhận diện lại
    if (isWalletDisconnected()) {
      return;
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            checkUser(accounts[0]);
          }
        })
        .catch(() => {});

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (isWalletDisconnected()) return;
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkUser(accounts[0]);
        } else {
          setAccount(null);
          setRole(null);
          setStatus(null);
        }
      });
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
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, []);

  const navLinks = [
    { href: '/trace', label: 'Tra cứu Nguồn gốc' },
    { href: '/portal', label: 'Nhập liệu Chuỗi cung ứng' },
    { href: '/register', label: 'Đăng ký Ví' },
    { href: '/admin', label: 'Quản trị' },
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
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {role} {status === 'PENDING' ? '(Chờ duyệt)' : ''}
                  </span>
                )}
                <div className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono">
                  {truncateAddress(account)}
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
