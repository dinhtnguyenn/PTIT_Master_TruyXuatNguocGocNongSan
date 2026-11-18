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
 * Mạng Polygon Amoy yêu cầu gas tip cap (maxPriorityFeePerGas) tối thiểu 25-30 Gwei.
 * Đặt mức sàn 35 Gwei để giao dịch luôn vượt ngưỡng validator và tránh bị từ chối RPC -32603.
 */
export async function getGasOverrides() {
  const minTipCap = ethers.parseUnits('35', 'gwei');
  const minMaxFee = ethers.parseUnits('100', 'gwei');
  try {
    const readProvider = await getProvider();
    const feeData = await readProvider.getFeeData();
    const networkPriority = feeData.maxPriorityFeePerGas
      ? (feeData.maxPriorityFeePerGas * BigInt(125)) / BigInt(100)
      : minTipCap;
    const priorityFee = networkPriority > minTipCap ? networkPriority : minTipCap;

    const baseFee = feeData.gasPrice ? feeData.gasPrice * BigInt(2) : ethers.parseUnits('40', 'gwei');
    const calculatedMax = baseFee + priorityFee;
    const maxFee = calculatedMax > minMaxFee ? calculatedMax : minMaxFee;

    return {
      maxPriorityFeePerGas: priorityFee,
      maxFeePerGas: maxFee,
    };
  } catch (e) {
    console.warn('Lỗi lấy feeData, áp dụng mức fallback:', e);
  }
  return {
    maxPriorityFeePerGas: minTipCap,
    maxFeePerGas: minMaxFee,
  };
}

/**
 * Chuyển đổi mã lỗi Blockchain / MetaMask / JSON-RPC sang thông báo Tiếng Việt thân thiện.
 */
export function formatBlockchainError(err: any): string {
  const raw = [
    err?.reason,
    err?.shortMessage,
    err?.message,
    err?.data,
    err?.info?.error?.message,
    String(err?.code || ''),
    String(err?.info?.error?.code || ''),
  ]
    .filter(Boolean)
    .join(' ');

  if (raw.includes('ACTION_REJECTED') || raw.includes('user rejected') || raw.includes('4001')) {
    return 'Bạn đã hủy xác nhận giao dịch trên ví MetaMask. Dữ liệu chưa được lưu vào hệ thống.';
  }
  if (raw.includes('0xe2517d3f') || raw.includes('e2517d3f') || raw.includes('AccessControlUnauthorizedAccount')) {
    return 'Ví đang kết nối chưa được cấp quyền tương ứng trên Hợp đồng thông minh. Vui lòng liên hệ Quản trị viên phê duyệt ví trước khi thao tác.';
  }
  if (raw.includes('Batch already exists')) {
    return 'Mã lô hàng này đã tồn tại trên Blockchain. Vui lòng sử dụng mã lô hàng khác.';
  }
  if (raw.includes('Batch not found')) {
    return 'Không tìm thấy mã lô hàng này trên Blockchain. Lô hàng có thể chưa được ghi nhận thành công ở bước sản xuất.';
  }
  if (raw.includes('Invalid stage') || raw.includes('must be inspected') || raw.includes('must be in transit')) {
    return 'Trạng thái hiện tại của lô hàng trên Blockchain không khớp để thực hiện bước này.';
  }
  if (raw.includes('insufficient funds')) {
    return 'Số dư POL trong ví không đủ để thanh toán phí giao dịch trên mạng Polygon Amoy. Dữ liệu chưa được lưu vào hệ thống.';
  }
  if (raw.includes('-32603') || raw.includes('Internal JSON-RPC error') || raw.includes('could not coalesce error')) {
    return 'Lỗi kết nối mạng Blockchain (JSON-RPC -32603). Giao dịch chưa được ghi nhận và dữ liệu chưa được lưu vào hệ thống. Vui lòng kiểm tra số dư POL, đổi RPC mạng Polygon Amoy trên MetaMask sang https://polygon-amoy-bor-rpc.publicnode.com (hoặc vào Cài đặt MetaMask -> Nâng cao -> Xóa dữ liệu tab hoạt động) rồi thử lại.';
  }
  return err?.reason || err?.shortMessage || err?.message || 'Giao dịch Blockchain không thành công. Dữ liệu chưa được lưu vào hệ thống.';
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
