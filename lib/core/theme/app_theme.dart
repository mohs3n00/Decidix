import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_radius.dart';
import '../constants/app_typography.dart' show AppFonts;

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme => getTheme(const Locale('en'));

  static ThemeData getTheme(Locale locale) {
    final isArabic = locale.languageCode == 'ar';

    return ThemeData(
      // The font of every widget that does not set its own style (snack bars,
      // the region picker, text fields).
      fontFamily: isArabic ? AppFonts.arabic : AppFonts.latin,
      fontFamilyFallback: [isArabic ? AppFonts.latin : AppFonts.arabic],
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.blue,
      scaffoldBackgroundColor: AppColors.mist,
      colorScheme: const ColorScheme.light(
        primary: AppColors.blue,
        secondary: AppColors.cyan,
        surface: AppColors.cardSurface,
        error: AppColors.danger,
        onPrimary: AppColors.white,
        onSecondary: AppColors.navy,
        onSurface: AppColors.navy,
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.cardRadius,
          side: const BorderSide(color: AppColors.line),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.line,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
