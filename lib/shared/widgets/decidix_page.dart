import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import 'section_header.dart';
import 'state_views.dart';

/// The layout every screen shares: tabs, eyebrow, big title, then sections
/// 20px apart, with pull to refresh. The shell already draws the top bar.
class DecidixPage extends StatelessWidget {
  /// The tab bar of the screen's group (Overview, Insights...). Optional.
  final Widget? tabs;
  final String? eyebrow;

  /// Null for a screen that starts with its own hero (region profile).
  final String? title;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;

  /// Called when the user scrolls near the end of a long list. It may be
  /// called several times while the end is on screen; the list's controller
  /// ignores calls while a page is already loading or when there is no more.
  final VoidCallback? onLoadMore;

  /// A placeholder row is shown at the end while the next page loads.
  final bool loadingMore;

  const DecidixPage({
    super.key,
    this.tabs,
    this.eyebrow,
    this.title,
    required this.children,
    this.onRefresh,
    this.onLoadMore,
    this.loadingMore = false,
  });

  /// How far from the end (in pixels) the next page starts loading.
  static const double _loadMoreDistance = 400;

  bool _nearEnd(Notification notification) {
    final ScrollMetrics? metrics = switch (notification) {
      ScrollNotification(:final metrics) => metrics,
      ScrollMetricsNotification(:final metrics) => metrics,
      _ => null,
    };
    // Depth 0 is this page's list; the horizontal chip rows are deeper.
    return metrics != null &&
        metrics.axis == Axis.vertical &&
        (notification as ViewportNotificationMixin).depth == 0 &&
        metrics.extentAfter < _loadMoreDistance;
  }

  /// Room under the last section for the floating bottom navigation.
  static const double bottomPadding = 128;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, bottomPadding),
      children: [
        ?tabs,
        if (title != null) ...[
          if (tabs != null) const SizedBox(height: 10),
          PageTitle(eyebrow: eyebrow, title: title!),
        ],
        for (final (i, child) in children.indexed) ...[
          if (i > 0 || tabs != null || title != null) const SizedBox(height: 20),
          child,
        ],
        if (loadingMore) ...[const SizedBox(height: 12), const SkeletonBox(height: 78)],
      ],
    );

    Widget page = list;
    if (onLoadMore != null) {
      page = NotificationListener<Notification>(
        onNotification: (notification) {
          // After the frame, so the list is never changed while it is laid out.
          if (_nearEnd(notification)) Future.microtask(onLoadMore!);
          return false;
        },
        child: list,
      );
    }

    if (onRefresh == null) return page;
    return RefreshIndicator(
      color: AppColors.blue,
      backgroundColor: AppColors.white,
      onRefresh: onRefresh!,
      child: page,
    );
  }
}

class PageTitle extends StatelessWidget {
  final String? eyebrow;
  final String title;

  const PageTitle({super.key, this.eyebrow, required this.title});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null)
          Text(
            eyebrow!.toUpperCase(),
            style: AppTypography.adapt(context, AppTypography.overlineM),
          ),
        if (eyebrow != null) const SizedBox(height: 4),
        Text(
          title,
          style: AppTypography.adapt(context, AppTypography.headingPage),
        ),
      ],
    );
  }
}

/// A titled block of a screen: header (and optional action), 12px, content.
class Section extends StatelessWidget {
  final String? title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget child;

  const Section({
    super.key,
    this.title,
    this.actionLabel,
    this.onAction,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null) ...[
          SectionHeader(title: title!, actionLabel: actionLabel, onAction: onAction),
          const SizedBox(height: 12),
        ],
        child,
      ],
    );
  }
}

/// The sections of a screen for a request: a skeleton while it loads, an error
/// with retry if it fails, and [builder]'s sections once the data is here.
/// Data that is already on screen stays while a newer request loads.
List<Widget> asyncSections<T>(
  AsyncValue<T> value, {
  required VoidCallback onRetry,
  required List<Widget> Function(T data) builder,
  int skeletonRows = 4,
}) {
  return [
    value.when(
      skipLoadingOnReload: true,
      skipLoadingOnRefresh: true,
      loading: () => LoadingSkeleton(rows: skeletonRows),
      error: (error, _) => ErrorView(onRetry: onRetry),
      data: (data) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, section) in builder(data).indexed) ...[
            if (i > 0) const SizedBox(height: 20),
            section,
          ],
        ],
      ),
    ),
  ];
}

/// The same for a provider built with an AsyncNotifier.
Future<void> refreshNotifier<N extends AsyncNotifier<T>, T>(
  WidgetRef ref,
  AsyncNotifierProvider<N, T> provider,
) async {
  ref.invalidate(provider);
  try {
    await ref.read(provider.future);
  } catch (_) {}
}

/// Pull to refresh for a screen: ask for fresh data and wait for the answer.
/// An error is not thrown here; the screen shows it with its retry button.
Future<void> refreshFuture<T>(WidgetRef ref, FutureProvider<T> provider) async {
  ref.invalidate(provider);
  try {
    await ref.read(provider.future);
  } catch (_) {}
}
