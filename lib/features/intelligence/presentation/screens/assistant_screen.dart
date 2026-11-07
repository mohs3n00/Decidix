import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    ref
        .read(assistantControllerProvider.notifier)
        .send(
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
        : [
            for (final i in [1, 2, 3]) fmt.tr('asst_prompt_$i'),
          ];

    return Column(
      children: [
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
            children: [
              const IntelligenceChipBar(selectedIndex: 1),
              const SizedBox(height: 10),
              PageTitle(
                eyebrow: fmt.tr('ai_eyebrow'),
                title: fmt.tr('ai_title_assistant'),
              ),
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
              if (state.waiting) ...[
                const SizedBox(height: 12),
                const _TypingBubble(),
              ],
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

class _BotAvatar extends StatelessWidget {
  final double size;

  const _BotAvatar({this.size = 28});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.white,
        border: Border.all(color: AppColors.hairline),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.06),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(2),
      child: ClipOval(
        child: Image.asset(
          AppAssets.iconChatBot,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _ThinkingBotAvatar extends StatefulWidget {
  final double size;

  const _ThinkingBotAvatar({this.size = 34});

  @override
  State<_ThinkingBotAvatar> createState() => _ThinkingBotAvatarState();
}

class _ThinkingBotAvatarState extends State<_ThinkingBotAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer glowing pulsing halo aura
            Container(
              width: widget.size + 14 + (6 * value),
              height: widget.size + 14 + (6 * value),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.cyan.withValues(alpha: 0.35 * (1.0 - value * 0.3)),
                    AppColors.blue.withValues(alpha: 0.15 * (1.0 - value)),
                    Colors.transparent,
                  ],
                  stops: const [0.3, 0.7, 1.0],
                ),
              ),
            ),
            // Breathing and glowing avatar container
            Transform.scale(
              scale: 1.0 + (0.06 * value),
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.white,
                  border: Border.all(
                    color: Color.lerp(AppColors.blue, AppColors.cyan, value)!,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.cyan.withValues(alpha: 0.3 + 0.3 * value),
                      blurRadius: 8 + 8 * value,
                      spreadRadius: 1 + 2 * value,
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(3),
                child: ClipOval(
                  child: Image.asset(
                    AppAssets.iconChatBot,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ThinkingDotsAnimation extends StatefulWidget {
  const _ThinkingDotsAnimation();

  @override
  State<_ThinkingDotsAnimation> createState() => _ThinkingDotsAnimationState();
}

class _ThinkingDotsAnimationState extends State<_ThinkingDotsAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final phase = (_controller.value - delay) % 1.0;
            final double bounce = -4.0 * (phase < 0.5 ? (1.0 - (phase * 2 - 1).abs()) : 0.0);
            final double opacity = 0.35 + 0.65 * (phase < 0.5 ? (1.0 - (phase * 2 - 1).abs()) : 0.0);

            return Transform.translate(
              offset: Offset(0, bounce),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 2.5),
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.blue.withValues(alpha: opacity),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _AssistantBubble extends StatelessWidget {
  final String text;
  final ChatReply? reply;
  final bool isError;

  const _AssistantBubble({
    required this.text,
    this.reply,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final rows = reply?.table;
    final sources = reply?.sources ?? const <ChatSource>[];

    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsetsDirectional.only(top: 4),
            child: _BotAvatar(size: 28),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 290),
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
                    if (reply?.answerSource == AnswerSource.deterministicFallback) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.verified_outlined,
                            size: 12,
                            color: AppColors.ink,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              fmt.tr('asst_fallback_notice'),
                              style: AppTypography.microRegular.copyWith(
                                color: AppColors.ink,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
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
                                      child: Text(
                                        row.name.resolve(locale),
                                        style: AppTypography.labelM,
                                      ),
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
                        style: AppTypography.microRegular.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
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
          child: Text(
            text,
            style: AppTypography.bodyM.copyWith(color: AppColors.white),
          ),
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
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            _ThinkingBotAvatar(size: 32),
            SizedBox(width: 8),
            DecidixCard(
              padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: _ThinkingDotsAnimation(),
            ),
          ],
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
        child: Text(
          label,
          style: AppTypography.captionMedium.copyWith(color: AppColors.blue),
        ),
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
          ClipOval(
            child: Image.asset(
              AppAssets.iconChatBot,
              width: 22,
              height: 22,
              fit: BoxFit.contain,
            ),
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
                  child: const Icon(
                    Icons.arrow_upward,
                    color: AppColors.white,
                    size: 18,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
