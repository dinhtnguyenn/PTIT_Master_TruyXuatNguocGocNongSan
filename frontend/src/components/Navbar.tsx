'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Wallet, ChevronRight, UserCheck, AlertCircle } from 'lucide-react';
import { connectWallet, truncateAddress, getContract } from '../lib/web3';
import { API_BASE_URL, ROLE_LABELS, ADMIN_ADDRESS } from '../lib/constants';

export default function Navbar() {
  const pathname = usePathname();
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function checkUser(walletAddr: string) {
    try {
      // 1. Kiểm tra nếu là Root Admin
      if (walletAddr.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        setRole('ADMIN');
        setStatus('APPROVED');
        return;
      }

      // 2. Kiểm tra API Backend
      const res = await fetch(`${API_BASE_URL}/accounts/me/${walletAddr}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setRole(data.role);
          setStatus(data.status);
          return;
        }
      }

      // 3. Kiểm tra trực tiếp trên Smart Contract
      try {
        const contract = await getContract(false);
        const onChainRole = await contract.getUserRole(walletAddr);
        if (onChainRole && onChainRole !== 'NONE') {
          setRole(onChainRole);
          setStatus('APPROVED');
          return;
        }
      } catch (err) {
        console.warn('Smart contract role read error:', err);
      }

      setRole(null);
      setStatus(null);
    } catch (e) {
      console.error(e);
    }
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkUser(accounts[0]);
          }
        })
        .catch(console.error);

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
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
  }, []);

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/trace', label: 'Tra cứu QR' },
    { href: '/portal', label: 'Cổng Chuỗi Cung Ứng' },
    { href: '/register', label: 'Đăng ký Ví' },
    { href: '/admin', label: 'Quản trị (Admin)' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-brand-600 text-white p-2 rounded-xl shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                PTIT <span className="text-brand-600">AgriTrace</span>
              </span>
              <span className="text-[10px] text-slate-600 font-medium tracking-wide uppercase block">
                Truy xuất Nguồn gốc Blockchain
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {account ? (
              <div className="flex items-center gap-2">
                {role ? (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {role} {status === 'PENDING' ? '(Chờ duyệt)' : ''}
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                    Chưa đăng ký
                  </span>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {truncateAddress(account)}
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-sm font-medium transition shadow-sm"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Đang kết nối...' : 'Kết nối ví MetaMask'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
