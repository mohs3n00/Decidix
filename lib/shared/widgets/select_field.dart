import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_shadows.dart';
import '../../core/constants/app_typography.dart';

enum SelectFieldStyle {
  /// White card (region select in the simulator).
  light,

  /// Blue to cyan (first region in Compare).
  gradient,

  /// Navy (second region in Compare).
  navy,
}

/// Dropdown-looking field. It only shows [value] and a chevron and reports
/// taps; the screen opens its own picker.
class SelectField extends StatelessWidget {
  final String value;
  final VoidCallback? onTap;
  final SelectFieldStyle style;

  const SelectField({
    super.key,
    required this.value,
    this.onTap,
    this.style = SelectFieldStyle.light,
  });

  @override
  Widget build(BuildContext context) {
    final light = style == SelectFieldStyle.light;
    final foreground = light ? AppColors.navy : AppColors.white;

    return Semantics(
      button: true,
      label: value,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          constraints: BoxConstraints(minHeight: light ? 52 : 46),
          padding: EdgeInsets.symmetric(
            horizontal: light ? 20 : 16,
            vertical: light ? 14 : 10,
          ),
          decoration: BoxDecoration(
            color: switch (style) {
              SelectFieldStyle.light => AppColors.white,
              SelectFieldStyle.gradient => null,
              SelectFieldStyle.navy => AppColors.navy,
            },
            gradient:
                style == SelectFieldStyle.gradient ? AppColors.brandGradient : null,
            borderRadius: light ? AppRadius.pillRadius : AppRadius.innerRadius,
            border: light ? Border.all(color: AppColors.hairline) : null,
            boxShadow: light ? AppShadows.card : null,
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: (light
                          ? AppTypography.titleS
                          : AppTypography.labelMStrong)
                      .copyWith(color: foreground),
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 18,
                color: light ? AppColors.ink : AppColors.white,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
