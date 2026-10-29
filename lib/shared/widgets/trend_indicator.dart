import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_assets.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';

/// Green or red change pill (the Figma "Delta").
class TrendIndicator extends StatelessWidget {
  final double value;
  final String suffix;
  final bool inverted; // true if negative change is good

  const TrendIndicator({
    super.key,
    required this.value,
    this.suffix = '%',
    this.inverted = false,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = value >= 0;
    final isGood = inverted ? !isPositive : isPositive;
    final color = isGood ? AppColors.success : AppColors.danger;
    final bgColor = color.withValues(alpha: isGood ? 0.12 : 0.10);
    final iconAsset = isPositive ? AppAssets.icTrendUp : AppAssets.icTrendDown;

    // No sign: the arrow and the colour already show the direction.
    final formattedText = '${value.abs().toStringAsFixed(1)}$suffix';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.pillRadius,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.asset(
            iconAsset,
            width: 12,
            height: 12,
            colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
          ),
          const SizedBox(width: 2),
          Text(
            formattedText,
            style: AppTypography.captionStrong.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
