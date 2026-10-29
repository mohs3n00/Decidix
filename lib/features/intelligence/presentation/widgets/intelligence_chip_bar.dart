import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/app_localizations.dart';
import '../../../../shared/widgets/section_chip_bar.dart';

class IntelligenceChipBar extends StatelessWidget {
  final int selectedIndex;

  const IntelligenceChipBar({super.key, required this.selectedIndex});

  static const List<String> routes = [
    '/intelligence/predictions',
    '/intelligence/assistant',
    '/intelligence/recommendations',
  ];

  @override
  Widget build(BuildContext context) {
    final chips = [
      context.tr('chip_predictions'),
      context.tr('chip_assistant'),
      context.tr('chip_recommendations'),
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
