import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/api/transport/mock_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';
import 'package:decidix_app/shared/widgets/state_views.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'helpers/pump_app.dart';

/// Counts the requests and can be made to fail.
class _Counting extends TestTransport {
  final Map<String, int> gets = {};

  /// Fail this many GETs of the dashboard before answering.
  int overviewFailures = 0;

  @override
  Future<ApiEnvelope> get(String path, {Map<String, dynamic>? query, CancelToken? cancelToken}) {
    gets[path] = (gets[path] ?? 0) + 1;
    if (path == '/overview' && overviewFailures > 0) {
      overviewFailures--;
      return Future.error(const NetworkException());
    }
    return super.get(path, query: query, cancelToken: cancelToken);
  }
}

void main() {
  group('Language', () {
    testWidgets('the language button switches the app to Arabic and back', (tester) async {
      await pumpApp(tester);
      expect(find.text('National Development'), findsOneWidget);

      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();
      expect(find.text('التنمية الوطنية'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
      expect(Directionality.of(tester.element(find.text('التنمية الوطنية'))), TextDirection.rtl);
      expect(find.text('الاتجاه الوطني', skipOffstage: false), findsOneWidget);

      await tester.tap(find.text('English'));
      await tester.pumpAndSettle();
      expect(find.text('National Development'), findsOneWidget);
      expect(Directionality.of(tester.element(find.text('National Development'))), TextDirection.ltr);
    });

    testWidgets('server text follows the language without a new request', (tester) async {
      final transport = _Counting();
      await pumpApp(tester, transport: transport);
      await tapChip(tester, 'Regions');
      expect(find.text('Central Capital'), findsOneWidget);
      final requests = transport.gets['/regions'];

      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();

      expect(find.text('العاصمة المركزية'), findsOneWidget);
      expect(find.text('Central Capital'), findsNothing);
      expect(transport.gets['/regions'], requests);
    });

    testWidgets('every group has Arabic titles', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('القطاعات').last);
      await tester.pumpAndSettle();
      expect(find.text('تحليلات التعليم'), findsOneWidget);

      await tester.tap(find.text('الذكاء الاصطناعي').last);
      await tester.pumpAndSettle();
      expect(find.text('توقعات التعلم الآلي'), findsOneWidget);

      await tester.tap(find.text('القرارات').last);
      await tester.pumpAndSettle();
      expect(find.text('محاكي السيناريوهات'), findsWidgets);
    });
  });

  group('Navigation', () {
    testWidgets('an unknown address shows a not-found page with a way home', (tester) async {
      await pumpApp(tester);

      GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/nowhere');
      await tester.pumpAndSettle();
      expect(find.text('Page not found'), findsOneWidget);

      await tester.tap(find.text('Back to overview'));
      await tester.pumpAndSettle();
      expect(find.text('National Development'), findsOneWidget);
    });

    testWidgets('the not-found page is translated', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();

      GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/nowhere');
      await tester.pumpAndSettle();
      expect(find.text('الصفحة غير موجودة'), findsOneWidget);
    });

    testWidgets('the bottom bar switches between the four groups', (tester) async {
      await pumpApp(tester);
      expect(find.text('National Development'), findsOneWidget);

      await tester.tap(find.text('Insights'));
      await tester.pumpAndSettle();
      expect(find.text('Education Analytics'), findsOneWidget);

      await tester.tap(find.text('Intelligence'));
      await tester.pumpAndSettle();
      expect(find.text('ML Predictions'), findsOneWidget);

      await tester.tap(find.text('Decisions'));
      await tester.pumpAndSettle();
      expect(find.text('What-If Simulator'), findsOneWidget);

      await tester.tap(find.text('Overview'));
      await tester.pumpAndSettle();
      expect(find.text('National Development'), findsOneWidget);
    });

    testWidgets('the top bar has the account, language and notifications', (tester) async {
      await pumpApp(tester);

      expect(find.text('عربي'), findsOneWidget);
      expect(find.bySemanticsLabel('Notifications'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Notifications'));
      await tester.pump();
      expect(find.text('You have no new notifications.'), findsOneWidget);
    });
  });

  group('Loading, errors and refresh', () {
    testWidgets('a screen shows a skeleton while its data is on the way', (tester) async {
      await pumpApp(
        tester,
        transport: MockTransport(bundle: FileAssetBundle(), latency: const Duration(seconds: 1)),
      );

      expect(find.text('National Development'), findsOneWidget); // the page frame is already there
      expect(find.byType(SkeletonBox), findsWidgets);
      expect(find.text('Development Index'), findsNothing);

      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.byType(SkeletonBox), findsNothing);
      expect(find.text('Development Index'), findsOneWidget);
    });

    testWidgets('a failed request shows an error with Retry, and Retry loads the data', (tester) async {
      final transport = _Counting()..overviewFailures = 1;
      await pumpApp(tester, transport: transport);

      expect(find.text('We couldn’t load this data'), findsOneWidget);
      expect(find.text('Development Index'), findsNothing);
      // The tabs and the title stay, so the user can go elsewhere.
      expect(find.text('National Development'), findsOneWidget);

      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(find.text('We couldn’t load this data'), findsNothing);
      expect(find.text('Development Index'), findsOneWidget);
      expect(transport.gets['/overview'], 2);
    });

    testWidgets('pulling down refreshes the screen', (tester) async {
      final transport = _Counting();
      await pumpApp(tester, transport: transport);
      expect(transport.gets['/overview'], 1);

      await tester.fling(find.byType(ListView).first, const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      expect(transport.gets['/overview'], 2);
      expect(find.text('Development Index'), findsOneWidget);
    });
  });
}
