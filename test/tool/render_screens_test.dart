// A tool, not a test: draws every screen with the real fonts and saves PNGs, so
// the design can be looked at without a device.
//
//   RENDER_OUT=E:/some/folder flutter test test/tool/render_screens_test.dart
//   RENDER_LANG=ar ... for the Arabic version
//   RENDER_ONLY=dashboard,simulator ... for some screens only
//
// Without RENDER_OUT it is skipped, so the normal test run ignores it.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:decidix_app/api/api_providers.dart';
import 'package:decidix_app/core/config/provider_retry.dart';
import 'package:decidix_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/pump_app.dart';

const _screens = <String, String>{
  'dashboard': '/overview/dashboard',
  'map': '/overview/map',
  'regions': '/overview/regions',
  'region_profile': '/overview/regions/delta',
  'education': '/insights/education',
  'healthcare': '/insights/healthcare',
  'economy': '/insights/economy',
  'infrastructure': '/insights/infrastructure',
  'compare': '/insights/comparison',
  'history': '/insights/history',
  'priority': '/insights/priority',
  'data_quality': '/insights/data-quality',
  'predictions': '/intelligence/predictions',
  'assistant': '/intelligence/assistant',
  'recommendations': '/intelligence/recommendations',
  'simulator': '/decisions/simulator',
  'projects': '/decisions/projects',
  'reports': '/decisions/reports',
};

Future<void> _loadFont(String family, String path) async {
  final loader = FontLoader(family)
    ..addFont(Future.value(ByteData.sublistView(File(path).readAsBytesSync())));
  await loader.load();
}

void main() {
  final out = Platform.environment['RENDER_OUT'];
  final language = Platform.environment['RENDER_LANG'] ?? 'en';
  final only = (Platform.environment['RENDER_ONLY'] ?? '')
      .split(',')
      .where((s) => s.isNotEmpty)
      .toSet();

  testWidgets('render every screen', (tester) async {
    await tester.runAsync(() async {
      await _loadFont('Outfit', 'assets/fonts/Outfit-Variable.ttf');
      await _loadFont('Cairo', 'assets/fonts/Cairo-Variable.ttf');
      // The Material icons (arrows, hearts) ship with the Flutter SDK.
      final icons = File(
        'C:/src/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
      );
      if (icons.existsSync()) await _loadFont('MaterialIcons', icons.path);
    });

    SharedPreferences.setMockInitialValues({'app_locale': language});
    // The map's tile cache asks for a folder; any folder will do here.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/path_provider'),
          (call) async => Directory.systemTemp.path,
        );
    tester.view.physicalSize = const Size(780, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final boundary = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: boundary,
        child: ProviderScope(
          retry: noAutomaticRetry,
          overrides: [apiTransportProvider.overrideWithValue(TestTransport())],
          child: const DecidixApp(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    Directory(out!).createSync(recursive: true);
    final context = tester.element(find.byType(Scaffold).first);

    for (final entry in _screens.entries) {
      if (only.isNotEmpty && !only.contains(entry.key)) continue;
      GoRouter.of(context).go(entry.value);
      await tester.pumpAndSettle();
      // The icons are SVG files that decode on a real thread.
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 150)),
      );
      await tester.pumpAndSettle();

      await tester.runAsync(() async {
        final render =
            boundary.currentContext!.findRenderObject()
                as RenderRepaintBoundary;
        final image = await render.toImage(pixelRatio: 1.0);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        File('$out/${entry.key}_$language.png')
            .writeAsBytesSync(bytes!.buffer.asUint8List());
      });
    }
  }, skip: out == null);
}
