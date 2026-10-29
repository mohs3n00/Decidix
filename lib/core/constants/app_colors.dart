import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color navy = Color(0xFF061A3A);
  static const Color blue = Color(0xFF2563EB);
  static const Color cyan = Color(0xFF21EAF4);
  static const Color white = Color(0xFFFFFFFF);
  static const Color mist = Color(0xFFF5F7FA);
  static const Color line = Color(0xFFE3E9F2);
  static const Color ink = Color(0xFF5B6B85);
  static const Color success = Color(0xFF14B87A);
  static const Color danger = Color(0xFFE5484D);
  static const Color warning = Color(0xFFF5A524);

  /// Text on top of a warning-tinted background (amber badge text).
  static const Color warningText = Color(0xFFA56A00);

  /// Empty part of progress bars, rings and sliders.
  static const Color track = Color(0xFFEAF0F8);

  static const Color successSoft = Color(0xFFECFDF5);
  static const Color dangerSoft = Color(0xFFFEF2F2);
  static const Color warningSoft = Color(0xFFFFFBEB);
  static const Color blueSoft = Color(0xFFEFF6FF);
  static const Color cyanSoft = Color(0xFFE0FBFC);
  static const Color navySoft = Color(0xFFEEF2F6);

  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color secondaryText = Color(0xFF5B6B85);
  static const Color mutedText = Color(0xFF8A99AD);
  static const Color borderSubtle = Color(0xFFE3E9F2);
  static const Color gray100 = Color(0xFFF1F5F9);

  /// Blue to cyan, used by the avatar, progress fills and gradient buttons.
  static const LinearGradient brandGradient = LinearGradient(
    begin: AlignmentDirectional.centerStart,
    end: AlignmentDirectional.centerEnd,
    colors: [blue, cyan],
  );
}
