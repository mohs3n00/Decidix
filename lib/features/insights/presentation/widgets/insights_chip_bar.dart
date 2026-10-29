import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/app_localizations.dart';
import '../../../../shared/widgets/section_chip_bar.dart';

class InsightsChipBar extends StatelessWidget {
  final int selectedIndex;

  const InsightsChipBar({super.key, required this.selectedIndex});

  static const List<String> routes = [
    '/insights/education',
    '/insights/healthcare',
    '/insights/economy',
    '/insights/infrastructure',
    '/insights/comparison',
    '/insights/history',
    '/insights/priority',
    '/insights/data-quality',
  ];

  @override
  Widget build(BuildContext context) {
    final chips = [
      context.tr('chip_education'),
      context.tr('chip_healthcare'),
      context.tr('chip_economy'),
      context.tr('chip_infrastructure'),
      context.tr('chip_comparison'),
      context.tr('chip_historical'),
      context.tr('chip_priority'),
      context.tr('chip_data_quality'),
    ];

    return SectionChipBar(
      chips: chips,
      selectedIndex: selectedIndex,
      onSelected: (idx) {
        if (idx != selectedIndex && idx < routes.length) {
          context.go(routes[idx]);
        }
      },
    );
  }
}
