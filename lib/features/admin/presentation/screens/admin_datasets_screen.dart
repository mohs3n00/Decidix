import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../api/repositories/admin_api.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/state_views.dart';
import '../widgets/admin_kpi_card.dart';

class AdminDatasetsScreen extends ConsumerStatefulWidget {
  const AdminDatasetsScreen({super.key});

  @override
  ConsumerState<AdminDatasetsScreen> createState() => _AdminDatasetsScreenState();
}

class _AdminDatasetsScreenState extends ConsumerState<AdminDatasetsScreen> {
  Future<Map<String, dynamic>>? _statsFuture;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  void _loadStats() {
    setState(() {
      _statsFuture = ref.read(adminApiProvider).getDatasetStatistics();
    });
  }

  String _formatBytes(num bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return DecidixPage(
      eyebrow: isAr ? 'إحصاءات البيانات' : 'DATA PLATFORM METRICS',
      title: isAr ? 'استهلاك التخزين ومجموعات البيانات' : 'Storage & Datasets Analytics',
      onRefresh: () async {
        _loadStats();
        await _statsFuture;
      },
      children: [
        FutureBuilder<Map<String, dynamic>>(
          future: _statsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            if (snapshot.hasError) {
              return ErrorView(
                message: isAr ? 'فشل تحميل إحصاءات مجموعات البيانات' : 'Failed to load dataset statistics',
                onRetry: _loadStats,
              );
            }

            final data = snapshot.data ?? {};
            final totalDatasets = data['totalDatasets'] as int? ?? 0;
            final totalStorageBytes = data['totalStorageBytes'] as num? ?? 0;
            final totalRecords = data['totalRecords'] as int? ?? 0;
            final activeVersion = data['activeVersion'] as Map<String, dynamic>?;
            final formatDist = data['formatDistribution'] as Map<String, dynamic>? ?? {};
            final statusDist = data['statusBreakdown'] as Map<String, dynamic>? ?? {};

            final validatedCount = statusDist['validated'] as int? ?? 0;
            final invalidCount = statusDist['invalid'] as int? ?? 0;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Storage KPIs
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.15,
                  children: [
                    AdminKpiCard(
                      title: isAr ? 'إجمالي الحجم المخزن' : 'R2 Cloud Storage',
                      value: _formatBytes(totalStorageBytes),
                      subtitle: isAr ? 'استهلاك ملفات R2' : 'Encrypted R2 bucket bytes',
                      icon: Icons.cloud_done_outlined,
                      iconColor: AppColors.blue,
                    ),
                    AdminKpiCard(
                      title: isAr ? 'مجموعات البيانات' : 'Datasets Total',
                      value: '$totalDatasets',
                      subtitle: isAr ? '$validatedCount معتمد • $invalidCount مرفوض' : '$validatedCount valid • $invalidCount invalid',
                      icon: Icons.folder_open_outlined,
                      iconColor: AppColors.cyan,
                    ),
                    AdminKpiCard(
                      title: isAr ? 'إجمالي السجلات' : 'Canonical Records',
                      value: '$totalRecords',
                      subtitle: isAr ? 'سجلات مؤشرات وطنية' : 'Verified indicator rows',
                      icon: Icons.table_chart_outlined,
                      iconColor: AppColors.success,
                    ),
                    AdminKpiCard(
                      title: isAr ? 'صيغ الملفات' : 'Supported Formats',
                      value: '${formatDist.keys.length}',
                      subtitle: 'CSV, XLSX, TSV, JSON, JSONL',
                      icon: Icons.description_outlined,
                      iconColor: AppColors.warning,
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Active Canonical Dataset Card
                Text(
                  isAr ? 'النسخة النشطة المعتمدة للمنصة' : 'Active Canonical Dataset Version',
                  style: AppTypography.titleM.copyWith(fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(color: AppColors.hairline),
                  ),
                  child: activeVersion != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.successSoft,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        activeVersion['filename'] as String? ?? 'active_dataset',
                                        style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                                      ),
                                      Text(
                                        activeVersion['version'] as String? ?? '',
                                        style: AppTypography.captionRegular.copyWith(color: AppColors.ink, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.successSoft,
                                    borderRadius: BorderRadius.circular(AppRadius.pill),
                                  ),
                                  child: Text(
                                    isAr ? 'نشط ومعتمد' : 'ACTIVE',
                                    style: AppTypography.captionMedium.copyWith(color: AppColors.successText),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: AppColors.hairline),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isAr ? 'عدد السجلات النشطة:' : 'Observations in Canonical Matrix:',
                                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                                ),
                                Text(
                                  '${activeVersion['recordCount'] ?? 0}',
                                  style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                                ),
                              ],
                            ),
                          ],
                        )
                      : Text(
                          isAr ? 'لا توجد نسخة نشطة حالياً' : 'No active dataset version selected',
                          style: AppTypography.captionRegular.copyWith(color: AppColors.fadedInk),
                        ),
                ),

                const SizedBox(height: 20),

                // Format Distribution
                Text(
                  isAr ? 'توزيع صيغ الملفات' : 'Ingested File Formats',
                  style: AppTypography.titleM.copyWith(fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(color: AppColors.hairline),
                  ),
                  child: Column(
                    children: formatDist.entries.map((entry) {
                      final fmt = entry.key.toUpperCase();
                      final count = entry.value as int? ?? 0;
                      final percent = totalDatasets > 0 ? (count / totalDatasets) : 0.0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.mist,
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                fmt,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(AppRadius.pill),
                                child: LinearProgressIndicator(
                                  value: percent.clamp(0.0, 1.0),
                                  minHeight: 6,
                                  backgroundColor: AppColors.mist,
                                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.blue),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              '$count (${(percent * 100).toStringAsFixed(0)}%)',
                              style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 24),

                // Shortcut to Upload Management
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/datasets/upload'),
                    icon: const Icon(Icons.cloud_upload_outlined, size: 18, color: Colors.white),
                    label: Text(
                      isAr ? 'الانتقال إلى شاشة رفع البيانات' : 'Open Dataset Upload & Ingestion Screen',
                      style: AppTypography.labelMStrong.copyWith(color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}
