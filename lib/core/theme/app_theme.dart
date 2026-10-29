import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../constants/app_radius.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme => getTheme(const Locale('en'));

  static ThemeData getTheme(Locale locale) {
    final isArabic = locale.languageCode == 'ar';
    final textTheme = isArabic
        ? GoogleFonts.cairoTextTheme()
        : GoogleFonts.outfitTextTheme();

    return ThemeData(
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
      textTheme: textTheme,
      dividerTheme: const DividerThemeData(
        color: AppColors.line,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
