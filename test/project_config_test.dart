import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Checks on the project files that a build depends on. They fail early and
/// with a clear message instead of as a broken build or a missing font.
void main() {
  final pubspec = File('pubspec.yaml').readAsStringSync();

  test('every asset listed in pubspec.yaml exists', () {
    // An empty or missing folder is a build error on a fresh checkout (git
    // does not keep empty folders).
    final paths = RegExp(r'^\s+- (assets/[^\s]+)\s*$', multiLine: true)
        .allMatches(pubspec)
        .map((m) => m.group(1)!)
        .where((p) => !p.endsWith('.ttf'));
    expect(paths, isNotEmpty);
    for (final path in paths) {
      if (path.endsWith('/')) {
        final dir = Directory(path);
        expect(dir.existsSync(), isTrue, reason: '$path is listed but missing');
        expect(
          dir.listSync().whereType<File>(),
          isNotEmpty,
          reason: '$path is empty',
        );
      } else {
        expect(
          File(path).existsSync(),
          isTrue,
          reason: '$path is listed but missing',
        );
      }
    }
  });

  test('the bundled fonts are real font files and nothing is downloaded', () {
    for (final file in ['Outfit-Variable.ttf', 'Cairo-Variable.ttf']) {
      final bytes = File('assets/fonts/$file').readAsBytesSync();
      // 0x00010000 is the signature of a TrueType file.
      expect(bytes.sublist(0, 4), [
        0,
        1,
        0,
        0,
      ], reason: '$file is not a TrueType font');
      expect(pubspec, contains('assets/fonts/$file'));
    }
    expect(
      pubspec,
      isNot(contains('google_fonts')),
      reason: 'fonts are bundled; google_fonts would download them at start',
    );
  });

  test('the font licences are shipped with the fonts', () {
    for (final file in ['OFL-Outfit.txt', 'OFL-Cairo.txt']) {
      expect(
        File('assets/fonts/$file').readAsStringSync(),
        contains('SIL OPEN FONT LICENSE'),
      );
    }
  });
}
