import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

export function computeSha256(data: any): string {
  const canonicalString = canonicalizeJson(data);
  return ethers.sha256(ethers.toUtf8Bytes(canonicalString));
}

export async function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-amoy.drpc.org');
}

export async function getSigner() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Vui lòng cài đặt tiện ích ví MetaMask trên trình duyệt!');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

export async function getContract(withSigner = false) {
  if (withSigner) {
    const signer = await getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
  const provider = await getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

// Kiểm tra cờ ngắt kết nối trong localStorage
export function isWalletDisconnected(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('wallet_disconnected') === 'true';
}

export async function connectWallet(): Promise<string> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_disconnected');
  }
  const signer = await getSigner();
  const addr = await signer.getAddress();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallet_connected', { detail: addr }));
  }
  return addr;
}

export function disconnectWallet() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wallet_disconnected', 'true');
    window.dispatchEvent(new Event('wallet_disconnected'));
  }
}

export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
