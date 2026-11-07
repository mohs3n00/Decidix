import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../api/api_providers.dart';
import '../../../../core/auth/auth_controller.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';

enum UploadStage {
  idle,
  fileSelected,
  preparing,
  authorizing,
  uploading,
  verifying,
  validating,
  ingesting,
  activating,
  completed,
  failed,
}

/// Dataset management and upload interface:
/// - Overview metrics (total, processed, pending, failed, last update)
/// - Dataset upload (CSV/JSON, sector, period, metadata, preview)
/// - Validation & ingestion execution
/// - Dataset history & lifecycle management (inspect, activate, retry, delete)
class DatasetUploadScreen extends ConsumerStatefulWidget {
  const DatasetUploadScreen({super.key});

  @override
  ConsumerState<DatasetUploadScreen> createState() => _DatasetUploadScreenState();
}

class _DatasetUploadScreenState extends ConsumerState<DatasetUploadScreen> {
  static const _maxBytes = 25 * 1024 * 1024;

  // Form Controllers
  final _datasetName = TextEditingController();
  final _source = TextEditingController();
  final _sourceUrl = TextEditingController();
  final _license = TextEditingController();
  final _coverage = TextEditingController();
  final _description = TextEditingController();
  final _periodController = TextEditingController(text: '2025');
  final _searchController = TextEditingController();

  String _sector = 'overall';
  String _classification = 'synthetic';
  String _historyFilter = 'all';

  PlatformFile? _file;
  Uint8List? _bytes;
  String? _format;
  UploadStage _stage = UploadStage.idle;
  double _progress = 0;
  String? _message;
  String? _activeVersion;

  // File Preview Data
  List<String> _previewHeaders = [];
  List<List<String>> _previewRows = [];
  int _previewTotalLines = 0;

  // Overview Stats
  Map<String, dynamic>? _stats;
  bool _statsLoading = false;

  // History List
  List<Map<String, dynamic>> _historyDatasets = [];
  bool _historyLoading = false;

