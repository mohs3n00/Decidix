import 'package:flutter/material.dart';

/// Shadows measured from the Figma file (all navy #061A3A).
class AppShadows {
  AppShadows._();

  /// Cards, list rows, inputs: y6 blur20 spread-10, 18%.
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x2E061A3A),
      blurRadius: 20,
      spreadRadius: -10,
      offset: Offset(0, 6),
    ),
  ];

  /// Hero card and the bottom navigation bar: y10 blur24, 18%.
  static const List<BoxShadow> hero = [
    BoxShadow(
      color: Color(0x2E061A3A),
      blurRadius: 24,
      offset: Offset(0, 10),
    ),
  ];

  static const List<BoxShadow> bottomNav = hero;

  /// Small round buttons (language, notifications): y1 blur3, 12%.
  static const List<BoxShadow> pill = [
    BoxShadow(
      color: Color(0x1F061A3A),
      blurRadius: 3,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> avatar = [
    BoxShadow(
      color: Color(0x33061A3A),
      blurRadius: 10,
      spreadRadius: -2,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> floatingButton = [
    BoxShadow(
      color: Color(0x402563EB),
      blurRadius: 14,
      offset: Offset(0, 6),
    ),
  ];

  /// Selected chip: y4 blur10 spread-2, 25%.
  static const List<BoxShadow> chipActive = [
    BoxShadow(
      color: Color(0x40061A3A),
      blurRadius: 10,
      spreadRadius: -2,
      offset: Offset(0, 4),
    ),
  ];
}
