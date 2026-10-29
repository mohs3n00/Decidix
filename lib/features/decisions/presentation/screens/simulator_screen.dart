import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/models/common.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/ai_insight_panel.dart';
import '../../../../shared/widgets/decidix_button.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/hatched_bar.dart';
import '../../../../shared/widgets/hero_card.dart';
import '../../../../shared/widgets/region_picker.dart';
import '../../../../shared/widgets/select_field.dart';
import '../controllers/decisions_controllers.dart';
import '../widgets/decisions_chip_bar.dart';

class SimulatorScreen extends ConsumerWidget {
  const SimulatorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final simulator = ref.watch(simulatorControllerProvider);
    final controller = ref.read(simulatorControllerProvider.notifier);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixPage(
      tabs: const DecisionsChipBar(selectedIndex: 0),
      eyebrow: fmt.tr('dc_eyebrow'),
      title: fmt.tr('dc_title_simulator'),
      onRefresh: () => refreshNotifier(ref, simulatorControllerProvider),
      children: asyncSections(
        simulator,
        skeletonRows: 4,
        onRetry: () => ref.invalidate(simulatorControllerProvider),
        builder: (s) => [
          SelectField(
            value: s.region.name.resolve(locale),
            onTap: () async {
              final id = await showRegionPicker(
                context,
                regions: s.regions,
                selectedId: s.regionId,
              );
              if (id != null) controller.selectRegion(id);
            },
          ),
          _ResultCard(state: s),
          Section(
            title: fmt.tr('sim_budget'),
            child: DecidixCard(
              child: Column(
                children: [
                  for (final (i, entry) in s.allocations.entries.indexed) ...[
                    if (i > 0) const SizedBox(height: 8),
                    _AllocationSlider(
                      domain: entry.key,
                      amount: entry.value,
                      onChanged: (v) => controller.setAllocation(entry.key, v),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      fmt.tr('sim_total'),
                      style: AppTypography.captionRegular.copyWith(
                        color: AppColors.ink,
                      ),
                    ),
                    Text(
                      fmt.money(Money(s.total, 'USD')),
                      style: AppTypography.adapt(
                        context,
                        AppTypography.numberM.copyWith(fontSize: 22),
                      ),
                    ),
                  ],
                ),
              ),
              DecidixButton(
                label: fmt.tr('btn_reset'),
                outlined: true,
                expand: false,
                onPressed: controller.reset,
              ),
            ],
          ),
          AiInsightPanel(
            label: fmt.tr('sim_note'),
            body: s.result.note.resolve(locale),
          ),
        ],
      ),
    );
  }
}

/// Today's score, the projected one and how far it moves, on the blue card.
class _ResultCard extends StatelessWidget {
  final SimulatorState state;

  const _ResultCard({required this.state});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final result = state.result;
    const onHero = AppColors.fadedInk;
    final gainColor = result.gain < 0
        ? AppColors.dangerText
        : AppColors.successText;

    return HeroCard(
      child: Opacity(
        // The number is from the sliders' last position until the new one arrives.
        opacity: state.busy ? 0.7 : 1,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    fmt.tr('sim_today', {'n': fmt.number(result.todayScore)}),
                    style: AppTypography.captionRegular.copyWith(color: onHero),
                  ),
                ),
                Flexible(
                  child: Text(
                    fmt.tr('sim_projected', {'n': result.horizonMonths}),
                    textAlign: TextAlign.end,
                    style: AppTypography.captionRegular.copyWith(color: onHero),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      result.projectedScore.toStringAsFixed(1),
                      style: AppTypography.adapt(
                        context,
                        AppTypography.headingPage.copyWith(
                          fontSize: 56,
                          height: 1,
                          color: AppColors.navy,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: gainColor.withValues(alpha: 0.10),
                    borderRadius: AppRadius.pillRadius,
                  ),
                  child: Text(
                    fmt.tr('sim_gain_pts', {
                      // One decimal even for a whole number: "+7.0 pts".
                      'change':
                          '${result.gain < 0 ? '-' : '+'}${result.gain.abs().toStringAsFixed(1)}',
                    }),
                    style: AppTypography.captionStrong.copyWith(
                      color: gainColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            HatchedBar(value: result.projectedScore / 100, height: 12),
            if (state.failed) ...[
              const SizedBox(height: 10),
              Text(
                fmt.tr('error_loading'),
                style: AppTypography.captionMedium.copyWith(
                  color: AppColors.dangerText,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AllocationSlider extends StatelessWidget {
  final Domain domain;
  final double amount;
  final ValueChanged<double> onChanged;

  const _AllocationSlider({
    required this.domain,
    required this.amount,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final label = fmt.tr('label_domain_${domain.name}');
    final money = fmt.money(Money(amount, 'USD'));

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: Text(label, style: AppTypography.labelM)),
            Text(
              money,
              style: AppTypography.labelMStrong.copyWith(color: AppColors.blue),
            ),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 5,
            activeTrackColor: AppColors.blue,
            inactiveTrackColor: AppColors.track,
            overlayColor: AppColors.blue.withValues(alpha: 0.12),
            thumbShape: const _RingThumb(),
            trackShape: const RoundedRectSliderTrackShape(),
          ),
          child: Slider(
            value: amount.clamp(0, simulatorMaxPerDomain),
            max: simulatorMaxPerDomain,
            divisions: 100,
            semanticFormatterCallback: (_) => '$label $money',
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}

/// A white thumb with a blue ring.
class _RingThumb extends SliderComponentShape {
  const _RingThumb();

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) =>
      const Size.fromRadius(11);

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final canvas = context.canvas;
    canvas.drawCircle(center, 9, Paint()..color = AppColors.white);
    canvas.drawCircle(
      center,
      9,
      Paint()
        ..color = AppColors.blue
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5,
    );
  }
}
