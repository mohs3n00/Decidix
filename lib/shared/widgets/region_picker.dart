import 'package:flutter/material.dart';

import '../../api/models/overview.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../core/format/formatters.dart';

/// Bottom sheet with every region. Returns the id of the one picked, or null
/// if the sheet is dismissed.
Future<String?> showRegionPicker(
  BuildContext context, {
  required List<RegionListItem> regions,
  String? selectedId,
}) {
  return showModalBottomSheet<String>(
    context: context,
    backgroundColor: AppColors.white,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (context) {
      final locale = Localizations.localeOf(context);
      final fmt = context.fmt;

      return SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text(
                  fmt.tr('cmp_pick_region'),
                  style: AppTypography.headingSection,
                ),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: regions.length,
                  itemBuilder: (context, i) {
                    final region = regions[i];
                    final selected = region.id == selectedId;
                    return ListTile(
                      selected: selected,
                      onTap: () => Navigator.of(context).pop(region.id),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                      ),
                      title: Text(
                        region.name.resolve(locale),
                        style: AppTypography.labelL,
                      ),
                      subtitle: Text(
                        fmt.people(region.population),
                        style: AppTypography.captionRegular.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                      trailing: selected
                          ? const Icon(
                              Icons.check_rounded,
                              color: AppColors.blue,
                            )
                          : Text(
                              fmt.number(region.score, decimals: 0),
                              style: AppTypography.labelMStrong,
                            ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
