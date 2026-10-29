import 'package:flutter/material.dart';

class AppRadius {
  AppRadius._();

  static const double sm = 6.0;
  static const double md = 10.0;

  /// Inner wells inside a card, inputs.
  static const double inner = 18.0;

  /// A row in a list.
  static const double row = 24.0;

  /// Cards.
  static const double card = 28.0;
  static const double lg = 18.0;

  /// Hero areas at the top of a screen.
  static const double hero = 32.0;
  static const double xl = 24.0;
  static const double bottomNav = 36.0;
  static const double avatar = 44.0;
  static const double pill = 999.0;

  static final BorderRadius cardRadius = BorderRadius.circular(card);
  static final BorderRadius rowRadius = BorderRadius.circular(row);
  static final BorderRadius innerRadius = BorderRadius.circular(inner);
  static final BorderRadius heroRadius = BorderRadius.circular(hero);
  static final BorderRadius pillRadius = BorderRadius.circular(pill);
  static final BorderRadius bottomNavRadius = BorderRadius.circular(bottomNav);
}
