import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/api_providers.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/decisions.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/errors/app_exception.dart';
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

final projectsProvider = FutureProvider<ProjectsData>((ref) {
  final status = ref.watch(projectStatusFilterProvider);
  return ref.watch(decisionsApiProvider).getProjects(status: status);
});

// ---------------------------------------------------------------- reports

/// A null category means all reports.
class ReportCategoryFilter extends Notifier<ReportCategory?> {
  @override
  ReportCategory? build() => null;

  void select(ReportCategory? category) => state = category;
}

final reportCategoryFilterProvider =
    NotifierProvider<ReportCategoryFilter, ReportCategory?>(ReportCategoryFilter.new);

class ReportsController extends AsyncNotifier<ReportsData> {
  @override
  Future<ReportsData> build() {
    final category = ref.watch(reportCategoryFilterProvider);
    return ref.watch(decisionsApiProvider).getCitizenReports(category: category);
  }

  /// The heart changes at once; it goes back if the server refuses, and takes
  /// the server's count when it answers.
  Future<void> toggleLike(String reportId) async {
    final before = state.value;
    if (before == null) return;
    final report = before.items.where((r) => r.id == reportId).firstOrNull;
    if (report == null) return;

    final liked = !report.likedByMe;
    state = AsyncData(_replace(
      before,
      report.copyWith(likedByMe: liked, likes: report.likes + (liked ? 1 : -1)),
    ));

    try {
      final answer = await ref.read(decisionsApiProvider).toggleLike(reportId);
      final latest = state.value;
      if (latest == null) return;
      final current = latest.items.where((r) => r.id == reportId).firstOrNull;
      if (current == null) return;
      state = AsyncData(
        _replace(latest, current.copyWith(likes: answer.likes, likedByMe: answer.likedByMe)),
      );
    } on AppException {
      state = AsyncData(before);
    }
  }

  ReportsData _replace(ReportsData data, CitizenReport report) {
    return data.withItems([for (final r in data.items) r.id == report.id ? report : r]);
  }
}

final reportsProvider =
    AsyncNotifierProvider<ReportsController, ReportsData>(ReportsController.new);
