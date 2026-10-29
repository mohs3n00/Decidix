import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/constants/app_assets.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_shadows.dart';

/// Round 44px account button: gradient fill, white outline, white icon.
class AccountAvatar extends StatelessWidget {
  final VoidCallback? onTap;
  final String? semanticLabel;

  const AccountAvatar({super.key, this.onTap, this.semanticLabel});

  static const double size = 44;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.blue, AppColors.cyan],
            ),
            border: Border.all(color: AppColors.white, width: 2),
            boxShadow: AppShadows.avatar,
          ),
          padding: const EdgeInsets.all(11),
          child: SvgPicture.asset(
            AppAssets.icAccount,
            colorFilter: const ColorFilter.mode(
              AppColors.white,
              BlendMode.srcIn,
            ),
          ),
        ),
      ),
    );
  }
}
