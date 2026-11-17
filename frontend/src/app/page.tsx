'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, QrCode, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_BASE_URL, STAGE_LABELS } from '../lib/constants';

export default function HomePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filtered = batches.filter(
    (b) =>
      b.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Search & Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Tra Cứu Nguồn Gốc Nông Sản
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Nhập mã lô sản phẩm hoặc quét mã QR trên bao bì để kiểm tra thông tin xuất xứ và xác thực trên Blockchain.
        </p>

        <div className="max-w-xl mx-auto flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập mã lô (VD: BATCH-...) hoặc tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          {searchTerm && (
            <Link
              href={`/trace/${searchTerm.trim()}`}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              Tra cứu <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs">
          <Link
            href="/portal"
            className="text-slate-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            Nhập liệu Chuỗi cung ứng (Theo ví)
          </Link>
          <Link
            href="/register"
            className="text-slate-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            Đăng ký ví mới
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
                    Loại: {batch.category} • Khối lượng: {batch.weight} kg ({batch.quantity} đơn vị)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nơi sản xuất: {batch.productionLocation}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Thu hoạch: {new Date(batch.harvestDate).toLocaleDateString('vi-VN')}
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
    </div>
  );
}
