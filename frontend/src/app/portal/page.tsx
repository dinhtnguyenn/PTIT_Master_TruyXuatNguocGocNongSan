'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  QrCode,
  Camera,
  Upload,
  AlertCircle,
  ExternalLink,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import QrScannerModal from '../../components/QrScannerModal';
import {
  connectWallet,
  truncateAddress,
  isWalletDisconnected,
  sendContractTx,
  formatBlockchainError,
  getProvider,
} from '../../lib/web3';
import {
  API_BASE_URL,
  ROLE_LABELS,
  STAGE_LABELS,
  isHardcodedAdmin,
  CONTRACT_ABI,
  getDynamicContractAddress,
  getDynamicExplorerUrl,
} from '../../lib/constants';
import { useToast } from '../../components/ToastProvider';
import { ethers } from 'ethers';

export default function SupplyChainPortalPage() {
  const { toast } = useToast();
  const [account, setAccount] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [statusAlert, setStatusAlert] = useState<{
    type: 'success' | 'error';
    message: string;
    txHash?: string;
    batchId?: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Quét mã QR & Kiểm tra lô hàng Blockchain & Thứ tự quy trình
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScannerRole, setActiveScannerRole] = useState<'INSPECTOR' | 'LOGISTICS' | 'DISTRIBUTOR'>('INSPECTOR');
  const [batchVerifications, setBatchVerifications] = useState<
    Record<
      'INSPECTOR' | 'LOGISTICS' | 'DISTRIBUTOR',
      { loading: boolean; error: string | null; result: any | null; currentStage?: number }
    >
  >({
    INSPECTOR: { loading: false, error: null, result: null },
    LOGISTICS: { loading: false, error: null, result: null },
    DISTRIBUTOR: { loading: false, error: null, result: null },
  });

  function resetBatchVerification(targetRole: 'INSPECTOR' | 'LOGISTICS' | 'DISTRIBUTOR') {
    setBatchVerifications((prev) => ({
      ...prev,
      [targetRole]: { loading: false, error: null, result: null },
    }));
    if (targetRole === 'INSPECTOR') setInspectorForm((f) => ({ ...f, batchId: '' }));
    if (targetRole === 'LOGISTICS') setLogisticsForm((f) => ({ ...f, batchId: '' }));
    if (targetRole === 'DISTRIBUTOR') setDistributorForm((f) => ({ ...f, batchId: '' }));
  }

  // Modal hiển thị Mã QR cho Producer vừa tạo lô hàng
  const [createdBatchModal, setCreatedBatchModal] = useState<{
    isOpen: boolean;
    batchId: string;
    productName: string;
    qrDataUrl: string;
    txHash: string;
  } | null>(null);

  const [explorerUrl, setExplorerUrl] = useState<string>('https://amoy.polygonscan.com');

  useEffect(() => {
    getDynamicExplorerUrl().then((url) => {
      if (url) setExplorerUrl(url.replace(/\/+$/, ''));
    });
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (createdBatchModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [createdBatchModal]);

  // Form Producer (Bảng 1)
  const [producerForm, setProducerForm] = useState({
    batchId: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    productName: '',
    category: '',
    quantity: 100,
    weight: 200,
    seedOrigin: '',
    farmingSupplies: '',
    productionLocation: '',
    cultivationStartDate: '',
    harvestDate: '',
    productImageUrl: '',
  });

  // Form Inspector (Bảng 2)
  const [inspectorForm, setInspectorForm] = useState({
    batchId: '',
    inspectionResult: 'Đạt tiêu chuẩn an toàn',
    inspectionCriteria: 'Dư lượng thuốc BVTV, vi sinh vật',
    certificateCode: '',
    certificateType: 'VietGAP',
    issuingAuthority: '',
    issuedDate: '',
    expiryDate: '',
    certImageUrl: '',
  });

  // Form Logistics (Bảng 3)
  const [logisticsForm, setLogisticsForm] = useState({
    batchId: '',
    transporterName: '',
    transporterContact: '',
    transporterType: 'Tổ chức',
    shippingCode: `SHIP-${Math.floor(100000 + Math.random() * 900000)}`,
    originLocation: '',
    destLocation: '',
    departureTime: '',
    completionTime: '',
    temperature: 20.0,
    humidity: 70.0,
    storageNotes: '',
  });

  // Form Distributor (Bảng 4)
  const [distributorForm, setDistributorForm] = useState({
    batchId: '',
    distributorName: '',
    distributorContact: '',
    distributorType: 'Tổ chức',
    receivedTime: '',
    actualQuantity: 100,
    actualWeight: 200,
    receiptNotes: '',
  });

  async function loadUser(addr: string) {
    setLoading(true);
    const isAdm = isHardcodedAdmin(addr);
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/me/${addr}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.status || isAdm)) {
          if (isAdm) {
            data.status = 'APPROVED';
          }
          setUserData(data);
        } else if (isAdm) {
          setUserData({
            walletAddress: addr,
            role: 'PRODUCER',
            roles: ['PRODUCER'],
            status: 'APPROVED',
            organizationName: 'Quản trị Hệ thống',
          });
        } else {
          setUserData(null);
        }
      } else if (isAdm) {
        setUserData({
          walletAddress: addr,
          role: 'PRODUCER',
          roles: ['PRODUCER'],
          status: 'APPROVED',
          organizationName: 'Quản trị Hệ thống',
        });
      } else {
        setUserData(null);
      }
      loadBatches();
    } catch (err) {
      if (isAdm) {
        setUserData({
          walletAddress: addr,
          role: 'PRODUCER',
          roles: ['PRODUCER'],
          status: 'APPROVED',
          organizationName: 'Quản trị Hệ thống',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadBatches() {
    try {
      const res = await fetch(`${API_BASE_URL}/batches`);
      if (res.ok) {
        const data = await res.json();
        setActiveBatches(data);
      }
    } catch (err) {}
  }

  async function handleFileUpload(file: File, target: 'product' | 'cert') {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const fullUrl = `${API_BASE_URL.replace('/api', '')}${data.url}`;
        if (target === 'product') {
          setProducerForm((prev) => ({ ...prev, productImageUrl: fullUrl }));
        } else {
          setInspectorForm((prev) => ({ ...prev, certImageUrl: fullUrl }));
        }
        toast.success('Tải ảnh lên thành công!');
      } else {
        toast.error(data.message || 'Lỗi tải ảnh lên máy chủ', 'Lỗi tải ảnh');
      }
    } catch (err: any) {
      toast.error('Không thể tải ảnh: ' + err.message, 'Lỗi tải ảnh');
    }
  }

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await loadUser(addr);
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối ví MetaMask', 'Lỗi kết nối ví');
    }
  }

  useEffect(() => {
    if (isWalletDisconnected()) {
      setLoading(false);
    } else if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0 && !isWalletDisconnected()) {
            setAccount(accounts[0]);
            loadUser(accounts[0]);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (isWalletDisconnected()) return;
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadUser(accounts[0]);
        } else {
          setAccount(null);
          setUserData(null);
        }
      });
    } else {
      setLoading(false);
    }

    function onDisconnected() {
      setAccount(null);
      setUserData(null);
    }

    function onConnected(e: any) {
      if (e.detail) {
        setAccount(e.detail);
        loadUser(e.detail);
      }
    }

    window.addEventListener('wallet_disconnected', onDisconnected);
    window.addEventListener('wallet_connected', onConnected);
    return () => {
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, []);

  // QUÉT MÃ QR & ĐỐI SOÁT BLOCKCHAIN / THỨ TỰ QUY TRÌNH
  async function verifyBatch(scannedText: string, targetRole: 'INSPECTOR' | 'LOGISTICS' | 'DISTRIBUTOR') {
    let cleanId = scannedText.trim();
    if (cleanId.includes('/trace/')) {
      const parts = cleanId.split('/trace/');
      if (parts[1]) cleanId = parts[1].split('?')[0].split('#')[0].trim();
    }
    cleanId = decodeURIComponent(cleanId).trim();
    if (!cleanId) {
      toast.warning('Vui lòng quét mã QR của lô sản phẩm!');
      return;
    }

    setBatchVerifications((prev) => ({
      ...prev,
      [targetRole]: { loading: true, error: null, result: null },
    }));

    try {
      // 1. Kiểm tra trên Blockchain qua Smart Contract Polygon Amoy
      let existsOnChain = false;
      let onChainProof: any = null;
      try {
        const readProvider = await getProvider();
        const contractAddress = await getDynamicContractAddress();
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, readProvider);
        existsOnChain = await contract.exists(cleanId);
        if (existsOnChain) {
          onChainProof = await contract.getBatchProof(cleanId);
        }
      } catch (e) {
        console.warn('Lỗi đọc Smart Contract on-chain:', e);
      }

      // 2. Lấy dữ liệu chi tiết từ CSDL
      let dbBatch: any = null;
      try {
        const res = await fetch(`${API_BASE_URL}/batches/${cleanId}`);
        if (res.ok) {
          dbBatch = await res.json();
        }
      } catch (e) {}

      // 3. KIỂM TRA 1: Lô hàng đã lưu lên Blockchain chưa?
      if (!existsOnChain && (!dbBatch || !dbBatch.producerTxHash)) {
        const errorMsg = `Lô hàng '${cleanId}' chưa được lưu trên Blockchain. Vui lòng kiểm tra lại mã QR hoặc yêu cầu Nhà sản xuất hoàn tất việc ký và ghi nhận lô hàng.`;
        setBatchVerifications((prev) => ({
          ...prev,
          [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: undefined },
        }));
        toast.error(errorMsg, 'Chưa lưu trên Blockchain');
        if (targetRole === 'INSPECTOR') setInspectorForm((f) => ({ ...f, batchId: '' }));
        if (targetRole === 'LOGISTICS') setLogisticsForm((f) => ({ ...f, batchId: '' }));
        if (targetRole === 'DISTRIBUTOR') setDistributorForm((f) => ({ ...f, batchId: '' }));
        return;
      }

      // 4. KIỂM TRA 2: Xác định giai đoạn hiện tại (0: Created, 1: Inspected, 2: InTransit, 3: Delivered)
      let stageNum = 0;
      if (onChainProof && onChainProof.currentStage !== undefined) {
        stageNum = Number(onChainProof.currentStage);
      } else if (dbBatch) {
        if (dbBatch.stage === 'CREATED') stageNum = 0;
        else if (dbBatch.stage === 'INSPECTED') stageNum = 1;
        else if (dbBatch.stage === 'IN_TRANSIT') stageNum = 2;
        else if (dbBatch.stage === 'DELIVERED') stageNum = 3;
      }

      const STAGE_NAMES = [
        '1. Đã sản xuất',
        '2. Đã kiểm định',
        '3. Đang vận chuyển',
        '4. Đã phân phối',
      ];
      const stageText = STAGE_NAMES[stageNum] || 'Chưa xác định';

      // 5. Kiểm tra đúng giai đoạn tiếp nhận
      if (targetRole === 'INSPECTOR') {
        if (stageNum > 0) {
          const errorMsg = `Lô hàng '${cleanId}' đã được kiểm định trước đó (Giai đoạn hiện tại: ${stageText}). Không thể thực hiện kiểm định lại để tránh trùng lặp dữ liệu.`;
          setBatchVerifications((prev) => ({
            ...prev,
            [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: stageNum },
          }));
          toast.error(errorMsg, 'Không thể kiểm định');
          setInspectorForm((f) => ({ ...f, batchId: '' }));
          return;
        }
      } else if (targetRole === 'LOGISTICS') {
        if (stageNum < 1) {
          const errorMsg = `Lô hàng '${cleanId}' mới ở giai đoạn [${stageText}] và chưa được Đơn vị Kiểm định đánh giá chất lượng. Vui lòng hoàn thành khâu Kiểm định trước khi tiếp nhận vận chuyển.`;
          setBatchVerifications((prev) => ({
            ...prev,
            [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: stageNum },
          }));
          toast.error(errorMsg, 'Chưa đến lượt vận chuyển');
          setLogisticsForm((f) => ({ ...f, batchId: '' }));
          return;
        }
        if (stageNum > 1) {
          const errorMsg = `Lô hàng '${cleanId}' đã/đang được vận chuyển (Giai đoạn hiện tại: ${stageText}). Không thể tạo hành trình vận chuyển mới.`;
          setBatchVerifications((prev) => ({
            ...prev,
            [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: stageNum },
          }));
          toast.error(errorMsg, 'Lô hàng đã vận chuyển');
          setLogisticsForm((f) => ({ ...f, batchId: '' }));
          return;
        }
      } else if (targetRole === 'DISTRIBUTOR') {
        if (stageNum < 2) {
          const errorMsg = `Lô hàng '${cleanId}' hiện ở giai đoạn [${stageText}] và chưa qua khâu Vận chuyển. Vui lòng hoàn thành khâu Vận chuyển trước khi tiếp nhận phân phối.`;
          setBatchVerifications((prev) => ({
            ...prev,
            [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: stageNum },
          }));
          toast.error(errorMsg, 'Chưa đến lượt phân phối');
          setDistributorForm((f) => ({ ...f, batchId: '' }));
          return;
        }
        if (stageNum > 2) {
          const errorMsg = `Lô hàng '${cleanId}' đã được tiếp nhận phân phối hoàn tất trước đó. Toàn bộ chuỗi cung ứng của lô hàng đã kết thúc.`;
          setBatchVerifications((prev) => ({
            ...prev,
            [targetRole]: { loading: false, error: errorMsg, result: null, currentStage: stageNum },
          }));
          toast.error(errorMsg, 'Lô hàng đã hoàn tất');
          setDistributorForm((f) => ({ ...f, batchId: '' }));
          return;
        }
      }

      // 6. XÁC THỰC THÀNH CÔNG!
      const verifyData = {
        batchId: cleanId,
        productName: dbBatch?.productName || onChainProof?.productName || 'Nông sản',
        category: dbBatch?.category || '—',
        weight: dbBatch?.weight || 0,
        quantity: dbBatch?.quantity || 0,
        productionLocation: dbBatch?.productionLocation || '—',
        producerTxHash: dbBatch?.producerTxHash || null,
        stageNum,
        stageText,
        dbBatch,
        onChainProof,
      };

      setBatchVerifications((prev) => ({
        ...prev,
        [targetRole]: { loading: false, error: null, result: verifyData, currentStage: stageNum },
      }));

      // Tự động gán mã lô vào form tương ứng
      if (targetRole === 'INSPECTOR') setInspectorForm((f) => ({ ...f, batchId: cleanId }));
      if (targetRole === 'LOGISTICS') setLogisticsForm((f) => ({ ...f, batchId: cleanId }));
      if (targetRole === 'DISTRIBUTOR') setDistributorForm((f) => ({ ...f, batchId: cleanId }));

      toast.success(
        `Xác thực thành công lô hàng '${cleanId}'! Đã lưu Blockchain & đúng giai đoạn tiếp nhận.`,
        'Xác thực mã QR thành công'
      );
    } catch (err: any) {
      setBatchVerifications((prev) => ({
        ...prev,
        [targetRole]: { loading: false, error: err.message || 'Lỗi kiểm tra lô hàng', result: null },
      }));
      toast.error(err.message || 'Lỗi kiểm tra lô hàng', 'Lỗi xác thực');
    }
  }

  function renderQrBatchSection(formRole: 'INSPECTOR' | 'LOGISTICS' | 'DISTRIBUTOR') {
    const verification = batchVerifications[formRole];

    const roleActionText = formRole === 'INSPECTOR'
      ? 'kiểm định'
      : formRole === 'LOGISTICS'
      ? 'vận chuyển'
      : 'tiếp nhận phân phối';

    return (
      <div className="space-y-3">
        {/* 1. Trạng thái Đang kiểm tra */}
        {verification?.loading && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            <span>Đang xác thực thông tin lô hàng trên Smart Contract Polygon Amoy và kiểm tra giai đoạn tiếp nhận...</span>
          </div>
        )}

        {/* 2. Trạng thái Lỗi / Chưa lên Blockchain / Sai giai đoạn */}
        {verification?.error && !verification?.loading && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Không thể tiếp nhận lô hàng này!</p>
                <p className="text-[11px] text-rose-800 leading-relaxed">{verification.error}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-1.5 text-[10px] text-rose-800 font-semibold">
              <span className="text-slate-500 font-normal mr-0.5">Trình tự quy trình:</span>
              {[
                { index: 0, label: '1. Sản xuất' },
                { index: 1, label: '2. Kiểm định' },
                { index: 2, label: '3. Vận chuyển' },
                { index: 3, label: '4. Phân phối' },
              ].map((step, idx) => {
                const currentStage = verification?.currentStage;
                let stepClass = 'bg-white text-slate-400 border border-slate-200';

                if (currentStage !== undefined) {
                  if (step.index <= currentStage) {
                    // Giai đoạn đã thực hiện xong: tô màu xám
                    stepClass = 'bg-slate-200 text-slate-700 border border-slate-300 font-medium';
                  } else if (step.index === currentStage + 1) {
                    // Giai đoạn cần làm hiện tại: tô màu xanh
                    stepClass = 'bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold shadow-xs';
                  } else {
                    // Giai đoạn chưa tới: màu trắng
                    stepClass = 'bg-white text-slate-400 border border-slate-200';
                  }
                } else {
                  const roleIdx = formRole === 'INSPECTOR' ? 1 : formRole === 'LOGISTICS' ? 2 : 3;
                  if (step.index === roleIdx) {
                    stepClass = 'bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold';
                  }
                }

                return (
                  <React.Fragment key={step.index}>
                    {idx > 0 && <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />}
                    <span className={`px-2 py-0.5 rounded ${stepClass}`}>
                      {step.label}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Box hướng dẫn & Nút Quét mã QR chính giữa khi chưa quét mã */}
        {!verification?.result && (
          <div className="py-8 px-4 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-3">
            <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1.5 w-full mx-auto">
              <p className="text-xs font-medium text-slate-600 whitespace-normal sm:whitespace-nowrap">
                Vui lòng quét mã QR của lô hàng để tải thông tin và mở biểu mẫu nhập liệu {roleActionText}.
              </p>
              <p className="text-[11px] text-slate-400 whitespace-normal sm:whitespace-nowrap">
                Hệ thống sẽ đối soát trực tiếp trên Blockchain để đảm bảo lô hàng hợp lệ và sẵn sàng tiếp nhận.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setActiveScannerRole(formRole);
                  setIsScannerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition mx-auto"
              >
                <Camera className="w-4 h-4" /> Quét mã QR
              </button>
            </div>
          </div>
        )}

        {/* 4. Trạng thái Hợp lệ & Đã xác thực Blockchain */}
        {verification?.result && !verification?.loading && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ĐÃ XÁC THỰC LÔ HÀNG HỢP LỆ TRÊN BLOCKCHAIN</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => resetBatchVerification(formRole)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Quét lại mã khác
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/90 p-2.5 rounded-lg border border-emerald-200 shadow-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Mã lô:</span>
                <span className="font-mono font-bold text-slate-900">{verification.result.batchId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tên nông sản:</span>
                <span className="font-semibold text-slate-900">{verification.result.productName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Loại nông sản:</span>
                <span className="font-semibold text-slate-900">{verification.result.category || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giai đoạn hiện tại:</span>
                <span className="font-semibold text-emerald-700">{verification.result.stageText}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 1. Submit Producer Form (Blockchain-First: Chỉ lưu CSDL sau khi Blockchain xác nhận thành công)
  async function submitProducer(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSubmitting(true);
    setStatusAlert(null);

    try {
      // Bước 1: Kiểm tra dữ liệu & lấy mã băm SHA-256 (KHÔNG ghi CSDL)
      const prepRes = await fetch(`${API_BASE_URL}/batches/prepare/producer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...producerForm, producerWallet: account }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        const msg = Array.isArray(prepData.message) ? prepData.message.join(', ') : prepData.message;
        throw new Error(msg || 'Dữ liệu sản xuất chưa hợp lệ');
      }

      // Bước 2: Ký & gửi giao dịch lên Blockchain TRƯỚC (chỉ lưu batchId và dataHash trên on-chain)
      const receipt = await sendContractTx('recordProduction', [
        producerForm.batchId,
        prepData.dataHash,
      ]);

      // Bước 3: Giao dịch Blockchain đã thành công -> Lưu chính thức vào CSDL kèm txHash
      const saveRes = await fetch(`${API_BASE_URL}/batches/producer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...producerForm,
          producerWallet: account,
          producerTxHash: receipt.hash,
        }),
      });
      const saveResult = await saveRes.json();
      if (!saveRes.ok) {
        const msg = Array.isArray(saveResult.message) ? saveResult.message.join(', ') : saveResult.message;
        throw new Error(msg || 'Giao dịch Blockchain đã hoàn tất nhưng lưu Cơ sở dữ liệu gặp sự cố');
      }

      const createdBatchId = producerForm.batchId;
      const createdProdName = producerForm.productName;
      setStatusAlert({
        type: 'success',
        message: `Đã tạo lô hàng '${createdBatchId}' và ghi nhận thành công trên Blockchain!`,
        txHash: receipt.hash,
        batchId: createdBatchId,
      });

      // Tạo mã QR cho lô hàng vừa tạo
      try {
        const traceUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/trace/${createdBatchId}`
          : `https://voting.io.vn/trace/${createdBatchId}`;
        const qrUrl = await QRCode.toDataURL(traceUrl, { width: 300, margin: 1 });
        setCreatedBatchModal({
          isOpen: true,
          batchId: createdBatchId,
          productName: createdProdName,
          qrDataUrl: qrUrl,
          txHash: receipt.hash,
        });
      } catch (err) {}

      setProducerForm({
        batchId: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: '',
        category: '',
        quantity: 100,
        weight: 200,
        seedOrigin: '',
        farmingSupplies: '',
        productionLocation: '',
        cultivationStartDate: '',
        harvestDate: '',
        productImageUrl: '',
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: formatBlockchainError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Submit Inspector Form (Blockchain-First)
  async function submitInspector(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!inspectorForm.batchId) {
      toast.warning('Vui lòng chọn mã lô cần kiểm định!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const prepRes = await fetch(`${API_BASE_URL}/batches/prepare/inspector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inspectorForm, inspectorWallet: account }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        const msg = Array.isArray(prepData.message) ? prepData.message.join(', ') : prepData.message;
        throw new Error(msg || 'Dữ liệu kiểm định chưa hợp lệ');
      }

      const receipt = await sendContractTx('recordInspection', [
        inspectorForm.batchId,
        prepData.dataHash,
      ]);

      const saveRes = await fetch(`${API_BASE_URL}/batches/inspector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inspectorForm,
          inspectorWallet: account,
          inspectorTxHash: receipt.hash,
        }),
      });
      const saveResult = await saveRes.json();
      if (!saveRes.ok) {
        const msg = Array.isArray(saveResult.message) ? saveResult.message.join(', ') : saveResult.message;
        throw new Error(msg || 'Giao dịch Blockchain đã hoàn tất nhưng lưu Cơ sở dữ liệu gặp sự cố');
      }

      setStatusAlert({
        type: 'success',
        message: `Kiểm định lô hàng '${inspectorForm.batchId}' thành công và đã ghi nhận trên Blockchain!`,
        txHash: receipt.hash,
        batchId: inspectorForm.batchId,
      });
      resetBatchVerification('INSPECTOR');
      setInspectorForm({
        batchId: '',
        inspectionResult: 'Đạt tiêu chuẩn an toàn',
        inspectionCriteria: 'Dư lượng thuốc BVTV, vi sinh vật',
        certificateCode: '',
        certificateType: 'VietGAP',
        issuingAuthority: '',
        issuedDate: '',
        expiryDate: '',
        certImageUrl: '',
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: formatBlockchainError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Submit Logistics Form (Blockchain-First)
  async function submitLogistics(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!logisticsForm.batchId) {
      toast.warning('Vui lòng chọn mã lô cần vận chuyển!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const prepRes = await fetch(`${API_BASE_URL}/batches/prepare/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...logisticsForm, logisticsWallet: account }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        const msg = Array.isArray(prepData.message) ? prepData.message.join(', ') : prepData.message;
        throw new Error(msg || 'Dữ liệu vận chuyển chưa hợp lệ');
      }

      const receipt = await sendContractTx('recordLogistics', [
        logisticsForm.batchId,
        prepData.dataHash,
      ]);

      const saveRes = await fetch(`${API_BASE_URL}/batches/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logisticsForm,
          logisticsWallet: account,
          logisticsTxHash: receipt.hash,
        }),
      });
      const saveResult = await saveRes.json();
      if (!saveRes.ok) {
        const msg = Array.isArray(saveResult.message) ? saveResult.message.join(', ') : saveResult.message;
        throw new Error(msg || 'Giao dịch Blockchain đã hoàn tất nhưng lưu Cơ sở dữ liệu gặp sự cố');
      }

      setStatusAlert({
        type: 'success',
        message: `Ghi nhận vận chuyển lô hàng '${logisticsForm.batchId}' thành công trên Blockchain!`,
        txHash: receipt.hash,
        batchId: logisticsForm.batchId,
      });
      resetBatchVerification('LOGISTICS');
      setLogisticsForm({
        batchId: '',
        transporterName: '',
        transporterContact: '',
        transporterType: 'Tổ chức',
        shippingCode: `SHIP-${Math.floor(100000 + Math.random() * 900000)}`,
        originLocation: '',
        destLocation: '',
        departureTime: '',
        completionTime: '',
        temperature: 20.0,
        humidity: 70.0,
        storageNotes: '',
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: formatBlockchainError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Submit Distributor Form (Blockchain-First)
  async function submitDistributor(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!distributorForm.batchId) {
      toast.warning('Vui lòng chọn mã lô tiếp nhận!');
      return;
    }
    setSubmitting(true);
    setStatusAlert(null);

    try {
      const prepRes = await fetch(`${API_BASE_URL}/batches/prepare/distributor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...distributorForm, distributorWallet: account }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        const msg = Array.isArray(prepData.message) ? prepData.message.join(', ') : prepData.message;
        throw new Error(msg || 'Dữ liệu phân phối chưa hợp lệ');
      }

      const receipt = await sendContractTx('recordDistribution', [
        distributorForm.batchId,
        prepData.dataHash,
      ]);

      const saveRes = await fetch(`${API_BASE_URL}/batches/distributor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...distributorForm,
          distributorWallet: account,
          distributorTxHash: receipt.hash,
        }),
      });
      const saveResult = await saveRes.json();
      if (!saveRes.ok) {
        const msg = Array.isArray(saveResult.message) ? saveResult.message.join(', ') : saveResult.message;
        throw new Error(msg || 'Giao dịch Blockchain đã hoàn tất nhưng lưu Cơ sở dữ liệu gặp sự cố');
      }

      setStatusAlert({
        type: 'success',
        message: `Tiếp nhận phân phối lô hàng '${distributorForm.batchId}' thành công trên Blockchain!`,
        txHash: receipt.hash,
        batchId: distributorForm.batchId,
      });
      resetBatchVerification('DISTRIBUTOR');
      setDistributorForm({
        batchId: '',
        distributorName: '',
        distributorContact: '',
        distributorType: 'Tổ chức',
        receivedTime: '',
        actualQuantity: 100,
        actualWeight: 200,
        receiptNotes: '',
      });
      loadBatches();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: formatBlockchainError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-xs text-slate-400">Đang kiểm tra quyền hạn ví...</div>;
  }

  if (!account) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center mb-3">
          <Wallet className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Yêu cầu kết nối Ví MetaMask</h1>
        <p className="text-xs text-slate-500 mt-1 mb-5 sm:whitespace-nowrap">
          Vui lòng kết nối ví đã được cấp quyền để hiển thị form nhập liệu tương ứng.
        </p>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
        >
          Kết nối Ví ngay
        </button>
      </div>
    );
  }

  const isAdm = isHardcodedAdmin(account);
  const effectiveUserData = userData || (isAdm && account ? {
    walletAddress: account,
    role: 'PRODUCER',
    roles: ['PRODUCER'],
    status: 'APPROVED',
    organizationName: 'Quản trị Hệ thống',
  } : null);

  if (!effectiveUserData || (effectiveUserData.status !== 'APPROVED' && !isAdm)) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-slate-900">
          {effectiveUserData?.status === 'PENDING' ? 'Hồ sơ đang chờ duyệt' : 'Chưa đăng ký tham gia chuỗi cung ứng'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Địa chỉ ví <span className="font-mono">{truncateAddress(account)}</span> {effectiveUserData?.status === 'PENDING' ? 'đang trong danh sách chờ Quản trị viên phê duyệt.' : 'chưa đăng ký vai trò nhập liệu trong chuỗi cung ứng.'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Đến trang Đăng ký vai trò →
          </Link>
          {isAdm && (
            <Link
              href="/admin"
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              Vào trang Quản trị →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const activeUserData = effectiveUserData;
  const userRoles: string[] = (activeUserData.roles && activeUserData.roles.length > 0)
    ? activeUserData.roles
    : (activeUserData.role ? [activeUserData.role] : ['PRODUCER']);
  const availableRoles = userRoles.length > 0
    ? userRoles
    : ['PRODUCER'];

  const role = (selectedRole && availableRoles.includes(selectedRole))
    ? selectedRole
    : (availableRoles[0] || 'PRODUCER');

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Actor Bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block">
          {ROLE_LABELS[role] || role}
        </span>
        <p className="text-xs font-mono text-slate-500 mt-0.5 break-all" title={account}>
          {account}
        </p>
      </div>

      {/* Role Switcher if multi-role */}
      {availableRoles.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 overflow-x-auto shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase px-2 whitespace-nowrap">
            Chọn vai trò thao tác:
          </span>
          {availableRoles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                role === r
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {ROLE_LABELS[r] || r}
            </button>
          ))}
        </div>
      )}

      {statusAlert && (
        <div
          className={`p-4 rounded-xl text-xs border overflow-hidden break-words shadow-xs ${
            statusAlert.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <p className="font-semibold break-words leading-relaxed">{statusAlert.message}</p>
              {statusAlert.txHash && (
                <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-700">
                    <span className="text-slate-500 font-medium">Mã giao dịch Blockchain:</span>{' '}
                    <span className="font-mono">{statusAlert.txHash}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {statusAlert.batchId && (
                      <Link
                        href={`/trace/${statusAlert.batchId}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem chi tiết sản phẩm
                      </Link>
                    )}
                    <a
                      href={`${explorerUrl}/tx/${statusAlert.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Xem giao dịch Blockchain
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM 1: PRODUCER (BẢNG 1) */}
      {/* ========================================================================= */}
      {role === 'PRODUCER' && (
        <form onSubmit={submitProducer} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Thông tin cung cấp bởi Đơn vị Sản xuất
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mã lô sản phẩm *</label>
              <input
                type="text"
                required
                readOnly
                value={producerForm.batchId}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-slate-100 cursor-not-allowed select-all"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tên sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.productName}
                onChange={(e) => setProducerForm({ ...producerForm, productName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loại sản phẩm *</label>
              <input
                type="text"
                required
                value={producerForm.category}
                onChange={(e) => setProducerForm({ ...producerForm, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số lượng *</label>
                <input
                  type="number"
                  required
                  value={producerForm.quantity}
                  onChange={(e) => setProducerForm({ ...producerForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Trọng lượng (kg) *</label>
                <input
                  type="number"
                  required
                  value={producerForm.weight}
                  onChange={(e) => setProducerForm({ ...producerForm, weight: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Nguồn gốc giống *</label>
              <input
                type="text"
                required
                value={producerForm.seedOrigin}
                onChange={(e) => setProducerForm({ ...producerForm, seedOrigin: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Địa điểm sản xuất *</label>
              <input
                type="text"
                required
                value={producerForm.productionLocation}
                onChange={(e) => setProducerForm({ ...producerForm, productionLocation: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Ngày bắt đầu canh tác *</label>
              <input
                type="date"
                required
                value={producerForm.cultivationStartDate}
                onChange={(e) => setProducerForm({ ...producerForm, cultivationStartDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Ngày thu hoạch *</label>
              <input
                type="date"
                required
                value={producerForm.harvestDate}
                onChange={(e) => setProducerForm({ ...producerForm, harvestDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Vật tư nông nghiệp đã sử dụng *</label>
              <textarea
                rows={2}
                required
                value={producerForm.farmingSupplies}
                onChange={(e) => setProducerForm({ ...producerForm, farmingSupplies: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Ảnh nông sản / ruộng trồng</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'product')}
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
          >
            {submitting ? 'Đang gửi giao dịch lên Blockchain...' : 'Lưu & Ký Blockchain (Khởi tạo Lô hàng)'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 2: INSPECTOR (BẢNG 2) */}
      {/* ========================================================================= */}
      {role === 'INSPECTOR' && (
        <form onSubmit={submitInspector} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Thông tin cung cấp bởi Đơn vị Kiểm định
          </h2>

          {/* 1. KHU VỰC QUÉT MÃ QR */}
          {renderQrBatchSection('INSPECTOR')}

          {/* 2. FORM NHẬP THÔNG TIN KIỂM ĐỊNH: Chỉ hiển thị khi quét mã thành công và đúng giai đoạn */}
          {batchVerifications.INSPECTOR?.result && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Đang nhập dữ liệu kiểm định cho lô hàng: <strong className="font-mono text-blue-950">{batchVerifications.INSPECTOR.result.batchId}</strong> ({batchVerifications.INSPECTOR.result.productName})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Kết quả kiểm định *</label>
                  <input
                    type="text"
                    required
                    value={inspectorForm.inspectionResult}
                    onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionResult: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mã chứng nhận *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: CERT-2026-089..."
                    value={inspectorForm.certificateCode}
                    onChange={(e) => setInspectorForm({ ...inspectorForm, certificateCode: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Loại chứng nhận *</label>
                  <input
                    type="text"
                    required
                    value={inspectorForm.certificateType}
                    onChange={(e) => setInspectorForm({ ...inspectorForm, certificateType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cơ quan cấp *</label>
                  <input
                    type="text"
                    required
                    value={inspectorForm.issuingAuthority}
                    onChange={(e) => setInspectorForm({ ...inspectorForm, issuingAuthority: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ngày cấp *</label>
                    <input
                      type="date"
                      required
                      value={inspectorForm.issuedDate}
                      onChange={(e) => setInspectorForm({ ...inspectorForm, issuedDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ngày hết hạn *</label>
                    <input
                      type="date"
                      required
                      value={inspectorForm.expiryDate}
                      onChange={(e) => setInspectorForm({ ...inspectorForm, expiryDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Chỉ tiêu kiểm định *</label>
                  <textarea
                    rows={2}
                    required
                    value={inspectorForm.inspectionCriteria}
                    onChange={(e) => setInspectorForm({ ...inspectorForm, inspectionCriteria: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Ảnh giấy chứng nhận</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cert')}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
              >
                {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Xác nhận Kiểm định)'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 3: LOGISTICS (BẢNG 3) */}
      {/* ========================================================================= */}
      {role === 'LOGISTICS' && (
        <form onSubmit={submitLogistics} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Thông tin cung cấp bởi Đơn vị Vận chuyển
          </h2>

          {/* 1. KHU VỰC QUÉT MÃ QR */}
          {renderQrBatchSection('LOGISTICS')}

          {/* 2. FORM NHẬP THÔNG TIN VẬN CHUYỂN: Chỉ hiển thị khi quét mã thành công và đúng giai đoạn */}
          {batchVerifications.LOGISTICS?.result && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Đang nhập dữ liệu vận chuyển cho lô hàng: <strong className="font-mono text-amber-950">{batchVerifications.LOGISTICS.result.batchId}</strong> ({batchVerifications.LOGISTICS.result.productName})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tên đơn vị vận chuyển *</label>
                  <input
                    type="text"
                    required
                    value={logisticsForm.transporterName}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thông tin liên hệ *</label>
                  <input
                    type="text"
                    required
                    value={logisticsForm.transporterContact}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterContact: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Loại chủ thể *</label>
                  <select
                    value={logisticsForm.transporterType}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, transporterType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Tổ chức">Tổ chức</option>
                    <option value="Cá nhân">Cá nhân</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mã vận chuyển *</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={logisticsForm.shippingCode}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-slate-100 cursor-not-allowed select-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Điểm đi *</label>
                  <input
                    type="text"
                    required
                    value={logisticsForm.originLocation}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, originLocation: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Điểm đến *</label>
                  <input
                    type="text"
                    required
                    value={logisticsForm.destLocation}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, destLocation: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Thời gian khởi hành *</label>
                    <input
                      type="datetime-local"
                      required
                      value={logisticsForm.departureTime}
                      onChange={(e) => setLogisticsForm({ ...logisticsForm, departureTime: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Thời gian hoàn tất *</label>
                    <input
                      type="datetime-local"
                      required
                      value={logisticsForm.completionTime}
                      onChange={(e) => setLogisticsForm({ ...logisticsForm, completionTime: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nhiệt độ (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={logisticsForm.temperature}
                      onChange={(e) => setLogisticsForm({ ...logisticsForm, temperature: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Độ ẩm (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={logisticsForm.humidity}
                      onChange={(e) => setLogisticsForm({ ...logisticsForm, humidity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Ghi chú bảo quản</label>
                  <input
                    type="text"
                    value={logisticsForm.storageNotes}
                    onChange={(e) => setLogisticsForm({ ...logisticsForm, storageNotes: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition"
              >
                {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Xác nhận Vận chuyển)'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* FORM 4: DISTRIBUTOR (BẢNG 4) */}
      {/* ========================================================================= */}
      {role === 'DISTRIBUTOR' && (
        <form onSubmit={submitDistributor} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
            Thông tin cung cấp bởi Đơn vị Phân phối
          </h2>

          {/* 1. KHU VỰC QUÉT MÃ QR */}
          {renderQrBatchSection('DISTRIBUTOR')}

          {/* 2. FORM NHẬP THÔNG TIN PHÂN PHỐI: Chỉ hiển thị khi quét mã thành công và đúng giai đoạn */}
          {batchVerifications.DISTRIBUTOR?.result && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 bg-purple-50/70 p-2.5 rounded-lg border border-purple-200">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Đang nhập dữ liệu tiếp nhận phân phối cho lô hàng: <strong className="font-mono text-purple-950">{batchVerifications.DISTRIBUTOR.result.batchId}</strong> ({batchVerifications.DISTRIBUTOR.result.productName})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tên đơn vị phân phối *</label>
                  <input
                    type="text"
                    required
                    value={distributorForm.distributorName}
                    onChange={(e) => setDistributorForm({ ...distributorForm, distributorName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thông tin liên hệ *</label>
                  <input
                    type="text"
                    required
                    value={distributorForm.distributorContact}
                    onChange={(e) => setDistributorForm({ ...distributorForm, distributorContact: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Loại chủ thể *</label>
                  <select
                    value={distributorForm.distributorType}
                    onChange={(e) => setDistributorForm({ ...distributorForm, distributorType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Tổ chức">Tổ chức</option>
                    <option value="Cá nhân">Cá nhân</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thời gian tiếp nhận *</label>
                  <input
                    type="datetime-local"
                    required
                    value={distributorForm.receivedTime}
                    onChange={(e) => setDistributorForm({ ...distributorForm, receivedTime: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Số lượng thực nhận *</label>
                    <input
                      type="number"
                      required
                      value={distributorForm.actualQuantity}
                      onChange={(e) => setDistributorForm({ ...distributorForm, actualQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Trọng lượng thực nhận (kg) *</label>
                    <input
                      type="number"
                      required
                      value={distributorForm.actualWeight}
                      onChange={(e) => setDistributorForm({ ...distributorForm, actualWeight: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Ghi chú tiếp nhận</label>
                  <input
                    type="text"
                    value={distributorForm.receiptNotes}
                    onChange={(e) => setDistributorForm({ ...distributorForm, receiptNotes: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition"
              >
                {submitting ? 'Đang gửi giao dịch...' : 'Lưu & Ký Blockchain (Tiếp nhận Phân phối)'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>

    {/* Modal Quét Mã QR bằng Camera */}
    <QrScannerModal
      isOpen={isScannerOpen}
      onClose={() => setIsScannerOpen(false)}
      title={`Quét Mã QR (${ROLE_LABELS[activeScannerRole] || activeScannerRole})`}
      onScanSuccess={(scannedId) => {
        verifyBatch(scannedId, activeScannerRole);
      }}
    />

    {/* Modal hiển thị Mã QR cho Producer sau khi khởi tạo lô hàng thành công */}
    {mounted && createdBatchModal && typeof document !== 'undefined' && createPortal(
      <div className="!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
        <div className="relative bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl text-center space-y-4">
          <button
            type="button"
            onClick={() => setCreatedBatchModal(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Khởi Tạo Lô Hàng Thành Công!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Lô hàng đã được ghi nhận trên Blockchain. Mã QR dưới đây sẵn sàng để Đơn vị Kiểm định quét tiếp nhận.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 inline-block mx-auto">
            {createdBatchModal.qrDataUrl && (
              <img
                src={createdBatchModal.qrDataUrl}
                alt={createdBatchModal.batchId}
                className="w-48 h-48 mx-auto rounded-lg shadow-sm"
              />
            )}
            <div className="mt-2 font-mono font-bold text-xs text-slate-800">
              {createdBatchModal.batchId}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {createdBatchModal.productName}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={createdBatchModal.qrDataUrl}
              download={`ma-qr-${createdBatchModal.batchId}.png`}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" /> Tải ảnh Mã QR về máy
            </a>
            <Link
              href={`/trace/${createdBatchModal.batchId}`}
              target="_blank"
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Xem chi tiết sản phẩm
            </Link>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(createdBatchModal.batchId);
                toast.success(`Đã sao chép: ${createdBatchModal.batchId}`);
              }}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5" /> Sao chép Mã Lô
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
);
}
