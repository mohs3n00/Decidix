import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_shadows.dart';

/// The big area at the top of a screen: a pale gradient (white into a brand
/// tint) with a soft cyan glow in one corner. The text on it is dark.
class HeroCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const HeroCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(22),
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: AppRadius.heroRadius,
        boxShadow: AppShadows.hero,
      ),
      child: ClipRRect(
        borderRadius: AppRadius.heroRadius,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.white.withValues(alpha: 0.9)),
            borderRadius: AppRadius.heroRadius,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.white, AppColors.heroTint],
            ),
          ),
          child: Stack(
            children: [
              PositionedDirectional(
                top: -70,
                end: -50,
                child: IgnorePointer(
                  child: Container(
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.cyan.withValues(alpha: 0.30),
                          AppColors.cyan.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Padding(padding: padding, child: child),
            ],
          ),
        ),
      ),
    );
  }
}
