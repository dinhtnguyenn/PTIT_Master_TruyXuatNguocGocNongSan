import { ethers } from 'ethers';

/**
 * Sắp xếp các key của object theo thứ tự bảng chữ cái để tạo chuỗi JSON chuẩn tắc (canonical JSON),
 * đảm bảo hàm băm (hash) luôn đồng nhất giữa Frontend và Backend.
 */
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

/**
 * Tính mã băm SHA-256 chuẩn (dạng bytes32 hex: 0x...) từ payload
 */
export function computeSha256(data: any): string {
  const canonicalString = canonicalizeJson(data);
  return ethers.sha256(ethers.toUtf8Bytes(canonicalString));
}
