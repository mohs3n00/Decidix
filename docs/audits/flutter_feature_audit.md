# Decidix Flutter Feature Audit & Inventory

## 1. Executive Summary

This document provides a comprehensive inventory of every screen, widget, interaction, user flow, and data contract in the Decidix Flutter application. 

The application is built using **Flutter 3.47.6 / Dart 3.13.5** with **Riverpod 3.4.3**, **go_router 18.0.2**, **Dio 5.11.1**, and **flutter_map 8.3.2**. It contains 18 primary screens organized across 4 top-level modules plus shell/cross-cutting utilities.

---

## 2. Comprehensive Feature Inventory

### Module 1: Overview

#### 1.1 National Development Dashboard
- **Screen:** `DashboardScreen` ([`lib/features/overview/presentation/screens/dashboard_screen.dart`](file:///e:/decidix_app/lib/features/overview/presentation/screens/dashboard_screen.dart))
- **Description:** Executive landing screen displaying national development composite index score, 4 key pillar KPIs (Education, Healthcare, Unemployment, Infrastructure) with sparklines, historical trend curve, regions needing urgent attention, and executive AI summary insight.
- **User Actions:**
  - Pull-to-refresh (`onRefresh`).
  - Switch national trend historical range (3Y, 5Y, 7Y) via `TrendCard` chip toggle.
  - Tap "See all" on Needs Attention section to navigate to `/overview/regions` with `priority=high` filter preselected.
  - Tap any region row in Needs Attention list to navigate to `/overview/regions/:id`.
  - Tap retry button on error state (`ref.invalidate(overviewProvider)`).
- **Input Data:** Query parameter `range=3Y|5Y|7Y` (default: `7Y`).
- **Output Data:** `OverviewData` object containing `as_of`, `index` (score, max_score, change, compared_with, band, regions_count, population, at_risk_count), `kpis` (4 metrics with sparklines), `trend` (points for selected range), `needs_attention` (top 3 at-risk regions), `ai_insight` (`text`, `arabic_text`).
- **Current Data Source:** API via `OverviewApi.getOverview()` (`MockTransport` / `DioTransport`).
- **State Management:** `overviewProvider` (`FutureProvider`), `selectedTrendRangeProvider` (`NotifierProvider<SelectedTrendRange, String>`).
- **Current Status:** **Complete** (UI, models, error handling, retry, pull-to-refresh, navigation all functional).
- **Backend Required:** Yes (`GET /v1/overview?range=3Y|5Y|7Y`).
- **Dependencies:** PostgreSQL (`national_index_history`, `regions`, `regional_metrics`, `indicators`).

#### 1.2 Interactive Regional Map
- **Screen:** `InteractiveMapScreen` ([`lib/features/overview/presentation/screens/interactive_map_screen.dart`](file:///e:/decidix_app/lib/features/overview/presentation/screens/interactive_map_screen.dart))
- **Description:** Geospatial interactive map displaying regional development pins across geographic coordinates (WGS84 lat/long) with color-coded score status badges and selected region summary card.
- **User Actions:**
  - Filter pins by sector chip: `overall`, `education`, `healthcare`, `economy`, `infrastructure`.
  - Pan and zoom on the map (`flutter_map`).
  - Tap any map pin to select region and update `SelectedRegionCard`.
  - Tap "View Profile" / arrow button on `SelectedRegionCard` to navigate to `/overview/regions/:id`.
  - Pull-to-refresh map data.
- **Input Data:** Query parameter `sector=overall|education|healthcare|economy|infrastructure`.
- **Output Data:** Array of `MapPoint` objects (`id`, `name`, `arabic_name`, `score`, `priority`, `population`, `latitude`, `longitude`).
- **Current Data Source:** API via `OverviewApi.getMapPoints()` (`MockTransport` / `DioTransport`).
- **State Management:** `mapPointsProvider` (`FutureProvider`), `mapSectorProvider` (`NotifierProvider`), `selectedMapRegionProvider` (`NotifierProvider`).
- **Current Status:** **Complete** (Map pin clustering, selection synchronization, tile caching supported).
- **Backend Required:** Yes (`GET /v1/regions/map-points?sector=...`).
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`).

#### 1.3 Regions Directory
- **Screen:** `RegionsScreen` ([`lib/features/overview/presentation/screens/regions_screen.dart`](file:///e:/decidix_app/lib/features/overview/presentation/screens/regions_screen.dart))
- **Description:** Filterable, searchable, paginated directory of all 12 national development regions showing rank, score, direction/change delta, priority level, and population.
- **User Actions:**
  - Search input with 300ms debounce across English and Arabic names (`SearchField`).
  - Filter by priority chip: `All`, `High`, `Medium`, `Low`.
  - Infinite scroll / pagination: loads more pages when scrolling near list end (`onLoadMore`).
  - Tap any region row to open `/overview/regions/:id`.
  - Pull-to-refresh (`refreshNotifier(ref, regionsProvider)`).
- **Input Data:** `q` (search string), `priority` (`all|high|medium|low`), `page` (int), `per_page` (int).
- **Output Data:** `PagedState<RegionListItem>` (`data: List<RegionListItem>`, `meta: PageMeta(page, per_page, total)`).
- **Current Data Source:** API via `OverviewApi.getRegions()`.
- **State Management:** `regionsProvider` (`AsyncNotifier<PagedState<RegionListItem>>`), `regionsFilterProvider` (`NotifierProvider<RegionsFilterNotifier, RegionsFilter>`).
- **Current Status:** **Complete** (Generation tracking prevents stale responses when rapidly filtering).
- **Backend Required:** Yes (`GET /v1/regions?q=&priority=&page=&per_page=`).
- **Dependencies:** PostgreSQL (`regions`).

#### 1.4 Region Profile
- **Screen:** `RegionProfileScreen` ([`lib/features/overview/presentation/screens/region_profile_screen.dart`](file:///e:/decidix_app/lib/features/overview/presentation/screens/region_profile_screen.dart))
- **Description:** Deep-dive regional profile presenting regional hero card (rank, score, area, population), 4 domain performance progress bars, multi-year historical comparison curve against the national average, AI strategic recommendation panel, and data quality provenance footer.
- **User Actions:**
  - View multi-year dual-line chart (region vs. national trend).
  - Inspect sector scores (Education, Healthcare, Economy, Infrastructure).
  - Tap back button on top navigation bar to return to originating screen.
  - Pull-to-refresh profile data.
- **Input Data:** Path parameter `regionId` (slug).
- **Output Data:** `RegionProfile` (`id`, `name`, `arabic_name`, `rank`, `rank_total`, `score`, `change`, `priority`, `population`, `area_km2`, `domains: List<DomainScore>`, `history: { region: List<TrendPoint>, national: List<TrendPoint> }`, `ai_insight`, `data_quality_score`, `data_quality_updated_at`).
- **Current Data Source:** API via `OverviewApi.getRegionProfile(regionId)`.
- **State Management:** `regionProfileProvider(id)` (`FutureProvider.family`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/regions/:id`).
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`, `national_index_history`, `dataset_metadata`).

---

### Module 2: Insights

#### 2.1 Sector Analytics (Education, Healthcare, Economy, Infrastructure)
- **Screen:** `SectorScreen` ([`lib/features/insights/presentation/screens/sector_screen.dart`](file:///e:/decidix_app/lib/features/insights/presentation/screens/sector_screen.dart))
- **Description:** Unified analytics template powering all 4 development pillars. Shows domain composite index score and annual delta, 4 sector-specific KPI cards, multi-year index trend line, sub-domain horizontal bar breakdown, detailed key indicators with progress bars, regional rankings (top 5 and bottom 5 with toggle), and AI sector insights.
- **User Actions:**
  - Switch sector via `InsightsChipBar` (Education, Healthcare, Economy, Infrastructure).
  - Toggle ranking view between "Top 5" and "Bottom 5" improvers (`RegionalRanking`).
  - Tap ranked region to inspect regional details.
  - Pull-to-refresh sector analytics.
- **Input Data:** Sector path (`Domain.education`, `Domain.healthcare`, `Domain.economy`, `Domain.infrastructure`).
- **Output Data:** `SectorInsights` (`sector`, `index: { score, change }`, `kpis: List<Metric>`, `trend: List<TrendPoint>`, `breakdown: { title, arabic_title, unit, bars: List<ChartBar> }`, `indicators: List<Indicator>`, `ranking: { top: List<RankedRegion>, bottom: List<RankedRegion> }`, `ai_insight: LocalizedText`).
- **Current Data Source:** API via `InsightsApi.getSector(domain)`.
- **State Management:** `sectorProvider(domain)` (`FutureProvider.family`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/insights/:sector`).
- **Dependencies:** PostgreSQL (`indicators`, `regional_metrics`, `sector_breakdowns`, `regions`).

#### 2.2 Regional Comparison
- **Screen:** `RegionComparisonScreen` ([`lib/features/insights/presentation/screens/region_comparison_screen.dart`](file:///e:/decidix_app/lib/features/insights/presentation/screens/region_comparison_screen.dart))
- **Description:** Side-by-side comparative analysis of any two national regions. Features region pickers A and B, score rings, 5 comparative domain metrics (Overall, Education, Healthcare, Economy, Infrastructure) with visual comparison bars, and automated gap analysis.
- **User Actions:**
  - Tap Region A selector to open `RegionPicker` modal bottom sheet.
  - Tap Region B selector to open `RegionPicker` modal bottom sheet.
  - Search regions inside picker dialog.
  - Compare metrics with color-coded comparison bars (Blue for A, Navy for B).
  - Pull-to-refresh comparison data.
- **Input Data:** Query parameters `a={regionA_id}&b={regionB_id}`.
- **Output Data:** `RegionComparison` (`a: ComparedRegion`, `b: ComparedRegion`, `metrics: List<ComparisonMetric(key, label, arabic_label, score_a, score_b)>`, `gap_analysis: LocalizedText`).
- **Current Data Source:** API via `InsightsApi.getComparison(a, b)`.
- **State Management:** `comparisonProvider` (`FutureProvider`), `comparisonChoiceProvider` (`NotifierProvider<ComparisonChoiceNotifier, ComparisonChoice>`), `allRegionsProvider` (`FutureProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/insights/comparison?a=...&b=...`).
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`).

#### 2.3 Historical Analysis
- **Screen:** `HistoricalAnalysisScreen` ([`lib/features/insights/presentation/screens/historical_analysis_screen.dart`](file:///e:/decidix_app/lib/features/insights/presentation/screens/historical_analysis_screen.dart))
- **Description:** Longitudinal retrospective analysis of national performance over 7 years. Includes sector selector chip bar, full historical trend curve, annual delta bar chart highlighting the latest period, and key historical policy milestones.
- **User Actions:**
  - Select historical sector: `overall`, `education`, `healthcare`, `economy`.
  - View annual change bar chart with positive/negative delta highlights.
  - Inspect policy milestones timeline.
  - Pull-to-refresh historical data.
- **Input Data:** Query parameters `sector=...`, `range=...`.
- **Output Data:** `HistoricalData` (`range`, `points: List<TrendPoint>`, `annual_change: List<TrendPoint>`, `milestones: List<Milestone(year, text, arabic_text)>`).
- **Current Data Source:** API via `InsightsApi.getHistorical()`.
- **State Management:** `historicalProvider` (`FutureProvider`), `historicalSectorProvider` (`NotifierProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/insights/historical?sector=...&range=...`).
- **Dependencies:** PostgreSQL (`national_index_history`, `regional_metrics`).

#### 2.4 Development Priority Queue
- **Screen:** `DevelopmentPriorityScreen` ([`lib/features/insights/presentation/screens/development_priority_screen.dart`](file:///e:/decidix_app/lib/features/insights/presentation/screens/development_priority_screen.dart))
- **Description:** Strategic prioritization dashboard categorizing regions by intervention urgency. Displays summary count tiles for High, Medium, and Low priority groups, followed by an ordered priority queue ranked by need score with identification of the primary bottleneck domain.
- **User Actions:**
  - Tap any region card in priority queue to navigate to `/overview/regions/:id`.
  - Pull-to-refresh priority data.
- **Input Data:** Query parameter `limit` (optional integer).
- **Output Data:** `PriorityOverview` (`summary: { high: int, medium: int, low: int }`, `queue: List<PriorityEntry(rank, region_id, name, arabic_name, priority, need_score, weakest_domain: DomainScore)>`).
- **Current Data Source:** API via `InsightsApi.getPriority()`.
- **State Management:** `priorityProvider` (`FutureProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/insights/priority?limit=...`).
- **Dependencies:** PostgreSQL (`regions`, `regional_metrics`).

#### 2.5 Data Quality & Governance
- **Screen:** `DataQualityScreen` ([`lib/features/insights/presentation/screens/data_quality_screen.dart`](file:///e:/decidix_app/lib/features/insights/presentation/screens/data_quality_screen.dart))
- **Description:** Transparency and data provenance report. Shows overall data quality score ring, quality confidence band (e.g., "High confidence"), completeness/timeliness/accuracy percentage tiles, national geographic coverage indicators, and authoritative data source audit table with sync age.
- **User Actions:**
  - Pull-to-refresh data quality report.
  - Inspect sync latency and update cadence per source.
- **Input Data:** None.
- **Output Data:** `DataQuality` (`score: double`, `completeness: double`, `timeliness: double`, `accuracy: double`, `coverage: String`, `sources: List<DataSource(name, arabic_name, frequency, status, age_days)>`).
- **Current Data Source:** API via `InsightsApi.getDataQuality()`.
- **State Management:** `dataQualityProvider` (`FutureProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/insights/data-quality`).
- **Dependencies:** PostgreSQL (`dataset_metadata`).

---

### Module 3: Intelligence

#### 3.1 ML Predictions & Forecasting
- **Screen:** `PredictionsScreen` ([`lib/features/intelligence/presentation/screens/predictions_screen.dart`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/predictions_screen.dart))
- **Description:** Predictive intelligence dashboard forecasting the national development index through 2030. Combines verified historical actuals with ML forecasts, shaded uncertainty confidence bands, model evaluation performance metrics ($R^2$ scores for Gradient Boosting, Random Forest, Temporal Ensemble), and anticipated top regional improvers.
- **User Actions:**
  - Select forecast target year (2027, 2028, 2030) via horizontal chip row.
  - View forecast value and confidence percentage.
  - Inspect individual model validation metrics.
  - Inspect top projected improvers and deltas.
  - Pull-to-refresh forecasts.
- **Input Data:** Query parameter `target_year=2027|2028|2030`.
- **Output Data:** `Predictions` (`target_year: int`, `available_years: List<int>`, `projected_index: double`, `confidence: double`, `series: List<ForecastPoint(year, value, kind, lower, upper)>`, `models: List<ModelScore(id, name, arabic_name, r2)>`, `top_improvers: List<RegionDelta(region_id, name, arabic_name, delta)>`).
- **Current Data Source:** API via `IntelligenceApi.getPredictions(targetYear)`.
- **State Management:** `predictionsProvider` (`FutureProvider`), `predictionYearProvider` (`NotifierProvider<PredictionYearNotifier, int?>`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/intelligence/predictions?target_year=...`).
- **Dependencies:** Python ML inference model (`ml/inference/predict.py`), PostgreSQL (`regional_metrics`).

#### 3.2 AI Decision Assistant
- **Screen:** `AssistantScreen` ([`lib/features/intelligence/presentation/screens/assistant_screen.dart`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/assistant_screen.dart))
- **Description:** Bilingual conversational AI interface grounded in national development intelligence. Features greeting, interactive chat bubbles, typing indicators, suggested prompt chips, structured table rendering within replies, and source attribution badges.
- **User Actions:**
  - Type custom question in text input bar and tap Send.
  - Tap pre-populated prompt chips ("Compare Delta and Lakeside", "Why did Delta decline?", etc.) to send instantly.
  - Auto-scrolls to latest message upon receiving responses.
  - Supports conversation continuity across multiple turns via `conversation_id`.
- **Input Data:** `message: String`, `language: 'en' | 'ar'`, `conversation_id: String?`.
- **Output Data:** `ChatReply` (`conversation_id: String`, `text: String`, `table: List<ChatRow>?`, `sources: List<ChatSource(name, period)>`, `suggested_prompts: List<String>`).
- **Current Data Source:** API via `IntelligenceApi.sendMessage()`.
- **State Management:** `assistantControllerProvider` (`NotifierProvider<AssistantController, AssistantState>`). Maintains full message history across tab switches.
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`POST /v1/intelligence/assistant/chat`).
- **Dependencies:** Grounded RAG knowledge retriever, OpenRouter API gateway.

#### 3.3 AI Recommendations
- **Screen:** `RecommendationsScreen` ([`lib/features/intelligence/presentation/screens/recommendations_screen.dart`](file:///e:/decidix_app/lib/features/intelligence/presentation/screens/recommendations_screen.dart))
- **Description:** Prescriptive policy recommendations generated from regional data gaps. Each recommendation details target region, domain, policy intervention title, strategic rationale, expected index point impact, estimated package cost, and model confidence score.
- **User Actions:**
  - Tap "Add to Plan" button: optimistic removal from list, sets status to `in_plan`, displays confirmation snackbar. Rolls back on error.
  - Tap "Dismiss" (✕) button: optimistic removal, sets status to `dismissed`, displays confirmation snackbar.
  - Pull-to-refresh recommendations.
- **Input Data:** Filter query `priority` (optional). Action parameters `id: String`.
- **Output Data:** `List<Recommendation>` (`id`, `priority`, `region: RegionRef`, `domain`, `title`, `arabic_title`, `summary`, `arabic_summary`, `index_impact`, `estimated_cost: Money`, `confidence`, `status`).
- **Current Data Source:** API via `IntelligenceApi.getRecommendations()`, `acceptRecommendation()`, `dismissRecommendation()`.
- **State Management:** `recommendationsProvider` (`AsyncNotifier<List<Recommendation>>`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/intelligence/recommendations`, `POST /v1/intelligence/recommendations/:id/accept`, `POST /v1/intelligence/recommendations/:id/dismiss`).
- **Dependencies:** PostgreSQL (`ai_recommendations`, `regions`).

---

### Module 4: Decisions

#### 4.1 What-If Budget Simulator
- **Screen:** `SimulatorScreen` ([`lib/features/decisions/presentation/screens/simulator_screen.dart`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/simulator_screen.dart))
- **Description:** Real-time policy decision sandbox. Planners select a target region and adjust budget allocation sliders across Education, Healthcare, Infrastructure, and Economy ($0 to $50M per pillar). Displays starting baseline score, forecasted post-investment score, total composite gain, package expenditure, lever yield efficiency, and AI advisory note.
- **User Actions:**
  - Tap Region picker to choose target region (`showRegionPicker`).
  - Slide allocation sliders for Education, Healthcare, Infrastructure, Economy.
  - Real-time debounced calculation (300ms) with request cancellation for obsolete in-flight queries.
  - Tap "Reset" button to revert allocations to baseline defaults.
  - Tap "Save scenario" button (stores local scenario).
- **Input Data:** Body `{ region_id: String, allocations: { education: double, healthcare: double, infrastructure: double, economy: double } }`.
- **Output Data:** `SimulationResult` (`region_id`, `horizon_months`, `today_score`, `projected_score`, `gain`, `total_package: Money`, `levers: List<SimulationLever(domain, amount, gain, yield_per_million)>`, `best_lever: Domain`, `best_yield_per_million: double`, `note: LocalizedText`).
- **Current Data Source:** API via `DecisionsApi.simulate()`.
- **State Management:** `simulatorControllerProvider` (`AsyncNotifier<SimulatorState>`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`POST /v1/decisions/simulate`).
- **Dependencies:** Simulation engine, PostgreSQL (`regions`, `regional_metrics`).

#### 4.2 Development Projects Portfolio
- **Screen:** `DevelopmentProjectsScreen` ([`lib/features/decisions/presentation/screens/development_projects_screen.dart`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/development_projects_screen.dart))
- **Description:** National infrastructure and strategic investment portfolio tracker. Features portfolio summary statistics (Active project count, Total budget committed in USD, Delayed project count), status filter tabs, and paginated project cards showing progress percentage, budget, region, due date, or completion date.
- **User Actions:**
  - Filter projects by status: `All`, `In Progress`, `Planned`, `Delayed`, `Completed`.
  - Infinite scroll / pagination (`onLoadMore`).
  - Tap project card to view milestones.
  - Pull-to-refresh projects list.
- **Input Data:** Query parameters `status=all|in_progress|planned|delayed|completed`, `page=int`, `per_page=int`.
- **Output Data:** `ProjectsData` (`projects_count: int`, `total_budget: Money`, `delayed_count: int`, `items: List<Project(id, title, arabic_title, region, status, progress, budget, due_date, completed_at)>`, `meta: PageMeta`).
- **Current Data Source:** API via `DecisionsApi.getProjects()`.
- **State Management:** `projectsProvider` (`AsyncNotifier<PagedState<ProjectsData>>`), `projectStatusFilterProvider` (`NotifierProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/decisions/projects?status=...&page=...&per_page=...`).
- **Dependencies:** PostgreSQL (`development_projects`, `regions`).

#### 4.3 Citizen Reports
- **Screen:** `CitizenReportsScreen` ([`lib/features/decisions/presentation/screens/citizen_reports_screen.dart`](file:///e:/decidix_app/lib/features/decisions/presentation/screens/citizen_reports_screen.dart))
- **Description:** Crowdsourced civic intelligence and citizen feedback feed. Displays community incident reports categorized by sector (Roads, Health, Schools, Water) with priority badges, status (Under Review, Escalated, Resolved), relative creation time, affected region, and interactive like counts. Top header includes open reports count and resolved rate percentage.
- **User Actions:**
  - Filter reports by category chip: `All`, `Roads`, `Health`, `Schools`, `Water`.
  - Like / unlike a report: optimistic UI counter increment/decrement with toggle state, synchronized to backend. Rolls back if request fails.
  - Infinite scroll / pagination (`onLoadMore`).
  - Pull-to-refresh reports feed.
- **Input Data:** Query parameters `category=all|roads|health|schools|water`, `status=...`, `page=int`, `per_page=int`. POST path parameter `id: String` for like toggle.
- **Output Data:** `ReportsData` (`open_this_week: ReportStat`, `resolved_rate: ReportStat`, `items: List<CitizenReport(id, category, title, arabic_title, region, created_at, likes, liked_by_me, priority, status)>`, `meta: PageMeta`). Like response: `LikeResult(id, likes, liked_by_me)`.
- **Current Data Source:** API via `DecisionsApi.getCitizenReports()`, `likeReport(id)`.
- **State Management:** `reportsProvider` (`AsyncNotifier<PagedState<ReportsData>>`), `reportCategoryFilterProvider` (`NotifierProvider`).
- **Current Status:** **Complete**.
- **Backend Required:** Yes (`GET /v1/decisions/citizen-reports`, `POST /v1/decisions/citizen-reports/:id/like`).
- **Dependencies:** PostgreSQL (`citizen_reports`, `citizen_report_likes`, `regions`), Appwrite (for civic photo media attachments).

---

### Module 5: Shell & Cross-Cutting Features

| Feature | Screen / Widget | Description | User Actions | State Management | Backend Required |
|---|---|---|---|---|---|
| **Language Toggle** | `DecidixTopBar` | Dynamic switching between English (LTR, Outfit font) and Arabic (RTL, Cairo font) | Tap "عربي" / "English" button | `localeNotifierProvider` (`SharedPreferences` persistent) | No (Client-side, sends `Accept-Language` header to API) |
| **Notifications** | `DecidixTopBar` | Alert badge and notifications inbox | Tap bell icon (shows snackbar placeholder) | None (Planned for Phase 9) | Future endpoint (`GET /v1/notifications`) |
| **Account / Profile** | `DecidixTopBar` | User profile avatar | Tap avatar (currently inactive) | Planned for Clerk / JWT session | Yes (`GET /v1/auth/me`) |
| **Region Picker** | `RegionPicker` | Searchable modal bottom sheet for selecting any national region | Search region, tap region item to return ID | Riverpod `allRegionsProvider` | Reuses `GET /v1/regions` |
| **Error Handling & Retry** | `state_views.dart` | Uniform error view with localized error message and retry button | Tap "Try again" (`onRetry`) | Riverpod `ref.invalidate(...)` | Returns structured `{ error: { code, message } }` |
| **Loading Skeletons** | `state_views.dart` | Shimmer/skeleton placeholder rows during asynchronous data fetching | Non-interactive visual feedback | Reactive to `AsyncValue.loading` | Fast API response times (<300ms) |

