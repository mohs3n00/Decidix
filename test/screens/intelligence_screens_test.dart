import 'package:decidix_app/api/transport/api_transport.dart';
import 'package:decidix_app/core/errors/app_exception.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../helpers/pump_app.dart';

/// The mock, except that every POST fails like a server that is down.
class _PostFails extends TestTransport {
  _PostFails();

  @override
  Future<ApiEnvelope> post(String path, {Object? body, CancelToken? cancelToken}) {
    return Future.error(const NetworkException());
  }
}

/// The mock, remembering the query of every GET.
class _Recording extends TestTransport {
  _Recording();

  final Map<String, Map<String, dynamic>?> queries = {};

  @override
  Future<ApiEnvelope> get(String path, {Map<String, dynamic>? query, CancelToken? cancelToken}) {
    queries[path] = query;
    return super.get(path, query: query, cancelToken: cancelToken);
  }
}

Future<void> openIntelligence(WidgetTester tester, {ApiTransport? transport}) async {
  await pumpApp(tester, transport: transport);
  await tester.tap(find.text('Intelligence'));
  await tester.pumpAndSettle();
}

void main() {
  group('Predictions', () {
    testWidgets('shows the projected index, forecast, models and top improvers', (tester) async {
      await openIntelligence(tester);

      expect(find.text('ML Predictions'), findsOneWidget);
      expect(find.text('Projected index · 2028'), findsOneWidget);
      expect(find.text('73.5'), findsOneWidget);
      expect(find.text('87% confidence'), findsOneWidget);
      expect(find.text("'25"), findsOneWidget);
      expect(find.text("'28"), findsOneWidget);
      expect(find.text('Shaded area marks the forecast interval.'), findsOneWidget);

      await scrollTo(tester, find.text('Model performance'));
      expect(find.text('Gradient boosting'), findsOneWidget);
      expect(find.text('R² 0.91'), findsOneWidget);

      await scrollTo(tester, find.text('Regions most likely to improve'));
      expect(find.text('+8.4 by 2028'), findsOneWidget);
    });

    testWidgets('the year chips ask the server for that year', (tester) async {
      final transport = _Recording();
      await pumpApp(tester, transport: transport);
      await tester.tap(find.text('Intelligence'));
      await tester.pumpAndSettle();

      await tapChip(tester, '2030');
      expect(transport.queries['/intelligence/predictions'], {'target_year': 2030});
    });
  });

  group('Assistant', () {
    Future<void> openAssistant(WidgetTester tester, {ApiTransport? transport}) async {
      await openIntelligence(tester, transport: transport);
      await tapChip(tester, 'Assistant');
    }

    testWidgets('starts with a greeting and three suggested questions', (tester) async {
      await openAssistant(tester);

      expect(find.text('AI Assistant'), findsOneWidget);
      expect(find.textContaining('Hi, I am Decidix AI'), findsOneWidget);
      expect(find.text('Which region needs help most?'), findsOneWidget);
      expect(find.text('Ask Decidix AI'), findsOneWidget);

      // The other two sit past the right edge of the scrolling row.
      final prompts = find.byWidgetPredicate(
        (w) => w is ListView && w.scrollDirection == Axis.horizontal,
      );
      await tester.drag(prompts, const Offset(-900, 0));
      await tester.pumpAndSettle();
      expect(find.text('Why did Delta decline?'), findsOneWidget);
      expect(find.text('Summarise education trends'), findsOneWidget);
    });

    testWidgets('a suggested question gets an answer with a table and a source', (tester) async {
      await openAssistant(tester);
      await tester.tap(find.text('Which region needs help most?'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Frontier needs help most'), findsOneWidget);
      expect(find.text('Steppe'), findsOneWidget); // a row of the answer table
      expect(find.text('Source: Ministry of Health registry · 2025 Q4'), findsOneWidget);
      // The server's follow-up questions replace the starting ones.
      expect(find.text('Compare Delta and Lakeside'), findsOneWidget);
    });

    testWidgets('typing a question and pressing send shows it and clears the box', (tester) async {
      await openAssistant(tester);

      await tester.enterText(find.byType(TextField), 'Tell me about regional healthcare priorities');
      await tester.tap(find.byIcon(Icons.arrow_upward));
      await tester.pumpAndSettle();

      expect(find.text('Tell me about regional healthcare priorities'), findsOneWidget);
      expect(find.textContaining('Frontier needs help most'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
    });

    testWidgets('an empty question is not sent', (tester) async {
      await openAssistant(tester);

      await tester.enterText(find.byType(TextField), '   ');
      await tester.tap(find.byIcon(Icons.arrow_upward));
      await tester.pumpAndSettle();

      expect(find.textContaining('Frontier needs help most'), findsNothing);
    });

    testWidgets('the conversation is still there after visiting another tab', (tester) async {
      await openAssistant(tester);
      await tester.tap(find.text('Which region needs help most?'));
      await tester.pumpAndSettle();

      // The chat has scrolled to the newest message; scroll back up to the tabs.
      await tester.drag(find.byType(ListView).first, const Offset(0, 2000));
      await tester.pumpAndSettle();
      await tapChip(tester, 'Predictions');
      await tapChip(tester, 'Assistant');

      expect(find.textContaining('Frontier needs help most'), findsOneWidget);
    });

    testWidgets('a failed answer shows an error bubble', (tester) async {
      await openAssistant(
        tester,
        transport: _PostFails(),
      );
      await tester.tap(find.text('Which region needs help most?'));
      await tester.pumpAndSettle();

      expect(find.text('I could not answer that. Please try again.'), findsOneWidget);
    });
  });

  group('Recommendations', () {
    Future<void> openRecommendations(WidgetTester tester, {ApiTransport? transport}) async {
      await openIntelligence(tester, transport: transport);
      await tapChip(tester, 'Recommendations');
    }

    testWidgets('lists the suggestions with impact, cost and confidence', (tester) async {
      await openRecommendations(tester);

      expect(find.text('AI Recommendations'), findsOneWidget);
      expect(find.text('Mobile clinic network for Frontier'), findsOneWidget);
      expect(find.text('+4.2'), findsOneWidget);
      expect(find.text('\$18M'), findsOneWidget);
      expect(find.text('Add to plan'), findsWidgets);
    });

    testWidgets('Add to plan removes the card and confirms', (tester) async {
      await openRecommendations(tester);
      await tester.tap(find.text('Add to plan').first);
      await tester.pumpAndSettle();

      expect(find.text('Mobile clinic network for Frontier'), findsNothing);
      expect(find.text('Added to plan'), findsOneWidget);
      expect(find.text('Rail link: Delta – Harbor Lowlands'), findsOneWidget);
    });

    testWidgets('Dismiss removes the card and confirms', (tester) async {
      await openRecommendations(tester);
      await tester.tap(find.bySemanticsLabel('Dismiss').first);
      await tester.pumpAndSettle();

      expect(find.text('Mobile clinic network for Frontier'), findsNothing);
      expect(find.text('Recommendation dismissed'), findsOneWidget);
    });

    testWidgets('if the server refuses, the card comes back and the user is told', (tester) async {
      await openRecommendations(
        tester,
        transport: _PostFails(),
      );
      await tester.tap(find.text('Add to plan').first);
      await tester.pumpAndSettle();

      expect(find.text('Mobile clinic network for Frontier'), findsOneWidget);
      expect(find.text('That did not work. Please try again.'), findsOneWidget);
    });
  });
}
