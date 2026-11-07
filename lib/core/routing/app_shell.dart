import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/brand_backdrop.dart';
import '../../shared/widgets/decidix_top_bar.dart';
import '../../shared/widgets/decidix_bottom_navigation.dart';
import '../auth/auth_controller.dart';
import '../config/app_config.dart';
import '../constants/app_colors.dart';
import '../constants/app_radius.dart';
import '../constants/app_typography.dart';
import '../localization/app_localizations.dart';
import '../localization/locale_controller.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  final String location;

  const AppShell({super.key, required this.child, required this.location});

  int get _currentIndex {
    if (location.startsWith('/insights')) return 1;
    if (location.startsWith('/intelligence')) return 2;
    if (location.startsWith('/decisions')) return 3;
    return 0; // /overview or default
  }

  /// A region profile (`/overview/regions/delta`) has a back button, not the account.
  bool get _isRegionProfile =>
      RegExp(r'^/overview/regions/[^/]+$').hasMatch(location);

  /// Whether the user is at the primary root of the entire application (Overview Dashboard).
  bool get _isOverviewRoot =>
      location == '/overview/dashboard' || location == '/overview';

  void _onNavigationTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/overview/dashboard');
        break;
      case 1:
        context.go('/insights/education');
        break;
      case 2:
        context.go('/intelligence/predictions');
        break;
      case 3:
        context.go('/decisions/simulator');
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(localeNotifierProvider);
    final languageLabel = currentLocale.languageCode == 'ar'
        ? 'English'
        : 'عربي';

    final canDirectlyExit = _isOverviewRoot && !context.canPop();

    return PopScope(
      key: const ValueKey('app_shell_pop_scope'),
      canPop: canDirectlyExit,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        // Case A: Nested screen inside the current navigation stack -> pop the nested route
        if (context.canPop()) {
          context.pop();
          return;
        }

        // Case B: User is on a secondary tab root or non-root screen -> return to Overview root
        if (!_isOverviewRoot) {
          context.go('/overview/dashboard');
          return;
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.mist,
        body: BrandBackdrop(
          child: SafeArea(
            bottom: false,
            child: Column(
              children: [
                DecidixTopBar(
                  languageLabel: languageLabel,
                  onAvatarTap: () => _showAccountSheet(context, ref),
                  // The profile is pushed on top of the screen it was opened from
                  // (list, map, priority queue), so back returns there. With no
                  // history (opened from a link) it goes to the regions list.
                  onBack: _isRegionProfile
                      ? () => context.canPop()
                            ? context.pop()
                            : context.go('/overview/regions')
                      : null,
                  onLanguageTap: () {
                    ref.read(localeNotifierProvider.notifier).toggleLocale();
                  },
                  onNotificationTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(context.tr('notifications_empty')),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                ),
                if (AppConfig.useMock ||
                    ref.watch(authNotifierProvider).user?.id ==
                        'usr_evaluator_demo')
                  Container(
                    width: double.infinity,
                    color: AppColors.accentWarning.withValues(alpha: 0.12),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.info_outline,
                            size: 13, color: AppColors.warningText),
                        const SizedBox(width: 6),
                        Flexible(child: Text(
                          currentLocale.languageCode == 'ar'
                              ? 'وضع تجريبي: البيانات الإقليمية محاكاة لأغراض التقييم الأكاديمي'
                              : 'Demo Mode: Regional statistics are simulated for academic evaluation',
                          style: AppTypography.captionRegular.copyWith(
                            color: AppColors.warningText,
                            fontSize: 11,
                          ),
                        )),
                      ],
                    ),
                  ),
                Expanded(
                  child: Stack(
                    children: [
                      Positioned.fill(child: child),
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: DecidixBottomNavigation(
                          currentIndex: _currentIndex,
                          onTap: (index) => _onNavigationTap(context, index),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showAccountSheet(BuildContext context, WidgetRef ref) {
    final authState = ref.read(authNotifierProvider);
    final user = authState.user;
    final isAr = Directionality.of(context) == TextDirection.rtl;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (modalContext) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.hairline,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                context.tr('account_title'),
                style: AppTypography.titleM.copyWith(fontSize: 20, color: AppColors.navy),
              ),
              const SizedBox(height: 16),
              if (user != null) ...[
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [AppColors.blue, AppColors.cyan],
                    ),
                  ),
                  child: Center(
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  isAr && user.arabicName != null ? user.arabicName! : user.name,
                  style: AppTypography.titleM.copyWith(color: AppColors.navy),
                ),
                const SizedBox(height: 4),
                Text(
                  user.email,
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.blueSoft,
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        border: Border.all(color: AppColors.blue.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        '${context.tr('account_role')}: ${user.role.toUpperCase()}',
                        style: AppTypography.captionMedium.copyWith(color: AppColors.blue),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: user.emailVerified ? AppColors.successSoft : AppColors.warningSoft,
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        border: Border.all(
                          color: user.emailVerified
                              ? AppColors.success.withValues(alpha: 0.3)
                              : AppColors.warning.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            user.emailVerified ? Icons.check_circle : Icons.warning_amber_rounded,
                            size: 14,
                            color: user.emailVerified ? AppColors.success : AppColors.warning,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            user.emailVerified
                                ? (isAr ? 'بريد مؤكد' : 'Verified')
                                : (isAr ? 'غير مؤكد' : 'Unverified'),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: user.emailVerified ? AppColors.success : AppColors.warning,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (!user.emailVerified) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () async {
                      final result = await ref
                          .read(authNotifierProvider.notifier)
                          .resendVerificationEmail(user.email);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(result.message),
                            backgroundColor: result.success ? AppColors.navy : AppColors.danger,
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.mark_email_read_outlined, size: 16, color: AppColors.blue),
                    label: Text(
                      isAr ? 'إعادة إرسال رابط التحقق' : 'Resend verification link',
                      style: AppTypography.captionMedium.copyWith(color: AppColors.blue),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                if (user.role == 'admin' || user.role == 'analyst') ...[
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(modalContext).pop();
                        context.push('/datasets/upload');
                      },
                      icon: const Icon(Icons.cloud_upload_outlined, size: 18, color: AppColors.blue),
                      label: Text(
                        isAr ? 'رفع وإدارة مجموعات البيانات' : 'Dataset Management & Upload',
                        style: AppTypography.labelMStrong.copyWith(color: AppColors.blue),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.blue),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      Navigator.of(modalContext).pop();
                      await ref.read(authNotifierProvider.notifier).signOut();
                      if (context.mounted) {
                        context.go('/login');
                      }
                    },
                    icon: const Icon(Icons.logout, size: 18, color: AppColors.danger),
                    label: Text(
                      context.tr('account_btn_signout'),
                      style: AppTypography.labelMStrong.copyWith(color: AppColors.danger),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.dangerSoft),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                const Icon(Icons.account_circle_outlined, size: 56, color: AppColors.fadedInk),
                const SizedBox(height: 12),
                Text(
                  isAr ? 'لم يتم تسجيل الدخول بعد' : 'Not signed in yet',
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(modalContext).pop();
                      context.go('/login');
                    },
                    icon: const Icon(Icons.login, size: 18),
                    label: Text(
                      context.tr('login_btn_google'),
                      style: AppTypography.labelMStrong.copyWith(color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.blue,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
