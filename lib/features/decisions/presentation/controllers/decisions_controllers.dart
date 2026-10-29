import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/api_providers.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/decisions.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../shared/paging.dart';
import '../../../overview/presentation/controllers/regions_controller.dart';

// -------------------------------------------------------------- simulator

/// The most money one slider can hold, in USD.
const double simulatorMaxPerDomain = 100e6;

/// The sliders' starting position, in USD.
const Map<Domain, double> simulatorDefaults = {
  Domain.education: 30e6,
  Domain.healthcare: 45e6,
  Domain.infrastructure: 20e6,
  Domain.economy: 25e6,
};

class SimulatorState {
  final List<RegionListItem> regions;
  final String regionId;
  final Map<Domain, double> allocations;
  final SimulationResult result;

  /// A newer answer is on its way; [result] is from the sliders' older position.
  final bool busy;

  /// The last request failed; [result] is the last good one.
  final bool failed;

  const SimulatorState({
    required this.regions,
    required this.regionId,
    required this.allocations,
    required this.result,
    this.busy = false,
    this.failed = false,
  });

  SimulatorState copyWith({
    String? regionId,
    Map<Domain, double>? allocations,
    SimulationResult? result,
    bool? busy,
    bool? failed,
  }) {
    return SimulatorState(
      regions: regions,
      regionId: regionId ?? this.regionId,
      allocations: allocations ?? this.allocations,
      result: result ?? this.result,
      busy: busy ?? this.busy,
      failed: failed ?? this.failed,
    );
  }

  double get total => allocations.values.fold(0, (sum, amount) => sum + amount);

  RegionListItem get region => regions.firstWhere(
        (r) => r.id == regionId,
        orElse: () => regions.first,
      );
}

/// Runs the simulation for the region and money on the sliders.
///
/// Moving a slider asks the server again, but only after the finger pauses for
/// [debounce]; a request still in flight is cancelled when a newer one starts,
/// so a slow old answer can never overwrite a newer one.
class SimulatorController extends AsyncNotifier<SimulatorState> {
  static const Duration debounce = Duration(milliseconds: 300);

  Timer? _timer;
  CancelToken? _inFlight;

  @override
  Future<SimulatorState> build() async {
    ref.onDispose(() {
      _timer?.cancel();
      _inFlight?.cancel();
    });

    // Start with the weakest region: the one most likely to need money.
    final regions = await ref.watch(allRegionsProvider.future);
    final regionId = regions.last.id;
    final result = await ref.read(decisionsApiProvider).simulate(
          SimulationRequest(regionId: regionId, allocations: simulatorDefaults),
        );
    return SimulatorState(
      regions: regions,
      regionId: regionId,
      allocations: simulatorDefaults,
      result: result,
    );
  }

  void setAllocation(Domain domain, double amount) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        allocations: {...current.allocations, domain: amount},
        busy: true,
      ),
    );
    _timer?.cancel();
    _timer = Timer(debounce, _run);
  }

  void selectRegion(String regionId) {
    final current = state.value;
    if (current == null || current.regionId == regionId) return;
    state = AsyncData(current.copyWith(regionId: regionId, busy: true));
    _timer?.cancel();
    _run();
  }

  void reset() {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(allocations: simulatorDefaults, busy: true));
    _timer?.cancel();
    _run();
  }

  Future<void> _run() async {
    final current = state.value;
    if (current == null) return;

    _inFlight?.cancel();
    final token = _inFlight = CancelToken();
    try {
      final result = await ref.read(decisionsApiProvider).simulate(
            SimulationRequest(regionId: current.regionId, allocations: current.allocations),
            cancelToken: token,
          );
      if (token.isCancelled) return;
      state = AsyncData(state.value!.copyWith(result: result, busy: false, failed: false));
    } on RequestCancelledException {
      // A newer request replaced this one.
    } on AppException {
      if (token.isCancelled) return;
      state = AsyncData(state.value!.copyWith(busy: false, failed: true));
    }
  }
}

final simulatorControllerProvider =
    AsyncNotifierProvider<SimulatorController, SimulatorState>(SimulatorController.new);

// --------------------------------------------------------------- projects

