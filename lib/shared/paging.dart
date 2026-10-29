import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/models/common.dart';

/// How many items one request asks for. The real value is 20; tests make it
/// small to exercise loading more pages with little data.
final listPageSizeProvider = Provider<int>((ref) => 20);

/// What a long list has loaded so far: everything from page 1 up to
/// [meta]`.page`, and whether the next page is on its way.
class PagedState<D> {
  final D data;
  final PageMeta meta;
  final bool loadingMore;

  const PagedState(this.data, this.meta, {this.loadingMore = false});

  bool get hasMore => meta.hasMore;

  PagedState<D> copyWith({D? data, PageMeta? meta, bool? loadingMore}) {
    return PagedState(
      data ?? this.data,
      meta ?? this.meta,
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}
