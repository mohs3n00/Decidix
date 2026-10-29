import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';

/// Navy card with a cyan label and short text. Used for "AI insight", "Gap
/// analysis" and "Simulation note": only [label] changes between screens.
class AiInsightPanel extends StatelessWidget {
  final String label;
  final String body;

  const AiInsightPanel({super.key, required this.label, required this.body});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadius.cardRadius,
      child: DecoratedBox(
        decoration: const BoxDecoration(color: AppColors.navy),
        child: Stack(
          children: [
            PositionedDirectional(
              top: -40,
              end: -40,
              child: IgnorePointer(
                child: Container(
                  width: 128,
                  height: 128,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.cyan.withValues(alpha: 0.28),
                        AppColors.cyan.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.cyan,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          label.toUpperCase(),
                          style: AppTypography.adapt(
                            context,
                            AppTypography.overlineS.copyWith(
                              color: AppColors.cyan,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    body,
                    style: AppTypography.bodyM.copyWith(
                      color: AppColors.white.withValues(alpha: 0.9),
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
