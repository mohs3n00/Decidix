import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Overview Screens
import '../../features/overview/presentation/screens/dashboard_screen.dart';
import '../../features/overview/presentation/screens/interactive_map_screen.dart';
import '../../features/overview/presentation/screens/regions_screen.dart';
import '../../features/overview/presentation/screens/region_profile_screen.dart';

// Insights Screens
import '../../features/insights/presentation/screens/sector_screen.dart';
import '../../api/models/common.dart' show Domain;
import '../../features/insights/presentation/screens/region_comparison_screen.dart';
import '../../features/insights/presentation/screens/historical_analysis_screen.dart';
import '../../features/insights/presentation/screens/development_priority_screen.dart';
import '../../features/insights/presentation/screens/data_quality_screen.dart';

// Intelligence Screens
import '../../features/intelligence/presentation/screens/predictions_screen.dart';
import '../../features/intelligence/presentation/screens/assistant_screen.dart';
import '../../features/intelligence/presentation/screens/recommendations_screen.dart';

// Decisions Screens
import '../../features/decisions/presentation/screens/simulator_screen.dart';
import '../../features/decisions/presentation/screens/development_projects_screen.dart';
import '../../features/decisions/presentation/screens/citizen_reports_screen.dart';

import 'app_shell.dart';
import 'not_found_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final rootNavigatorKey = GlobalKey<NavigatorState>();
  final shellNavigatorKey = GlobalKey<NavigatorState>();

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/overview/dashboard',
    errorBuilder: (context, state) => const NotFoundScreen(),
    routes: [
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) {
          return AppShell(
            location: state.uri.path,
            child: child,
          );
        },
        routes: [
          // 1. Overview
          GoRoute(
            path: '/overview/dashboard',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DashboardScreen(),
            ),
          ),
          GoRoute(
            path: '/overview/map',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: InteractiveMapScreen(),
            ),
          ),
          GoRoute(
            path: '/overview/regions',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: RegionsScreen(),
            ),
          ),
          GoRoute(
            path: '/overview/regions/:id',
            pageBuilder: (context, state) => NoTransitionPage(
              child: RegionProfileScreen(
                regionId: state.pathParameters['id']!,
              ),
            ),
          ),

          // 2. Insights
          GoRoute(
            path: '/insights',
            redirect: (_, _) => '/insights/education',
          ),
          GoRoute(
            path: '/insights/education',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SectorScreen(sector: Domain.education),
            ),
          ),
          GoRoute(
            path: '/insights/healthcare',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SectorScreen(sector: Domain.healthcare),
            ),
          ),
          GoRoute(
            path: '/insights/economy',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SectorScreen(sector: Domain.economy),
            ),
          ),
          GoRoute(
            path: '/insights/infrastructure',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SectorScreen(sector: Domain.infrastructure),
            ),
          ),
          GoRoute(
            path: '/insights/comparison',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: RegionComparisonScreen(),
            ),
          ),
          GoRoute(
            path: '/insights/history',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HistoricalAnalysisScreen(),
            ),
          ),
          GoRoute(
            path: '/insights/priority',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DevelopmentPriorityScreen(),
            ),
          ),
          GoRoute(
            path: '/insights/data-quality',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DataQualityScreen(),
            ),
          ),

          // 3. Intelligence
          GoRoute(
            path: '/intelligence',
            redirect: (_, _) => '/intelligence/predictions',
          ),
          GoRoute(
            path: '/intelligence/predictions',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: PredictionsScreen(),
            ),
          ),
          GoRoute(
            path: '/intelligence/assistant',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: AssistantScreen(),
            ),
          ),
          GoRoute(
            path: '/intelligence/recommendations',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: RecommendationsScreen(),
            ),
          ),

          // 4. Decisions
          GoRoute(
            path: '/decisions',
            redirect: (_, _) => '/decisions/simulator',
          ),
          GoRoute(
            path: '/decisions/simulator',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SimulatorScreen(),
            ),
          ),
          GoRoute(
            path: '/decisions/projects',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DevelopmentProjectsScreen(),
            ),
          ),
          GoRoute(
            path: '/decisions/reports',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CitizenReportsScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});
