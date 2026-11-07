import React, { useState, useRef, useEffect } from 'react';
import { intelligenceService } from '../../services/intelligenceService';
import { AssistantChatMessage } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { ProvenanceCard } from '../../components/ProvenanceCard';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const AssistantScreen: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: 'assistant',
      content: isRTL
        ? 'مرحباً بك في المساعد الذكي لمنصة Decidix. أنا مدرب على بيانات المحافظات والمؤشرات التنموية في مصر. كيف يمكنني مساعدتك في دعم القرار اليوم؟'
        : 'Welcome to the Decidix Regional Intelligence Assistant. I am grounded in verified Egyptian regional indicators and development records. How can I assist your policy planning today?',
      provenance: {
        answer_source: 'model',
        model_name: 'Decidix RAG Engine',
      },
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (msgToSend?: string) => {
    const text = msgToSend || inputMessage;
    if (!text.trim() || isSending) return;

    const userMessage: AssistantChatMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!msgToSend) setInputMessage('');
    setIsSending(true);

    try {
      const response = await intelligenceService.chatAssistant({
        message: text,
        language: language as 'en' | 'ar',
        conversation_id: conversationId,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const botReply: AssistantChatMessage = {
        role: 'assistant',
        content: response.reply?.content || (response.reply as any)?.text || 'No response generated.',
        table: response.reply?.table || null,
        provenance: response.provenance || (response.reply as any)?.provenance,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isRTL
            ? `عذراً، حدث خطأ أثناء الاتصال بمحرك الذكاء الاصطناعي: ${err?.message || 'تعذر استرجاع الإجابة'}`
            : `Sorry, an error occurred while connecting to the intelligence engine: ${err?.message || 'Request failed'}`,
          provenance: {
            answer_source: 'refusal',
            provider_status: 'unavailable',
          },
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const SUGGESTED_PROMPTS = isRTL
    ? [
        'ما هي المحافظات الأكثر احتياجاً لدعم قطاع التعليم؟',
        'قارن بين أداء قطاعي الصحة والبنية التحتية في مصر.',
        'ما هي التوصيات ذات الأثر الأعلى لتحسين المؤشر الوطني؟',
        'استخرج ملخصاً لمؤشرات محافظة القاهرة والإسكندرية.',
      ]
    : [
        'Which regions need the most urgent support in education?',
        'Compare healthcare vs infrastructure performance across regions.',
        'What policy interventions yield the highest index gain?',
        'Summarize key indicators for Cairo and Alexandria.',
      ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col decidix-card bg-white overflow-hidden shadow-lg border border-line">
      {/* Header Bar */}
      <div className="p-4 md:p-6 border-b border-line bg-gradient-to-r from-navy via-navy to-[#0F2B59] text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/20 border border-cyan/40 flex items-center justify-center">
            <DecidixIcon name="spark" size={20} color="#21EAF4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg leading-none">
                {isRTL ? 'مساعد Decidix الذكي' : 'Decidix Intelligence Assistant'}
              </h2>
              <span className="decidix-pill-badge bg-cyan text-navy font-bold text-[10px]">
                ZERO-COST RAG
              </span>
            </div>
            <div className="text-xs text-white/70 mt-1">
              {isRTL ? 'مرتبط مباشرة بقاعدة بيانات المحافظات وسحابة R2' : 'Strictly grounded in canonical database records'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([messages[0]]);
            setConversationId(null);
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-pill bg-white/10 hover:bg-white/20 text-white/80 transition"
        >
          {isRTL ? 'محادثة جديدة' : 'New Chat'}
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 bg-mist/40">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                isUser ? 'ml-auto' : 'mr-auto'
              } w-full`}
            >
              <div
                className={`p-4 md:p-5 rounded-card text-sm leading-relaxed shadow-sm w-full ${
                  isUser
                    ? 'bg-blue text-white rounded-tr-none'
                    : 'bg-white text-navy border border-line rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Optional Table Rendering */}
                {msg.table && msg.table.headers && (
                  <div className="mt-4 overflow-x-auto rounded-well border border-line bg-well/50">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-well text-navy font-bold border-b border-line">
                          {msg.table.headers.map((h, i) => (
                            <th key={i} className="p-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {msg.table.rows?.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 font-medium text-navy">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Provenance Card for Assistant */}
              {!isUser && msg.provenance && (
                <div className="mt-2 w-full max-w-xl">
                  <ProvenanceCard provenance={msg.provenance} />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-3 p-4 rounded-card bg-white border border-line max-w-sm text-sm text-ink">
            <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin"></div>
            <span>{isRTL ? 'المساعد يقوم بفحص قاعدة البيانات وصياغة الرد...' : 'Querying database & reasoning with zero-cost model...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (if chat is short) */}
      {messages.length <= 2 && (
        <div className="p-3 bg-white border-t border-line flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-bold text-faded-ink uppercase tracking-wider px-2">
            {isRTL ? 'أسئلة مقترحة:' : 'Suggestions:'}
          </span>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs bg-well hover:bg-line text-navy px-3 py-1.5 rounded-pill transition border border-line truncate max-w-xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-line">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isSending}
            placeholder={
              isRTL
                ? 'اطرح سؤالاً عن المحافظات، المؤشرات، أو خطط التدخل...'
                : 'Ask about regions, KPIs, sector performance, or budget tradeoffs...'
            }
            className="decidix-input flex-1 py-3"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="decidix-btn-primary px-6 py-3 font-bold text-xs"
          >
            {isRTL ? 'إرسال' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};
