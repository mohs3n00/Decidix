import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';

class AdminPeriodSelector extends StatelessWidget {
  final String selectedPeriod;
  final ValueChanged<String> onSelected;

  const AdminPeriodSelector({
    super.key,
    required this.selectedPeriod,
    required this.onSelected,
  });

  static const periods = [
    ('7d', '7 Days', '٧ أيام'),
    ('30d', '30 Days', '٣٠ يوماً'),
    ('90d', '90 Days', '٩٠ يوماً'),
    ('all', 'All Time', 'كل الفترات'),
  ];

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: periods.map((p) {
          final isSelected = selectedPeriod == p.$1;
          final label = isAr ? p.$3 : p.$2;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(label),
              selected: isSelected,
              onSelected: (_) => onSelected(p.$1),
              selectedColor: AppColors.navy,
              backgroundColor: AppColors.white,
              labelStyle: AppTypography.captionMedium.copyWith(
                color: isSelected ? Colors.white : AppColors.ink,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
                side: BorderSide(
                  color: isSelected ? AppColors.navy : AppColors.hairline,
                ),
              ),
              showCheckmark: false,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
          );
        }).toList(),
      ),
    );
  }
}
