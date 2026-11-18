import deploymentData from './contract-deployment.json';
import { ethers } from 'ethers';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
const cleanUrl = rawApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deploymentData.contractAddress;
export const CONTRACT_ABI = deploymentData.abi;
export const ADMIN_ADDRESSES = [
  '0x33F34938981588Df03c8eB291C6abe75612eA49a'.toLowerCase(),
  '0xd308d759F0986aADe715d8B2bf18d58c1680b9CC'.toLowerCase(),
];

export const ADMIN_ADDRESS = '0xd308d759F0986aADe715d8B2bf18d58c1680b9CC';

export function isAdminAddress(addr?: string | null): boolean {
  if (!addr) return false;
  return ADMIN_ADDRESSES.includes(addr.toLowerCase());
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
