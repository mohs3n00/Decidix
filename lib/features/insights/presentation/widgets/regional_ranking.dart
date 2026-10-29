import 'package:flutter/material.dart';
import '../../../../api/models/insights.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_chip.dart';

/// Green from 70, amber from 55, red below.
Color scoreColor(double score) {
  if (score >= 70) return AppColors.success;
  if (score >= 55) return AppColors.warning;
  return AppColors.danger;
}

/// The five best or five weakest regions of a sector, with a Top / Bottom switch.
class RegionalRanking extends StatefulWidget {
  final List<RankedRegion> top;
  final List<RankedRegion> bottom;

  const RegionalRanking({super.key, required this.top, required this.bottom});

  @override
  State<RegionalRanking> createState() => _RegionalRankingState();
}

class _RegionalRankingState extends State<RegionalRanking> {
  bool _showTop = true;

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final rows = _showTop ? widget.top : widget.bottom;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          children: [
            DecidixChip(
              label: fmt.tr('ranking_top'),
              selected: _showTop,
              onTap: () => setState(() => _showTop = true),
            ),
            DecidixChip(
              label: fmt.tr('ranking_bottom'),
              selected: !_showTop,
              onTap: () => setState(() => _showTop = false),
            ),
          ],
        ),
        const SizedBox(height: 12),
        DecidixCard(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              for (final (i, row) in rows.indexed) ...[
                if (i > 0) const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 28,
                        child: Text(
                          '${row.rank}',
                          style: AppTypography.captionMedium.copyWith(color: AppColors.ink),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          row.name.resolve(locale),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.labelL,
                        ),
                      ),
                      Text(
                        fmt.number(row.score, decimals: 0),
                        style: AppTypography.labelLStrong.copyWith(color: scoreColor(row.score)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
