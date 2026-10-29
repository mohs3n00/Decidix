import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_shadows.dart';

/// White card with the outline, radius and shadow of every card in the design.
class DecidixCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  const DecidixCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: AppRadius.cardRadius,
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.card,
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: card);
  }
}
