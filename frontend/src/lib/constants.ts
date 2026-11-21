import deploymentData from './contract-deployment.json';
import { ethers } from 'ethers';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
const cleanUrl = rawApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
export const CONTRACT_ABI = deploymentData.abi;

// Cache cấu hình động đọc từ CSDL (SystemConfig) qua API
let cachedConfig: Record<string, string> | null = null;
let lastFetchTime = 0;

export async function fetchSystemConfig(forceRefresh: boolean = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedConfig && now - lastFetchTime < 30000) {
    return cachedConfig;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/config`);
    if (res.ok) {
      cachedConfig = await res.json();
      lastFetchTime = now;
      return cachedConfig || {};
    }
  } catch (e) {}
  return cachedConfig || {};
}

export async function getDynamicContractAddress(): Promise<string> {
  const cfg = await fetchSystemConfig();
  return cfg.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deploymentData.contractAddress;
}

export async function getDynamicRpcUrl(): Promise<string> {
  const cfg = await fetchSystemConfig();
  return cfg.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com';
}

export async function getDynamicExplorerUrl(): Promise<string> {
  const cfg = await fetchSystemConfig();
  return cfg.EXPLORER_URL || 'https://amoy.polygonscan.com';
}

// 2 địa chỉ ví Admin cố định của hệ thống
export const HARDCODED_ADMIN_WALLETS = [
  '0xd308d759F0986aADe715d8B2bf18d58c1680b9CC'.toLowerCase(),
  '0x33F34938981588Df03c8eB291C6abe75612eA49a'.toLowerCase(),
];

export function isHardcodedAdmin(addr?: string | null): boolean {
  if (!addr) return false;
  return HARDCODED_ADMIN_WALLETS.includes(addr.toLowerCase());
}

export async function getDynamicAdminWallets(): Promise<string[]> {
  return HARDCODED_ADMIN_WALLETS;
}

export async function checkIsAdminWallet(addr?: string | null): Promise<boolean> {
  return isHardcodedAdmin(addr);
}

export const ROLE_HASHES = {
  ADMIN: ethers.ZeroHash,
  PRODUCER: ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE")),
  INSPECTOR: ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE")),
  LOGISTICS: ethers.keccak256(ethers.toUtf8Bytes("LOGISTICS_ROLE")),
  DISTRIBUTOR: ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")),
};

export const ROLE_LABELS: Record<string, string> = {
  PRODUCER: 'Đơn vị Sản xuất',
  INSPECTOR: 'Đơn vị Kiểm định',
  LOGISTICS: 'Đơn vị Vận chuyển',
  DISTRIBUTOR: 'Đơn vị Phân phối',
  ADMIN: 'Quản trị viên',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Đã sản xuất', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  INSPECTED: { label: 'Đã kiểm định', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  DELIVERED: { label: 'Đã tiếp nhận', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

const padZero = (n: number | string) => n.toString().padStart(2, '0');

/**
 * Format ngày theo định dạng chuẩn: dd/mm/yyyy
 */
export function formatDate(dateInput: any): string {
  if (!dateInput) return 'Chưa cập nhật';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-');
    return `${padZero(d)}/${padZero(m)}/${y}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Chưa cập nhật';
  return `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Format thời gian theo định dạng chuẩn: hh:mm:ss
 */
export function formatTime(dateInput: any): string {
  if (!dateInput) return 'Chưa cập nhật';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Chưa cập nhật';
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())}`;
}

/**
 * Format ngày và giờ theo định dạng chuẩn: hh:mm:ss dd/mm/yyyy
 */
export function formatDateTime(dateInput: any): string {
  if (!dateInput) return 'Chưa cập nhật';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Chưa cập nhật';
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())} ${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatRelativeTime(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return 'Chưa cập nhật';
  const date = typeof dateInput === 'number'
    ? new Date(dateInput * (dateInput < 10000000000 ? 1000 : 1))
    : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Chưa cập nhật';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'Vừa xong';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay <= 30) return `${diffDay} ngày trước`;

  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());
  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

