import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

/// Remembers which pages were asked for, and can fail page 2.
class _Pages extends TestTransport {
  final Map<String, List<int>> asked = {};
  bool failSecondPage = false;

  @override
  Future<ApiEnvelope> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) {
    final page = query?['page'];
    if (page is int) (asked[path] ??= []).add(page);
    if (failSecondPage && page == 2) {
      return Future.error(const NetworkException());
    }
    return super.get(path, query: query, cancelToken: cancelToken);
  }
}

void main() {
  group('Regions', () {
    testWidgets('start with one page and load the next while scrolling', (
      tester,
    ) async {
      final transport = _Pages();
      await pumpApp(tester, transport: transport, pageSize: 5);
      await tapChip(tester, 'Regions');

      expect(find.text('Central Capital'), findsOneWidget); // rank 1, page 1
      // 5 rows do not fill the phone screen, so page 2 (ranks 6 to 10) comes
      // by itself; the screen is full after that and page 3 waits.
      expect(transport.asked['/regions'], [1, 2]);
      expect(find.text('Frontier'), findsNothing); // rank 12 is on page 3

      await scrollTo(tester, find.text('Frontier'));
      expect(find.text('Frontier'), findsOneWidget);
      expect(transport.asked['/regions'], [1, 2, 3]);
    });

    testWidgets('stop asking once everything is loaded', (tester) async {
      final transport = _Pages();
      await pumpApp(tester, transport: transport, pageSize: 5);
      await tapChip(tester, 'Regions');
      await scrollTo(tester, find.text('Frontier'));

      // Keep dragging at the bottom: there is no page 4.
      for (var i = 0; i < 3; i++) {
        await tester.drag(find.byType(ListView).first, const Offset(0, -400));
        await tester.pumpAndSettle();
      }
      expect(transport.asked['/regions'], [1, 2, 3]);
    });

    testWidgets('a new filter starts again from page 1 without leftovers', (
      tester,
    ) async {
      final transport = _Pages();
      await pumpApp(tester, transport: transport, pageSize: 5);
      await tapChip(tester, 'Regions');
      await scrollTo(tester, find.text('Delta')); // pages 1 and 2 are loaded
      await scrollToTop(tester);

      await tapChip(tester, 'High');
      expect(find.text('Frontier'), findsOneWidget);
      expect(find.text('Northern Highlands'), findsOneWidget);
      expect(find.text('Central Capital'), findsNothing);
      expect(find.text('Delta'), findsOneWidget); // once, not duplicated
    });

    testWidgets(
      'a failed page keeps the list and the next scroll tries again',
      (tester) async {
        final transport = _Pages()..failSecondPage = true;
        await pumpApp(tester, transport: transport, pageSize: 5);
        await tapChip(tester, 'Regions');

        await tester.drag(find.byType(ListView).first, const Offset(0, -2000));
        await tester.pumpAndSettle();

        expect(
          find.text('We couldn’t load this data'),
          findsNothing,
        ); // no error screen
        expect(
          find.text('Central Capital', skipOffstage: false),
          findsOneWidget,
        );
        expect(transport.asked['/regions'], contains(2));

        transport.failSecondPage = false;
        await tester.drag(find.byType(ListView).first, const Offset(0, -300));
        await tester.pumpAndSettle();
        await scrollTo(tester, find.text('Delta'));
        expect(find.text('Delta'), findsOneWidget);
      },
    );

    testWidgets(
      'a short list that fits the screen loads its other pages by itself',
      (tester) async {
        final transport = _Pages();
        await pumpApp(tester, transport: transport, pageSize: 2);
        await tapChip(tester, 'Regions');

        // 2 rows do not fill a phone screen, so there is nothing to scroll:
        // the next pages must be requested anyway.
        expect(transport.asked['/regions'], containsAll([1, 2]));
      },
    );
  });

  group('Projects', () {
    testWidgets('load page by page and keep the totals', (tester) async {
      final transport = _Pages();
      await pumpApp(tester, transport: transport, pageSize: 2);
      await tester.tap(find.text('Decisions'));
      await tester.pumpAndSettle();
      await tapChip(tester, 'Projects');

      await scrollTo(
        tester,
        find.text('Frontier Mobile Clinics'),
      ); // the 5th of 5
      expect(transport.asked['/decisions/projects'], [1, 2, 3]);

      await scrollToTop(tester);
      expect(find.text('\$528M'), findsOneWidget); // the totals did not change
    });
  });

  group('Citizen reports', () {
    testWidgets('load page by page and likes still work on later pages', (
      tester,
    ) async {
      final transport = _Pages();
      await pumpApp(tester, transport: transport, pageSize: 2);
      await tester.tap(find.text('Decisions'));
      await tester.pumpAndSettle();
      await tapChip(tester, 'Reports');

      await scrollTo(
        tester,
        find.text('Unlit highway section causing accidents'),
      );
      expect(transport.asked['/decisions/citizen-reports'], [1, 2, 3]);

      expect(find.text('96'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Like').last);
      await tester.pumpAndSettle();
      expect(find.text('97'), findsOneWidget);
      // The reports loaded before are still there.
      expect(
        find.text('Bridge deck cracking near market road', skipOffstage: false),
        findsOneWidget,
      );
    });
  });
}
