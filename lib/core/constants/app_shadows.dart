import 'package:flutter/material.dart';

/// Light, wide shadows (navy at a low opacity): cards float, they do not weigh.
class AppShadows {
  AppShadows._();

  /// Cards and list rows: y10 blur30 spread-10, 8%.
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x14061A3A),
      blurRadius: 30,
      spreadRadius: -10,
      offset: Offset(0, 10),
    ),
  ];

  /// Hero areas: a bit deeper, y16 blur40 spread-12, 12%.
  static const List<BoxShadow> hero = [
    BoxShadow(
      color: Color(0x1F061A3A),
      blurRadius: 40,
      spreadRadius: -12,
      offset: Offset(0, 16),
    ),
  ];

  /// The floating tab bar: y12 blur32 spread-8, 16%.
  static const List<BoxShadow> bottomNav = [
    BoxShadow(
      color: Color(0x29061A3A),
      blurRadius: 32,
      spreadRadius: -8,
      offset: Offset(0, 12),
    ),
  ];

  /// Small round buttons (language, notifications): y4 blur12, 8%.
  static const List<BoxShadow> pill = [
    BoxShadow(
      color: Color(0x14061A3A),
      blurRadius: 12,
      offset: Offset(0, 4),
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

  /// The white circle on the active tab: y6 blur16, 14%.
  static const List<BoxShadow> activeTab = [
    BoxShadow(
      color: Color(0x24061A3A),
      blurRadius: 16,
      offset: Offset(0, 6),
    ),
  ];
}
