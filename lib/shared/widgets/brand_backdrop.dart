import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// The page canvas: almost white, with a faint cyan and blue glow behind the
/// header that fades out before the content. Everything else sits on top.
class BrandBackdrop extends StatelessWidget {
  final Widget child;

  const BrandBackdrop({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(child: ColoredBox(color: AppColors.mist)),
        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 420,
          child: IgnorePointer(child: _Glow()),
        ),
        Positioned.fill(child: child),
      ],
    );
  }
}

class _Glow extends StatelessWidget {
  const _Glow();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0.95, -1.05),
              radius: 1.0,
              colors: [
                AppColors.cyan.withValues(alpha: 0.26),
                AppColors.cyan.withValues(alpha: 0),
              ],
            ),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(-1.1, -0.7),
              radius: 0.9,
              colors: [
                AppColors.blue.withValues(alpha: 0.10),
                AppColors.blue.withValues(alpha: 0),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
