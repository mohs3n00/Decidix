import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/constants/app_assets.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_shadows.dart';
import '../../core/constants/app_typography.dart';
import '../../core/localization/app_localizations.dart';
import 'account_avatar.dart';

/// Account (or back) on one side, language and notifications on the other.
class DecidixTopBar extends StatelessWidget {
  final VoidCallback? onAvatarTap;

  /// When set, a back button replaces the account avatar (region profile).
  final VoidCallback? onBack;
  final VoidCallback? onLanguageTap;
  final VoidCallback? onNotificationTap;
  final bool hasUnreadNotifications;
  final String? languageLabel;

  const DecidixTopBar({
    super.key,
    this.onAvatarTap,
    this.onBack,
    this.onLanguageTap,
    this.onNotificationTap,
    // There is no notifications endpoint yet, so there is nothing unread to
    // show: the red dot appears only when a screen says so.
    this.hasUnreadNotifications = false,
    this.languageLabel,
  });

  @override
  Widget build(BuildContext context) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          if (onBack != null)
            _RoundButton(
              onTap: onBack,
              semanticLabel: context.tr('btn_back'),
              child: SvgPicture.asset(
                AppAssets.icBack,
                width: 18,
                height: 18,
                matchTextDirection: true,
                colorFilter: const ColorFilter.mode(AppColors.navy, BlendMode.srcIn),
              ),
            )
          else
            AccountAvatar(onTap: onAvatarTap),
          const Spacer(),
          GestureDetector(
            onTap: onLanguageTap,
            behavior: HitTestBehavior.opaque,
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: _pillDecoration(BoxShape.rectangle),
              child: Text(
                languageLabel ?? (isRtl ? 'English' : 'عربي'),
                style: AppTypography.labelMStrong,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              _RoundButton(
                onTap: onNotificationTap,
                semanticLabel: 'Notifications',
                child: SvgPicture.asset(
                  AppAssets.icNotifications,
                  width: 18,
                  height: 18,
                  colorFilter: const ColorFilter.mode(AppColors.navy, BlendMode.srcIn),
                ),
              ),
              if (hasUnreadNotifications)
                PositionedDirectional(
                  top: 10,
                  end: 9,
                  child: IgnorePointer(
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.danger,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

BoxDecoration _pillDecoration(BoxShape shape) => BoxDecoration(
      color: AppColors.white,
      shape: shape,
      borderRadius: shape == BoxShape.rectangle ? BorderRadius.circular(999) : null,
      border: Border.all(color: AppColors.line),
      boxShadow: AppShadows.pill,
    );

class _RoundButton extends StatelessWidget {
  final VoidCallback? onTap;
  final Widget child;
  final String semanticLabel;

  const _RoundButton({
    required this.onTap,
    required this.child,
    required this.semanticLabel,
  });

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
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: _pillDecoration(BoxShape.circle),
          child: child,
        ),
      ),
    );
  }
}
