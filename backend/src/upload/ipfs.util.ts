import * as crypto from 'crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Mã hóa Base58 chuẩn (Bitcoin / IPFS Base58btc)
 */
export function encodeBase58(buffer: Buffer): string {
  const digits: number[] = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) str += '1';
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
}

/**
 * Mã hóa Protobuf Varint
 */
function encodeVarint(n: number): Buffer {
  const bytes: number[] = [];
  while (n >= 0x80) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n & 0x7f);
  return Buffer.from(bytes);
}

/**
 * Tính mã định danh IPFS CIDv0 chuẩn (Qm...) theo định dạng UnixFS DAG-PB
 * Không phụ thuộc bên thứ 3, hoạt động offline / trên mọi môi trường
 */
export function computeIpfsCidV0(content: Buffer | string): string {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  // UnixFS: field 1 Type=File(2) [0x08, 0x02], field 2 Data [0x12, len, buf], field 3 filesize [0x18, len]
  const unixfs = Buffer.concat([
    Buffer.from([0x08, 0x02, 0x12]),
    encodeVarint(buf.length),
    buf,
    Buffer.from([0x18]),
    encodeVarint(buf.length),
  ]);
  // DAG-PB Node: field 1 Data [0x0a, len, unixfs]
  const pbNode = Buffer.concat([
    Buffer.from([0x0a]),
    encodeVarint(unixfs.length),
    unixfs,
  ]);
  const sha256Hash = crypto.createHash('sha256').update(pbNode).digest();
  // Multihash prefix: 0x12 (sha2-256), 0x20 (32 bytes length)
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256Hash]);
  return encodeBase58(multihash);
}

/**
 * Tự động trích xuất CID nếu URL là đường dẫn IPFS hoặc Pinata
 * Ví dụ: https://gateway.pinata.cloud/ipfs/Qm... -> Qm...
 * ipfs://Qm... -> Qm...
 */
export function extractCidFromUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Dạng ipfs://<CID>
  const ipfsMatch = trimmed.match(/^ipfs:\/\/([a-zA-Z0-9]{46,62})/i);
  if (ipfsMatch) return ipfsMatch[1];

  // Dạng URL chứa /ipfs/<CID>
  const gatewayMatch = trimmed.match(/\/ipfs\/([a-zA-Z0-9]{46,62})/i);
  if (gatewayMatch) return gatewayMatch[1];

  // Nếu bản thân chuỗi là 1 CID hợp lệ (CIDv0 bắt đầu bằng Qm dài 46 ký tự hoặc CIDv1 bafy...)
  if (/^Qm[a-zA-Z0-9]{44}$/.test(trimmed) || /^bafy[a-zA-Z0-9]{55,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Hỗ trợ đồng bộ trực tiếp lên Pinata IPFS nếu người dùng cấu hình PINATA_JWT hoặc PINATA_API_KEY
 */
export async function pinFileToPinata(
  fileBuffer: Buffer,
  filename: string,
): Promise<{ cid: string; gatewayUrl?: string } | null> {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

  if (!pinataJwt && !(pinataApiKey && pinataSecretKey)) {
    return null;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)]);
    formData.append('file', blob, filename);

    const headers: Record<string, string> = {};
    if (pinataJwt) {
      headers['Authorization'] = `Bearer ${pinataJwt}`;
    } else if (pinataApiKey && pinataSecretKey) {
      headers['pinata_api_key'] = pinataApiKey;
      headers['pinata_secret_api_key'] = pinataSecretKey;
    }

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      console.warn('Pinata upload failed with status:', res.status);
      return null;
    }

    const data: any = await res.json();
    if (data && data.IpfsHash) {
      const gateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
      return {
        cid: data.IpfsHash,
        gatewayUrl: `${gateway}/${data.IpfsHash}`,
      };
    }
  } catch (err: any) {
    console.warn('Pinata pinning error:', err.message);
  }

  return null;
}
