import 'package:flutter/material.dart';
import 'app_colors.dart';

/// The two fonts of the app, bundled in assets/fonts (see pubspec.yaml).
class AppFonts {
  AppFonts._();

  /// Latin letters and digits.
  static const String latin = 'Outfit';

  /// Arabic letters. Also the backup for any letter Outfit does not have.
  static const String arabic = 'Cairo';
}

class AppTypography {
  AppTypography._();

  /// Figma type ramp. Same names and values as the 23 text styles in the file.
  /// Colour defaults to navy; set another one with copyWith where the design
  /// uses it (secondary text is AppColors.ink).
  static TextStyle _figma(
    double size,
    FontWeight weight, {
    Color color = AppColors.navy,
    double? lineHeightPx,
    double letterSpacingPct = 0,
  }) {
    return TextStyle(
      fontFamily: AppFonts.latin,
      // Outfit has no Arabic glyphs; Cairo fills in for them.
      fontFamilyFallback: const [AppFonts.arabic],
      fontSize: size,
      fontWeight: weight,
      // The fonts are variable: the weight is an axis, set explicitly.
      fontVariations: [FontVariation.weight(weight.value.toDouble())],
      color: color,
      height: lineHeightPx == null ? null : lineHeightPx / size,
      letterSpacing: size * letterSpacingPct / 100,
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
