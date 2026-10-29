// A tool, not a test: draws the app icon and splash images from the logo in
// assets/icon, because there is no image editor in the build.
//
//   ICON_OUT=assets/icon flutter test test/tool/render_icon_test.dart
//
// Without ICON_OUT it is skipped. Then run:
//   dart run flutter_launcher_icons
//   dart run flutter_native_splash:create
import 'dart:io';
import 'dart:ui' as ui;

import 'package:decidix_app/core/constants/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

const double _size = 1024;

Future<void> _save(WidgetTester tester, String path, Widget picture) async {
  final key = GlobalKey();
  tester.view.physicalSize = const Size(_size, _size);
  tester.view.devicePixelRatio = 1;
  await tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.ltr,
      child: RepaintBoundary(
        key: key,
        child: SizedBox.square(dimension: _size, child: picture),
      ),
    ),
  );
  // Let the SVG load from the asset bundle.
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 300)),
  );
  await tester.pump();
  await tester.runAsync(() async {
    final boundary =
        key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    File(path).writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}

Widget _mark(double fraction) => Center(
  child: SvgPicture.asset(
    'assets/icon/Asset 3.svg',
    width: _size * fraction,
    height: _size * fraction,
    // flutter_svg ignores the <style> block of this file, so the fill is
    // set here.
    colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
  ),
);

void main() {
  final out = Platform.environment['ICON_OUT'];

  testWidgets('render app icon and splash', (tester) async {
    addTearDown(tester.view.reset);
    // The logo on navy: iOS and old Android launchers.
    await _save(
      tester,
      '$out/app_icon.png',
      ColoredBox(color: AppColors.navy, child: _mark(0.56)),
    );
    // The logo alone on nothing: Android adaptive icon (it keeps to the middle
    // two thirds, the launcher draws the shape and the navy behind it).
    await _save(tester, '$out/app_icon_foreground.png', _mark(0.42));
    // The logo on nothing, for the splash screen.
    await _save(tester, '$out/splash_mark.png', _mark(0.9));
  }, skip: out == null);
}
