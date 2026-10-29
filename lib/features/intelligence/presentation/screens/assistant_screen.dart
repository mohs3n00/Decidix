import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../api/models/intelligence.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../controllers/intelligence_controllers.dart';
import '../widgets/intelligence_chip_bar.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});

  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send(String text) {
    if (text.trim().isEmpty) return;
    ref.read(assistantControllerProvider.notifier).send(
          text,
          language: Localizations.localeOf(context).languageCode,
          errorText: context.fmt.tr('asst_error'),
        );
    _input.clear();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assistantControllerProvider);
    final fmt = context.fmt;

    ref.listen(assistantControllerProvider, (previous, next) {
      if (previous?.messages.length != next.messages.length ||
          previous?.waiting != next.waiting) {
        _scrollToEnd();
      }
    });

    final prompts = state.suggestedPrompts.isNotEmpty
        ? state.suggestedPrompts
        : [for (final i in [1, 2, 3]) fmt.tr('asst_prompt_$i')];

    return Column(
      children: [
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
            children: [
              const IntelligenceChipBar(selectedIndex: 1),
              const SizedBox(height: 10),
              PageTitle(eyebrow: fmt.tr('ai_eyebrow'), title: fmt.tr('ai_title_assistant')),
              const SizedBox(height: 20),
              _AssistantBubble(text: fmt.tr('asst_greeting')),
              for (final message in state.messages) ...[
                const SizedBox(height: 12),
                message.fromUser
                    ? _UserBubble(text: message.text)
                    : _AssistantBubble(
                        text: message.text,
                        reply: message.reply,
                        isError: message.isError,
                      ),
              ],
              if (state.waiting) ...[const SizedBox(height: 12), const _TypingBubble()],
            ],
          ),
        ),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              for (final prompt in prompts)
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: _PromptChip(label: prompt, onTap: () => _send(prompt)),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _InputBar(
            controller: _input,
            hint: fmt.tr('asst_input_hint'),
            sendLabel: fmt.tr('btn_send'),
            enabled: !state.waiting,
            onSend: _send,
          ),
        ),
        // Room for the floating bottom navigation.
        const SizedBox(height: 120),
      ],
    );
  }
}

class _AssistantBubble extends StatelessWidget {
  final String text;
  final ChatReply? reply;
  final bool isError;

  const _AssistantBubble({required this.text, this.reply, this.isError = false});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final rows = reply?.table;
    final sources = reply?.sources ?? const <ChatSource>[];

    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: DecidixCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                text,
                style: AppTypography.bodyM.copyWith(
                  color: isError ? AppColors.dangerText : AppColors.navy,
                ),
              ),
              if (rows != null && rows.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.wellTint,
                    borderRadius: AppRadius.innerRadius,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Column(
                    children: [
                      for (final (i, row) in rows.indexed) ...[
                        if (i > 0) const Divider(height: 1),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(row.name.resolve(locale), style: AppTypography.labelM),
                              ),
                              Text(
                                '${row.change < 0 ? '▼' : '▲'} ${fmt.points(row.change)}',
                                style: AppTypography.captionRegular.copyWith(
                                  color: row.change < 0
                                      ? AppColors.dangerText
                                      : AppColors.successText,
                                ),
                              ),
                              SizedBox(
                                width: 36,
                                child: Text(
                                  fmt.number(row.score, decimals: 0),
                                  textAlign: TextAlign.end,
                                  style: AppTypography.labelLStrong,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              for (final source in sources) ...[
                const SizedBox(height: 10),
                Text(
                  fmt.tr('asst_source', {
                    'name': source.name.resolve(locale),
                    'period': fmt.period(source.period),
                  }),
                  style: AppTypography.microRegular.copyWith(color: AppColors.ink),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _UserBubble extends StatelessWidget {
  final String text;

  const _UserBubble({required this.text});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: AlignmentDirectional.centerEnd,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 280),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.navy,
            borderRadius: BorderRadiusDirectional.only(
              topStart: Radius.circular(18),
              topEnd: Radius.circular(18),
              bottomStart: Radius.circular(18),
              bottomEnd: Radius.circular(6),
            ),
          ),
          child: Text(text, style: AppTypography.bodyM.copyWith(color: AppColors.white)),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Semantics(
        label: context.fmt.tr('loading'),
        child: DecidixCard(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: Text(
            '•••',
            style: AppTypography.titleM.copyWith(color: AppColors.ink, letterSpacing: 2),
          ),
        ),
      ),
    );
  }
}

class _PromptChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _PromptChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: AppColors.hairline),
        ),
        child: Text(label, style: AppTypography.captionMedium.copyWith(color: AppColors.blue)),
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final String sendLabel;
  final bool enabled;
  final ValueChanged<String> onSend;

  const _InputBar({
    required this.controller,
    required this.hint,
    required this.sendLabel,
    required this.enabled,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return DecidixCard(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 6, 6, 6),
      child: Row(
        children: [
          SvgPicture.asset(
            AppAssets.icAiSpark,
            width: 16,
            height: 16,
            colorFilter: const ColorFilter.mode(AppColors.blue, BlendMode.srcIn),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onSubmitted: enabled ? onSend : null,
              textInputAction: TextInputAction.send,
              style: AppTypography.bodyM.copyWith(height: 1.2),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: hint,
                hintStyle: AppTypography.bodyM.copyWith(
                  height: 1.2,
                  color: AppColors.ink.withValues(alpha: 0.7),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Semantics(
            button: true,
            enabled: enabled,
            label: sendLabel,
            excludeSemantics: true,
            child: GestureDetector(
              onTap: enabled ? () => onSend(controller.text) : null,
              child: Opacity(
                opacity: enabled ? 1 : 0.5,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.blue, AppColors.cyan],
                    ),
                  ),
                  child: const Icon(Icons.arrow_upward, color: AppColors.white, size: 18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
