export const HARDCODED_ADMIN_WALLETS = [
  '0xd308d759F0986aADe715d8B2bf18d58c1680b9CC'.toLowerCase(),
  '0x33F34938981588Df03c8eB291C6abe75612eA49a'.toLowerCase(),
];

export function isHardcodedAdmin(wallet?: string | null): boolean {
  if (!wallet) return false;
  return HARDCODED_ADMIN_WALLETS.includes(wallet.toLowerCase());
}