  bool get _busy =>
      _stage == UploadStage.preparing ||
      _stage == UploadStage.authorizing ||
      _stage == UploadStage.uploading ||
      _stage == UploadStage.verifying ||
      _stage == UploadStage.validating ||
      _stage == UploadStage.ingesting ||
      _stage == UploadStage.activating;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStats();
      _loadHistory();
    });
  }

  @override
  void dispose() {
    _datasetName.dispose();
    _source.dispose();
    _sourceUrl.dispose();
    _license.dispose();
    _coverage.dispose();
    _description.dispose();
    _periodController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadStats() async {
    try {
      setState(() => _statsLoading = true);
      final stats = await ref.read(datasetsApiProvider).getStats();
      if (mounted) {
        setState(() {
          _stats = stats;
          _statsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _statsLoading = false);
    }
  }

  Future<void> _loadHistory() async {
    try {
      setState(() => _historyLoading = true);
      final list = await ref.read(datasetsApiProvider).list(
            search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
            status: _historyFilter == 'all' ? null : _historyFilter,
          );
      if (mounted) {
        setState(() {
          _historyDatasets = list;
          _historyLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _historyLoading = false);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['csv', 'json'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final picked = result.files.single;
    final bytes = picked.bytes;
    if (bytes == null) {
      setState(() => _message = 'Could not read the selected file.');
      return;
    }
    final extension = (picked.extension ?? '').toLowerCase();
    if (extension != 'csv' && extension != 'json') {
      setState(() => _message = 'Only CSV and JSON datasets are supported.');
      return;
    }
    if (bytes.length > _maxBytes) {
      setState(() => _message = 'File exceeds the 25 MB limit.');
      return;
    }

    _generatePreview(bytes, extension);

    if (_source.text.trim().isEmpty) {
      _source.text = 'General Authority for Statistics';
    }
    if (_license.text.trim().isEmpty) {
      _license.text = 'Open Government License - Saudi Arabia';
    }
    if (_coverage.text.trim().isEmpty) {
      _coverage.text = 'All 12 administrative regions (2019-2025)';
    }
    if (_datasetName.text.trim().isEmpty) {
      _datasetName.text = picked.name.replaceAll('.csv', '').replaceAll('_', ' ').toUpperCase();
    }

    setState(() {
      _file = picked;
      _bytes = bytes;
      _format = extension == 'json' ? 'json' : 'csv';
      _message = null;
      if (_stage == UploadStage.idle || _stage == UploadStage.failed) {
        _stage = UploadStage.fileSelected;
      }
    });
  }

  void _generatePreview(Uint8List bytes, String extension) {
    try {
      final text = utf8.decode(bytes.take(8192).toList(), allowMalformed: true);
      if (extension == 'csv') {
        final lines = text.split(RegExp(r'\r?\n')).where((l) => l.trim().isNotEmpty).toList();
        final dataLines = lines.where((l) => !l.startsWith('#')).toList();
        _previewTotalLines = text.split(RegExp(r'\r?\n')).length;
        if (dataLines.isNotEmpty) {
          _previewHeaders = dataLines.first.split(',').map((h) => h.trim()).toList();
          _previewRows = dataLines.skip(1).take(5).map((line) {
            return line.split(',').map((c) => c.trim()).toList();
          }).toList();
        }
      } else {
        final parsed = jsonDecode(text);
        if (parsed is List && parsed.isNotEmpty) {
          final first = parsed.first;
          if (first is Map<String, dynamic>) {
            _previewHeaders = first.keys.take(6).toList();
            _previewRows = parsed.take(5).map((item) {
              if (item is Map<String, dynamic>) {
                return _previewHeaders.map((h) => '${item[h] ?? ''}').toList();
              }
              return <String>[];
            }).toList();
            _previewTotalLines = parsed.length;
          }
        } else if (parsed is Map<String, dynamic> && parsed['canonical'] != null) {
          final c = parsed['canonical'] as Map<String, dynamic>;
          final regions = (c['regions'] as List?)?.length ?? 0;
          final indicators = (c['indicators'] as List?)?.length ?? 0;
          _previewHeaders = ['Section', 'Elements', 'Status'];
          _previewRows = [
            ['Regions', '$regions entries', 'Canonical'],
            ['Indicators', '$indicators entries', 'Canonical'],
            ['Index History', '${(c['national_index_history'] as List?)?.length ?? 0} entries', 'Canonical'],
          ];
          _previewTotalLines = regions + indicators;
        }
      }
    } catch (_) {
      _previewHeaders = [];
      _previewRows = [];
    }
  }

  void _resetForm() {
    setState(() {
      _file = null;
      _bytes = null;
      _format = null;
      _stage = UploadStage.idle;
      _progress = 0;
      _message = null;
      _activeVersion = null;
      _previewHeaders = [];
      _previewRows = [];
    });
  }

  Future<void> _upload() async {
    if (_busy) return;
    if (_file == null || _bytes == null || _format == null) {
      setState(() => _message = 'Select a CSV or JSON file first.');
      return;
    }
    if (_source.text.trim().isEmpty ||
        _license.text.trim().isEmpty ||
        _coverage.text.trim().isEmpty) {
      setState(() => _message = 'Source, license and geographic coverage are required.');
      return;
    }

    final api = ref.read(datasetsApiProvider);
    final filename = _file!.name;
    final sizeBytes = _bytes!.length;
    final mime = _format == 'json' ? 'application/json' : 'text/csv';

    setState(() {
      _stage = UploadStage.preparing;
      _progress = 0;
      _message = null;
      _activeVersion = null;
    });

    try {
      // Stage 1 & 2: Authorize & Presign
      setState(() => _stage = UploadStage.authorizing);
      final initiated = await api.initiate({
        'filename': filename,
        'format': _format,
        'source': _source.text.trim(),
        'license': _license.text.trim(),
        'coverage': _coverage.text.trim(),
        'sizeBytes': sizeBytes,
        if (_datasetName.text.trim().isNotEmpty) 'name': _datasetName.text.trim(),
        if (_sourceUrl.text.trim().isNotEmpty) 'sourceUrl': _sourceUrl.text.trim(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        'classification': _classification,
      });

      final uploadUrl = initiated['upload_url'] as String;
      final objectKey = initiated['object_key'] as String;
      final version = initiated['version'] as String;
      final id = initiated['id'] as String;

      // Stage 3: Direct PUT to Cloudflare R2
      setState(() => _stage = UploadStage.uploading);
      await Dio().put(
        uploadUrl,
        data: _bytes!,
        options: Options(headers: {
          Headers.contentTypeHeader: mime,
          Headers.contentLengthHeader: sizeBytes,
        }),
        onSendProgress: (sent, total) {
          if (total > 0 && mounted) {
            setState(() => _progress = sent / total);
          }
        },
      );

      // Stage 4: Backend Object Verification
      setState(() => _stage = UploadStage.verifying);
      await api.complete(id, {
        'filename': filename,
        'format': _format,
        'source': _source.text.trim(),
        'license': _license.text.trim(),
        'coverage': _coverage.text.trim(),
        'sizeBytes': sizeBytes,
        'version': version,
        'objectKey': objectKey,
        if (_datasetName.text.trim().isNotEmpty) 'name': _datasetName.text.trim(),
        if (_sourceUrl.text.trim().isNotEmpty) 'sourceUrl': _sourceUrl.text.trim(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        'classification': _classification,
      });

      // Stage 5: Canonical Dataset Validation
      setState(() => _stage = UploadStage.validating);
      await api.validate(id);

      // Stage 6: Database Ingestion
      setState(() => _stage = UploadStage.ingesting);
      await api.ingest(id);

      // Stage 7: Safe Atomic Activation
      setState(() => _stage = UploadStage.activating);
      final activated = await api.activate(id);

      setState(() {
        _stage = UploadStage.completed;
        _activeVersion = activated['id'] as String? ?? version;
        _message = 'Dataset validated, ingested and activated.';
      });
      _loadStats();
      _loadHistory();
    } catch (error) {
      final message = _describeError(error);
      setState(() {
        _stage = UploadStage.failed;
        _message = message;
      });
    }
  }

  String _describeError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['error'] is Map) {
        final e = data['error'] as Map;
        final code = e['code'];
        final text = e['message'];
        if (code == 'STORAGE_CONFIG_MISSING') {
          return 'Storage service unconfigured (STORAGE_CONFIG_MISSING). The project owner must configure Cloudflare R2 credentials.';
        }
        if (code == 'ROLE_NOT_AUTHORIZED' || code == 'INSUFFICIENT_PERMISSIONS') {
          return 'Access denied: Only administrators and analysts have permission to upload datasets.';
        }
        if (code == 'DATASET_OBJECT_MISSING') {
          return 'Verification failed: Uploaded file was not found in storage.';
        }
        if (code == 'CHECKSUM_MISMATCH') {
          return 'Integrity check failed: Computed SHA-256 does not match storage payload.';
        }
        if (code == 'CANONICAL_DATASET_REQUIRED' || code == 'CANONICAL_DATASET_INVALID') {
          return 'Dataset validation failed: File does not match the canonical Decidix dataset specification.';
        }
        final fields = e['fields'];
        if (fields is Map && fields['csv'] is String) {
          return _describeCsvError(fields['csv'] as String, text?.toString() ?? '');
        }
        if (code != null || text != null) return '${code ?? 'ERROR'}: ${text ?? ''}';
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Network timeout. The presigned upload URL may have expired; retry the upload.';
      }
      return 'Upload failed (${error.type.name}). Check your connection and retry.';
    }
    return 'Upload failed: $error';
  }

  String _describeCsvError(String code, String detail) {
    switch (code) {
      case 'CSV_TEMPLATE_PREAMBLE_MISSING':
      case 'CSV_TEMPLATE_PREAMBLE_INVALID':
        return 'CSV metadata header is missing or invalid. Use the Decidix CSV template (it starts with "#decidix-csv: v1"). $detail';
      case 'CSV_TEMPLATE_HEADER_MISSING':
      case 'CSV_TEMPLATE_HEADER_UNKNOWN':
        return 'CSV columns do not match the Decidix template. $detail';
      case 'CSV_DEVELOPMENT_INDEX_REQUIRED':
      case 'CSV_DEVELOPMENT_INDEX_INCOMPLETE':
        return 'CSV is missing the development_index observations required for scores and history. $detail';
      case 'CSV_TEMPLATE_ROW_INCOMPLETE':
      case 'CSV_TEMPLATE_VALUE_INVALID':
      case 'CSV_TEMPLATE_UNIT_INVALID':
      case 'CSV_TEMPLATE_DOMAIN_INVALID':
      case 'CSV_TEMPLATE_UNKNOWN_REGION':
      case 'CSV_TEMPLATE_UNKNOWN_INDICATOR':
      case 'CSV_TEMPLATE_CONFLICTING_REGION':
      case 'CSV_TEMPLATE_CONFLICTING_INDICATOR':
      case 'CSV_TEMPLATE_DUPLICATE_OBSERVATION':
      case 'CSV_TEMPLATE_NO_OBSERVATIONS':
        return 'CSV validation failed ($code). $detail';
      default:
        return 'CSV validation failed ($code). $detail';
    }
  }

  static const _csvTemplate = '''#decidix-csv: v1
#name: Regional development 2025
#name_ar: التنمية الإقليمية 2025
#source: <publisher or origin of the data>
#license: <licence or usage terms>
#geographic_coverage: <regions covered>
#time_coverage: 2024-2025
#update_frequency: annual
#completeness_pct: 100
#timeliness_pct: 100
#accuracy_pct: 0
#age_days: 0
region_id,region_name,region_name_ar,region_population,region_latitude,region_longitude,indicator_key,indicator_label,indicator_label_ar,indicator_domain,indicator_unit,indicator_higher_is_better,year,value
central_capital,Central Capital,العاصمة,4000000,24.7,46.7,development_index,Development index,مؤشر التنمية,overall,score_100,true,2024,95.0
central_capital,Central Capital,العاصمة,4000000,24.7,46.7,literacy_rate,Literacy rate,معدل الإلمام,education,percent,true,2024,96.2
central_capital,Central Capital,العاصمة,4000000,24.7,46.7,development_index,Development index,مؤشر التنمية,overall,score_100,true,2025,95.4
central_capital,Central Capital,العاصمة,4000000,24.7,46.7,literacy_rate,Literacy rate,معدل الإلمام,education,percent,true,2025,96.6''';

  Future<void> _showCsvTemplate() async {
    final isAr = Directionality.of(context) == TextDirection.rtl ||
        Localizations.localeOf(context).languageCode == 'ar';
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(isAr ? 'قالب CSV لمجموعات بيانات Decidix' : 'Decidix dataset CSV template'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isAr
                    ? 'صف واحد لكل منطقة ومؤشر وسنة. كل صف يحدد المنطقة والمؤشر والوحدة، ويجب أن تحتوي كل منطقة على قراءة development_index لكل سنة.'
                    : 'One row per region, indicator and year. Every row declares its region, indicator and unit, and every region needs a development_index observation for each year.',
                style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.mist,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: SelectableText(
                  _csvTemplate,
                  style: AppTypography.captionRegular.copyWith(fontFamily: 'monospace', height: 1.35),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                isAr
                    ? 'الوحدات المسموحة: percent, per_mille, per_thousand, score_100, years, usd, pupils_per_teacher, count.'
                    : 'Allowed units: percent, per_mille, per_thousand, score_100, years, usd, pupils_per_teacher, count.',
                style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(isAr ? 'إغلاق' : 'Close'),
          ),
          FilledButton.icon(
            onPressed: () => Clipboard.setData(const ClipboardData(text: _csvTemplate)),
            icon: const Icon(Icons.copy_all_outlined, size: 16),
            label: Text(isAr ? 'نسخ' : 'Copy'),
          ),
        ],
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl ||
        Localizations.localeOf(context).languageCode == 'ar';
    final role = ref.watch(authNotifierProvider).user?.role;
    final canUpload = role == 'admin' || role == 'analyst';

    return Scaffold(
      backgroundColor: AppColors.mist,
      appBar: AppBar(
        title: Text(isAr ? 'رفع مجموعة بيانات' : 'Upload dataset'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.navy,
        elevation: 0,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          children: [
            if (!canUpload)
              _notice(
                isAr
                    ? 'هذه الشاشة متاحة للمسؤولين والمحللين فقط.'
                    : 'Only administrators and analysts can upload datasets.',
                AppColors.dangerSoft,
                AppColors.dangerText,
              ),
            _notice(
              isAr
                  ? 'بيانات العرض التوضيحي ليست إحصاءات رسمية.'
                  : 'Synthetic demo data is not official statistics.',
              AppColors.blueSoft,
              AppColors.blue,
            ),
            const SizedBox(height: 12),

            // 1. Overview Statistics Section
            _buildStatsSection(isAr),
            const SizedBox(height: 16),

            // 2. File Selection Section
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(isAr ? 'ملف مجموعة البيانات' : 'Dataset File', style: AppTypography.titleS),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _file == null ? AppColors.mist : AppColors.blueSoft,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Icon(
                          _format == 'json' ? Icons.code : Icons.table_chart,
                          color: _file == null ? AppColors.ink : AppColors.blue,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _file == null
                                  ? (isAr ? 'لم يتم اختيار ملف' : 'No file selected')
                                  : _file!.name,
                              style: AppTypography.bodyM.copyWith(fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (_file != null && _bytes != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                '${_formatBytes(_bytes!.length)} · ${_format?.toUpperCase() ?? ''}',
                                style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                              ),
                            ],
                          ],
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _busy ? null : _pickFile,
                        icon: const Icon(Icons.folder_open, size: 18),
                        label: Text(
                          _file == null
                              ? (isAr ? 'اختيار' : 'Choose')
                              : (isAr ? 'تغيير' : 'Replace'),
                        ),
                      ),
                      if (_file != null && !_busy)
                        IconButton(
                          onPressed: () => setState(() {
                            _file = null;
                            _bytes = null;
                            _format = null;
                            _previewHeaders = [];
                            _previewRows = [];
                            _stage = UploadStage.idle;
                          }),
                          icon: const Icon(Icons.close, size: 18, color: AppColors.ink),
                          tooltip: isAr ? 'إزالة' : 'Remove',
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    isAr
                        ? 'ملفات CSV يجب أن تتبع قالب Decidix: صف واحد لكل منطقة ومؤشر وسنة. ملفات JSON المعيارية مدعومة كما هي.'
                        : 'CSV files must follow the Decidix template: one row per region, indicator and year. Canonical JSON files are also supported as-is.',
                    style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      onPressed: _busy ? null : _showCsvTemplate,
                      icon: const Icon(Icons.description_outlined, size: 16),
                      label: Text(isAr ? 'عرض قالب CSV' : 'View CSV template'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. Dataset Preview Section (if file picked)
            if (_file != null && _previewHeaders.isNotEmpty) ...[
              _buildPreviewSection(isAr),
              const SizedBox(height: 16),
            ],

            // 4. Metadata Form Section
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(isAr ? 'بيانات التوثيق والنسب' : 'Metadata & Provenance', style: AppTypography.titleS),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _datasetName,
                    enabled: !_busy,
                    decoration: InputDecoration(
                      labelText: isAr ? 'اسم مجموعة البيانات' : 'Dataset name (e.g. Regional Development 2025)',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          isExpanded: true,
                          initialValue: _sector,
                          decoration: InputDecoration(
                            labelText: isAr ? 'القطاع' : 'Sector',
                            border: const OutlineInputBorder(),
                          ),
                          items: [
                            DropdownMenuItem(value: 'overall', child: Text(isAr ? 'شامل' : 'Overall', overflow: TextOverflow.ellipsis)),
                            DropdownMenuItem(value: 'healthcare', child: Text(isAr ? 'الصحة' : 'Healthcare', overflow: TextOverflow.ellipsis)),
                            DropdownMenuItem(value: 'education', child: Text(isAr ? 'التعليم' : 'Education', overflow: TextOverflow.ellipsis)),
                            DropdownMenuItem(value: 'economy', child: Text(isAr ? 'الاقتصاد' : 'Economy', overflow: TextOverflow.ellipsis)),
                            DropdownMenuItem(value: 'infrastructure', child: Text(isAr ? 'البنية التحتية' : 'Infrastructure', overflow: TextOverflow.ellipsis)),
                          ],
                          onChanged: _busy ? null : (v) => setState(() => _sector = v ?? 'overall'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _periodController,
                          enabled: !_busy,
                          decoration: InputDecoration(
                            labelText: isAr ? 'الفترة' : 'Period (e.g. 2025)',
                            border: const OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _source,
                    enabled: !_busy,
                    decoration: InputDecoration(
                      labelText: isAr ? 'المصدر / الناشر *' : 'Source / publisher *',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _sourceUrl,
                    enabled: !_busy,
                    decoration: InputDecoration(
                      labelText: isAr ? 'رابط المرجع / الوثيقة (اختياري)' : 'Source URL / reference (optional)',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _license,
                    enabled: !_busy,
                    decoration: InputDecoration(
                      labelText: isAr ? 'الترخيص *' : 'License (e.g. Open Government License) *',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _coverage,
                    enabled: !_busy,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: isAr ? 'النطاق الجغرافي والزمني *' : 'Geographic & temporal coverage *',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _description,
                    enabled: !_busy,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: isAr ? 'الوصف ومنهجية الجمع (اختياري)' : 'Description / methodology notes (optional)',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _classification,
                    decoration: InputDecoration(
                      labelText: isAr ? 'التصنيف' : 'Classification',
                      border: const OutlineInputBorder(),
                    ),
                    items: [
                      DropdownMenuItem(
                        value: 'official',
                        child: Text(isAr ? 'بيانات رسمية' : 'Official data', overflow: TextOverflow.ellipsis),
                      ),
                      DropdownMenuItem(
                        value: 'third_party',
                        child: Text(isAr ? 'بيانات مرخصة من طرف ثالث' : 'Third-party licensed data', overflow: TextOverflow.ellipsis),
                      ),
                      DropdownMenuItem(
                        value: 'synthetic',
                        child: Text(isAr ? 'بيانات توضيحية اصطناعية' : 'Synthetic demo data', overflow: TextOverflow.ellipsis),
                      ),
                    ],
                    onChanged: _busy ? null : (value) => setState(() => _classification = value ?? 'synthetic'),
                  ),
                  if (_classification == 'synthetic')
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.warningSoft,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          border: Border.all(color: AppColors.accentWarning.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.warningText),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                isAr
                                    ? 'سيتم وسم هذه البيانات كبيانات توضيحية، وليست رسمية.'
                                    : 'This upload will be treated as synthetic demonstration data, not official.',
                                style: AppTypography.captionRegular.copyWith(color: AppColors.warningText),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 5. Processing Stepper (when in progress)
            if (_stage != UploadStage.idle && _stage != UploadStage.fileSelected) ...[
              _buildProcessingStepper(isAr),
              const SizedBox(height: 16),
            ],

            // 6. Success Card
            if (_stage == UploadStage.completed) ...[
              _buildSuccessCard(isAr),
              const SizedBox(height: 16),
            ],

            // Error message if any
            if (_message != null && _stage == UploadStage.failed) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.dangerSoft,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _message!,
                        style: AppTypography.captionRegular.copyWith(color: AppColors.dangerText),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: (canUpload && !_busy) ? _upload : null,
                icon: _busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.cloud_upload_outlined, size: 20),
                label: Text(
                  _busy
                      ? (isAr ? 'جارٍ الرفع والمعالجة...' : 'Processing...')
                      : (isAr ? 'رفع ومعالجة' : 'Upload and process'),
                  style: AppTypography.labelL.copyWith(color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // 7. Dataset History & Existing Datasets Section
            _buildHistorySection(isAr, canUpload),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(bool isAr) {
    final stats = _stats;
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  isAr ? 'نظرة عامة على البيانات' : 'Dataset Overview',
                  style: AppTypography.titleS,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (_statsLoading)
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
              else
                IconButton(
                  icon: const Icon(Icons.refresh, size: 18, color: AppColors.blue),
                  onPressed: _loadStats,
                  tooltip: isAr ? 'تحديث' : 'Refresh',
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _statTile(
                  title: isAr ? 'إجمالي المجموعات' : 'Total',
                  value: '${stats?['total'] ?? 1}',
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _statTile(
                  title: isAr ? 'معالجة بنجاح' : 'Processed',
                  value: '${stats?['processed'] ?? 1}',
                  color: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _statTile(
                  title: isAr ? 'قيد المعالجة' : 'Pending',
                  value: '${stats?['pending'] ?? 0}',
                  color: AppColors.accentWarning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _statTile(
                  title: isAr ? 'فشلت' : 'Failed',
                  value: '${stats?['failed'] ?? 0}',
                  color: AppColors.danger,
                ),
              ),
            ],
          ),
          if (stats?['active_version'] != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.blueSoft,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 14, color: AppColors.blue),
                  const SizedBox(width: 6),
                  Text(
                    isAr ? 'النسخة النشطة حالياً: ' : 'Active Version: ',
                    style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                  ),
                  Text(
                    '${stats!['active_version']}',
                    style: AppTypography.captionMedium.copyWith(color: AppColors.blue, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statTile({required String title, required String value, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Column(
        children: [
          Text(value, style: AppTypography.headingPage.copyWith(fontSize: 18, color: color)),
          const SizedBox(height: 2),
          Text(title, style: AppTypography.captionRegular.copyWith(fontSize: 10, color: AppColors.ink), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildPreviewSection(bool isAr) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.preview_outlined, size: 18, color: AppColors.blue),
              const SizedBox(width: 8),
              Text(isAr ? 'معاينة سريعة للبيانات' : 'Dataset Preview', style: AppTypography.titleS),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.successSoft,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  isAr ? '$_previewTotalLines صف' : '$_previewTotalLines rows',
                  style: AppTypography.captionMedium.copyWith(color: AppColors.successText),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowHeight: 36,
              dataRowMinHeight: 32,
              dataRowMaxHeight: 36,
              headingRowColor: WidgetStateProperty.all(AppColors.mist),
              columns: _previewHeaders
                  .map((h) => DataColumn(label: Text(h, style: AppTypography.captionMedium.copyWith(fontWeight: FontWeight.bold))))
                  .toList(),
              rows: _previewRows.map((row) {
                return DataRow(
                  cells: List.generate(_previewHeaders.length, (idx) {
                    final cellValue = idx < row.length ? row[idx] : '';
                    return DataCell(Text(cellValue, style: AppTypography.captionRegular));
                  }),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingStepper(bool isAr) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(isAr ? 'حالة المعالجة والتفعيل' : 'Processing & Activation', style: AppTypography.titleS),
              const Spacer(),
              if (_busy)
                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ),
          const SizedBox(height: 12),
          _stepRow(
            stepNumber: 1,
            title: isAr ? 'طلب تصريح الرفع (Presign)' : 'Request Upload Authorization',
            isDone: _stageIndex(_stage) > _stageIndex(UploadStage.authorizing),
            isActive: _stage == UploadStage.preparing || _stage == UploadStage.authorizing,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.authorizing),
          ),
          _stepRow(
            stepNumber: 2,
            title: isAr
                ? 'الرفع المباشر إلى التخزين السحابي (${(_progress * 100).toStringAsFixed(0)}%)'
                : 'Upload to Cloud Storage (${(_progress * 100).toStringAsFixed(0)}%)',
            isDone: _stageIndex(_stage) > _stageIndex(UploadStage.uploading),
            isActive: _stage == UploadStage.uploading,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.uploading),
          ),
          if (_stage == UploadStage.uploading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 24),
              child: LinearProgressIndicator(value: _progress == 0 ? null : _progress, borderRadius: BorderRadius.circular(4)),
            ),
          _stepRow(
            stepNumber: 3,
            title: isAr ? 'التحقق من سلامة الملف المخزن' : 'Verify Stored Object & Checksum',
            isDone: _stageIndex(_stage) > _stageIndex(UploadStage.verifying),
            isActive: _stage == UploadStage.verifying,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.verifying),
          ),
          _stepRow(
            stepNumber: 4,
            title: isAr ? 'التحقق من صحة البيانات المعيارية' : 'Validate Canonical Schema',
            isDone: _stageIndex(_stage) > _stageIndex(UploadStage.validating),
            isActive: _stage == UploadStage.validating,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.validating),
          ),
          _stepRow(
            stepNumber: 5,
            title: isAr ? 'إدخال السجلات في قاعدة البيانات' : 'Ingest Analytical Records',
            isDone: _stageIndex(_stage) > _stageIndex(UploadStage.ingesting),
            isActive: _stage == UploadStage.ingesting,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.ingesting),
          ),
          _stepRow(
            stepNumber: 6,
            title: isAr ? 'تفعيل النسخة الرسمية' : 'Activate Dataset Version',
            isDone: _stage == UploadStage.completed,
            isActive: _stage == UploadStage.activating,
            isFailed: _stage == UploadStage.failed && _stageIndex(_stage) <= _stageIndex(UploadStage.activating),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessCard(bool isAr) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.successSoft,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline, color: AppColors.success, size: 40),
          const SizedBox(height: 8),
          Text(
            isAr ? 'تم تفعيل مجموعة البيانات بنجاح!' : 'Dataset Successfully Activated!',
            style: AppTypography.titleM.copyWith(color: AppColors.successText),
          ),
          if (_activeVersion != null) ...[
            const SizedBox(height: 4),
            Text(
              isAr ? 'النسخة النشطة: $_activeVersion' : 'Active version: $_activeVersion',
              style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _resetForm,
                  child: Text(isAr ? 'رفع ملف آخر' : 'Upload Another'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () => context.go('/overview/dashboard'),
                  child: Text(isAr ? 'عرض المؤشرات' : 'Go to Dashboard'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistorySection(bool isAr, bool canUpload) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  isAr ? 'سجل وإدارة المجموعات' : 'Dataset History & Management',
                  style: AppTypography.titleS,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (_historyLoading)
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
              else
                IconButton(
                  icon: const Icon(Icons.refresh, size: 18, color: AppColors.blue),
                  onPressed: _loadHistory,
                  tooltip: isAr ? 'تحديث' : 'Refresh',
                ),
            ],
          ),
          const SizedBox(height: 10),
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('all', isAr ? 'الكل' : 'All'),
                const SizedBox(width: 8),
                _filterChip('validated', isAr ? 'معتمدة / نشطة' : 'Validated'),
                const SizedBox(width: 8),
                _filterChip('pending', isAr ? 'قيد الانتظار' : 'Pending'),
                const SizedBox(width: 8),
                _filterChip('invalid', isAr ? 'غير صالحة' : 'Invalid'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_historyDatasets.isEmpty)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Text(
                  isAr ? 'لا توجد مجموعات بيانات مسجلة' : 'No datasets found',
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
              ),
            )
          else
            ..._historyDatasets.map((ds) => _buildDatasetItem(ds, isAr, canUpload)),
        ],
      ),
    );
  }

  Widget _filterChip(String filterKey, String label) {
    final isSelected = _historyFilter == filterKey;
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      selectedColor: AppColors.blueSoft,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.blue : AppColors.ink,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      onSelected: (_) {
        setState(() => _historyFilter = filterKey);
        _loadHistory();
      },
    );
  }

  Widget _buildDatasetItem(Map<String, dynamic> ds, bool isAr, bool canUpload) {
    final id = ds['id'] as String? ?? '';
    final version = ds['version'] as String? ?? '';
    final filename = ds['filename'] as String? ?? '';
    final status = ds['validation_status'] as String? ?? 'pending';
    final isActive = ds['is_active'] as bool? ?? false;
    final recordCount = ds['record_count'] as int? ?? 0;
    final metadata = ds['metadata'] as Map<String, dynamic>?;
    final displayName = metadata?['name'] as String? ?? filename;

    Color statusColor;
    String statusLabel;
    switch (status) {
      case 'validated':
        statusColor = AppColors.success;
        statusLabel = isAr ? 'معتمدة' : 'Validated';
        break;
      case 'invalid':
        statusColor = AppColors.danger;
        statusLabel = isAr ? 'غير صالحة' : 'Invalid';
        break;
      default:
        statusColor = AppColors.accentWarning;
        statusLabel = isAr ? 'قيد الانتظار' : 'Pending';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            displayName,
                            style: AppTypography.bodyM.copyWith(fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isActive) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success,
                              borderRadius: BorderRadius.circular(AppRadius.pill),
                            ),
                            child: Text(
                              isAr ? 'نشط' : 'ACTIVE',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$version · $recordCount ${isAr ? 'سجل' : 'records'}',
                      style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const Divider(height: 16),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 4,
            children: [
              TextButton.icon(
                onPressed: () => _showDatasetDetails(ds, isAr),
                icon: const Icon(Icons.info_outline, size: 16),
                label: Text(isAr ? 'التفاصيل' : 'Details'),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (canUpload && status == 'validated' && !isActive)
                    FilledButton.tonal(
                      onPressed: () async {
                        try {
                          await ref.read(datasetsApiProvider).activate(id);
                          _loadStats();
                          _loadHistory();
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Activation failed: $e')));
                          }
                        }
                      },
                      child: Text(isAr ? 'تفعيل' : 'Activate'),
                    ),
                  if (canUpload && status == 'invalid')
                    OutlinedButton.icon(
                      onPressed: () async {
                        try {
                          await ref.read(datasetsApiProvider).retry(id);
                          _loadHistory();
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Retry failed: $e')));
                          }
                        }
                      },
                      icon: const Icon(Icons.refresh, size: 16),
                      label: Text(isAr ? 'إعادة المحاولة' : 'Retry'),
                    ),
                  if (canUpload && !isActive)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                      onPressed: () => _confirmDelete(id, displayName, isAr),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showDatasetDetails(Map<String, dynamic> ds, bool isAr) async {
    final metadata = ds['metadata'] as Map<String, dynamic>?;
    final validationError = ds['validation_error'] as String?;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.hairline, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Text(ds['filename'] as String? ?? 'Dataset', style: AppTypography.titleM),
            const SizedBox(height: 4),
            Text('Version: ${ds['version']}', style: AppTypography.captionRegular.copyWith(color: AppColors.ink)),
            const Divider(height: 24),
            _reviewRow(isAr ? 'المصدر:' : 'Source:', '${ds['source'] ?? '—'}'),
            _reviewRow(isAr ? 'الترخيص:' : 'License:', '${ds['license'] ?? '—'}'),
            _reviewRow(isAr ? 'التغطية:' : 'Coverage:', '${ds['coverage'] ?? '—'}'),
            _reviewRow(isAr ? 'تاريخ الرفع:' : 'Uploaded at:', '${ds['uploaded_at'] ?? '—'}'),
            _reviewRow(isAr ? 'عدد السجلات:' : 'Record count:', '${ds['record_count'] ?? 0}'),
            if (metadata != null) ...[
              _reviewRow(isAr ? 'اكتمال البيانات:' : 'Completeness:', '${metadata['completeness_pct'] ?? 0}%'),
              _reviewRow(isAr ? 'حداثة البيانات:' : 'Timeliness:', '${metadata['timeliness_pct'] ?? 0}%'),
            ],
            if (validationError != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.dangerSoft, borderRadius: BorderRadius.circular(AppRadius.sm)),
                child: Text('Error: $validationError', style: AppTypography.captionRegular.copyWith(color: AppColors.dangerText)),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text(isAr ? 'إغلاق' : 'Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(String id, String name, bool isAr) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isAr ? 'حذف مجموعة البيانات' : 'Delete Dataset'),
        content: Text(
          isAr
              ? 'هل أنت متأكد من رغبتك في حذف "$name"؟ لا يمكن التراجع عن هذا الإجراء.'
              : 'Are you sure you want to delete "$name"? This action cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(isAr ? 'إلغاء' : 'Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isAr ? 'حذف' : 'Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(datasetsApiProvider).delete(id);
        _loadStats();
        _loadHistory();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Delete failed: $e')));
        }
      }
    }
  }

  Widget _notice(String text, Color bg, Color fg) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Text(text, style: AppTypography.captionRegular.copyWith(color: fg)),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.hairline),
      ),
      child: child,
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: AppTypography.captionMedium.copyWith(color: AppColors.ink)),
          ),
          Expanded(
            child: Text(value, style: AppTypography.captionRegular.copyWith(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _stepRow({
    required int stepNumber,
    required String title,
    required bool isDone,
    required bool isActive,
    required bool isFailed,
  }) {
    Color iconColor;
    IconData iconData;

    if (isDone) {
      iconColor = AppColors.success;
      iconData = Icons.check_circle;
    } else if (isFailed) {
      iconColor = AppColors.danger;
      iconData = Icons.cancel;
    } else if (isActive) {
      iconColor = AppColors.blue;
      iconData = Icons.radio_button_checked;
    } else {
      iconColor = AppColors.hairline;
      iconData = Icons.radio_button_unchecked;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(iconData, color: iconColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$stepNumber. $title',
              style: AppTypography.captionRegular.copyWith(
                color: isFailed ? AppColors.dangerText : (isActive ? AppColors.navy : AppColors.ink),
                fontWeight: isActive || isDone ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  int _stageIndex(UploadStage stage) {
    switch (stage) {
      case UploadStage.idle:
      case UploadStage.fileSelected:
        return 0;
      case UploadStage.preparing:
      case UploadStage.authorizing:
        return 1;
      case UploadStage.uploading:
        return 2;
      case UploadStage.verifying:
        return 3;
      case UploadStage.validating:
        return 4;
      case UploadStage.ingesting:
        return 5;
      case UploadStage.activating:
      case UploadStage.completed:
        return 6;
      case UploadStage.failed:
        return 0;
    }
  }
}
