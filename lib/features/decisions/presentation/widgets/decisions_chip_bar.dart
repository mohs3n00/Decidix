import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/app_localizations.dart';
import '../../../../shared/widgets/section_chip_bar.dart';

class DecisionsChipBar extends StatelessWidget {
  final int selectedIndex;

  const DecisionsChipBar({super.key, required this.selectedIndex});

  static const List<String> routes = [
    '/decisions/simulator',
    '/decisions/projects',
    '/decisions/reports',
  ];

  @override
  Widget build(BuildContext context) {
    final chips = [
      context.tr('chip_simulator'),
      context.tr('chip_projects'),
      context.tr('chip_reports'),
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
