import React, { useState, useEffect } from 'react';
import { datasetService } from '../../services/datasetService';
import { DatasetItem, DatasetStats } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const DatasetManagementScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [activeDataset, setActiveDataset] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'csv' | 'tsv' | 'json' | 'jsonl' | 'xlsx' | 'xls'>('csv');
  const [source, setSource] = useState('CAPMAS & Decidix Platform');
  const [coverage, setCoverage] = useState('Egypt Governorates 2018-2025');
  const [license, setLicense] = useState('CC-BY-4.0');
  const [autoActivate, setAutoActivate] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [listRes, statsRes, activeRes] = await Promise.all([
        datasetService.list(),
        datasetService.stats(),
        datasetService.active().catch(() => null),
      ]);
      setDatasets(listRes || []);
      setStats(statsRes || null);
      setActiveDataset(activeRes || null);
    } catch (err: any) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);

      // Auto-detect format from file extension
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (['csv', 'tsv', 'json', 'jsonl', 'xlsx', 'xls'].includes(ext || '')) {
        setFormat(ext as any);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError(isRTL ? 'يرجى اختيار ملف البيانات أولاً.' : 'Please select a dataset file to upload.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      let content = '';

      if (format === 'xlsx' || format === 'xls') {
        // Read as Base64 for binary spreadsheets
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Extract pure base64 without data URI prefix
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } else {
        // Read as UTF-8 Text for CSV, TSV, JSON, JSONL
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file);
        });
      }

      const res = await datasetService.uploadDirect({
        filename: file.name,
        format,
        source,
        license,
        coverage,
        content,
        auto_activate: autoActivate,
      });

      setUploadSuccess(
        isRTL
          ? `تم رفع البيانات بنجاح إلى Cloudflare R2 ومعالجة السجلات (${res.record_count || res.records_processed || 'معتمدة'})!`
          : `Dataset successfully uploaded to Cloudflare R2 bucket and ingested (${res.record_count || res.records_processed || 'verified'} records)!`
      );
      setFile(null);
      await loadData();
    } catch (err: any) {
      setUploadError(err?.message || 'Dataset upload failed. Check format validity.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'إدارة' : 'Dataset'}
            second={isRTL ? 'البيانات وسحابة R2' : 'Platform & R2'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'رفع وإدارة السجلات الإحصائية متعددة الصيغ وحفظها سحابياً في Cloudflare R2'
              : 'Multi-format ingestion pipeline & Cloudflare R2 object storage management'}
          </p>
        </div>

        <button
          onClick={loadData}
          className="decidix-btn-secondary text-xs self-start"
        >
          {isRTL ? 'تحديث البيانات ⟳' : 'Refresh Datasets ⟳'}
        </button>
      </div>

      {/* R2 & Platform Storage KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="decidix-card p-5">
          <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
            {isRTL ? 'المجموعات النشطة' : 'Active Datasets'}
          </div>
          <div className="text-2xl font-bold text-navy">
            {stats?.active_datasets || (activeDataset ? 1 : 0)}
          </div>
          <div className="text-xs text-blue mt-1">
            {isRTL ? 'المصدر الأساسي للمؤشرات' : 'Grounding Analytics & AI'}
          </div>
        </div>

        <div className="decidix-card p-5">
          <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
            {isRTL ? 'إجمالي السجلات المفحوصة' : 'Ingested Records'}
          </div>
          <div className="text-2xl font-bold text-navy">
            {(stats?.total_records || 0).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            {isRTL ? 'تم التحقق من النزاهة' : 'Verified canonical data'}
          </div>
        </div>

        <div className="decidix-card p-5">
          <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
            {isRTL ? 'استهلاك سحابة R2' : 'R2 Object Storage'}
          </div>
          <div className="text-2xl font-bold text-navy">
            {formatBytes(stats?.total_storage_bytes || 0)}
          </div>
          <div className="text-xs text-faded-ink mt-1">
            Bucket: <code className="text-navy font-bold">decidcix</code>
          </div>
        </div>

        <div className="decidix-card p-5">
          <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
            {isRTL ? 'الصيغ المدعومة' : 'Supported Formats'}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {['CSV', 'TSV', 'JSON', 'JSONL', 'XLSX', 'XLS'].map((fmt) => (
              <span key={fmt} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-well text-navy">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Direct Multi-Format Upload Card */}
      <div className="decidix-card p-6 md:p-8 bg-white border border-blue/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center font-bold">
            ☁
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">
              {isRTL ? 'رفع ملف بيانات جديد وتنشيطه في R2' : 'Direct Dataset Upload to Cloudflare R2'}
            </h2>
            <p className="text-xs text-faded-ink">
              {isRTL
                ? 'يدعم ملفات CSV، TSV، JSON، JSONL، وExcel (XLSX, XLS) مع التحقق الفوري من صحة البيانات'
                : 'Direct stream ingestion into bucket "decidcix" with automated schema validation'}
            </p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="p-4 mb-6 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
            <span>✓ {uploadSuccess}</span>
            <button onClick={() => setUploadSuccess(null)} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {uploadError && (
          <div className="p-4 mb-6 rounded-card bg-rose-50 border border-rose-200 text-danger text-sm font-semibold flex items-center justify-between">
            <span>✕ {uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-rose-600 font-bold">✕</button>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* File Picker Drop Area */}
          <div className="border-2 border-dashed border-line hover:border-blue rounded-hero p-8 text-center transition bg-well/50">
            <input
              type="file"
              id="dataset-file-input"
              className="hidden"
              accept=".csv,.tsv,.json,.jsonl,.ndjson,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <label htmlFor="dataset-file-input" className="cursor-pointer block">
              <div className="text-3xl mb-2">📁</div>
              <div className="font-bold text-navy text-sm">
                {file ? file.name : isRTL ? 'انقر لاختيار ملف بيانات من جهازك' : 'Click to select or drag & drop dataset file'}
              </div>
              <div className="text-xs text-faded-ink mt-1">
                {file
                  ? `${formatBytes(file.size)} • ${file.type || 'Document'}`
                  : '.csv, .tsv, .json, .jsonl, .xlsx, .xls (Up to 25MB)'}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'صيغة الملف' : 'Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="decidix-input font-medium"
              >
                <option value="csv">CSV (Comma-Separated)</option>
                <option value="tsv">TSV (Tab-Separated)</option>
                <option value="json">JSON (Structured Array)</option>
                <option value="jsonl">JSONL / NDJSON</option>
                <option value="xlsx">Excel OpenXML (.xlsx)</option>
                <option value="xls">Excel 97-2004 (.xls)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'الجهة المصدرية' : 'Data Source'}
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="decidix-input"
                placeholder="e.g. CAPMAS, Ministry of Planning"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'التغطية الجغرافية والزمنية' : 'Geographic Coverage'}
              </label>
              <input
                type="text"
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                className="decidix-input"
                placeholder="e.g. Egypt Regions 2018-2025"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-line">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-navy">
              <input
                type="checkbox"
                checked={autoActivate}
                onChange={(e) => setAutoActivate(e.target.checked)}
                className="w-4 h-4 text-blue rounded"
              />
              <span>
                {isRTL
                  ? 'تنشيط النسخة فوراً وتحديث محرك الاسترجاع الذكي (RAG) والتحليلات'
                  : 'Auto-activate version and immediately refresh RAG & regional indices'}
              </span>
            </label>

            <button
              type="submit"
              disabled={isUploading || !file}
              className="decidix-btn-primary px-8 text-xs font-bold"
            >
              {isUploading
                ? isRTL ? 'جارٍ البث إلى R2 والمعالجة...' : 'Streaming to R2 & Ingesting...'
                : isRTL ? 'رفع وتنشيط البيانات' : 'Upload & Ingest Dataset'}
            </button>
          </div>
        </form>
      </div>

      {/* Datasets Table */}
      <div className="decidix-card p-6">
        <h3 className="font-bold text-navy text-base mb-4">
          {isRTL ? 'سجل مجموعات البيانات المخزنة في المنصة' : 'Registered Dataset Repository'}
        </h3>

        {isLoading ? (
          <LoadingSpinner message="" />
        ) : datasets.length === 0 ? (
          <div className="p-8 text-center text-ink">
            <p>{isRTL ? 'لا توجد مجموعات بيانات مسجلة حالياً.' : 'No datasets registered yet. Upload your first dataset above.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                  <th className="py-3 px-4">{isRTL ? 'اسم المجموعة' : 'Dataset Name'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الصيغة' : 'Format'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المصدر' : 'Source'}</th>
                  <th className="py-3 px-4">{isRTL ? 'النسخة النشطة' : 'Active Version'}</th>
                  <th className="py-3 px-4">{isRTL ? 'السجلات' : 'Records'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {datasets.map((item) => (
                  <tr key={item.id} className="hover:bg-well/50 transition">
                    <td className="py-3 px-4 font-semibold text-navy">
                      {item.name || item.id}
                      <div className="text-[11px] text-faded-ink font-normal">{item.coverage}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue/10 text-blue uppercase">
                        {item.format}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink text-xs">{item.source}</td>
                    <td className="py-3 px-4 font-mono text-xs text-navy">
                      {item.active_version?.version || 'v1.0.0'}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-navy">
                      {(item.active_version?.record_count || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="decidix-pill-badge bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
