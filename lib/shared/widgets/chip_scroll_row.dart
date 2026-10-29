import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import '../../core/constants/app_colors.dart';
import 'decidix_chip.dart';

/// Horizontally scrolling row of [DecidixChip]s.
///
/// - the selected chip is scrolled to the middle, so it is never hidden off
///   the edge (the Insights tabs have 8 chips);
/// - a fade on the edge that has more chips behind it shows the row scrolls;
/// - works in right to left layouts.
class ChipScrollRow extends StatefulWidget {
  final List<String> labels;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  /// Colour of the screen behind the row, used by the edge fades.
  final Color fadeColor;

  const ChipScrollRow({
    super.key,
    required this.labels,
    required this.selectedIndex,
    required this.onSelected,
    this.fadeColor = AppColors.mist,
  });

  /// 36px chip with 5px above and below.
  static const double height = 46;

  @override
  State<ChipScrollRow> createState() => _ChipScrollRowState();
}

class _ChipScrollRowState extends State<ChipScrollRow> {
  static const double _fadeWidth = 32;

  final ScrollController _controller = ScrollController();
  late List<GlobalKey> _keys = _newKeys();
  bool _fadeStart = false;
  bool _fadeEnd = false;

  List<GlobalKey> _newKeys() =>
      List.generate(widget.labels.length, (_) => GlobalKey());

  @override
  void initState() {
    super.initState();
    _controller.addListener(_updateFades);
    WidgetsBinding.instance.addPostFrameCallback((_) => _reveal(animate: false));
  }

  @override
  void didUpdateWidget(ChipScrollRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    final countChanged = oldWidget.labels.length != widget.labels.length;
    if (countChanged) _keys = _newKeys();
    if (countChanged || oldWidget.selectedIndex != widget.selectedIndex) {
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _reveal(animate: !countChanged));
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_updateFades);
    _controller.dispose();
    super.dispose();
  }

  void _reveal({required bool animate}) {
    if (!mounted || !_controller.hasClients) return;
    final index = widget.selectedIndex;
    if (index < 0 || index >= _keys.length) return;
    final box = _keys[index].currentContext?.findRenderObject();
    if (box is! RenderBox) return;
    final viewport = RenderAbstractViewport.maybeOf(box);
    if (viewport == null) return;

    final position = _controller.position;
    final target = viewport
        .getOffsetToReveal(box, 0.5)
        .offset
        .clamp(position.minScrollExtent, position.maxScrollExtent)
        .toDouble();

    if (animate) {
      _controller.animateTo(
        target,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    } else {
      _controller.jumpTo(target);
    }
    _updateFades();
  }

  void _updateFades() {
    if (!mounted || !_controller.hasClients) return;
    final position = _controller.position;
    final start = position.extentBefore > 1;
    final end = position.extentAfter > 1;
    if (start != _fadeStart || end != _fadeEnd) {
      setState(() {
        _fadeStart = start;
        _fadeEnd = end;
      });
    }
  }

  Widget _fade({required bool atStart, required bool visible}) {
    final textDirection = Directionality.of(context);
    final solid = widget.fadeColor;
    final clear = widget.fadeColor.withValues(alpha: 0);
    return Positioned.directional(
      textDirection: textDirection,
      start: atStart ? 0 : null,
      end: atStart ? null : 0,
      top: 0,
      bottom: 0,
      width: _fadeWidth,
      child: IgnorePointer(
        child: AnimatedOpacity(
          opacity: visible ? 1 : 0,
          duration: const Duration(milliseconds: 150),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: atStart
                    ? AlignmentDirectional.centerStart
                    : AlignmentDirectional.centerEnd,
                end: atStart
                    ? AlignmentDirectional.centerEnd
                    : AlignmentDirectional.centerStart,
                colors: [solid, clear],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.labels.length;
    return SizedBox(
      height: ChipScrollRow.height,
      child: NotificationListener<ScrollMetricsNotification>(
        onNotification: (_) {
          // Chip widths change when the font loads, so re-check the fades.
          WidgetsBinding.instance.addPostFrameCallback((_) => _updateFades());
          return false;
        },
        child: Stack(
          children: [
            SingleChildScrollView(
              controller: _controller,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  for (var i = 0; i < count; i++)
                    Padding(
                      padding: EdgeInsetsDirectional.only(
                        end: i < count - 1 ? 8 : 0,
                      ),
                      child: KeyedSubtree(
                        key: _keys[i],
                        child: DecidixChip(
                          label: widget.labels[i],
                          selected: i == widget.selectedIndex,
                          onTap: () => widget.onSelected(i),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            _fade(atStart: true, visible: _fadeStart),
            _fade(atStart: false, visible: _fadeEnd),
          ],
        ),
      ),
    );
  }
}
