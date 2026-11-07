import 'package:decidix_app/core/routing/app_router.dart';
import 'package:decidix_app/shared/widgets/decidix_bottom_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Android System Back Navigation UX', () {
    testWidgets('Case B: Secondary tab root (Insights) -> system Back switches to Overview', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      // Verify started on Overview
      expect(find.text('National Development'), findsOneWidget);

      // Tap Insights tab
      await tester.tap(find.text('Insights'));
      await tester.pumpAndSettle();

      final router = ProviderScope.containerOf(
        tester.element(find.text('Insights')),
      ).read(appRouterProvider);
      expect(router.state.uri.path, startsWith('/insights'));

      // Check AppShell PopScope
      final PopScope popScope = tester.widget(find.byKey(const ValueKey('app_shell_pop_scope')));
      expect(popScope.canPop, isFalse); // Must NOT exit app directly

      // Simulate Android System Back press via Flutter engine binding
      final handled = await tester.binding.handlePopRoute();
      expect(handled, isTrue); // Intercepted, did not exit
      await tester.pumpAndSettle();

      // Must be back on Overview Dashboard!
      expect(router.state.uri.path, '/overview/dashboard');
      expect(find.text('National Development'), findsOneWidget);
    });

    testWidgets('Case B: Secondary tab root (Decisions) -> system Back switches to Overview', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      // Tap Decisions tab
      await tester.tap(find.text('Decisions'));
      await tester.pumpAndSettle();

      final router = ProviderScope.containerOf(
        tester.element(find.text('Decisions')),
      ).read(appRouterProvider);
      expect(router.state.uri.path, startsWith('/decisions'));

      final PopScope popScope = tester.widget(find.byKey(const ValueKey('app_shell_pop_scope')));
      expect(popScope.canPop, isFalse);

      final handled = await tester.binding.handlePopRoute();
      expect(handled, isTrue);
      await tester.pumpAndSettle();

      expect(router.state.uri.path, '/overview/dashboard');
    });

    testWidgets('Case C: Overview root allows application exit (canPop is true)', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      final PopScope popScope = tester.widget(find.byKey(const ValueKey('app_shell_pop_scope')));
      // At overview root with nothing in navigation stack, canPop must be true
      expect(popScope.canPop, isTrue);

      final handled = await tester.binding.handlePopRoute();
      // On Android, when canPop is true, handlePopRoute returns false so OS handles exit
      expect(handled, isFalse);
    });

    testWidgets('Case A: Pushed nested screen -> system Back pops nested route first', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      final BuildContext context = tester.element(find.byType(DecidixBottomNavigation));
      final router = ProviderScope.containerOf(context).read(appRouterProvider);

      // Push a nested route on top of the navigation stack
      router.push('/datasets/upload');
      await tester.pumpAndSettle();

      expect(router.state.uri.path, '/datasets/upload');

      // On a nested pushed screen, canPop on PopScope must be false
      final PopScope popScope = tester.widget(find.byKey(const ValueKey('app_shell_pop_scope')));
      expect(popScope.canPop, isFalse);

      // Trigger Android system back
      final handled = await tester.binding.handlePopRoute();
      expect(handled, isTrue);
      await tester.pumpAndSettle();

      // Must pop back to Overview Dashboard
      expect(router.state.uri.path, '/overview/dashboard');
      expect(find.text('National Development'), findsOneWidget);
    });

    testWidgets('Nested route inside a secondary tab -> Back pops nested route first, then switches to Overview', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      // Navigate to Insights
      await tester.tap(find.text('Insights'));
      await tester.pumpAndSettle();

      final BuildContext context = tester.element(find.byType(DecidixBottomNavigation));
      final router = ProviderScope.containerOf(context).read(appRouterProvider);
      expect(router.state.uri.path, startsWith('/insights'));

      // Push nested route on top of Insights tab
      router.push('/datasets/upload');
      await tester.pumpAndSettle();
      expect(router.state.uri.path, '/datasets/upload');

      // First Back press: pops nested route, stays on Insights!
      final handled1 = await tester.binding.handlePopRoute();
      expect(handled1, isTrue);
      await tester.pumpAndSettle();
      expect(router.state.uri.path, startsWith('/insights'));

      // Second Back press: switches from Insights to Overview!
      final handled2 = await tester.binding.handlePopRoute();
      expect(handled2, isTrue);
      await tester.pumpAndSettle();
      expect(router.state.uri.path, '/overview/dashboard');
    });

    testWidgets('Multiple Back presses at Overview root do not trigger duplicate navigation', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.pumpAndSettle();

      final BuildContext context = tester.element(find.byType(DecidixBottomNavigation));
      final router = ProviderScope.containerOf(context).read(appRouterProvider);

      // Multiple back attempts at root
      final handled1 = await tester.binding.handlePopRoute();
      expect(handled1, isFalse);
      expect(router.state.uri.path, '/overview/dashboard');

      final handled2 = await tester.binding.handlePopRoute();
      expect(handled2, isFalse);
      expect(router.state.uri.path, '/overview/dashboard');
    });
  });
}
