import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/decidix_button.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../localization/app_localizations.dart';

/// Shown for an address the app has no screen for (a bad link), instead of
/// the router's built-in error page.
class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mist,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.explore_off_outlined,
                  size: 48,
                  color: AppColors.mutedText,
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('nf_title'),
                  textAlign: TextAlign.center,
                  style: AppTypography.headingSection,
                ),
                const SizedBox(height: 6),
                Text(
                  context.tr('nf_body'),
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyS.copyWith(color: AppColors.ink),
                ),
                const SizedBox(height: 20),
                DecidixButton(
                  label: context.tr('nf_button'),
                  expand: false,
                  onPressed: () => context.go('/overview/dashboard'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
