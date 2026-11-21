'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { truncateAddress } from '../lib/web3';

interface CopyableAddressProps {
  address?: string | null;
  truncate?: boolean;
  className?: string;
  showIcon?: boolean;
  title?: string;
  prefix?: string;
}

export default function CopyableAddress({
  address,
  truncate = true,
  className = '',
  showIcon = true,
  title,
  prefix,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return <span className="text-slate-400 italic">Chưa cập nhật</span>;
  }

  const displayText = truncate ? truncateAddress(address) : address;

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = address!;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || `Nhấp để sao chép địa chỉ ví:\n${address}`}
      className={`inline-flex items-center gap-1.5 font-mono cursor-pointer transition-all duration-150 group px-1.5 py-0.5 -mx-1 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-left border border-transparent hover:border-emerald-200 select-all ${className}`}
    >
      {prefix && <span className="font-sans font-normal text-slate-500 mr-0.5">{prefix}</span>}
      <span className={copied ? 'text-emerald-700 font-semibold' : ''}>
        {displayText}
      </span>
      {showIcon && (
        <span className="shrink-0 transition-transform group-hover:scale-110">
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
          ) : (
            <Copy className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          )}
        </span>
      )}
    </button>
  );
}
