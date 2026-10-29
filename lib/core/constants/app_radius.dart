import 'package:flutter/material.dart';

class AppRadius {
  AppRadius._();

  static const double sm = 6.0;
  static const double md = 10.0;

  /// Inner blocks inside a card (stat tiles, list wells).
  static const double inner = 12.0;

  /// Cards, rows, inputs.
  static const double card = 18.0;
  static const double lg = 18.0;

  /// Hero cards such as the Development Index card.
  static const double hero = 22.0;
  static const double xl = 24.0;
  static const double bottomNav = 30.0;
  static const double avatar = 44.0;
  static const double pill = 999.0;

  static final BorderRadius cardRadius = BorderRadius.circular(card);
  static final BorderRadius innerRadius = BorderRadius.circular(inner);
  static final BorderRadius heroRadius = BorderRadius.circular(hero);
  static final BorderRadius pillRadius = BorderRadius.circular(pill);
  static final BorderRadius bottomNavRadius = BorderRadius.circular(bottomNav);
}
