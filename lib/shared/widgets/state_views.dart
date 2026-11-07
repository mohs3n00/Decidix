import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_typography.dart';
import '../../core/localization/app_localizations.dart';

/// Grey placeholder block shown while data loads.
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;

  const SkeletonBox({
    super.key,
    this.width,
    required this.height,
    this.radius = AppRadius.card,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.track,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// Loading state for a screen: [rows] cards stacked under the gutter.
class LoadingSkeleton extends StatelessWidget {
  final int rows;
  final double rowHeight;

  const LoadingSkeleton({super.key, this.rows = 4, this.rowHeight = 78});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: context.tr('loading'),
      child: Column(
        children: [
          for (var i = 0; i < rows; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            SkeletonBox(height: rowHeight),
          ],
        ],
      ),
    );
  }
}

/// Error state with a retry button. Wire [onRetry] to `ref.invalidate(...)`.
class ErrorView extends StatelessWidget {
  final String? message;
  final bool datasetUnavailable;
  final VoidCallback onRetry;

  const ErrorView({
    super.key,
    this.message,
    this.datasetUnavailable = false,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 40,
              color: AppColors.mutedText,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              context.tr('error_loading'),
              textAlign: TextAlign.center,
              style: AppTypography.titleM,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message ??
                  (datasetUnavailable
                      ? context.tr('dataset_not_connected')
                      : context.tr('error_retry_hint')),
              textAlign: TextAlign.center,
              style: AppTypography.bodyS.copyWith(color: AppColors.ink),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                foregroundColor: AppColors.white,
                minimumSize: const Size(120, 44),
                shape: const StadiumBorder(),
                textStyle: AppTypography.labelMStrong,
              ),
              child: Text(context.tr('btn_retry')),
            ),
          ],
        ),
      ),
    );
  }
}

/// Empty state: the request worked but there is nothing to show.
class EmptyView extends StatelessWidget {
  final String? message;

  const EmptyView({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.inbox_outlined,
              size: 40,
              color: AppColors.mutedText,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              message ?? context.tr('empty_results'),
              textAlign: TextAlign.center,
              style: AppTypography.bodyS.copyWith(color: AppColors.ink),
            ),
          ],
        ),
      ),
    );
  }
}
