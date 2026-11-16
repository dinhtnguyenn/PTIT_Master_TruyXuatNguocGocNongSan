'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, QrCode, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL, STAGE_LABELS } from '../../lib/constants';

export default function TraceIndexPage() {
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
        console.error(err);
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
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-3xl bg-brand-100 text-brand-700 mx-auto flex items-center justify-center mb-4">
          <QrCode className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Tra cứu & Kiểm chứng Nguồn gốc Nông sản
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
          Nhập mã lô sản phẩm hoặc quét tem QR trên bao bì để kiểm tra toàn bộ dữ liệu nhật ký canh tác, chứng nhận an toàn và chứng minh Blockchain.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập mã lô sản phẩm (ví dụ: BATCH-2024-...) hoặc tên nông sản"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Đang tải danh sách nông sản...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 p-8">
          Không tìm thấy lô hàng nào phù hợp với từ khóa &apos;{searchTerm}&apos;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((batch) => (
            <div
              key={batch.batchId}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {batch.batchId}
                  </span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                      STAGE_LABELS[batch.stage]?.color || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STAGE_LABELS[batch.stage]?.label || batch.stage}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900">{batch.productName}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chủng loại: {batch.category} • Khối lượng: {batch.weight} kg
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Địa điểm: {batch.productionLocation}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">
                  Ngày thu hoạch: {new Date(batch.harvestDate).toLocaleDateString('vi-VN')}
                </span>
                <Link
                  href={`/trace/${batch.batchId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl transition"
                >
                  Xem Nguồn Gốc <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
