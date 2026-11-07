import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/repositories/admin_api.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/state_views.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/admin_period_selector.dart';

class AdminAnalyticsScreen extends ConsumerStatefulWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  ConsumerState<AdminAnalyticsScreen> createState() => _AdminAnalyticsScreenState();
}

class _AdminAnalyticsScreenState extends ConsumerState<AdminAnalyticsScreen> {
  String _period = '30d';
  Future<Map<String, dynamic>>? _analyticsFuture;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  void _loadAnalytics() {
    setState(() {
      _analyticsFuture = ref.read(adminApiProvider).getAnalytics(period: _period);
    });
  }

  void _onPeriodChanged(String period) {
    if (_period == period) return;
    setState(() {
      _period = period;
    });
    _loadAnalytics();
  }

  IconData _getModuleIcon(String module) {
    return switch (module.toLowerCase()) {
      'overview' => Icons.dashboard_outlined,
      'insights' => Icons.insights_outlined,
      'intelligence' => Icons.psychology_outlined,
      'decisions' => Icons.balance_outlined,
      'datasets' => Icons.dataset_outlined,
      'assistant' => Icons.chat_bubble_outline,
      _ => Icons.circle_outlined,
    };
  }

  Color _getModuleColor(String module) {
    return switch (module.toLowerCase()) {
      'overview' => AppColors.blue,
      'insights' => AppColors.cyan,
      'intelligence' => AppColors.navy,
      'decisions' => AppColors.success,
      'datasets' => AppColors.warning,
      'assistant' => Colors.purple,
      _ => AppColors.ink,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return DecidixPage(
      eyebrow: isAr ? 'تحليلات المنصة' : 'PLATFORM TELEMETRY',
      title: isAr ? 'نشاط واستخدام الميزات' : 'Feature Usage & Analytics',
      onRefresh: () async {
        _loadAnalytics();
        await _analyticsFuture;
      },
      children: [
        // Privacy Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.mist,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.hairline),
          ),
          child: Row(
            children: [
              const Icon(Icons.privacy_tip_outlined, color: AppColors.ink, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isAr
                      ? 'مبدأ الخصوصية الصارمة: تُقيد التحليلات على الإحصاءات العامة فقط دون تسجيل نصوص المحادثات أو سجلات البيانات الخاصة.'
                      : 'Zero-Exposure Telemetry: Tracks functional engagement without logging prompts, queries, or dataset records.',
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink, fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Period filter
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isAr ? 'الفترة الزمنية:' : 'Time Horizon:',
              style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
            ),
            AdminPeriodSelector(
              selectedPeriod: _period,
              onSelected: _onPeriodChanged,
            ),
          ],
        ),
        const SizedBox(height: 16),

        FutureBuilder<Map<String, dynamic>>(
          future: _analyticsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            if (snapshot.hasError) {
              return ErrorView(
                message: isAr ? 'فشل تحميل بيانات التحليلات' : 'Failed to load telemetry analytics',
                onRetry: _loadAnalytics,
              );
            }

            final data = snapshot.data ?? {};
            final totalEvents = data['totalEvents'] as int? ?? 0;
            final moduleBreakdown = (data['moduleBreakdown'] as List?)?.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() ?? [];
            final dailyTrends = (data['dailyTrends'] as List?)?.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() ?? [];

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Summary KPI
                AdminKpiCard(
                  title: isAr ? 'إجمالي الأحداث المسجلة' : 'Total Telemetry Events',
                  value: '$totalEvents',
                  subtitle: isAr ? 'تفاعل في الوحدات الست الأساسية' : 'Interactions across 6 core platform modules',
                  icon: Icons.track_changes_outlined,
                  iconColor: AppColors.blue,
                ),
                const SizedBox(height: 20),

                // Core Modules Distribution
                Text(
                  isAr ? 'توزيع التفاعل حسب الوحدة' : 'Module Engagement Breakdown',
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
                    children: moduleBreakdown.map((item) {
                      final modName = (item['module'] as String? ?? 'module').toUpperCase();
                      final count = item['count'] as int? ?? 0;
                      final percent = totalEvents > 0 ? (count / totalEvents) : 0.0;
                      final color = _getModuleColor(modName);
                      final icon = _getModuleIcon(modName);

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(icon, size: 16, color: color),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    modName,
                                    style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                                  ),
                                ),
                                Text(
                                  '$count (${(percent * 100).toStringAsFixed(1)}%)',
                                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(AppRadius.pill),
                              child: LinearProgressIndicator(
                                value: percent.clamp(0.0, 1.0),
                                minHeight: 6,
                                backgroundColor: AppColors.mist,
                                valueColor: AlwaysStoppedAnimation<Color>(color),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 24),

                // Daily Trends
                Text(
                  isAr ? 'الاتجاهات اليومية' : 'Daily Activity Trends',
                  style: AppTypography.titleM.copyWith(fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 12),

                if (dailyTrends.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(color: AppColors.hairline),
                    ),
                    child: Text(
                      isAr ? 'لا توجد أنشطة مسجلة في هذه الفترة' : 'No recorded activity for this period',
                      style: AppTypography.captionRegular.copyWith(color: AppColors.fadedInk),
                    ),
                  )
                else
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(color: AppColors.hairline),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: dailyTrends.length,
                      separatorBuilder: (_, _) => const Divider(color: AppColors.hairline, height: 1),
                      itemBuilder: (context, index) {
                        final trend = dailyTrends[index];
                        final date = trend['date'] as String? ?? '-';
                        final count = trend['count'] as int? ?? 0;

                        return ListTile(
                          dense: true,
                          title: Text(date, style: AppTypography.captionMedium.copyWith(color: AppColors.navy)),
                          trailing: Text(
                            isAr ? '$count حدث' : '$count events',
                            style: AppTypography.labelMStrong.copyWith(color: AppColors.blue),
                          ),
                        );
                      },
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
