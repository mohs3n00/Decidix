import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/constants/app_assets.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_shadows.dart';
import '../../core/constants/app_typography.dart';
import '../../core/localization/app_localizations.dart';

class DecidixNavItem {
  final String labelKey;
  final String iconAsset;

  const DecidixNavItem({required this.labelKey, required this.iconAsset});
}

/// The floating tab bar: a capsule. The active tab is a white circle with its
/// icon in brand blue; the others show an icon and a label.
class DecidixBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  static const List<DecidixNavItem> items = [
    DecidixNavItem(labelKey: 'nav_overview', iconAsset: AppAssets.icOverview),
    DecidixNavItem(labelKey: 'nav_insights', iconAsset: AppAssets.icInsights),
    DecidixNavItem(labelKey: 'nav_intelligence', iconAsset: AppAssets.icIntelligence),
    DecidixNavItem(labelKey: 'nav_decisions', iconAsset: AppAssets.icDecisions),
  ];

  static const double _barHeight = 72;
  static const double _circle = 56;

  const DecidixBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        child: Container(
          height: _barHeight,
          decoration: BoxDecoration(
            color: AppColors.wellTint,
            borderRadius: AppRadius.bottomNavRadius,
            border: Border.all(color: AppColors.white),
            boxShadow: AppShadows.bottomNav,
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final itemWidth = constraints.maxWidth / items.length;
              final isRtl = Directionality.of(context) == TextDirection.rtl;
              final visualIndex = isRtl ? items.length - 1 - currentIndex : currentIndex;

              return Stack(
                children: [
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    top: (_barHeight - _circle) / 2 - 1,
                    left: visualIndex * itemWidth + (itemWidth - _circle) / 2,
                    child: IgnorePointer(
                      child: Container(
                        width: _circle,
                        height: _circle,
                        decoration: const BoxDecoration(
                          color: AppColors.white,
                          shape: BoxShape.circle,
                          boxShadow: AppShadows.activeTab,
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      for (var i = 0; i < items.length; i++)
                        Expanded(
                          child: _NavTab(
                            item: items[i],
                            active: i == currentIndex,
                            onTap: () => onTap(i),
                          ),
                        ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  final DecidixNavItem item;
  final bool active;
  final VoidCallback onTap;

  const _NavTab({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final label = context.tr(item.labelKey);

    return Semantics(
      button: true,
      selected: active,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Center(
          child: active
              ? SvgPicture.asset(
                  item.iconAsset,
                  width: 24,
                  height: 24,
                  colorFilter: const ColorFilter.mode(AppColors.blue, BlendMode.srcIn),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset(
                      item.iconAsset,
                      width: 22,
                      height: 22,
                      colorFilter:
                          const ColorFilter.mode(AppColors.fadedInk, BlendMode.srcIn),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.captionRegular.copyWith(
                        color: AppColors.fadedInk,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
