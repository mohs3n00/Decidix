import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { GrainOverlay } from '../../components/GrainOverlay';
import { GlassStatCard } from '../../components/GlassStatCard';

export const DatasetManagementScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user, requireAuth } = useAuth();
  const {
    datasets,
    approvedDatasets,
    pendingDatasets,
    rejectedDatasets,
    activeDataset,
    selectActiveDataset,
    uploadDataset,
    approveDataset,
    rejectDataset,
    deleteDataset,
  } = useWorkspace();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Reject modal state
  const [rejectingDatasetId, setRejectingDatasetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = user?.role === 'admin';

  const handleOpenUploadModal = () => {
    requireAuth(
      isRTL
        ? 'يتطلب رفع مجموعة بيانات جديدة تسجيل الدخول إلى المنظومة الوطنية.'
        : 'Sign in to upload datasets to the national platform repository.',
      () => {
        setShowUploadModal(true);
      },
      isRTL ? 'تسجيل الدخول لرفع البيانات' : 'Sign In to Upload'
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!customName) {
        setCustomName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.show(isRTL ? 'يرجى اختيار ملف البيانات أولاً' : 'Please select a dataset file', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const created = await uploadDataset(selectedFile, customName, customDescription);
      if (isAdmin) {
        toast.show(
          isRTL
            ? `تم رفع واعتماد مجموعة "${created.name}" بنجاح! تم تفعيلها فورياً للتحليل.`
            : `Dataset "${created.name}" uploaded and approved! Active for analysis.`,
          'success'
        );
      } else {
        toast.show(
          isRTL
            ? `تم رفع مجموعة "${created.name}" بنجاح! تم إرسالها إلى قائمة مراجعة الإدارة للتدقيق الإحصائي.`
            : `Dataset "${created.name}" uploaded successfully! Sent to admin review queue.`,
          'success'
        );
        setActiveTab('pending');
      }
      setShowUploadModal(false);
      setSelectedFile(null);
      setCustomName('');
      setCustomDescription('');
    } catch (err: any) {
      toast.show(err?.message || 'Failed to process dataset file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectActive = (id: string, name: string) => {
    selectActiveDataset(id);
    toast.show(
      isRTL
        ? `تم تعيين "${name}" كمصدر البيانات النشط في كافة لوحات التحليل والمساعد الذكي.`
        : `"${name}" is now the active dataset powering all analytics and AI assistant.`,
      'success'
    );
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveDataset(id);
      toast.show(
        isRTL
          ? `تم اعتماد مجموعة البيانات "${name}" بنجاح، وأصبحت متاحة للتحليل لجميع المستخدمين.`
          : `Dataset "${name}" approved successfully and is now active for all users.`,
        'success'
      );
    } catch (err: any) {
      toast.show(err?.message || 'Failed to approve dataset', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingDatasetId) return;
    try {
      await rejectDataset(rejectingDatasetId, rejectReason || undefined);
      toast.show(
        isRTL ? 'تم رفض مجموعة البيانات وتحديث حالتها في السجل.' : 'Dataset rejected and marked in registry.',
        'info'
      );
      setRejectingDatasetId(null);
      setRejectReason('');
    } catch (err: any) {
      toast.show(err?.message || 'Failed to reject dataset', 'error');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(isRTL ? `هل أنت متأكد من حذف مجموعة "${name}" من المنظومة؟` : `Delete dataset "${name}"?`)) {
      deleteDataset(id);
      toast.show(isRTL ? 'تم حذف مجموعة البيانات' : 'Dataset deleted', 'info');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-cairo">
      {/* Active Dataset Spotlight - Dark Navy Glass */}
      <div className="relative bg-navy-gradient rounded-[2rem] overflow-hidden p-6 sm:p-8 mb-6">
        <GrainOverlay />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-eyebrow text-[#21EAF4] mb-2">{isRTL ? 'مجموعة البيانات النشطة' : 'Active Dataset Registry'}</div>
            <div className="text-2xl font-bold text-white">{activeDataset?.name || (isRTL ? 'الأساس الوطني المعتمد' : 'National Baseline Dataset')}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="status-dot-active" />
              <span className="text-xs text-white/70">{isRTL ? 'معتمدة ونشطة' : 'Approved & Active'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <GlassStatCard metric={activeDataset?.kpis?.nationalIndex ?? 74.2} caption={isRTL ? 'المؤشر الوطني' : 'National Index'} />
            <GlassStatCard metric={activeDataset?.coverage?.split(' ')[0] ?? '27'} caption={isRTL ? 'محافظة' : 'Governorates'} />
            <GlassStatCard metric={activeDataset?.recordCount ?? 270} caption={isRTL ? 'سجل بيانات' : 'Records'} />
          </div>
        </div>
      </div>

      {/* 1. Header with System Architecture Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue animate-pulse" />
            <DecidixIcon name="globe" size={13} color="#0052FF" />
            <span>{isRTL ? 'المنظومة الوطنية الموحدة لدعم القرار' : 'NATIONAL UNIFIED DECISION SYSTEM'}</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline text-slate-600 font-medium">
              {isRTL ? 'سجل وحوكمة البيانات الإحصائية' : 'Dataset Registry & Governance'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#061A3A] tracking-tight">
            {isRTL ? 'سجل وإدارة مجموعات البيانات الوطنية' : 'National Dataset Registry & Governance'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            {isRTL
              ? 'مستودع البيانات الإحصائية الموحد لمحافظات مصر الـ 27. يتاح لأي باحث أو جهة رفع البيانات، وتخضع للمراجعة والاعتماد المؤسسي لتوجيه لوحة القيادة والذكاء الاصطناعي.'
              : 'Unified national data repository across Egypt’s 27 governorates. Open for researcher ingestion, subject to institutional vetting before powering analytics and AI.'}
          </p>
        </div>

        {/* Upload CTA Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenUploadModal}
            className="h-11 px-5 rounded-xl bg-blue hover:bg-blue-600 active:scale-98 text-white text-xs font-bold transition-all flex items-center gap-2.5 shadow-sm shadow-blue/20"
          >
            <DecidixIcon name="upload" size={15} color="#FFFFFF" strokeWidth={2.5} />
            <span>{isRTL ? 'رفع مجموعة بيانات جديدة' : 'Upload New Dataset'}</span>
          </button>
        </div>
      </div>

      {/* 2. Active Dataset Spotlight Banner */}
      {activeDataset && (
        <div className="rounded-2xl bg-white border border-blue/25 shadow-sm overflow-hidden transition-all">
          <div className="p-5 bg-gradient-to-r from-blue/[0.04] via-blue/[0.02] to-transparent flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-blue/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue/30">
                <DecidixIcon name="dataset" size={24} color="#FFFFFF" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isRTL ? 'المصدر المعتمد النشط حالياً' : 'Active System Source'}</span>
                  </span>
                  <h2 className="text-base font-bold text-[#061A3A] tracking-tight">
                    {activeDataset.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {activeDataset.format}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({activeDataset.recordCount.toLocaleString()} {isRTL ? 'سجل' : 'records'})
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {activeDataset.description || (isRTL ? 'المصدر الأساسي المعتمد لتوجيه مؤشرات لوحة القيادة والمساعد الذكي.' : 'Baseline data source powering dashboard KPIs and AI assistant.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="/overview"
                className="h-9 px-4 rounded-xl bg-[#061A3A] hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs"
              >
                <span>{isRTL ? 'استعراض في لوحة القيادة' : 'View in Dashboard'}</span>
                <DecidixIcon name={isRTL ? 'arrow_left' : 'arrow_right'} size={13} color="#FFFFFF" />
              </a>
              <a
                href="/assistant"
                className="h-9 px-4 rounded-xl bg-white hover:bg-slate-50 text-blue border border-blue/30 text-xs font-bold transition flex items-center gap-2 shadow-2xs"
              >
                <DecidixIcon name="robot" size={14} color="#0052FF" />
                <span>{isRTL ? 'استشارة المساعد الذكي' : 'Ask AI Assistant'}</span>
              </a>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="px-5 py-3.5 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المؤشر العام' : 'National Index'}</span>
              <span className="text-sm font-extrabold text-blue font-mono mt-0.5">{activeDataset.kpis?.nationalIndex} <span className="text-[10px] text-slate-400 font-normal">/ 100</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'الصحة' : 'Health'}</span>
              <span className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{activeDataset.kpis?.healthScore}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'التعليم' : 'Education'}</span>
              <span className="text-sm font-bold text-blue font-mono mt-0.5">{activeDataset.kpis?.educationScore}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'الاقتصاد' : 'Economy'}</span>
              <span className="text-sm font-bold text-indigo-600 font-mono mt-0.5">{activeDataset.kpis?.economyScore}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'البنية التحتية' : 'Infrastructure'}</span>
              <span className="text-sm font-bold text-amber-600 font-mono mt-0.5">{activeDataset.kpis?.infrastructureScore}%</span>
            </div>
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المصدر المعتمد' : 'Provider'}</span>
              <span className="text-xs font-semibold text-[#061A3A] truncate mt-0.5" title={activeDataset.uploadedByName}>
                {activeDataset.uploadedByName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Platform Dataset KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isRTL ? 'المجموعات المعتمدة' : 'Approved Datasets'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DecidixIcon name="check" size={15} color="#059669" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-[#061A3A] mt-2 font-mono">
            {approvedDatasets.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>{isRTL ? 'متاحة للتحليل والاستفسار بالمنظومة' : 'Available across all analytics'}</span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isRTL ? 'قيد مراجعة الإدارة' : 'Pending Review'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <DecidixIcon name="clock" size={15} color="#D97706" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-amber-600 mt-2 font-mono">
            {pendingDatasets.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span>{isRTL ? 'بانتظار تدقيق واعتماد المسؤول' : 'Awaiting admin decision'}</span>
          </div>
        </div>

        {/* Governorates Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isRTL ? 'المحافظات المشمولة' : 'Monitored Governorates'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue/10 text-blue flex items-center justify-center border border-blue/20">
              <DecidixIcon name="globe" size={15} color="#0052FF" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-[#061A3A] mt-2 font-mono">
            27
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue inline-block" />
            <span>{isRTL ? 'تغطية جغرافية وطنية شاملة' : '100% National territory coverage'}</span>
          </div>
        </div>

        {/* Mean Quality Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isRTL ? 'متوسط موثوقية السجلات' : 'Mean Data Quality'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DecidixIcon name="shield" size={15} color="#059669" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-emerald-600 mt-2 font-mono">
            98.1%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>{isRTL ? 'تدقيق آلي ضد التكرار والقيم الشاذة' : 'Automated validation check'}</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition -mb-px ${
            activeTab === 'approved'
              ? 'border-blue text-blue bg-blue/[0.02]'
              : 'border-transparent text-slate-500 hover:text-[#061A3A] hover:border-slate-300'
          }`}
        >
          <span>{isRTL ? 'المجموعات المعتمدة للتحليل' : 'Approved Datasets'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'approved' ? 'bg-blue text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {approvedDatasets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition -mb-px ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-600 bg-amber-500/[0.02]'
              : 'border-transparent text-slate-500 hover:text-[#061A3A] hover:border-slate-300'
          }`}
        >
          <span>{isRTL ? 'قيد مراجعة الإدارة' : 'Pending Review'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            pendingDatasets.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
          }`}>
            {pendingDatasets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition -mb-px ${
            activeTab === 'rejected'
              ? 'border-rose-500 text-rose-600 bg-rose-500/[0.02]'
              : 'border-transparent text-slate-500 hover:text-[#061A3A] hover:border-slate-300'
          }`}
        >
          <span>{isRTL ? 'المجموعات المرفوضة' : 'Rejected Datasets'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {rejectedDatasets.length}
          </span>
        </button>
      </div>

      {/* 5. Dataset List Presentation */}
      <div className="space-y-4">
        {activeTab === 'approved' && (
          <div className="space-y-3">
            {approvedDatasets.map((ds) => {
              const isSelected = activeDataset?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isSelected
                      ? 'border-blue/50 shadow-md ring-2 ring-blue/10 bg-gradient-to-r from-blue/[0.03] to-white'
                      : 'border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Right side: Icon + Title + Metadata */}
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isSelected ? 'bg-blue text-white shadow-blue/20' : 'bg-slate-100 text-[#061A3A] border border-slate-200'
                      }`}>
                        <DecidixIcon name="dataset" size={20} color={isSelected ? '#FFFFFF' : '#2563EB'} />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#061A3A]">{ds.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {ds.format}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <DecidixIcon name="check" size={10} color="#059669" strokeWidth={3} />
                            <span>{isRTL ? 'معتمدة رسمياً' : 'Official Approved'}</span>
                          </span>
                          {isSelected && (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue text-white shadow-2xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                              <span>{isRTL ? 'المصدر النشط حالياً' : 'Active System Source'}</span>
                            </span>
                          )}
                        </div>

                        {ds.description && (
                          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{ds.description}</p>
                        )}

                        {/* Metadata Badges Strip */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="globe" size={12} color="#64748B" />
                            <span>{isRTL ? 'التغطية:' : 'Coverage:'}</span>
                            <strong className="text-[#061A3A]">{ds.coverage}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="file" size={12} color="#64748B" />
                            <span>{isRTL ? 'السجلات:' : 'Records:'}</span>
                            <strong className="text-[#061A3A] font-mono">{ds.recordCount.toLocaleString()}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="account" size={12} color="#64748B" />
                            <span>{isRTL ? 'المصدر:' : 'Source:'}</span>
                            <strong className="text-[#061A3A] truncate max-w-[220px]" title={ds.uploadedByName}>{ds.uploadedByName}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <DecidixIcon name="shield" size={12} color="#059669" />
                            <span>{isRTL ? 'الموثوقية:' : 'Quality:'}</span>
                            <strong className="font-mono">{ds.qualityScore}%</strong>
                          </span>
                        </div>

                        {/* Sector Breakdown Mini Bar */}
                        {ds.kpis && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'توزيع القطاعات:' : 'Sectors:'}</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{isRTL ? 'الصحة' : 'Health'}: <strong className="font-mono text-slate-700">{ds.kpis.healthScore}%</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                              <span>{isRTL ? 'التعليم' : 'Education'}: <strong className="font-mono text-slate-700">{ds.kpis.educationScore}%</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>{isRTL ? 'الاقتصاد' : 'Economy'}: <strong className="font-mono text-slate-700">{ds.kpis.economyScore}%</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{isRTL ? 'البنية التحتية' : 'Infra'}: <strong className="font-mono text-slate-700">{ds.kpis.infrastructureScore}%</strong></span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left side: Scores & Actions */}
                    <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-between lg:justify-end">
                      {/* Composite Score Card */}
                      <div className="flex flex-col items-end px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المؤشر العام' : 'Score'}</span>
                        <span className="text-base font-extrabold text-blue font-mono">{ds.kpis?.nationalIndex}</span>
                      </div>

                      {isSelected ? (
                        <div className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                          <DecidixIcon name="check" size={14} color="#059669" strokeWidth={2.5} />
                          <span>{isRTL ? 'المصدر النشط' : 'Active Dataset'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSelectActive(ds.id, ds.name)}
                          className="h-10 px-4 rounded-xl bg-blue hover:bg-blue-600 active:scale-98 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-2xs shadow-blue/20"
                        >
                          <DecidixIcon name="check" size={13} color="#FFFFFF" strokeWidth={2.5} />
                          <span>{isRTL ? 'تعيين كمصدر نشط' : 'Activate for Analytics'}</span>
                        </button>
                      )}

                      {isAdmin && ds.id !== 'ds_capmas_2024' && (
                        <button
                          onClick={() => handleDelete(ds.id, ds.name)}
                          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition flex items-center justify-center border border-slate-200"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <DecidixIcon name="trash" size={15} color="currentColor" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-3">
            {pendingDatasets.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-100">
                  <DecidixIcon name="check" size={24} color="#D97706" strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-bold text-[#061A3A]">
                  {isRTL ? 'لا توجد مجموعات بيانات قيد المراجعة حالياً' : 'No datasets pending review'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  {isRTL ? 'كافة البيانات المرفوعة من قبل الباحثين تمت مراجعتها واعتمادها في المنظومة الوطنية.' : 'All researcher datasets have been reviewed and approved in the national registry.'}
                </p>
              </div>
            ) : (
              pendingDatasets.map((ds) => (
                <div
                  key={ds.id}
                  className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-2xs hover:border-amber-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                        <DecidixIcon name="clock" size={20} color="#D97706" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#061A3A]">{ds.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {ds.format}
                          </span>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span>{isRTL ? 'قيد مراجعة واعتماد الإدارة' : 'Pending Admin Review'}</span>
                          </span>
                        </div>

                        {ds.description && (
                          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{ds.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="account" size={12} color="#64748B" />
                            <span>{isRTL ? 'تم الرفع بواسطة:' : 'Uploaded by:'}</span>
                            <strong className="text-[#061A3A]">{ds.uploadedByName} ({ds.uploadedByRole})</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="file" size={12} color="#64748B" />
                            <span>{isRTL ? 'السجلات:' : 'Records:'}</span>
                            <strong className="text-[#061A3A] font-mono">{ds.recordCount.toLocaleString()}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue/10 text-blue border border-blue/20">
                            <DecidixIcon name="trend_up" size={12} color="#0052FF" />
                            <span>{isRTL ? 'المؤشر الأولي المحسوب:' : 'Calculated Index:'}</span>
                            <strong className="font-mono">{ds.kpis?.nationalIndex}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Approval & Rejection Actions */}
                    <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-between lg:justify-end">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleApprove(ds.id, ds.name)}
                            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs shadow-emerald-600/20"
                          >
                            <DecidixIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />
                            <span>{isRTL ? 'اعتماد المجموعة' : 'Approve Dataset'}</span>
                          </button>
                          <button
                            onClick={() => setRejectingDatasetId(ds.id)}
                            className="h-10 px-4 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center gap-2"
                          >
                            <DecidixIcon name="close" size={13} color="#E11D48" strokeWidth={2.5} />
                            <span>{isRTL ? 'رفض' : 'Reject'}</span>
                          </button>
                        </>
                      ) : (
                        <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium">
                          {isRTL ? 'في انتظار مراجعة مسؤول المنظومة' : 'Awaiting system administrator review'}
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(ds.id, ds.name)}
                        className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition flex items-center justify-center border border-slate-200"
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        <DecidixIcon name="trash" size={15} color="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'rejected' && (
          <div className="space-y-3">
            {rejectedDatasets.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <DecidixIcon name="shield" size={24} color="#059669" />
                </div>
                <h3 className="text-base font-bold text-[#061A3A]">
                  {isRTL ? 'سجل الرفض خالٍ تماماً' : 'No rejected datasets'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  {isRTL ? 'كافة البيانات المرفوعة مطابقة للمواصفات الإحصائية ومعايير الجودة المعتمدة.' : 'All datasets conform to statistical standards and quality controls.'}
                </p>
              </div>
            ) : (
              rejectedDatasets.map((ds) => (
                <div
                  key={ds.id}
                  className="bg-white rounded-2xl p-5 border border-rose-200 shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                        <DecidixIcon name="close" size={20} color="#E11D48" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#061A3A]">{ds.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {ds.format}
                          </span>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {isRTL ? 'مرفوضة من الإدارة' : 'Rejected'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-rose-900 leading-relaxed">
                          <strong>{isRTL ? 'سبب الرفض الإحصائي: ' : 'Rejection Reason: '}</strong>
                          <span>{ds.rejectionReason || (isRTL ? 'الملف لا يتطابق مع المعايير الإحصائية المعتمدة' : 'File did not meet statistical standards')}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="account" size={12} color="#64748B" />
                            <span>{isRTL ? 'الموفر:' : 'Uploaded by:'}</span>
                            <strong className="text-[#061A3A]">{ds.uploadedByName}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80">
                            <DecidixIcon name="clock" size={12} color="#64748B" />
                            <span>{isRTL ? 'تاريخ الرفع:' : 'Uploaded at:'}</span>
                            <strong className="text-[#061A3A] font-mono">{new Date(ds.uploadedAt).toLocaleDateString()}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end">
                      <button
                        onClick={() => handleDelete(ds.id, ds.name)}
                        className="h-10 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-2"
                      >
                        <DecidixIcon name="trash" size={14} color="currentColor" />
                        <span>{isRTL ? 'حذف من السجل' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 6. Upload Dataset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue/10 text-blue flex items-center justify-center">
                  <DecidixIcon name="dataset" size={16} color="#0052FF" />
                </div>
                <h2 className="text-base font-bold text-[#061A3A]">
                  {isRTL ? 'رفع مجموعة بيانات إلى المنظومة الوطنية' : 'Upload Dataset to National System'}
                </h2>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <DecidixIcon name="x" size={16} color="currentColor" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRTL ? 'اسم مجموعة البيانات' : 'Dataset Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={isRTL ? 'مثال: المسح الميداني للخدمات الصحية 2024' : 'e.g., Regional Healthcare Baseline 2024'}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-blue text-xs text-[#061A3A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRTL ? 'جهة الإصدار أو الوصف المختصر' : 'Source / Description'}
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={isRTL ? 'مثال: بيانات موثقة من وزارة التخطيط والتنمية الاقتصادية' : 'e.g., Verified by Ministry of Planning'}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-blue text-xs text-[#061A3A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRTL ? 'ملف البيانات (CSV, XLSX, JSON)' : 'Dataset File (CSV, XLSX, JSON)'} *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue/50 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue/[0.02]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.json,.tsv,.jsonl"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center mx-auto mb-2">
                    <DecidixIcon name="dataset" size={20} color="#0052FF" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <div className="text-xs font-bold text-blue">{selectedFile.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-[#061A3A]">
                        {isRTL ? 'اضغط لاختيار الملف من جهازك' : 'Click to select file'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {isRTL ? 'الصيغ المدعومة: CSV, XLSX, JSON, TSV (حتى 25 ميجابايت)' : 'Supported: CSV, XLSX, JSON, TSV up to 25MB'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue/5 border border-blue/15 text-[11px] text-slate-600">
                {isAdmin ? (
                  <span>{isRTL ? 'بصفتك مسؤولاً للمنظومة، سيتم اعتماد وتفعيل هذه المجموعة فورياً.' : 'As administrator, this dataset will be immediately approved and activated.'}</span>
                ) : (
                  <span>{isRTL ? 'سيتم تدقيق جودة البيانات آلياً وإرسال المجموعة لمراجعة مسؤول المنظومة لاعتمادها رسمياً.' : 'Data quality will be validated and submitted to system admin for official approval.'}</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="h-9 px-4 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="h-9 px-5 rounded-xl bg-blue hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  <span>{isRTL ? 'تأكيد الرفع والتدقيق' : 'Upload & Validate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Rejection Reason Modal */}
      {rejectingDatasetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-[#061A3A] mb-2">
              {isRTL ? 'رفض مجموعة البيانات المرفوعة' : 'Reject Uploaded Dataset'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isRTL ? 'يرجى كتابة سبب الرفض لتوضيح ما يلزم تصحيحه لموفر البيانات:' : 'Please enter the reason for rejection:'}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={isRTL ? 'مثال: الملف لا يحتوي على أكواد المحافظات الـ 27 أو يحتوي على قيم مفقودة تتجاوز 15%' : 'e.g., Missing governorate IDs or >15% null values'}
              className="w-full h-24 p-3 rounded-xl border border-slate-200 focus:border-rose-500 text-xs text-[#061A3A] outline-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingDatasetId(null)}
                className="h-9 px-4 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmReject}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
