import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../api/models/insights.dart';
import '../../../../core/auth/auth_controller.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/progress_row.dart';
import '../../../../shared/widgets/score_ring.dart';
import '../../../../shared/widgets/stat_tile.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';

class DataQualityScreen extends ConsumerWidget {
  const DataQualityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quality = ref.watch(dataQualityProvider);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final isAr = locale.languageCode == 'ar';

    return DecidixPage(
      tabs: const InsightsChipBar(selectedIndex: 7),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_data_quality'),
      onRefresh: () => refreshFuture(ref, dataQualityProvider),
      children: asyncSections(
        quality,
        skeletonRows: 5,
        onRetry: () => ref.invalidate(dataQualityProvider),
        builder: (data) => [
          if (_canUpload(ref))
            DecidixCard(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.blue.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.cloud_upload_outlined, color: AppColors.blue, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'إدارة ورفع مجموعات البيانات' : 'Dataset Management & Upload',
                          style: AppTypography.titleS,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isAr
                              ? 'استيراد ملفات CSV, TSV, XLSX, JSON للتحليل والتنبؤ'
                              : 'Import CSV, TSV, XLSX, JSON for analysis & ML',
                          style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () => context.push('/datasets/upload'),
                    icon: const Icon(Icons.upload_file, size: 16),
                    label: Text(isAr ? 'رفع' : 'Upload'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.blue,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
          DecidixCard(
            child: Row(
              children: [
                ScoreRing(
                  score: data.score,
                  size: 84,
                  strokeWidth: 8,
                  color: _coverageColor(data.score),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fmt.qualityBand(data.band),
                        style: AppTypography.titleM,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        fmt.tr('dq_confidence'),
                        style: AppTypography.bodyS.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          StatRow(
            tiles: [
              StatTile(
                value: fmt.percent(data.completeness),
                label: fmt.tr('dq_complete'),
              ),
              StatTile(
                value: fmt.percent(data.timeliness),
                label: fmt.tr('dq_timely'),
              ),
              StatTile(
                value: fmt.percent(data.accuracy),
                label: fmt.tr('dq_accurate'),
              ),
            ],
          ),
          Section(
            title: fmt.tr('dq_lowest_coverage'),
            child: DecidixCard(
              child: Column(
                children: [
                  for (final (i, entry) in data.lowestCoverage.indexed) ...[
                    if (i > 0) const SizedBox(height: 14),
                    ProgressRow(
                      label: entry.name.resolve(locale),
                      valueLabel: fmt.percent(entry.coverage),
                      progress: entry.coverage / 100,
                      color: _coverageColor(entry.coverage),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Section(
            title: fmt.tr('dq_sources'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    fmt.tr('dq_tap_to_explore'),
                    style: AppTypography.captionRegular.copyWith(
                      color: AppColors.ink,
                    ),
                  ),
                ),
                DecidixCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      for (final (i, source) in data.sources.indexed) ...[
                        if (i > 0) const Divider(height: 1),
                        _SourceRow(source: source),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Red below 65, amber below 75, green from 75.
  bool _canUpload(WidgetRef ref) {
    // All authenticated users can access dataset upload & management
    return ref.watch(authNotifierProvider).isAuthenticated;
  }

  static Color _coverageColor(double value) {
    if (value >= 75) return AppColors.success;
    if (value >= 65) return AppColors.warning;
    return AppColors.danger;
  }
}

class _SourceRow extends StatelessWidget {
  final DataSource source;

  const _SourceRow({required this.source});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final overdue = source.status == SourceStatus.overdue;

    final age = overdue
        ? fmt.tr('dq_overdue', {'n': source.ageDays})
        : source.ageDays == 0
        ? fmt.tr('dq_synced_today')
        : fmt.tr('dq_synced_days', {'n': source.ageDays});

    return InkWell(
      onTap: () => _showDatasetDetails(context, source),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: overdue ? AppColors.danger : AppColors.success,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 3,
              child: Text(
                source.name.resolve(locale),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.labelM,
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              flex: 2,
              child: Text(
                age,
                textAlign: TextAlign.end,
                style: AppTypography.captionRegular.copyWith(
                  color: overdue ? AppColors.dangerText : AppColors.ink,
                ),
              ),
            ),
            const SizedBox(width: 6),
            const Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.ink,
            ),
          ],
        ),
      ),
    );
  }

  void _showDatasetDetails(BuildContext context, DataSource source) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final isAr = locale.languageCode == 'ar';

    final meta = _lookupMetadata(source.name.resolve(locale));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentWarning.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: AppColors.accentWarning.withValues(alpha: 0.4),
                          ),
                        ),
                        child: Text(
                          isAr ? 'نموذج محاكاة أكاديمي' : 'Academic Simulation Model',
                          style: AppTypography.captionMedium.copyWith(
                            color: AppColors.warningText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    source.name.resolve(locale),
                    style: AppTypography.titleM,
                  ),
                  const SizedBox(height: 16),
                  _buildMetaTile(
                    label: isAr ? 'نزاهة البيانات والتصنيف' : 'Data Integrity & Provenance',
                    value: isAr
                        ? 'SIMULATED — بيانات محاكاة خوارزمياً لأغراض مشروع التخرج الجامعي (ليست إحصاءات رسمية)'
                        : 'SIMULATED — Algorithmically generated for academic defense (not direct official records)',
                    icon: Icons.shield_outlined,
                  ),
                  _buildMetaTile(
                    label: fmt.tr('dq_original_source'),
                    value: isAr ? meta.arabicSource : meta.source,
                    icon: Icons.account_balance_outlined,
                  ),
                  _buildMetaTile(
                    label: fmt.tr('dq_license'),
                    value: meta.license,
                    icon: Icons.verified_user_outlined,
                  ),
                  _buildMetaTile(
                    label: fmt.tr('dq_coverage'),
                    value: isAr
                        ? '12 منطقة تجريبية (إحداثيات إقليمية بأسماء بديلة)'
                        : '12 Calibrated Regions (Regional Coordinates / Slugs)',
                    icon: Icons.public_outlined,
                  ),
                  _buildMetaTile(
                    label: fmt.tr('dq_time_coverage'),
                    value: meta.timeCoverage,
                    icon: Icons.calendar_today_outlined,
                  ),
                  const Divider(height: 28),
                  Text(
                    fmt.tr('dq_indicators'),
                    style: AppTypography.labelM,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final ind in (isAr ? meta.arabicIndicators : meta.indicators))
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.wellTint,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            ind,
                            style: AppTypography.captionRegular.copyWith(
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const Divider(height: 28),
                  Text(
                    fmt.tr('dq_lineage'),
                    style: AppTypography.labelM,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.wellTint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.hub_outlined, size: 20, color: AppColors.blue),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            isAr
                                ? 'نص التوليد scripts/pipeline_ingest.py ➔ فحوصات الحدود ➔ تدقيق النموذج ➔ العرض في التطبيق'
                                : 'Generator script scripts/pipeline_ingest.py ➔ Bounds Check ➔ Model Ingestion ➔ UI Display',
                            style: AppTypography.captionRegular.copyWith(
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetaTile({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.ink),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
                Text(
                  value,
                  style: AppTypography.bodyS.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static _CatalogEntry _lookupMetadata(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('health') || lower.contains('صحة')) {
      return const _CatalogEntry(
        source: 'Simulated Health Sector Model (scripts/pipeline_ingest.py)',
        arabicSource: 'نموذج محاكاة قطاع الصحة (أداة الاستيراد التجريبية)',
        license: 'Academic Demonstration Model License',
        timeCoverage: '2019–2025 (Annual & Q4 Series)',
        indicators: [
          'Life Expectancy (years)',
          'Physicians Density (per 1,000)',
          'Hospital Bed Capacity (per 1,000)',
          'Maternal Mortality (per 100k)',
          'Primary Clinic Shortfall (%)',
        ],
        arabicIndicators: [
          'متوسط العمر المتوقع (سنوات)',
          'كثافة الأطباء (لكل 1000 نسمة)',
          'سعة الأسرّة (لكل 1000 نسمة)',
          'وفيات الأمهات (لكل 100 ألف)',
          'نقص العيادات الأولية (%)',
        ],
      );
    } else if (lower.contains('education') || lower.contains('تعليم')) {
      return const _CatalogEntry(
        source: 'Simulated Education Sector Model (scripts/pipeline_ingest.py)',
        arabicSource: 'نموذج محاكاة قطاع التعليم (أداة الاستيراد التجريبية)',
        license: 'Academic Demonstration Model License',
        timeCoverage: '2019–2025',
        indicators: [
          'Literacy Rate (%)',
          'School Enrolment (%)',
          'Pupil-Teacher Ratio (pupils/teacher)',
          'Tertiary Completion (%)',
        ],
        arabicIndicators: [
          'معدل القراءة والكتابة (%)',
          'الالتحاق المدرسي (%)',
          'نسبة التلاميذ للمعلم',
          'إتمام التعليم الجامعي (%)',
        ],
      );
    } else if (lower.contains('labor') || lower.contains('statistic') || lower.contains('قوى') || lower.contains('إحصاء')) {
      return const _CatalogEntry(
        source: 'Simulated Economy & Labor Model (scripts/pipeline_ingest.py)',
        arabicSource: 'نموذج محاكاة الاقتصاد والقوى العاملة (أداة الاستيراد التجريبية)',
        license: 'Academic Demonstration Model License',
        timeCoverage: '2019–2025',
        indicators: [
          'Unemployment Rate (%)',
          'Labor Participation (%)',
          'Regional GDP Per Capita (USD)',
          'SME Density (per 1,000)',
        ],
        arabicIndicators: [
          'معدل البطالة (%)',
          'المشاركة في القوى العاملة (%)',
          'الناتج المحلي للفرد (دولار)',
          'كثافة المنشآت الصغيرة والمتوسطة',
        ],
      );
    } else {
      return const _CatalogEntry(
        source: 'Simulated Infrastructure Model (scripts/pipeline_ingest.py)',
        arabicSource: 'نموذج محاكاة البنية التحتية (أداة الاستيراد التجريبية)',
        license: 'Academic Demonstration Model License',
        timeCoverage: '2020–2025',
        indicators: [
          'Paved Road Network (%)',
          'Potable Water Access (%)',
          'Sanitation Index (/100)',
          'Broadband Coverage (%)',
        ],
        arabicIndicators: [
          'شبكة الطرق المعبدة (%)',
          'الوصول لمياه الشرب (%)',
          'مؤشر الصرف الصحي (من 100)',
          'تغطية النطاق العريض (%)',
        ],
      );
    }
  }
}

class _CatalogEntry {
  final String source;
  final String arabicSource;
  final String license;
  final String timeCoverage;
  final List<String> indicators;
  final List<String> arabicIndicators;

  const _CatalogEntry({
    required this.source,
    required this.arabicSource,
    required this.license,
    required this.timeCoverage,
    required this.indicators,
    required this.arabicIndicators,
  });
}
