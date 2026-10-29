import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/shared/widgets/decidix_chip.dart';
import '../helpers/pump_app.dart';

/// A chip, not a label with the same text elsewhere on the screen.
Finder _chip(String label) => find.widgetWithText(DecidixChip, label);

void main() {
  group('Dashboard', () {
    testWidgets('shows the index, KPIs, trend, regions and insight from the mock data',
        (tester) async {
      await pumpApp(tester);

      expect(find.text('National Development'), findsOneWidget);
      expect(find.text('DECIDIX · 2025 Q4'), findsOneWidget);
      expect(find.text('Development Index'), findsOneWidget);
      expect(find.text('68.4'), findsOneWidget);
      expect(find.text('+2.3 vs 2024'), findsOneWidget);
      expect(find.text('out of 100 · Moderate-High'), findsOneWidget);
      expect(find.text('39.6M'), findsOneWidget); // population of the 12 regions

      await scrollTo(tester, find.text('Unemployment'));
      expect(find.text('Education'), findsWidgets);
      expect(find.text('74.2'), findsOneWidget);

      await scrollTo(tester, find.text('Needs attention'));
      await scrollTo(tester, find.text('Frontier'));
      expect(find.text('1.2M people'), findsOneWidget);
      expect(find.text('High'), findsWidgets);
    });

    testWidgets('the trend range chips change the years shown', (tester) async {
      await pumpApp(tester);
      await scrollTo(tester, find.text('National trend'));

      expect(find.text('2019'), findsOneWidget);
      await tester.tap(_chip('3Y'));
      await tester.pumpAndSettle();

      expect(find.text('2019'), findsNothing);
      expect(find.text('2023'), findsOneWidget);
      expect(find.text('2025'), findsOneWidget);
    });

    testWidgets('See all opens the regions screen filtered to high priority',
        (tester) async {
      await pumpApp(tester);
      await scrollTo(tester, find.text('See all'));
      await tester.tap(find.text('See all'));
      await tester.pumpAndSettle();

      expect(find.text('Search regions'), findsOneWidget);
      expect(find.text('Frontier'), findsOneWidget);
      expect(find.text('Lakeside'), findsNothing); // low priority is filtered out
    });
  });

  group('Map', () {
    testWidgets('shows the selected region and opens its profile', (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Map'));
      await tester.pumpAndSettle();

      expect(find.text('Interactive Map'), findsOneWidget);
      // Every tile provider requires its credit on the map.
      expect(find.text('© OpenStreetMap contributors'), findsOneWidget);
      expect(find.text('Overall'), findsOneWidget);
      expect(find.text('Central Capital'), findsWidgets);

      await scrollTo(tester, find.text('Open region profile'));
      await tester.tap(find.text('Open region profile'));
      await tester.pumpAndSettle();

      expect(find.text('Rank #1 of 12'), findsOneWidget);
    });
  });

  group('Regions', () {
    testWidgets('lists the regions and filters them', (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Regions'));
      await tester.pumpAndSettle();

      expect(find.text('Central Capital'), findsOneWidget);
      expect(find.text('9.2M people'), findsOneWidget);

      await tester.tap(_chip('Medium'));
      await tester.pumpAndSettle();
      expect(find.text('Central Capital'), findsNothing);
      expect(find.text('Harbor Lowlands'), findsOneWidget);
    });

    testWidgets('search waits for a pause in typing, then filters', (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Regions'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'del');
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Lakeside'), findsOneWidget); // not filtered yet

      await tester.pumpAndSettle(const Duration(milliseconds: 400));
      expect(find.text('Delta'), findsOneWidget);
      expect(find.text('Lakeside'), findsNothing);
    });

    testWidgets('a search with no match shows the empty state', (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Regions'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'atlantis');
      await tester.pumpAndSettle(const Duration(milliseconds: 400));
      expect(find.text('Nothing to show here yet'), findsOneWidget);
    });

    testWidgets('tapping a region opens its profile with a back button', (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Regions'));
      await tester.pumpAndSettle();
      await scrollTo(tester, find.text('Delta')); // the 10th row is below the fold
      await tester.tap(find.text('Delta'));
      await tester.pumpAndSettle();

      expect(find.text('Rank #10 of 12'), findsOneWidget);
      expect(find.text('Index history'), findsOneWidget);
      expect(find.bySemanticsLabel('Back'), findsOneWidget);
      expect(find.text('Healthcare'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();
      await scrollToTop(tester);
      expect(find.text('Search regions'), findsOneWidget);
    });
  });

  group('Back navigation from a region profile', () {
    testWidgets('the Android back button returns to the list instead of leaving the app',
        (tester) async {
      await pumpApp(tester);
      await tester.tap(_chip('Regions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Central Capital'));
      await tester.pumpAndSettle();
      expect(find.text('Rank #1 of 12'), findsOneWidget);

      await tester.binding.handlePopRoute(); // the system back button
      await tester.pumpAndSettle();

      expect(find.text('Search regions'), findsOneWidget);
      expect(find.text('Rank #1 of 12'), findsNothing);
    });

    testWidgets('back returns to the screen the profile was opened from', (tester) async {
      await pumpApp(tester);

      // From the dashboard's "Needs attention" list.
      await scrollTo(tester, find.text('Frontier'));
      await tester.tap(find.text('Frontier'));
      await tester.pumpAndSettle();
      expect(find.text('Rank #12 of 12'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();
      await scrollToTop(tester); // the dashboard is where we left it, down the page
      expect(find.text('National Development'), findsOneWidget);

      // From the map.
      await tester.tap(_chip('Map'));
      await tester.pumpAndSettle();
      await scrollTo(tester, find.text('Open region profile'));
      await tester.tap(find.text('Open region profile'));
      await tester.pumpAndSettle();
      expect(find.text('Rank #1 of 12'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Interactive Map'), findsOneWidget);
    });
  });
}
