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
import '../widgets/admin_period_selector.dart';
import '../widgets/must_change_password_dialog.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  String _period = '30d';
  Future<Map<String, dynamic>>? _dashboardFuture;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      MustChangePasswordDialog.showIfNeeded(context, ref);
    });
  }

  void _loadDashboard() {
    setState(() {
      _dashboardFuture = ref.read(adminApiProvider).getDashboard(period: _period);
    });
  }

  void _onPeriodChanged(String newPeriod) {
    if (_period == newPeriod) return;
    setState(() {
      _period = newPeriod;
    });
    _loadDashboard();
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
      eyebrow: isAr ? 'لوحة تحكم النظام' : 'SYSTEM ADMINISTRATION',
      title: isAr ? 'نظرة عامة على المنصة' : 'Platform Overview',
      onRefresh: () async {
        _loadDashboard();
        await _dashboardFuture;
      },
      children: [
        // Privacy Guarantee Notice
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.cyanSoft,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.cyan.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.privacy_tip_outlined, color: AppColors.blue, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isAr
                      ? 'ضمان الخصوصية: تعرض لوحة التحكم مؤشرات تشغيلية وبيانات مجمعة فقط. محتويات مجموعات البيانات ومحادثات الذكاء الاصطناعي محجوبة بالكامل.'
                      : 'Privacy Assured: Displays operational metadata and aggregated stats only. Dataset contents and AI chat records are strictly omitted.',
                  style: AppTypography.captionRegular.copyWith(
                    color: AppColors.navy,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Period filter selector
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

        // Main KPI content
        FutureBuilder<Map<String, dynamic>>(
          future: _dashboardFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            if (snapshot.hasError) {
              return ErrorView(
                message: isAr ? 'فشل تحميل بيانات لوحة التحكم' : 'Failed to load admin metrics',
                onRetry: _loadDashboard,
              );
            }

            final data = snapshot.data ?? {};
            final kpis = data['kpis'] as Map<String, dynamic>? ?? {};
            final usersKpi = kpis['users'] as Map<String, dynamic>? ?? {};
            final datasetsKpi = kpis['datasets'] as Map<String, dynamic>? ?? {};
            final activityKpi = kpis['activity'] as Map<String, dynamic>? ?? {};
            final notifsKpi = kpis['notifications'] as Map<String, dynamic>? ?? {};

            final totalUsers = usersKpi['total'] as int? ?? 0;
            final activeUsers = usersKpi['active'] as int? ?? 0;
            final suspendedUsers = usersKpi['suspended'] as int? ?? 0;

            final totalDatasets = datasetsKpi['total'] as int? ?? 0;
            final validatedDatasets = datasetsKpi['validated'] as int? ?? 0;
            final storageBytes = datasetsKpi['totalStorageBytes'] as num? ?? 0;

            final totalEvents = activityKpi['totalEvents'] as int? ?? 0;
            final uniqueActive = activityKpi['uniqueUsers'] as int? ?? 0;

            final totalCampaigns = notifsKpi['totalCampaigns'] as int? ?? 0;
            final deliveredNotifs = notifsKpi['totalDelivered'] as int? ?? 0;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 2x2 Primary KPI Grid
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.15,
                  children: [
                    AdminKpiCard(
                      title: isAr ? 'إجمالي المستخدمين' : 'Total Accounts',
                      value: '$totalUsers',
                      subtitle: isAr ? '$activeUsers نشط • $suspendedUsers موقوف' : '$activeUsers active • $suspendedUsers suspended',
                      icon: Icons.people_outline,
                      iconColor: AppColors.blue,
                      onTap: () => context.push('/admin/users'),
                    ),
                    AdminKpiCard(
                      title: isAr ? 'مجموعات البيانات' : 'Platform Datasets',
                      value: '$totalDatasets',
                      subtitle: isAr ? '$validatedDatasets معتمد • ${_formatBytes(storageBytes)}' : '$validatedDatasets valid • ${_formatBytes(storageBytes)}',
                      icon: Icons.dataset_outlined,
                      iconColor: AppColors.cyan,
                      onTap: () => context.push('/admin/datasets'),
                    ),
                    AdminKpiCard(
                      title: isAr ? 'نشاط المنصة' : 'Module Events',
                      value: '$totalEvents',
                      subtitle: isAr ? '$uniqueActive مستخدم متفاعل' : '$uniqueActive active users',
                      icon: Icons.analytics_outlined,
                      iconColor: AppColors.success,
                      onTap: () => context.push('/admin/analytics'),
                    ),
                    AdminKpiCard(
                      title: isAr ? 'الإشعارات التنبيهية' : 'Push Campaigns',
                      value: '$totalCampaigns',
                      subtitle: isAr ? '$deliveredNotifs تم تسليمها' : '$deliveredNotifs delivered',
                      icon: Icons.notifications_active_outlined,
                      iconColor: AppColors.warning,
                      onTap: () => context.push('/admin/notifications'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Management Modules Shortcuts
                Text(
                  isAr ? 'وحدات إدارة المنصة' : 'Management Subsystems',
                  style: AppTypography.titleM.copyWith(fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 12),
                _buildActionRow(
                  context: context,
                  icon: Icons.manage_accounts_outlined,
                  color: AppColors.blue,
                  title: isAr ? 'إدارة المستخدمين والحسابات' : 'User Accounts Management',
                  subtitle: isAr ? 'عرض الحسابات، البحث، التعليق، إلغاء التفعيل' : 'Search, review roles, suspend and safely delete accounts',
                  route: '/admin/users',
                ),
                const SizedBox(height: 10),
                _buildActionRow(
                  context: context,
                  icon: Icons.insights_outlined,
                  color: AppColors.cyan,
                  title: isAr ? 'تحليلات استخدام الميزات' : 'Feature Usage & Platform Analytics',
                  subtitle: isAr ? 'توزيع استخدام الوحدات الست والاتجاهات الزمنية' : 'Distribution across the 6 core modules and daily trends',
                  route: '/admin/analytics',
                ),
                const SizedBox(height: 10),
                _buildActionRow(
                  context: context,
                  icon: Icons.storage_outlined,
                  color: AppColors.success,
                  title: isAr ? 'إحصاءات التخزين ومجموعات البيانات' : 'Dataset Storage & Formats',
                  subtitle: isAr ? 'استهلاك مساحة التخزين R2، وتوزيع الصيغ، والسجلات' : 'R2 storage metrics, format breakdown, and records count',
                  route: '/admin/datasets',
                ),
                const SizedBox(height: 10),
                _buildActionRow(
                  context: context,
                  icon: Icons.campaign_outlined,
                  color: AppColors.warning,
                  title: isAr ? 'إرسال الإشعارات التنبيهية' : 'Push Notification Campaigns',
                  subtitle: isAr ? 'إنشاء وإرسال حملات FCM للمستخدمين واختبارها' : 'Compose and send targeted FCM messages with history log',
                  route: '/admin/notifications',
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildActionRow({
    required BuildContext context,
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required String route,
  }) {
    return InkWell(
      onTap: () => context.push(route),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.hairline),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTypography.captionRegular.copyWith(color: AppColors.ink, fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.fadedInk),
          ],
        ),
      ),
    );
  }
}
