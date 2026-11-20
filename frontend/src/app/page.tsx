'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, QrCode, ArrowRight } from 'lucide-react';
import { API_BASE_URL, STAGE_LABELS, formatRelativeTime } from '../lib/constants';
import QrScannerModal from '../components/QrScannerModal';

export default function HomePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch(`${API_BASE_URL}/batches`);
        if (res.ok) {
          const data = await res.json();
          setBatches(data);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    loadBatches();
  }, []);

  const filtered = batches.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.batchId.toLowerCase().includes(term) ||
      b.productName.toLowerCase().includes(term) ||
      (b.category && b.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Search & Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Tra Cứu Nguồn Gốc Nông Sản
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Nhập mã lô sản phẩm hoặc bấm quét tem mã QR trên bao bì để kiểm tra xuất xứ và xác thực trên Blockchain.
        </p>

        <div className="max-w-xl mx-auto flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập mã lô hoặc tên sản phẩm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          {/* Nút Quét mã QR */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition shadow-sm"
          >
            <QrCode className="w-4 h-4 text-emerald-600" /> Quét mã QR
          </button>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs">
          <Link
            href="/portal"
            className="text-slate-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            Nhập liệu Chuỗi cung ứng
          </Link>
          <Link
            href="/register"
            className="text-slate-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            Đăng ký Vai trò
          </Link>
        </div>
      </div>

      {/* Batch List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Danh sách Lô hàng trên hệ thống ({filtered.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Đang tải dữ liệu...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            Không tìm thấy lô hàng nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((batch) => (
              <div
                key={batch.batchId}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {batch.batchId}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                        STAGE_LABELS[batch.stage]?.color || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STAGE_LABELS[batch.stage]?.label || batch.stage}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">{batch.productName}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Loại: {batch.category || '—'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Cập nhật: {formatRelativeTime(batch.updatedAt || batch.createdAt || batch.harvestDate)}
                  </span>
                  <Link
                    href={`/trace/${batch.batchId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
