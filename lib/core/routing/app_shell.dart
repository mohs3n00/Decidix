import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/widgets/decidix_top_bar.dart';
import '../../shared/widgets/decidix_bottom_navigation.dart';
import '../constants/app_colors.dart';
import '../localization/app_localizations.dart';
import '../localization/locale_controller.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  final String location;

  const AppShell({
    super.key,
    required this.child,
    required this.location,
  });

  int get _currentIndex {
    if (location.startsWith('/insights')) return 1;
    if (location.startsWith('/intelligence')) return 2;
    if (location.startsWith('/decisions')) return 3;
    return 0; // /overview or default
  }

  /// A region profile (`/overview/regions/delta`) has a back button, not the account.
  bool get _isRegionProfile => RegExp(r'^/overview/regions/[^/]+$').hasMatch(location);

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
    final languageLabel = currentLocale.languageCode == 'ar' ? 'English' : 'عربي';

    return Scaffold(
      backgroundColor: AppColors.mist,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            DecidixTopBar(
              languageLabel: languageLabel,
              // The profile is pushed on top of the screen it was opened from
              // (list, map, priority queue), so back returns there. With no
              // history (opened from a link) it goes to the regions list.
              onBack: _isRegionProfile
                  ? () => context.canPop() ? context.pop() : context.go('/overview/regions')
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
    );
  }
}
