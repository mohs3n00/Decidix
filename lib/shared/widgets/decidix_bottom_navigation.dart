import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/constants/app_assets.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_shadows.dart';
import '../../core/constants/app_typography.dart';
import '../../core/localization/app_localizations.dart';

class DecidixNavItem {
  final String labelKey;
  final String iconAsset;

  const DecidixNavItem({required this.labelKey, required this.iconAsset});
}

/// The floating tab bar: a white bar with a bowl cut out around the active
/// tab, whose icon sits in a white circle. Sizes are from the Figma file.
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
  static const double _circle = 54;
  static const double _bowlRadius = 40;

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
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: _circle / 2 + _barHeight,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final itemWidth = constraints.maxWidth / items.length;
                  final isRtl = Directionality.of(context) == TextDirection.rtl;
                  final visualIndex = isRtl ? items.length - 1 - currentIndex : currentIndex;
                  final activeCenterX = (visualIndex + 0.5) * itemWidth;

                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned(
                        top: _circle / 2,
                        left: 0,
                        right: 0,
                        height: _barHeight,
                        child: DecoratedBox(
                          decoration: const BoxDecoration(boxShadow: AppShadows.hero),
                          child: CustomPaint(
                            painter: _BarPainter(
                              activeCenterX: activeCenterX,
                              bowlRadius: _bowlRadius,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: _circle / 2,
                        left: 0,
                        right: 0,
                        height: _barHeight,
                        child: Row(
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
                      ),
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOutCubic,
                        top: 0,
                        left: activeCenterX - _circle / 2,
                        child: IgnorePointer(
                          child: Container(
                            width: _circle,
                            height: _circle,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                              color: AppColors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Color(0x4D061A3A),
                                  blurRadius: 20,
                                  spreadRadius: -6,
                                  offset: Offset(0, 8),
                                ),
                              ],
                            ),
                            child: SvgPicture.asset(
                              items[currentIndex].iconAsset,
                              width: 24,
                              height: 24,
                              colorFilter: const ColorFilter.mode(
                                AppColors.blue,
                                BlendMode.srcIn,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: 128,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.navy.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
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
        child: Padding(
          padding: const EdgeInsets.only(top: 21),
          child: Column(
            children: [
              // The active icon is drawn in the circle above.
              SizedBox(
                width: 22,
                height: 22,
                child: active
                    ? null
                    : SvgPicture.asset(
                        item.iconAsset,
                        colorFilter: const ColorFilter.mode(AppColors.ink, BlendMode.srcIn),
                      ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: (active ? AppTypography.captionStrong : AppTypography.captionRegular)
                    .copyWith(
                  color: active ? AppColors.navy : AppColors.ink,
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

/// A rounded bar with a circular bowl taken out of its top edge.
class _BarPainter extends CustomPainter {
  final double activeCenterX;
  final double bowlRadius;

  _BarPainter({required this.activeCenterX, required this.bowlRadius});

  @override
  void paint(Canvas canvas, Size size) {
    final bar = Path()
      ..addRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(26)));
    final bowl = Path()
      ..addOval(Rect.fromCircle(center: Offset(activeCenterX, 4), radius: bowlRadius));
    final shape = Path.combine(PathOperation.difference, bar, bowl);

    canvas.drawPath(shape, Paint()..color = AppColors.white);
    canvas.drawPath(
      shape,
      Paint()
        ..color = AppColors.line
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
  }

  @override
  bool shouldRepaint(covariant _BarPainter oldDelegate) =>
      oldDelegate.activeCenterX != activeCenterX;
}
