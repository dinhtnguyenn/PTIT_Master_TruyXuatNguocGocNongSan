'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Package,
  Settings,
  Database,
  Plus,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Lock,
  LogOut,
  Sliders,
} from 'lucide-react';
import { connectWallet, disconnectWallet, truncateAddress, isWalletDisconnected } from '../../lib/web3';
import { API_BASE_URL, ROLE_LABELS, STAGE_LABELS } from '../../lib/constants';
import { useToast } from '../../components/ToastProvider';

const ALL_ROLES = ['PRODUCER', 'INSPECTOR', 'LOGISTICS', 'DISTRIBUTOR', 'ADMIN'];
const ALL_STAGES = ['CREATED', 'INSPECTED', 'IN_TRANSIT', 'DELIVERED'];
const ALL_STATUSES = ['APPROVED', 'PENDING', 'REJECTED'];

export default function SuperadminPage() {
  const { toast, confirmDialog } = useToast();
  // Auth state
  const [account, setAccount] = useState<string | null>(null);
  const [superadminKey, setSuperadminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'BATCHES' | 'CONFIGS'>('OVERVIEW');

  // Overview stats
  const [overview, setOverview] = useState<any>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    walletAddress: '',
    organizationName: '',
    phoneNumber: '',
    email: '',
    address: '',
    contactInfo: '',
    status: 'APPROVED',
    roles: ['PRODUCER'] as string[],
    txHashGrantRole: '',
  });

  // Batches state
  const [batches, setBatches] = useState<any[]>([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchFilterStage, setBatchFilterStage] = useState('');
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [batchFormTab, setBatchFormTab] = useState<'GENERAL' | 'STAGE1' | 'STAGE2' | 'STAGE3' | 'STAGE4'>('GENERAL');
  const [batchForm, setBatchForm] = useState<any>({
    batchId: '',
    productName: '',
    category: 'Nông sản',
    quantity: 1,
    weight: 1,
    stage: 'CREATED',
    seedOrigin: '',
    farmingSupplies: '',
    productionLocation: '',
    cultivationStartDate: '',
    harvestDate: '',
    producerWallet: '',
    producerTxHash: '',
    producerDataHash: '',
    inspectionResult: '',
    inspectionCriteria: '',
    certificateCode: '',
    certificateType: '',
    issuingAuthority: '',
    issuedDate: '',
    expiryDate: '',
    inspectorWallet: '',
    inspectorTxHash: '',
    inspectorDataHash: '',
    transporterName: '',
    transporterContact: '',
    shippingCode: '',
    originLocation: '',
    destLocation: '',
    departureTime: '',
    completionTime: '',
    temperature: '',
    humidity: '',
    storageNotes: '',
    logisticsWallet: '',
    logisticsTxHash: '',
    logisticsDataHash: '',
    distributorName: '',
    distributorContact: '',
    receivedTime: '',
    actualQuantity: '',
    actualWeight: '',
    receiptNotes: '',
    distributorWallet: '',
    distributorTxHash: '',
    distributorDataHash: '',
  });

  // Configs state
  const [configs, setConfigs] = useState<any[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [configForm, setConfigForm] = useState({
    key: '',
    value: '',
    description: '',
  });

  // Loading indicator
  const [tableLoading, setTableLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Headers for API calls
  function getAuthHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (account) headers['x-wallet-address'] = account;
    if (superadminKey) headers['x-superadmin-key'] = superadminKey;
    return headers;
  }

  // Check stored auth on load
  useEffect(() => {
    const savedKey = typeof window !== 'undefined' ? sessionStorage.getItem('superadmin_key') : null;
    if (savedKey) {
      setSuperadminKey(savedKey);
      verifyAuth('', savedKey);
    } else if (typeof window !== 'undefined' && window.ethereum && !isWalletDisconnected()) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accs: string[]) => {
          if (accs.length > 0) {
            setAccount(accs[0]);
            verifyAuth(accs[0], '');
          }
        })
        .catch(() => {});
    }

    function onDisconnected() {
      if (!sessionStorage.getItem('superadmin_key')) {
        setIsAuthenticated(false);
      }
      setAccount(null);
    }

    function onConnected(e: any) {
      if (e.detail) {
        setAccount(e.detail);
        verifyAuth(e.detail, '');
      }
    }

    window.addEventListener('wallet_disconnected', onDisconnected);
    window.addEventListener('wallet_connected', onConnected);
    return () => {
      window.removeEventListener('wallet_disconnected', onDisconnected);
      window.removeEventListener('wallet_connected', onConnected);
    };
  }, []);

  async function verifyAuth(walletAddr?: string, keyVal?: string) {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddr || account,
          superadminKey: keyVal || superadminKey,
        }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        if (keyVal) sessionStorage.setItem('superadmin_key', keyVal);
        loadAllData(walletAddr || account || undefined, keyVal || superadminKey || undefined);
      } else {
        const err = await res.json();
        setAuthError(err.message || 'Xác thực thất bại');
        setIsAuthenticated(false);
      }
    } catch (e: any) {
      setAuthError('Không thể kết nối máy chủ');
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleWalletLogin() {
    try {
      setAuthLoading(true);
      const addr = await connectWallet();
      setAccount(addr);
      await verifyAuth(addr, superadminKey);
    } catch (err: any) {
      setAuthError(err.message || 'Lỗi kết nối ví');
      setAuthLoading(false);
    }
  }

  async function handleKeyLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!superadminKey.trim()) return;
    await verifyAuth(account || undefined, superadminKey.trim());
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setSuperadminKey('');
    setAccount(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('superadmin_key');
      disconnectWallet();
    }
  }

  // Load all datasets
  async function loadAllData(overrideWallet?: string, overrideKey?: string) {
    setTableLoading(true);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const w = overrideWallet !== undefined ? overrideWallet : account;
    const k = overrideKey !== undefined ? overrideKey : superadminKey;
    if (w) headers['x-wallet-address'] = w;
    if (k) headers['x-superadmin-key'] = k;

    try {
      const [ovRes, uRes, bRes, cRes] = await Promise.all([
        fetch(`${API_BASE_URL}/superadmin/overview`, { headers }),
        fetch(`${API_BASE_URL}/superadmin/users`, { headers }),
        fetch(`${API_BASE_URL}/superadmin/batches`, { headers }),
        fetch(`${API_BASE_URL}/superadmin/configs`, { headers }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (bRes.ok) setBatches(await bRes.json());
      if (cRes.ok) setConfigs(await cRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setTableLoading(false);
    }
  }

  // USER CRUD
  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingUser
        ? `${API_BASE_URL}/superadmin/users/${editingUser.id}`
        : `${API_BASE_URL}/superadmin/users`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(userForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi lưu người dùng');
      }

      toast.success(editingUser ? 'Đã cập nhật người dùng!' : 'Đã tạo người dùng mới!');
      setUserModalOpen(false);
      setEditingUser(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu người dùng');
    }
  }

  async function deleteUser(id: string) {
    const confirmed = await confirmDialog({
      title: 'Xóa tài khoản người dùng',
      message: 'Bạn có chắc chắn muốn XÓA tài khoản người dùng này cùng toàn bộ dữ liệu liên quan?',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Không thể xóa người dùng');
      toast.success('Đã xóa người dùng thành công!');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa người dùng');
    }
  }

  function openCreateUserModal() {
    setEditingUser(null);
    setUserForm({
      walletAddress: '',
      organizationName: '',
      phoneNumber: '',
      email: '',
      address: '',
      contactInfo: '',
      status: 'APPROVED',
      roles: ['PRODUCER'],
      txHashGrantRole: '',
    });
    setUserModalOpen(true);
  }

  function openEditUserModal(user: any) {
    setEditingUser(user);
    const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || 'PRODUCER'];
    setUserForm({
      walletAddress: user.walletAddress,
      organizationName: user.organizationName,
      phoneNumber: user.phoneNumber || '',
      email: user.email || '',
      address: user.address || '',
      contactInfo: user.contactInfo || '',
      status: user.status,
      roles: roles,
      txHashGrantRole: user.txHashGrantRole || '',
    });
    setUserModalOpen(true);
  }

  // BATCH CRUD
  async function saveBatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingBatch
        ? `${API_BASE_URL}/superadmin/batches/${editingBatch.id}`
        : `${API_BASE_URL}/superadmin/batches`;
      const method = editingBatch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(batchForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi lưu lô hàng');
      }

      toast.success(editingBatch ? 'Đã cập nhật lô hàng!' : 'Đã tạo lô hàng mới!');
      setBatchModalOpen(false);
      setEditingBatch(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu lô hàng');
    }
  }

  async function deleteBatch(id: string) {
    const confirmed = await confirmDialog({
      title: 'Xóa lô hàng nông sản',
      message: 'Bạn có chắc chắn muốn XÓA lô hàng này khỏi cơ sở dữ liệu?',
      confirmText: 'Xóa lô hàng',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/batches/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Không thể xóa lô hàng');
      toast.success('Đã xóa lô hàng thành công!');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa lô hàng');
    }
  }

  function openCreateBatchModal() {
    setEditingBatch(null);
    setBatchFormTab('GENERAL');
    setBatchForm({
      batchId: 'BATCH-' + Date.now().toString().slice(-6),
      productName: '',
      category: 'Nông sản xuất khẩu',
      quantity: 1000,
      weight: 500,
      stage: 'CREATED',
      seedOrigin: 'Giống chứng nhận VietGAP',
      farmingSupplies: 'Phân vi sinh hữu cơ',
      productionLocation: 'Hợp tác xã nông sản',
      cultivationStartDate: new Date().toISOString().split('T')[0],
      harvestDate: new Date().toISOString().split('T')[0],
      producerWallet: account || '',
      producerTxHash: '',
      producerDataHash: '',
      inspectionResult: '',
      inspectionCriteria: '',
      certificateCode: '',
      certificateType: '',
      issuingAuthority: '',
      issuedDate: '',
      expiryDate: '',
      inspectorWallet: '',
      inspectorTxHash: '',
      inspectorDataHash: '',
      transporterName: '',
      transporterContact: '',
      shippingCode: '',
      originLocation: '',
      destLocation: '',
      departureTime: '',
      completionTime: '',
      temperature: '',
      humidity: '',
      storageNotes: '',
      logisticsWallet: '',
      logisticsTxHash: '',
      logisticsDataHash: '',
      distributorName: '',
      distributorContact: '',
      receivedTime: '',
      actualQuantity: '',
      actualWeight: '',
      receiptNotes: '',
      distributorWallet: '',
      distributorTxHash: '',
      distributorDataHash: '',
    });
    setBatchModalOpen(true);
  }

  function openEditBatchModal(batch: any) {
    setEditingBatch(batch);
    setBatchFormTab('GENERAL');
    setBatchForm({
      ...batch,
      cultivationStartDate: batch.cultivationStartDate ? batch.cultivationStartDate.split('T')[0] : '',
      harvestDate: batch.harvestDate ? batch.harvestDate.split('T')[0] : '',
      issuedDate: batch.issuedDate ? batch.issuedDate.split('T')[0] : '',
      expiryDate: batch.expiryDate ? batch.expiryDate.split('T')[0] : '',
      departureTime: batch.departureTime ? batch.departureTime.split('T')[0] : '',
      completionTime: batch.completionTime ? batch.completionTime.split('T')[0] : '',
      receivedTime: batch.receivedTime ? batch.receivedTime.split('T')[0] : '',
    });
    setBatchModalOpen(true);
  }

  // CONFIG CRUD
  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/configs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(configForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi lưu cấu hình');
      }

      toast.success('Đã lưu cấu hình hệ thống thành công!');
      setConfigModalOpen(false);
      setEditingConfig(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu cấu hình');
    }
  }

  async function deleteConfig(key: string) {
    const confirmed = await confirmDialog({
      title: 'Xóa cấu hình hệ thống',
      message: `Bạn có chắc chắn muốn xóa cấu hình '${key}'?`,
      confirmText: 'Xóa cấu hình',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/configs/${key}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Không thể xóa cấu hình');
      toast.success('Đã xóa cấu hình thành công!');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa cấu hình');
    }
  }

  function openCreateConfigModal() {
    setEditingConfig(null);
    setConfigForm({ key: '', value: '', description: '' });
    setConfigModalOpen(true);
  }

  function openEditConfigModal(conf: any) {
    setEditingConfig(conf);
    setConfigForm({
      key: conf.key,
      value: conf.value,
      description: conf.description || '',
    });
    setConfigModalOpen(true);
  }

  // FILTERED LISTS
  const filteredUsers = users.filter((u) => {
    if (userFilterStatus && u.status !== userFilterStatus) return false;
    if (userFilterRole) {
      const uRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
      if (!uRoles.includes(userFilterRole)) return false;
    }
    if (userSearch) {
      const s = userSearch.toLowerCase();
      const matchWallet = u.walletAddress?.toLowerCase().includes(s);
      const matchOrg = u.organizationName?.toLowerCase().includes(s);
      const matchPhone = u.phoneNumber?.toLowerCase().includes(s);
      const matchEmail = u.email?.toLowerCase().includes(s);
      const matchAddr = u.address?.toLowerCase().includes(s);
      const matchContact = u.contactInfo?.toLowerCase().includes(s);
      if (!matchWallet && !matchOrg && !matchContact && !matchPhone && !matchEmail && !matchAddr) return false;
    }
    return true;
  });

  const filteredBatches = batches.filter((b) => {
    if (batchFilterStage && b.stage !== batchFilterStage) return false;
    if (batchSearch) {
      const s = batchSearch.toLowerCase();
      const matchId = b.batchId?.toLowerCase().includes(s);
      const matchName = b.productName?.toLowerCase().includes(s);
      const matchProducer = b.producerWallet?.toLowerCase().includes(s);
      if (!matchId && !matchName && !matchProducer) return false;
    }
    return true;
  });

  // =========================================================================
  // VIEW: LOGIN SCREEN (If not authenticated)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Superadmin Control Center</h1>
            <p className="text-xs text-slate-500">
              Trang quản trị nâng cao kiểm soát toàn bộ cơ sở dữ liệu và cấu hình hệ thống
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {authError}
            </div>
          )}

          <div className="space-y-4">
            {/* Cách 1: Đăng nhập ví MetaMask */}
            <button
              onClick={handleWalletLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {authLoading ? 'Đang xác thực...' : 'Đăng nhập bằng Ví Admin MetaMask'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                hoặc dùng mã khóa
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Cách 2: Mã bí mật */}
            <form onSubmit={handleKeyLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mã khóa Superadmin Secret</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Nhập Superadmin Secret Key..."
                    value={superadminKey}
                    onChange={(e) => setSuperadminKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading || !superadminKey}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow transition disabled:opacity-50"
              >
                Xác thực & Mở khóa
              </button>
            </form>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400">
            Khóa bí mật được quản lý và lưu trữ trực tiếp trong bảng Cấu hình (SystemConfig) trên CSDL.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN DASHBOARD
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Superadmin Root Access
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Quản Trị Cơ Sở Dữ Liệu Toàn Diện</h1>
          <p className="text-xs text-slate-400">
            Thêm, sửa, xóa trực tiếp tất cả bảng dữ liệu &amp; cấu hình hệ thống động lưu trên DB
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAllData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Thoát
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'OVERVIEW', label: 'Tổng Quan Hệ Thống', icon: Database },
          { id: 'USERS', label: `Người Dùng & Vai Trò (${users.length})`, icon: Users },
          { id: 'BATCHES', label: `Lô Hàng Nông Sản (${batches.length})`, icon: Package },
          { id: 'CONFIGS', label: `Cấu Hình Động (${configs.length})`, icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Người dùng &amp; Đối tác</span>
                <Users className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview?.totalUsers || users.length}</div>
              <div className="flex items-center gap-3 text-xs pt-2 border-t border-slate-100">
                <span className="text-emerald-600 font-semibold">{overview?.usersByStatus?.approved || 0} Đã duyệt</span>
                <span className="text-amber-600 font-semibold">{overview?.usersByStatus?.pending || 0} Chờ duyệt</span>
                <span className="text-rose-600 font-semibold">{overview?.usersByStatus?.rejected || 0} Từ chối</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lô hàng chuỗi cung ứng</span>
                <Package className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview?.totalBatches || batches.length}</div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                <span>SX: {overview?.batchesByStage?.created || 0}</span>
                <span>KĐ: {overview?.batchesByStage?.inspected || 0}</span>
                <span>VC: {overview?.batchesByStage?.inTransit || 0}</span>
                <span>PP: {overview?.batchesByStage?.delivered || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tham số cấu hình động</span>
                <Settings className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview?.totalConfigs || configs.length}</div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                Lưu trực tiếp trong bảng <code className="font-mono text-indigo-600">SystemConfig</code>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-slate-50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Tính Năng Hỗ Trợ Đa Vai Trò (Multi-Role)</h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                Một tài khoản ví hiện nay có thể nắm giữ đồng thời nhiều vai trò (ví dụ: vừa là Đơn vị Sản xuất vừa là Đơn vị Kiểm định, hoặc là Admin kiểm soát toàn bộ). Mọi vai trò được lưu trong trường mảng <code className="font-mono font-semibold">roles: String[]</code> trên PostgreSQL.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('USERS')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Quản lý vai trò <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: USERS CRUD */}
      {/* ===================================================================== */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-grow">
              <div className="relative min-w-[200px] flex-grow sm:flex-grow-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo ví, tên đơn vị..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <select
                value={userFilterStatus}
                onChange={(e) => setUserFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <select
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Tất cả vai trò</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={openCreateUserModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Tài Khoản Mới
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Địa Chỉ Ví</th>
                    <th className="px-4 py-3">Tổ Chức / Đơn Vị</th>
                    <th className="px-4 py-3">Danh Sách Vai Trò</th>
                    <th className="px-4 py-3">Trạng Thái</th>
                    <th className="px-4 py-3">Tx Cấp Quyền</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Không tìm thấy tài khoản phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-900">
                            {truncateAddress(u.walletAddress)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{u.organizationName}</div>
                            <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                              {u.phoneNumber && <div><span className="text-slate-400">SĐT:</span> {u.phoneNumber}</div>}
                              {u.email && <div><span className="text-slate-400">Email:</span> {u.email}</div>}
                              {u.address && <div><span className="text-slate-400">Đ/c:</span> {u.address}</div>}
                              {!u.phoneNumber && !u.email && !u.address && <div>{u.contactInfo}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {userRoles.map((r: string) => (
                                <span
                                  key={r}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r === 'ADMIN'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : r === 'PRODUCER'
                                      ? 'bg-blue-100 text-blue-800'
                                      : r === 'INSPECTOR'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : r === 'LOGISTICS'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : u.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                            {u.txHashGrantRole ? truncateAddress(u.txHashGrantRole) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: BATCHES CRUD */}
      {/* ===================================================================== */}
      {activeTab === 'BATCHES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-grow">
              <div className="relative min-w-[200px] flex-grow sm:flex-grow-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã lô, tên nông sản..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <select
                value={batchFilterStage}
                onChange={(e) => setBatchFilterStage(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Tất cả giai đoạn</option>
                {ALL_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {STAGE_LABELS[st]?.label || st}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={openCreateBatchModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Lô Hàng Mới
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Mã Lô Hàng</th>
                    <th className="px-4 py-3">Sản Phẩm &amp; Danh Mục</th>
                    <th className="px-4 py-3">Khối Lượng</th>
                    <th className="px-4 py-3">Giai Đoạn</th>
                    <th className="px-4 py-3">Ví Khởi Tạo</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Không tìm thấy lô hàng nào
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchId}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{b.productName}</div>
                          <div className="text-[11px] text-slate-400">{b.category}</div>
                        </td>
                        <td className="px-4 py-3">
                          {b.quantity} sp / {b.weight} kg
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              STAGE_LABELS[b.stage]?.color || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {STAGE_LABELS[b.stage]?.label || b.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {truncateAddress(b.producerWallet || b.createdByAddress)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/trace/${b.batchId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition"
                              title="Xem tra cứu"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => openEditBatchModal(b)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              title="Sửa tất cả thông tin"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteBatch(b.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SYSTEM CONFIGS CRUD */}
      {/* ===================================================================== */}
      {activeTab === 'CONFIGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Các tham số hệ thống được lưu trong bảng <code className="font-mono text-indigo-600">SystemConfig</code>. Thay đổi tại đây sẽ có hiệu lực ngay lập tức mà không cần triển khai lại mã nguồn.
            </p>
            <button
              onClick={openCreateConfigModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Cấu Hình Mới
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 w-1/4">Khóa Cấu Hình (Key)</th>
                    <th className="px-4 py-3 w-1/2">Giá Trị (Value)</th>
                    <th className="px-4 py-3">Mô Tả</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {configs.map((c) => (
                    <tr key={c.key} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-900">{c.key}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 break-all">{c.value}</td>
                      <td className="px-4 py-3 text-slate-500">{c.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditConfigModal(c)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteConfig(c.key)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: USER ACCOUNT (ADD / EDIT) */}
      {/* ===================================================================== */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Chỉnh Sửa Tài Khoản & Vai Trò' : 'Thêm Tài Khoản Mới'}
              </h2>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ ví (Ethereum / Polygon) *</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={userForm.walletAddress}
                  onChange={(e) => setUserForm({ ...userForm, walletAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Phân quyền vai trò (Có thể chọn nhiều vai trò cùng lúc) *
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {ALL_ROLES.map((r) => {
                    const isChecked = userForm.roles.includes(r);
                    return (
                      <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm({ ...userForm, roles: [...userForm.roles, r] });
                            } else {
                              setUserForm({
                                ...userForm,
                                roles: userForm.roles.filter((x) => x !== r),
                              });
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`font-semibold ${isChecked ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>
                          {r}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tổ chức / cá nhân *</label>
                  <input
                    type="text"
                    required
                    value={userForm.organizationName}
                    onChange={(e) => setUserForm({ ...userForm, organizationName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái phê duyệt *</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={userForm.phoneNumber}
                    onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email liên hệ *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ cơ sở / Trụ sở *</label>
                <input
                  type="text"
                  required
                  value={userForm.address}
                  onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã Tx Hash Grant Role (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={userForm.txHashGrantRole}
                  onChange={(e) => setUserForm({ ...userForm, txHashGrantRole: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: BATCH (ADD / EDIT ALL FIELDS) */}
      {/* ===================================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingBatch ? `Chỉnh Sửa Lô Hàng: ${editingBatch.batchId}` : 'Khởi Tạo Lô Hàng Mới'}
              </h2>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Sub-tabs for 4 Stages */}
            <div className="flex border-b border-slate-100 bg-slate-50 px-6 gap-2 pt-2">
              {[
                { id: 'GENERAL', label: '1. Khởi Tạo & Thông Tin Chung' },
                { id: 'STAGE2', label: '2. Kiểm Định Chất Lượng' },
                { id: 'STAGE3', label: '3. Vận Chuyển & Bảo Quản' },
                { id: 'STAGE4', label: '4. Phân Phối & Tiếp Nhận' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBatchFormTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition ${
                    batchFormTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 border-b-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={saveBatch} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {batchFormTab === 'GENERAL' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã Lô Hàng (Batch ID) *</label>
                      <input
                        type="text"
                        required
                        value={batchForm.batchId}
                        onChange={(e) => setBatchForm({ ...batchForm, batchId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Giai đoạn hiện tại *</label>
                      <select
                        value={batchForm.stage}
                        onChange={(e) => setBatchForm({ ...batchForm, stage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        {ALL_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {STAGE_LABELS[st]?.label || st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tên nông sản / sản phẩm *</label>
                      <input
                        type="text"
                        required
                        value={batchForm.productName}
                        onChange={(e) => setBatchForm({ ...batchForm, productName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Danh mục *</label>
                      <input
                        type="text"
                        required
                        value={batchForm.category}
                        onChange={(e) => setBatchForm({ ...batchForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số lượng đóng gói *</label>
                      <input
                        type="number"
                        required
                        value={batchForm.quantity}
                        onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Khối lượng (kg) *</label>
                      <input
                        type="number"
                        required
                        value={batchForm.weight}
                        onChange={(e) => setBatchForm({ ...batchForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Địa điểm sản xuất *</label>
                      <input
                        type="text"
                        value={batchForm.productionLocation}
                        onChange={(e) => setBatchForm({ ...batchForm, productionLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nguồn gốc giống *</label>
                      <input
                        type="text"
                        value={batchForm.seedOrigin}
                        onChange={(e) => setBatchForm({ ...batchForm, seedOrigin: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu gieo trồng</label>
                      <input
                        type="date"
                        value={batchForm.cultivationStartDate}
                        onChange={(e) => setBatchForm({ ...batchForm, cultivationStartDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày thu hoạch</label>
                      <input
                        type="date"
                        value={batchForm.harvestDate}
                        onChange={(e) => setBatchForm({ ...batchForm, harvestDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ví Đơn vị sản xuất ký</label>
                    <input
                      type="text"
                      value={batchForm.producerWallet}
                      onChange={(e) => setBatchForm({ ...batchForm, producerWallet: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              {batchFormTab === 'STAGE2' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kết quả kiểm định</label>
                      <input
                        type="text"
                        placeholder="VD: ĐẠT TIÊU CHUẨN XUẤT KHẨU"
                        value={batchForm.inspectionResult || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, inspectionResult: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tiêu chuẩn kiểm định</label>
                      <input
                        type="text"
                        placeholder="VD: VietGAP, GlobalGAP..."
                        value={batchForm.inspectionCriteria || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, inspectionCriteria: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số chứng nhận kiểm định</label>
                      <input
                        type="text"
                        value={batchForm.certificateCode || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, certificateCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Cơ quan cấp chứng nhận</label>
                      <input
                        type="text"
                        value={batchForm.issuingAuthority || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, issuingAuthority: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày cấp chứng nhận</label>
                      <input
                        type="date"
                        value={batchForm.issuedDate || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, issuedDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày hết hạn</label>
                      <input
                        type="date"
                        value={batchForm.expiryDate || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ví Đơn vị kiểm định ký</label>
                    <input
                      type="text"
                      value={batchForm.inspectorWallet || ''}
                      onChange={(e) => setBatchForm({ ...batchForm, inspectorWallet: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              {batchFormTab === 'STAGE3' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                      <input
                        type="text"
                        value={batchForm.transporterName || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, transporterName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã vận đơn (Shipping Code)</label>
                      <input
                        type="text"
                        value={batchForm.shippingCode || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, shippingCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Địa điểm xuất phát</label>
                      <input
                        type="text"
                        value={batchForm.originLocation || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, originLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Địa điểm đích</label>
                      <input
                        type="text"
                        value={batchForm.destLocation || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, destLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nhiệt độ bảo quản (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={batchForm.temperature !== null ? batchForm.temperature : ''}
                        onChange={(e) => setBatchForm({ ...batchForm, temperature: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Độ ẩm bảo quản (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={batchForm.humidity !== null ? batchForm.humidity : ''}
                        onChange={(e) => setBatchForm({ ...batchForm, humidity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ví Đơn vị vận chuyển ký</label>
                    <input
                      type="text"
                      value={batchForm.logisticsWallet || ''}
                      onChange={(e) => setBatchForm({ ...batchForm, logisticsWallet: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              {batchFormTab === 'STAGE4' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Đơn vị phân phối</label>
                      <input
                        type="text"
                        value={batchForm.distributorName || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, distributorName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Liên hệ nhà phân phối</label>
                      <input
                        type="text"
                        value={batchForm.distributorContact || ''}
                        onChange={(e) => setBatchForm({ ...batchForm, distributorContact: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số lượng thực nhận</label>
                      <input
                        type="number"
                        value={batchForm.actualQuantity !== null ? batchForm.actualQuantity : ''}
                        onChange={(e) => setBatchForm({ ...batchForm, actualQuantity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Khối lượng thực nhận (kg)</label>
                      <input
                        type="number"
                        value={batchForm.actualWeight !== null ? batchForm.actualWeight : ''}
                        onChange={(e) => setBatchForm({ ...batchForm, actualWeight: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú tiếp nhận</label>
                    <textarea
                      rows={2}
                      value={batchForm.receiptNotes || ''}
                      onChange={(e) => setBatchForm({ ...batchForm, receiptNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ví Đơn vị phân phối ký</label>
                    <input
                      type="text"
                      value={batchForm.distributorWallet || ''}
                      onChange={(e) => setBatchForm({ ...batchForm, distributorWallet: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow"
                >
                  {editingBatch ? 'Lưu Thay Đổi Lô Hàng' : 'Tạo Lô Hàng Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: SYSTEM CONFIG (ADD / EDIT) */}
      {/* ===================================================================== */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingConfig ? `Chỉnh Sửa: ${editingConfig.key}` : 'Thêm Cấu Hình Hệ Thống Mới'}
              </h2>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveConfig} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khóa Cấu Hình (Key) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingConfig}
                  placeholder="VD: CONTRACT_ADDRESS, RPC_URL..."
                  value={configForm.key}
                  onChange={(e) => setConfigForm({ ...configForm, key: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giá Trị Cấu Hình (Value) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Nhập giá trị cấu hình..."
                  value={configForm.value}
                  onChange={(e) => setConfigForm({ ...configForm, value: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả công dụng</label>
                <input
                  type="text"
                  placeholder="VD: Địa chỉ Hợp đồng thông minh chính thức..."
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
