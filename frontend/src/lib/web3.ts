import { ethers } from 'ethers';
import {
  CONTRACT_ABI,
  getDynamicContractAddress,
  getDynamicRpcUrl,
  getDynamicExplorerUrl,
} from './constants';

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
  const rpcUrl = await getDynamicRpcUrl();
  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function ensurePolygonAmoyNetwork() {
  if (typeof window === 'undefined' || !window.ethereum) return;
  const rpcUrl = await getDynamicRpcUrl();
  const explorerUrl = await getDynamicExplorerUrl();
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13882' }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x13882',
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
              rpcUrls: [rpcUrl, 'https://polygon-amoy-bor-rpc.publicnode.com'],
              blockExplorerUrls: [explorerUrl.endsWith('/') ? explorerUrl : `${explorerUrl}/`],
            },
          ],
        });
      } catch (addError) {}
    }
  }
}

/**
 * Trả về cấu hình gas override cho Polygon Amoy Testnet.
 * Mạng Polygon Amoy yêu cầu gas tip cap (maxPriorityFeePerGas) tối thiểu 25 Gwei (25_000_000_000 wei).
 * Chúng ta đặt 30 - 35 Gwei để giao dịch luôn được validator chấp nhận ngay lập tức.
 */
export async function getGasOverrides() {
  const minTipCap = ethers.parseUnits('30', 'gwei');
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const feeData = await provider.getFeeData();
      const priorityFee = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minTipCap
        ? feeData.maxPriorityFeePerGas
        : minTipCap;

      const baseFee = feeData.gasPrice ? feeData.gasPrice * BigInt(2) : ethers.parseUnits('35', 'gwei');
      const maxFee = baseFee + priorityFee;

      return {
        maxPriorityFeePerGas: priorityFee,
        maxFeePerGas: maxFee,
      };
    }
  } catch (e) {
    console.warn('Lỗi lấy feeData, áp dụng mức fallback:', e);
  }
  return {
    maxPriorityFeePerGas: minTipCap,
    maxFeePerGas: ethers.parseUnits('65', 'gwei'),
  };
}

export async function getSigner() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Vui lòng cài đặt tiện ích ví MetaMask trên trình duyệt!');
  }
  await ensurePolygonAmoyNetwork();
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

export async function getContract(withSigner = false) {
  const contractAddress = await getDynamicContractAddress();
  if (withSigner) {
    const signer = await getSigner();
    return new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
  }
  // Cho thao tác đọc (read-only): luôn dùng RPC chính thức của Polygon Amoy để xác thực toàn vẹn
  const provider = await getProvider();
  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
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
