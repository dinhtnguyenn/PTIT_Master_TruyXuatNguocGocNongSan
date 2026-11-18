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

export async function getDynamicAdminWallets(): Promise<string[]> {
  const cfg = await fetchSystemConfig();
  if (cfg.ADMIN_WALLETS) {
    return cfg.ADMIN_WALLETS.split(',').map((w) => w.trim().toLowerCase());
  }
  return [];
}

export async function checkIsAdminWallet(addr?: string | null): Promise<boolean> {
  if (!addr) return false;
  const list = await getDynamicAdminWallets();
  return list.includes(addr.toLowerCase());
}

export const ROLE_HASHES = {
  ADMIN: ethers.ZeroHash,
  PRODUCER: ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE")),
  INSPECTOR: ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE")),
  LOGISTICS: ethers.keccak256(ethers.toUtf8Bytes("LOGISTICS_ROLE")),
  DISTRIBUTOR: ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")),
};

export const ROLE_LABELS: Record<string, string> = {
  PRODUCER: 'Đơn vị Sản xuất (Producer)',
  INSPECTOR: 'Đơn vị Kiểm định (Inspector)',
  LOGISTICS: 'Đơn vị Vận chuyển (Logistics)',
  DISTRIBUTOR: 'Đơn vị Phân phối (Distributor)',
  ADMIN: 'Quản trị viên (Admin)',
};

export const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Đã sản xuất', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  INSPECTED: { label: 'Đã kiểm định', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  DELIVERED: { label: 'Đã tiếp nhận', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};