/// A null status means all projects.
class ProjectStatusFilter extends Notifier<ProjectStatus?> {
  @override
  ProjectStatus? build() => null;

  void select(ProjectStatus? status) => state = status;
}

final projectStatusFilterProvider =
    NotifierProvider<ProjectStatusFilter, ProjectStatus?>(ProjectStatusFilter.new);

/// The projects list: page 1, then more as the user scrolls. The totals above
/// the list come with page 1 and stay.
class ProjectsController extends AsyncNotifier<PagedState<ProjectsData>> {
  /// Counts the starts from page 1, so a late page for an old filter is dropped.
  int _generation = 0;

  @override
  Future<PagedState<ProjectsData>> build() async {
    _generation++;
    final status = ref.watch(projectStatusFilterProvider);
    final data = await ref.watch(decisionsApiProvider).getProjects(
          status: status,
          perPage: ref.watch(listPageSizeProvider),
        );
    return PagedState(data, data.meta);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.loadingMore || !current.hasMore) return;

    final generation = _generation;
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await ref.read(decisionsApiProvider).getProjects(
            status: ref.read(projectStatusFilterProvider),
            page: current.meta.page + 1,
            perPage: ref.read(listPageSizeProvider),
          );
      if (generation != _generation) return;
      final merged = current.data.withMore(next.items, next.meta);
      state = AsyncData(PagedState(merged, next.meta));
    } on AppException {
      if (generation != _generation) return;
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }
}

final projectsProvider =
    AsyncNotifierProvider<ProjectsController, PagedState<ProjectsData>>(ProjectsController.new);

// ---------------------------------------------------------------- reports

/// A null category means all reports.
class ReportCategoryFilter extends Notifier<ReportCategory?> {
  @override
  ReportCategory? build() => null;

  void select(ReportCategory? category) => state = category;
}

final reportCategoryFilterProvider =
    NotifierProvider<ReportCategoryFilter, ReportCategory?>(ReportCategoryFilter.new);

/// The reports list: page 1, then more as the user scrolls.
class ReportsController extends AsyncNotifier<PagedState<ReportsData>> {
  /// Counts the starts from page 1, so a late page for an old filter is dropped.
  int _generation = 0;

  @override
  Future<PagedState<ReportsData>> build() async {
    _generation++;
    final data = await ref.watch(decisionsApiProvider).getCitizenReports(
          category: ref.watch(reportCategoryFilterProvider),
          perPage: ref.watch(listPageSizeProvider),
        );
    return PagedState(data, data.meta);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.loadingMore || !current.hasMore) return;

    final generation = _generation;
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await ref.read(decisionsApiProvider).getCitizenReports(
            category: ref.read(reportCategoryFilterProvider),
            page: current.meta.page + 1,
            perPage: ref.read(listPageSizeProvider),
          );
      if (generation != _generation) return;
      final merged = current.data.withItems(
        [...current.data.items, ...next.items],
        newMeta: next.meta,
      );
      state = AsyncData(PagedState(merged, next.meta));
    } on AppException {
      if (generation != _generation) return;
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }

  /// The heart changes at once; it goes back if the server refuses, and takes
  /// the server's count when it answers. Only this report changes, so pages
  /// that load meanwhile are kept.
  Future<void> toggleLike(String reportId) async {
    final report = _find(reportId);
    if (report == null) return;

    final liked = !report.likedByMe;
    _update(report.copyWith(likedByMe: liked, likes: report.likes + (liked ? 1 : -1)));

    try {
      final answer = await ref.read(decisionsApiProvider).toggleLike(reportId);
      final current = _find(reportId);
      if (current != null) {
        _update(current.copyWith(likes: answer.likes, likedByMe: answer.likedByMe));
      }
    } on AppException {
      _update(report);
    }
  }

  CitizenReport? _find(String id) =>
      state.value?.data.items.where((r) => r.id == id).firstOrNull;

  void _update(CitizenReport report) {
    final current = state.value;
    if (current == null) return;
    final items = [for (final r in current.data.items) r.id == report.id ? report : r];
    state = AsyncData(current.copyWith(data: current.data.withItems(items)));
  }
}

final reportsProvider =
    AsyncNotifierProvider<ReportsController, PagedState<ReportsData>>(ReportsController.new);
