import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();

  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;

  /// Side margin of every screen in the Figma file.
  static const double gutter = 20.0;

  /// Gap between two sections on a screen.
  static const double section = 20.0;

  /// Inner padding of a card.
  static const double cardPadding = 16.0;

  // TODO(phase-4): move screens to [gutter] and remove this 16px padding.
  static const EdgeInsets pagePadding = EdgeInsets.symmetric(horizontal: 16.0);
  static const EdgeInsets screenPadding =
      EdgeInsets.symmetric(horizontal: gutter);
}
