import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../api/models/overview.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/localization/app_localizations.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/score_ring.dart';

/// The regions as score bubbles on a map, with zoom buttons and a low to high
/// legend. The map frames all the points when it opens.
class DecidixMap extends StatefulWidget {
  final List<MapPoint> points;
  final String selectedId;
  final ValueChanged<MapPoint> onPointSelected;

  const DecidixMap({
    super.key,
    required this.points,
    required this.selectedId,
    required this.onPointSelected,
  });

  @override
  State<DecidixMap> createState() => _DecidixMapState();
}

class _DecidixMapState extends State<DecidixMap> {
  final MapController _controller = MapController();

  void _zoom(double delta) {
    final camera = _controller.camera;
    _controller.move(camera.center, camera.zoom + delta);
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final bounds = LatLngBounds.fromPoints([
      for (final p in widget.points) LatLng(p.latitude, p.longitude),
    ]);

    return DecidixCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          SizedBox(
            height: 300,
            child: ClipRRect(
              borderRadius: AppRadius.innerRadius,
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _controller,
                    options: MapOptions(
                      initialCameraFit: CameraFit.bounds(
                        bounds: bounds,
                        padding: const EdgeInsets.all(36),
                      ),
                      minZoom: 3,
                      maxZoom: 10,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: AppConfig.mapTileUrl,
                        userAgentPackageName: 'com.decidix.app',
                      ),
                      MarkerLayer(
                        markers: [
                          // The selected bubble is drawn last, on top.
                          for (final p in widget.points.where(
                            (p) => p.id != widget.selectedId,
                          ))
                            _marker(p, selected: false, locale: locale),
                          for (final p in widget.points.where(
                            (p) => p.id == widget.selectedId,
                          ))
                            _marker(p, selected: true, locale: locale),
                        ],
                      ),
                    ],
                  ),
                  // The tile provider's credit, always visible.
                  PositionedDirectional(
                    bottom: 0,
                    end: 0,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 260),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      color: AppColors.white.withValues(alpha: 0.8),
                      child: Text(
                        AppConfig.mapAttribution,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.microRegular.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                  ),
                  PositionedDirectional(
                    top: 10,
                    end: 10,
                    child: Column(
                      children: [
                        _ZoomButton(
                          icon: Icons.add,
                          label: context.tr('map_zoom_in'),
                          onTap: () => _zoom(0.6),
                        ),
                        const SizedBox(height: 8),
                        _ZoomButton(
                          icon: Icons.remove,
                          label: context.tr('map_zoom_out'),
                          onTap: () => _zoom(-0.6),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _Legend(),
        ],
      ),
    );
  }

  Marker _marker(
    MapPoint point, {
    required bool selected,
    required Locale locale,
  }) {
    final size = selected ? 46.0 : 34.0;
    final color = ScoreRing.colorFor(point.priority);

    return Marker(
      point: LatLng(point.latitude, point.longitude),
      width: size,
      height: size,
      child: GestureDetector(
        onTap: () => widget.onPointSelected(point),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            Container(
              width: size,
              height: size,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? null : AppColors.white,
                gradient: selected
                    ? const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.blue, AppColors.cyan],
                      )
                    : null,
                border: Border.all(
                  color: selected ? AppColors.white : color,
                  width: selected ? 3 : 2,
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33061A3A),
                    blurRadius: 8,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Text(
                point.score.toStringAsFixed(0),
                style: AppTypography.labelMStrong.copyWith(
                  fontSize: selected ? 15 : 12,
                  color: selected ? AppColors.white : AppColors.navy,
                ),
              ),
            ),
            if (selected)
              Positioned(
                bottom: size + 6,
                left: -70,
                right: -70,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.navy,
                      borderRadius: AppRadius.pillRadius,
                    ),
                    child: Text(
                      point.name.resolve(locale),
                      maxLines: 1,
                      style: AppTypography.microStrong.copyWith(
                        color: AppColors.white,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ZoomButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ZoomButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.white,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.line),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F061A3A),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Icon(icon, size: 20, color: AppColors.navy),
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final style = AppTypography.microRegular.copyWith(color: AppColors.ink);
    return Row(
      children: [
        Text(context.tr('map_legend_low'), style: style),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 6,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              gradient: LinearGradient(
                begin: AlignmentDirectional.centerStart,
                end: AlignmentDirectional.centerEnd,
                colors: [
                  AppColors.blue.withValues(alpha: 0.15),
                  AppColors.blue,
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(context.tr('map_legend_high'), style: style),
      ],
    );
  }
}
