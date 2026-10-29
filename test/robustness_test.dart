import 'dart:io';

import 'package:decidix_app/api/api_providers.dart';
import 'package:decidix_app/core/config/provider_retry.dart';
import 'package:decidix_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers/pump_app.dart';

/// Every screen on a small phone, a normal one and a tablet, with the system
/// text at normal size, large and very large. A screen that does not fit throws
/// a layout error (a yellow and black stripe on a device), which fails the test.
const _routes = <String>[
  '/overview/dashboard',
  '/overview/map',
  '/overview/regions',
  '/overview/regions/delta',
  '/insights/education',
  '/insights/healthcare',
  '/insights/economy',
  '/insights/infrastructure',
  '/insights/comparison',
  '/insights/history',
  '/insights/priority',
  '/insights/data-quality',
  '/intelligence/predictions',
  '/intelligence/assistant',
  '/intelligence/recommendations',
  '/decisions/simulator',
  '/decisions/projects',
  '/decisions/reports',
];

Future<void> _visitAll(
  WidgetTester tester, {
  required double width,
  required double textScale,
  required String language,
}) async {
  SharedPreferences.setMockInitialValues({'app_locale': language});
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/path_provider'),
        (call) async => Directory.systemTemp.path,
      );
  tester.view.physicalSize = Size(width, 1600);
  tester.view.devicePixelRatio = 1.0;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAllTestValues);

  // Say which widget overflowed: the error alone only has the number of pixels.
  final reportError = FlutterError.onError;
  FlutterError.onError = (details) {
    debugPrint(
      'LAYOUT ERROR: ${details.toString(minLevel: DiagnosticLevel.info)}',
    );
    reportError?.call(details);
  };
  addTearDown(() => FlutterError.onError = reportError);

  await tester.pumpWidget(
    ProviderScope(
      retry: noAutomaticRetry,
      overrides: [apiTransportProvider.overrideWithValue(TestTransport())],
      child: const DecidixApp(),
    ),
  );
  await tester.pumpAndSettle();

  final context = tester.element(find.byType(Scaffold).first);
  for (final route in _routes) {
    GoRouter.of(context).go(route);
    await tester.pumpAndSettle();
    final problem = tester.takeException();
    final detail = problem is FlutterError
        ? problem.diagnostics.map((node) => node.toStringDeep()).join('\n')
        : problem;
    expect(
      problem,
      isNull,
      reason: '$route at ${width}px, text x$textScale, $language:\n$detail',
    );
  }
}

void main() {
  group('Layout holds on every screen', () {
    for (final width in [320.0, 390.0, 768.0]) {
      for (final scale in [1.0, 1.3, 2.0]) {
        testWidgets('English, ${width.toInt()}px wide, text x$scale', (
          tester,
        ) async {
          await _visitAll(
            tester,
            width: width,
            textScale: scale,
            language: 'en',
          );
        });
      }
    }

    testWidgets('Arabic, 320px wide, text x1.3', (tester) async {
      await _visitAll(tester, width: 320, textScale: 1.3, language: 'ar');
    });
  });
}
