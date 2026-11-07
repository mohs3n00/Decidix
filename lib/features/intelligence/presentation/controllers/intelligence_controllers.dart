import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/api_providers.dart';
import '../../../../api/models/intelligence.dart';
import '../../../../core/errors/app_exception.dart';

/// The year the forecast runs to; null lets the server pick its default.
class PredictionYear extends Notifier<int?> {
  @override
  int? build() => null;

  void select(int year) => state = year;
}

final predictionYearProvider = NotifierProvider<PredictionYear, int?>(
  PredictionYear.new,
);

final predictionsProvider = FutureProvider<Predictions>((ref) {
  final year = ref.watch(predictionYearProvider);
  return ref.watch(intelligenceApiProvider).getPredictions(targetYear: year);
});

// ------------------------------------------------------------- assistant

/// One bubble of the conversation.
class ChatBubble {
  final bool fromUser;
  final String text;

  /// The full answer (table, sources) for an assistant bubble.
  final ChatReply? reply;
  final bool isError;

  const ChatBubble.user(this.text)
    : fromUser = true,
      reply = null,
      isError = false;

  ChatBubble.assistant(ChatReply this.reply)
    : fromUser = false,
      text = reply.text,
      isError = false;

  const ChatBubble.error(this.text)
    : fromUser = false,
      reply = null,
      isError = true;
}

class AssistantState {
  final List<ChatBubble> messages;

  /// True from sending a question until the answer (or error) arrives.
  final bool waiting;
  final String? conversationId;

  /// Follow-up questions from the last answer; empty before the first one.
  final List<String> suggestedPrompts;

  const AssistantState({
    this.messages = const [],
    this.waiting = false,
    this.conversationId,
    this.suggestedPrompts = const [],
  });

  AssistantState copyWith({
    List<ChatBubble>? messages,
    bool? waiting,
    String? conversationId,
    List<String>? suggestedPrompts,
  }) {
    return AssistantState(
      messages: messages ?? this.messages,
      waiting: waiting ?? this.waiting,
      conversationId: conversationId ?? this.conversationId,
      suggestedPrompts: suggestedPrompts ?? this.suggestedPrompts,
    );
  }
}

/// The conversation lives here, not in the screen, so it survives going to
/// another tab and coming back.
class AssistantController extends Notifier<AssistantState> {
  @override
  AssistantState build() => const AssistantState();

  /// [language] is `en` or `ar`; [errorText] is shown if the answer fails.
  Future<void> send(
    String text, {
    required String language,
    required String errorText,
  }) async {
    final message = text.trim();
    if (message.isEmpty || state.waiting) return;

    state = state.copyWith(
      messages: [...state.messages, ChatBubble.user(message)],
      waiting: true,
    );

    try {
      final reply = await ref
          .read(intelligenceApiProvider)
          .sendMessage(
            message: message,
            language: language,
            conversationId: state.conversationId,
          );
      state = state.copyWith(
        messages: [...state.messages, ChatBubble.assistant(reply)],
        waiting: false,
        conversationId: reply.conversationId,
        suggestedPrompts: reply.suggestedPrompts,
      );
    } catch (_) {
      state = state.copyWith(
        messages: [...state.messages, ChatBubble.error(errorText)],
        waiting: false,
      );
    }
  }
}

final assistantControllerProvider =
    NotifierProvider<AssistantController, AssistantState>(
      AssistantController.new,
    );

// -------------------------------------------------------- recommendations

class RecommendationsController extends AsyncNotifier<List<Recommendation>> {
  @override
  Future<List<Recommendation>> build() {
    return ref.watch(intelligenceApiProvider).getRecommendations();
  }

  Future<bool> accept(String id) => _answer(id, accept: true);

  Future<bool> dismiss(String id) => _answer(id, accept: false);

  /// The card leaves the list at once; it comes back if the server refuses.
  /// Returns whether the server accepted.
  Future<bool> _answer(String id, {required bool accept}) async {
    final before = state.value;
    if (before == null) return false;

    state = AsyncData([
      for (final r in before)
        if (r.id != id) r,
    ]);
    try {
      final api = ref.read(intelligenceApiProvider);
      accept
          ? await api.acceptRecommendation(id)
          : await api.dismissRecommendation(id);
      return true;
    } on AppException {
      state = AsyncData(before);
      return false;
    }
  }
}

final recommendationsProvider =
    AsyncNotifierProvider<RecommendationsController, List<Recommendation>>(
      RecommendationsController.new,
    );
