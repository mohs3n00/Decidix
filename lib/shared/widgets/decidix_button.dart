import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_shadows.dart';
import '../../core/constants/app_typography.dart';

/// 52px pill button: navy with white text, or the white outlined version.
class DecidixButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Widget? trailing;
  final bool outlined;

  /// Fill the width (default) or hug the label.
  final bool expand;

  const DecidixButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.trailing,
    this.outlined = false,
    this.expand = true,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final foreground = outlined ? AppColors.navy : AppColors.white;

    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onPressed,
        behavior: HitTestBehavior.opaque,
        child: Opacity(
          opacity: enabled ? 1 : 0.5,
          child: Container(
            height: 52,
            width: expand ? double.infinity : null,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            decoration: BoxDecoration(
              color: outlined ? AppColors.white : AppColors.navy,
              borderRadius: AppRadius.pillRadius,
              border: outlined ? Border.all(color: AppColors.hairline) : null,
              boxShadow: outlined ? null : AppShadows.pill,
            ),
            child: Row(
              mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.labelMStrong.copyWith(color: foreground),
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: 8), trailing!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
