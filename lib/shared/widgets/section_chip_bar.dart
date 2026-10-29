import 'package:flutter/material.dart';
import 'chip_scroll_row.dart';

/// Chip bar used by the Overview, Insights, Intelligence and Decisions
/// headers. Kept as the single entry point; the work is in [ChipScrollRow].
class SectionChipBar extends StatelessWidget {
  final List<String> chips;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const SectionChipBar({
    super.key,
    required this.chips,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ChipScrollRow(
      labels: chips,
      selectedIndex: selectedIndex,
      onSelected: onSelected,
    );
  }
}
