import 'dart:io';

import 'package:decidix_app/api/api_providers.dart';
import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
import 'package:decidix_app/core/config/provider_retry.dart';
import 'package:decidix_app/main.dart';
import 'package:decidix_app/shared/widgets/decidix_chip.dart';
import 'package:flutter/foundation.dart' show SynchronousFuture;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Reads the mock files straight from disk, without real asynchronous I/O.
/// The default test bundle does real I/O, which `pumpAndSettle` cannot wait
/// for, so a screen would stay on its loading skeleton.
class FileAssetBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async {
    final bytes = File(key).readAsBytesSync();
    return ByteData.sublistView(bytes);
  }

  @override
  Future<String> loadString(String key, {bool cache = true}) {
    return SynchronousFuture(File(key).readAsStringSync());
  }
}

/// The mock with no artificial delay: it answers at once, so `pumpAndSettle`
/// is enough to wait for it. Subclass it to make requests fail or to record them.
class TestTransport extends MockTransport {
  TestTransport() : super(bundle: FileAssetBundle(), latency: Duration.zero);
}

/// Starts the app on a phone-sized screen, on the mock data. Pass a
/// [transport] to replace it, for example one that fails.
Future<void> pumpApp(WidgetTester tester, {ApiTransport? transport}) async {
  SharedPreferences.setMockInitialValues({});
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ProviderScope(
      retry: noAutomaticRetry,
      overrides: [
        apiTransportProvider.overrideWithValue(transport ?? TestTransport()),
      ],
      child: const DecidixApp(),
    ),
  );
  await tester.pumpAndSettle();
}

/// Scrolls the screen until [finder] is on screen.
Future<void> scrollTo(WidgetTester tester, Finder finder) async {
  // The page's own ListView, not the horizontal chip rows inside it.
  final page = find
      .descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable))
      .first;
  await tester.scrollUntilVisible(finder, 300, scrollable: page);
  await tester.pumpAndSettle();
}

/// Taps a chip (tab or filter) by its label. Scrolls the chip row first, since
/// the later tabs of a group start off screen.
Future<void> tapChip(WidgetTester tester, String label) async {
  final chip = find.widgetWithText(DecidixChip, label);
  await tester.ensureVisible(chip);
  await tester.pumpAndSettle();
  await tester.tap(chip);
  await tester.pumpAndSettle();
}

/// Taps the bottom tab with this label.
Future<void> openTab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byType(Scaffold).first, matching: find.text(label)).last);
  await tester.pumpAndSettle();
}

/// Scrolls the screen back to its top (a screen keeps its scroll position when
/// you come back to it).
Future<void> scrollToTop(WidgetTester tester) async {
  final page = find
      .descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable))
      .first;
  await tester.drag(page, const Offset(0, 4000));
  await tester.pumpAndSettle();
}
