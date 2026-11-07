import 'package:decidix_app/shared/widgets/decidix_chip.dart';
import 'package:decidix_app/shared/widgets/select_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

Future<void> openInsights(WidgetTester tester) async {
  await pumpApp(tester);
  await tester.tap(find.text('Insights'));
  await tester.pumpAndSettle();
}

void main() {
  group('Sector screens', () {
    testWidgets(
      'education shows KPIs, trend, bars, indicators, ranking and insight',
      (tester) async {
        await openInsights(tester);

        expect(find.text('Education Analytics'), findsOneWidget);
        expect(find.text('Literacy rate'), findsOneWidget);
        expect(find.text('96.2'), findsOneWidget);
        expect(find.text('1:19'), findsOneWidget); // teacher : pupil
        expect(find.text('Index trend, 2019–2025'), findsOneWidget);

        await scrollTo(tester, find.text('Enrolment by level (%)'));
        await scrollTo(tester, find.text('Key indicators'));
        expect(find.text('Primary completion'), findsOneWidget);
        expect(find.text('94%'), findsOneWidget);

        await scrollTo(tester, find.text('Regional ranking'));
        expect(find.text('Central Capital'), findsOneWidget);
        expect(find.text('Frontier'), findsNothing);

        await tester.tap(find.widgetWithText(DecidixChip, 'Bottom'));
        await tester.pumpAndSettle();
        expect(find.text('Frontier'), findsOneWidget);
        expect(find.text('Central Capital'), findsNothing);

        await scrollTo(tester, find.textContaining('Secondary dropout'));
      },
    );

    testWidgets('the sector tabs open the four sectors', (tester) async {
      await openInsights(tester);

      await tapChip(tester, 'Healthcare');
      expect(find.text('Healthcare Analytics'), findsOneWidget);
      expect(find.text('Life expectancy'), findsOneWidget);
      expect(find.text('yrs'), findsOneWidget);

      await tapChip(tester, 'Economy');
      expect(find.text('Economy & Employment'), findsOneWidget);
      expect(find.text('1,820'), findsOneWidget); // median income

      await tapChip(tester, 'Infrastructure');
      expect(find.text('Infrastructure Analytics'), findsOneWidget);
      expect(find.text('Broadband'), findsOneWidget);
    });
  });

  group('Compare', () {
    testWidgets('starts with the best and the weakest region', (tester) async {
      await openInsights(tester);
      await tapChip(tester, 'Compare');

      expect(find.text('Compare Regions'), findsOneWidget);
      expect(
        find.widgetWithText(SelectField, 'Central Capital'),
        findsOneWidget,
      );
      expect(find.widgetWithText(SelectField, 'Frontier'), findsOneWidget);
      expect(find.text('VS'), findsOneWidget);
      expect(find.text('Overall'), findsOneWidget);

      await scrollTo(tester, find.text('GAP ANALYSIS'));
      expect(
        find.textContaining('Central Capital leads Frontier by 42'),
        findsOneWidget,
      );
    });

    testWidgets('picking another region reloads the comparison', (
      tester,
    ) async {
      await openInsights(tester);
      await tapChip(tester, 'Compare');

      await tester.tap(find.widgetWithText(SelectField, 'Frontier'));
      await tester.pumpAndSettle();
      expect(find.text('Choose a region'), findsOneWidget);

      await tester.tap(
        find.descendant(
          of: find.byType(BottomSheet),
          matching: find.text('Lakeside'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.widgetWithText(SelectField, 'Lakeside'), findsOneWidget);
      await scrollTo(tester, find.text('GAP ANALYSIS'));
      expect(
        find.textContaining('Central Capital leads Lakeside by 14'),
        findsOneWidget,
      );
    });
  });

  group('History', () {
    testWidgets('shows the change since 2019, annual change and milestones', (
      tester,
    ) async {
      await openInsights(tester);
      await tapChip(tester, 'History');

      expect(find.text('Historical Analysis'), findsOneWidget);
      expect(find.text('68.4'), findsOneWidget);
      expect(find.text('+10.2'), findsOneWidget);
      expect(find.text('Change since 2019'), findsOneWidget);

      await scrollTo(tester, find.text('Annual change'));
      await scrollTo(tester, find.text('Milestones'));
      await scrollTo(tester, find.text('Pandemic economic contraction'));
      expect(find.text('-2.2 economy'), findsOneWidget);
      expect(find.text('+4.8 digital access'), findsOneWidget);
    });

    testWidgets('the sector chips reload without leaving the screen', (
      tester,
    ) async {
      await openInsights(tester);
      await tapChip(tester, 'History');
      await tester.tap(find.widgetWithText(DecidixChip, 'Health'));
      await tester.pumpAndSettle();

      expect(find.text('Historical Analysis'), findsOneWidget);
      expect(find.text('68.4'), findsOneWidget);
    });
  });

  group('Priority', () {
    testWidgets('counts the regions and lists the queue', (tester) async {
      await openInsights(tester);
      await tapChip(tester, 'Priority');

      expect(find.text('Development Priority'), findsOneWidget);
      expect(
        find.text('Medium'),
        findsWidgets,
      ); // the count tile and queue badges
      expect(
        find.text('5'),
        findsWidgets,
      ); // medium priority regions (and rank 5 in the queue)

      await scrollTo(tester, find.text('Priority queue'));
      expect(find.text('Frontier'), findsOneWidget);
      expect(find.text('Weakest: Healthcare (40)'), findsOneWidget);
      expect(find.text('Need score'), findsWidgets);
    });

    testWidgets('a queue entry opens the region profile', (tester) async {
      await openInsights(tester);
      await tapChip(tester, 'Priority');
      await scrollTo(tester, find.text('Frontier'));
      await tester.tap(find.text('Frontier'));
      await tester.pumpAndSettle();

      expect(find.text('Rank #12 of 12'), findsOneWidget);
    });
  });

  group('Data quality', () {
    testWidgets('shows the score, the three dimensions, coverage and sources', (
      tester,
    ) async {
      await openInsights(tester);
      await tapChip(tester, 'Data Quality');

      expect(find.text('Good overall'), findsOneWidget);
      expect(find.text('91%'), findsOneWidget);
      expect(find.text('78%'), findsOneWidget);
      expect(find.text('86%'), findsOneWidget);

      await scrollTo(tester, find.text('Lowest coverage regions'));
      expect(find.text('58%'), findsOneWidget);

      await scrollTo(tester, find.text('Data sources'));
      await scrollTo(tester, find.text('Overdue · 41 days'));
      // All three synthetic sources are generated in the same run, so none is stale.
      expect(find.text('Synced today'), findsNWidgets(2));
      expect(find.text('2 days ago'), findsNothing);
    });
  });
}
