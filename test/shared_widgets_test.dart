import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/core/localization/app_localizations.dart';
import 'package:decidix_app/shared/widgets/chip_scroll_row.dart';
import 'package:decidix_app/shared/widgets/decidix_chip.dart';
import 'package:decidix_app/shared/widgets/decidix_top_bar.dart';
import 'package:decidix_app/shared/widgets/progress_row.dart';
import 'package:decidix_app/shared/widgets/select_field.dart';
import 'package:decidix_app/shared/widgets/state_views.dart';
import 'package:decidix_app/shared/widgets/status_badge.dart';

Widget _host(
  Widget child, {
  double width = 360,
  Locale locale = const Locale('en'),
}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: const [Locale('en'), Locale('ar')],
    localizationsDelegates: const [
      AppLocalizationsDelegate(),
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(
      body: Align(
        alignment: Alignment.topLeft,
        child: SizedBox(width: width, child: child),
      ),
    ),
  );
}

void main() {
  const labels = [
    'Education',
    'Healthcare',
    'Economy',
    'Infrastructure',
    'Compare',
    'History',
    'Priority',
    'Data Quality',
  ];

  group('DecidixChip', () {
    testWidgets('selected and unselected chips are the same height', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          const Row(
            children: [
              DecidixChip(label: 'Active', selected: true),
              DecidixChip(label: 'Inactive'),
            ],
          ),
        ),
      );

      expect(
        tester.getSize(find.byType(DecidixChip).first).height,
        DecidixChip.height,
      );
      expect(
        tester.getSize(find.byType(DecidixChip).last).height,
        DecidixChip.height,
      );
    });

    testWidgets('reports taps', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(DecidixChip(label: 'Map', onTap: () => taps++)),
      );
      await tester.tap(find.text('Map'));
      expect(taps, 1);
    });
  });

  group('ChipScrollRow', () {
    testWidgets('scrolls the selected chip into view', (tester) async {
      await tester.pumpWidget(
        _host(
          ChipScrollRow(labels: labels, selectedIndex: 7, onSelected: (_) {}),
          width: 300,
        ),
      );
      await tester.pumpAndSettle();

      final rect = tester.getRect(find.text('Data Quality'));
      expect(rect.left, greaterThanOrEqualTo(0));
      expect(rect.right, lessThanOrEqualTo(300));
    });

    testWidgets('follows the selection when it changes', (tester) async {
      Widget row(int selected) => _host(
        ChipScrollRow(
          labels: labels,
          selectedIndex: selected,
          onSelected: (_) {},
        ),
        width: 300,
      );

      await tester.pumpWidget(row(0));
      await tester.pumpAndSettle();
      expect(
        tester.getRect(find.text('Education')).left,
        greaterThanOrEqualTo(0),
      );

      await tester.pumpWidget(row(6));
      await tester.pumpAndSettle();
      final rect = tester.getRect(find.text('Priority'));
      expect(rect.left, greaterThanOrEqualTo(0));
      expect(rect.right, lessThanOrEqualTo(300));
    });

    testWidgets('selecting a chip calls onSelected with its index', (
      tester,
    ) async {
      int? picked;
      await tester.pumpWidget(
        _host(
          ChipScrollRow(
            labels: const ['One', 'Two', 'Three'],
            selectedIndex: 0,
            onSelected: (i) => picked = i,
          ),
        ),
      );
      await tester.tap(find.text('Two'));
      expect(picked, 1);
    });

    testWidgets('keeps the selected chip visible in Arabic (RTL)', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          ChipScrollRow(labels: labels, selectedIndex: 7, onSelected: (_) {}),
          width: 300,
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      final rect = tester.getRect(find.text('Data Quality'));
      expect(rect.left, greaterThanOrEqualTo(0));
      expect(rect.right, lessThanOrEqualTo(300));
    });
  });

  group('StatusBadge', () {
    testWidgets('shows its label for every tone', (tester) async {
      await tester.pumpWidget(
        _host(
          Column(
            children: [
              for (final tone in BadgeTone.values)
                StatusBadge(label: 'Tone ${tone.name}', tone: tone),
            ],
          ),
        ),
      );

      for (final tone in BadgeTone.values) {
        expect(find.text('Tone ${tone.name}'), findsOneWidget);
      }
    });
  });

  group('SelectField', () {
    testWidgets('shows value and chevron, reports taps', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(SelectField(value: 'Frontier', onTap: () => taps++)),
      );

      expect(find.text('Frontier'), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_down_rounded), findsOneWidget);
      await tester.tap(find.text('Frontier'));
      expect(taps, 1);
    });
  });

  group('ProgressRow', () {
    testWidgets('clamps progress to the 0 to 1 range', (tester) async {
      await tester.pumpWidget(
        _host(
          const Column(
            children: [
              ProgressRow(label: 'Over', valueLabel: '150%', progress: 1.5),
              ProgressRow(label: 'Under', valueLabel: '-20%', progress: -0.2),
            ],
          ),
        ),
      );

      final factors = tester
          .widgetList<FractionallySizedBox>(find.byType(FractionallySizedBox))
          .map((w) => w.widthFactor)
          .toList();
      expect(factors, [1.0, 0.0]);
    });
  });

  group('State views', () {
    testWidgets('ErrorView retry button calls onRetry', (tester) async {
      var retries = 0;
      await tester.pumpWidget(_host(ErrorView(onRetry: () => retries++)));

      expect(find.text('We couldn’t load this data'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      expect(retries, 1);
    });

    testWidgets('ErrorView shows a custom message', (tester) async {
      await tester.pumpWidget(
        _host(ErrorView(message: 'Server is down', onRetry: () {})),
      );
      expect(find.text('Server is down'), findsOneWidget);
    });

    testWidgets('ErrorView is translated in Arabic', (tester) async {
      await tester.pumpWidget(
        _host(ErrorView(onRetry: () {}), locale: const Locale('ar')),
      );
      expect(find.text('إعادة المحاولة'), findsOneWidget);
    });

    testWidgets('EmptyView shows the empty message', (tester) async {
      await tester.pumpWidget(_host(const EmptyView()));
      expect(find.text('Nothing to show here yet'), findsOneWidget);
    });

    testWidgets('LoadingSkeleton renders the requested rows', (tester) async {
      await tester.pumpWidget(_host(const LoadingSkeleton(rows: 3)));
      expect(find.byType(SkeletonBox), findsNWidgets(3));
    });
  });

  group('DecidixTopBar', () {
    testWidgets('has no unread dot unless a screen asks for it', (
      tester,
    ) async {
      await tester.pumpWidget(_host(const DecidixTopBar()));
      expect(find.byType(PositionedDirectional), findsNothing);

      await tester.pumpWidget(
        _host(const DecidixTopBar(hasUnreadNotifications: true)),
      );
      expect(find.byType(PositionedDirectional), findsOneWidget);
    });
  });
}
