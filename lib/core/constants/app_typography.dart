import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  // ---------------------------------------------------------------------------
  // Legacy styles. Screens still use these until they are moved to the Figma
  // ramp below in phase 4.
  // ---------------------------------------------------------------------------

  static TextStyle get titleLarge => GoogleFonts.outfit(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: AppColors.navy,
        letterSpacing: -0.3,
      );

  static TextStyle get titleMedium => GoogleFonts.outfit(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.navy,
        letterSpacing: -0.2,
      );

  static TextStyle get titleSmall => GoogleFonts.outfit(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: AppColors.navy,
      );

  static TextStyle get eyebrow => GoogleFonts.outfit(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
        letterSpacing: 0.8,
      );

  static TextStyle get body => GoogleFonts.outfit(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
        height: 1.4,
      );

  static TextStyle get bodyMedium => GoogleFonts.outfit(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: AppColors.navy,
      );

  static TextStyle get caption => GoogleFonts.outfit(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      );

  static TextStyle get kpiValue => GoogleFonts.outfit(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: AppColors.navy,
        letterSpacing: -0.5,
      );

  static TextStyle get scoreLarge => GoogleFonts.outfit(
        fontSize: 36,
        fontWeight: FontWeight.w800,
        color: AppColors.navy,
        letterSpacing: -1.0,
      );

  // ---------------------------------------------------------------------------
  // Figma type ramp. Same names and values as the 23 text styles in the file.
  // Colour defaults to navy; set another one with copyWith where the design
  // uses it (secondary text is AppColors.ink).
  // ---------------------------------------------------------------------------

  static TextStyle _figma(
    double size,
    FontWeight weight, {
    Color color = AppColors.navy,
    double? lineHeightPx,
    double letterSpacingPct = 0,
  }) {
    final base = GoogleFonts.outfit(
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: lineHeightPx == null ? null : lineHeightPx / size,
      letterSpacing: size * letterSpacingPct / 100,
    );
    // Outfit has no Arabic glyphs; Cairo fills in for them.
    return base.copyWith(
      fontFamilyFallback: [GoogleFonts.cairo(fontWeight: weight).fontFamily!],
    );
  }

  /// Negative or wide letter spacing breaks joined Arabic letters, so drop it
  /// when the layout is right to left.
  static TextStyle adapt(BuildContext context, TextStyle style) {
    return Directionality.of(context) == TextDirection.rtl
        ? style.copyWith(letterSpacing: 0)
        : style;
  }

  // Headings and numbers
  static TextStyle get headingPage =>
      _figma(34, FontWeight.w300, lineHeightPx: 36, letterSpacingPct: -2.5);
  static TextStyle get headingSection => _figma(17, FontWeight.w600);
  static TextStyle get numberL =>
      _figma(28, FontWeight.w500, letterSpacingPct: -2.5);
  static TextStyle get numberM => _figma(20, FontWeight.w500);
  static TextStyle get numberS => _figma(18, FontWeight.w500);

  // Titles
  static TextStyle get titleM =>
      _figma(16, FontWeight.w600, lineHeightPx: 22);
  static TextStyle get titleS => _figma(15, FontWeight.w600);
  static TextStyle get titleSMultiline =>
      _figma(15, FontWeight.w600, lineHeightPx: 21);

  // Body and labels
  static TextStyle get bodyM =>
      _figma(14, FontWeight.w400, lineHeightPx: 22.75);
  static TextStyle get labelL => _figma(14, FontWeight.w500);
  static TextStyle get labelLStrong => _figma(14, FontWeight.w600);
  static TextStyle get bodyS => _figma(13, FontWeight.w400);
  static TextStyle get bodySMultiline =>
      _figma(13, FontWeight.w400, lineHeightPx: 21);
  static TextStyle get labelM => _figma(13, FontWeight.w500);
  static TextStyle get labelMStrong => _figma(13, FontWeight.w600);

  // Captions
  static TextStyle get captionRegular => _figma(12, FontWeight.w400);
  static TextStyle get captionMedium => _figma(12, FontWeight.w500);
  static TextStyle get captionStrong => _figma(12, FontWeight.w600);

  // Overlines are upper case in English: apply toUpperCase() to the text.
  static TextStyle get overlineM => _figma(
        12,
        FontWeight.w500,
        color: AppColors.blue,
        letterSpacingPct: 14,
      );
  static TextStyle get overlineS => _figma(
        11,
        FontWeight.w600,
        color: AppColors.blue,
        letterSpacingPct: 14,
      );

  // Micro
  static TextStyle get microRegular => _figma(11, FontWeight.w400);
  static TextStyle get microMedium => _figma(11, FontWeight.w500);
  static TextStyle get microStrong => _figma(11, FontWeight.w600);
}
