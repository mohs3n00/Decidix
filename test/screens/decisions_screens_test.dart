import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../helpers/pump_app.dart';

/// The mock, remembering every POST and failing the likes on request.
class _Recording extends TestTransport {
  final List<Map<String, dynamic>> simulations = [];
  bool failLikes = false;

  @override
  Future<ApiEnvelope> post(String path, {Object? body, CancelToken? cancelToken}) {
    if (path == '/decisions/simulate') simulations.add(body! as Map<String, dynamic>);
    if (failLikes && path.endsWith('/like')) {
      return Future.error(const NetworkException());
    }
    return super.post(path, body: body, cancelToken: cancelToken);
  }
}

Future<void> openDecisions(WidgetTester tester, {ApiTransport? transport}) async {
  await pumpApp(tester, transport: transport);
  await tester.tap(find.text('Decisions'));
  await tester.pumpAndSettle();
}

void main() {
  group('Simulator', () {
    testWidgets('starts with the weakest region and the default budget', (tester) async {
      await openDecisions(tester);

      expect(find.text('What-If Simulator'), findsOneWidget);
      expect(find.widgetWithText(InkWell, 'x'), findsNothing); // no stray placeholder
      expect(find.text('Frontier'), findsOneWidget); // the select field
      expect(find.text('Today 44'), findsOneWidget);
      expect(find.text('Projected in 24 months'), findsOneWidget);
      expect(find.text(r'Budget allocation ($M)'), findsOneWidget);
      expect(find.byType(Slider), findsNWidgets(4));

      await scrollTo(tester, find.text('Total package'));
      expect(find.text('\$120M'), findsOneWidget);
      expect(find.text('\$45M'), findsOneWidget); // healthcare slider
      expect(find.text('Jobs & enterprise'), findsOneWidget);
      await scrollTo(tester, find.text('SIMULATION NOTE'));
    });

    testWidgets('moving a slider asks the server once, after a pause', (tester) async {
      final transport = _Recording();
      await openDecisions(tester, transport: transport);
      transport.simulations.clear(); // the first, automatic request

      await scrollTo(tester, find.text('Total package'));
      final slider = find.byType(Slider).at(1); // healthcare
      // Three quick moves in a row: one drag, three pointer updates.
      final gesture = await tester.startGesture(tester.getCenter(slider));
      await gesture.moveBy(const Offset(20, 0));
      await tester.pump(const Duration(milliseconds: 50));
      await gesture.moveBy(const Offset(20, 0));
      await tester.pump(const Duration(milliseconds: 50));
      await gesture.up();
      expect(transport.simulations, isEmpty); // still waiting for the pause

      await tester.pumpAndSettle(const Duration(milliseconds: 400));
      expect(transport.simulations, hasLength(1));
      final healthcare = (transport.simulations.single['allocations'] as Map)['healthcare'];
      expect(healthcare, isNot(45000000.0));
    });

    testWidgets('Reset puts the sliders back', (tester) async {
      await openDecisions(tester);
      await scrollTo(tester, find.text('Total package'));

      await tester.drag(find.byType(Slider).first, const Offset(120, 0));
      await tester.pumpAndSettle(const Duration(milliseconds: 400));
      expect(find.text('\$120M'), findsNothing);

      await tester.tap(find.text('Reset'));
      await tester.pumpAndSettle();
      expect(find.text('\$120M'), findsOneWidget);
    });

    testWidgets('picking another region simulates for it', (tester) async {
      final transport = _Recording();
      await openDecisions(tester, transport: transport);

      await tester.tap(find.text('Frontier'));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(of: find.byType(BottomSheet), matching: find.text('Lakeside')));
      await tester.pumpAndSettle();

      expect(transport.simulations.last['region_id'], 'lakeside');
      expect(find.text('Today 72'), findsOneWidget);
    });
  });

  group('Projects', () {
    Future<void> openProjects(WidgetTester tester) async {
      await openDecisions(tester);
      await tapChip(tester, 'Projects');
    }

    testWidgets('shows the totals and the five projects', (tester) async {
      await openProjects(tester);

      expect(find.text('Development Projects'), findsOneWidget);
      expect(find.text('\$528M'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Northern Highlands Broadband'), findsOneWidget);
      expect(find.text('64%'), findsOneWidget);
      expect(find.text('\$24M'), findsOneWidget);
      expect(find.text('Mar 2026'), findsOneWidget);

      await scrollTo(tester, find.text('Capital Metro Line 3'));
      expect(find.text('Done'), findsOneWidget); // finished: shows its status, not a date
    });

    testWidgets('a status chip filters the list and keeps the totals', (tester) async {
      await openProjects(tester);
      await tapChip(tester, 'Delayed');

      expect(find.text('Frontier Mobile Clinics'), findsOneWidget);
      expect(find.text('Northern Highlands Broadband'), findsNothing);
      expect(find.text('\$528M'), findsOneWidget);
    });
  });

  group('Citizen reports', () {
    Future<void> openReports(WidgetTester tester, {ApiTransport? transport}) async {
      await openDecisions(tester, transport: transport);
      await tapChip(tester, 'Reports');
    }

    testWidgets('shows the stats and the reports with their age', (tester) async {
      await openReports(tester);

      expect(find.text('Citizen Reports'), findsOneWidget);
      expect(find.text('1,284'), findsOneWidget);
      expect(find.text('73%'), findsOneWidget);
      expect(find.text('Open this week'), findsOneWidget);
      expect(find.text('Bridge deck cracking near market road'), findsOneWidget);
      expect(find.text('2h ago'), findsOneWidget);
      expect(find.text('128'), findsOneWidget);
      expect(find.text('Escalated'), findsWidgets);
    });

    testWidgets('a category chip filters the reports', (tester) async {
      await openReports(tester);
      await tapChip(tester, 'Water');

      expect(find.text('No drinking water for 6 days'), findsOneWidget);
      expect(find.text('Bridge deck cracking near market road'), findsNothing);
    });

    testWidgets('liking updates the count and unliking puts it back', (tester) async {
      await openReports(tester);

      await tester.tap(find.bySemanticsLabel('Like').first);
      await tester.pumpAndSettle();
      expect(find.text('129'), findsOneWidget);
      expect(find.text('128'), findsNothing);

      await tester.tap(find.bySemanticsLabel('Like').first);
      await tester.pumpAndSettle();
      expect(find.text('128'), findsOneWidget);
    });

    testWidgets('if the server refuses the like, the count goes back', (tester) async {
      final transport = _Recording()..failLikes = true;
      await openReports(tester, transport: transport);

      await tester.tap(find.bySemanticsLabel('Like').first);
      await tester.pumpAndSettle();

      expect(find.text('128'), findsOneWidget);
      expect(find.text('129'), findsNothing);
    });
  });
}
