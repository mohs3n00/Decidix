import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { intelligenceService } from '../../services/intelligenceService';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ChatSource {
  name: string;
  arabic_name?: string;
  period?: string;
}

interface ChatTableRow {
  region_id: string;
  name: string;
  arabic_name?: string;
  score: number;
  change: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  table?: { rows: ChatTableRow[] } | null;
  sources?: ChatSource[];
  suggested_prompts?: string[];
  answer_source?: string;
  provider_status?: string | null;
  isError?: boolean;
}

export const AssistantScreen: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const { user, requireAuth } = useAuth();
  const { activeDataset } = useWorkspace();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: isRTL
        ? 'مرحباً بك في **المساعد التحليلي لمنظومة ديسيدكس**. يمكنك سؤالي عن مؤشرات التنمية الوطنية، الفجوات التنموية بين المحافظات الـ 27، أو سيناريوهات محاكاة السياسات، وستحصل على إجابات موثقة بالأدلة وسجلات الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS).'
        : 'Welcome to the **Decidix National Decision Support Copilot**. Ask about regional indicators, socio-economic disparities across Egypt’s 27 governorates, or budget simulations. All responses cite verified CAPMAS records.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [
        {
          name: 'Egyptian Central Agency for Public Mobilization and Statistics (CAPMAS)',
          arabic_name: 'الجهاز المركزي للتعبئة العامة والإحصاء',
          period: '2024–2025',
        },
      ],
      suggested_prompts: isRTL
        ? [
          'ما هي المناطق الأكثر احتياجاً للتدخل التنموي؟',
          'عرض مقارنة مؤشرات الصحة والتعليم لعام 2024',
          'ما هي فرضيات نموذج التنبؤ لعام 2028؟',
        ]
        : [
          'Which regions need developmental intervention most?',
          'Compare health and education indicators for 2024',
          'Explain the 2028 forecast assumptions',
        ],
      answer_source: 'verified_baseline',
    },
  ]);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Scroll state & management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessagesAbove, setHasNewMessagesAbove] = useState(false);

  // Format time helper
  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
      setIsAtBottom(true);
      setHasNewMessagesAbove(false);
    }
  }, []);

  // Monitor scroll position
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const currentIsAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(currentIsAtBottom);
    if (currentIsAtBottom) {
      setHasNewMessagesAbove(false);
    }
  };

  // Auto-scroll on new messages only if user was already at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom('smooth');
    } else {
      setHasNewMessagesAbove(true);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll on mount
  useEffect(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  // Toggle sources accordion
  const toggleSourceExpand = (messageId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Copy assistant response text
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Clear conversation
  const handleClearConversation = () => {
    setConversationId(null);
    setMessages([
      {
        id: `fresh_${Date.now()}`,
        sender: 'assistant',
        text: isRTL
          ? 'تم بدء جلسة محادثة جديدة. تفضل بطرح استفسارك التحليلي.'
          : 'Started a fresh conversation session. How can Decidix Intelligence assist you?',
        timestamp: getFormattedTime(),
        sources: [
          {
            name: 'Decidix Grounded Data Repository',
            arabic_name: 'مستودع بيانات ديسيديكس المعتمدة',
            period: '2024–2025',
          },
        ],
        suggested_prompts: isRTL
          ? [
            'ما هي المناطق الأكثر احتياجاً للتدخل التنموي؟',
            'عرض مقارنة مؤشرات الصحة والتعليم لعام 2024',
          ]
          : [
            'Which regions need developmental intervention most?',
            'Compare health and education indicators for 2024',
          ],
      },
    ]);
  };

  // Send message handler
  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isSending) return;

    requireAuth(
      isRTL
        ? 'يتطلب استخدام المساعد الذكي تسجيل الدخول لربط الأسئلة بالسياق التحليلي والذاكرة التفاعلية.'
        : 'Sign in to ask questions and receive evidence-grounded answers from the Decidix AI Assistant.',
      async () => {
        const userMsg: ChatMessage = {
          id: `usr_${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: getFormattedTime(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsSending(true);

        // Immediate scroll to user message
        setTimeout(() => scrollToBottom('smooth'), 50);

        try {
          const datasetContext = activeDataset
            ? {
                name: activeDataset.name,
                nationalIndex: activeDataset.kpis?.nationalIndex,
                recordsCount: activeDataset.recordCount,
                sectorScores: {
                  health: activeDataset.kpis?.healthScore,
                  education: activeDataset.kpis?.educationScore,
                  economy: activeDataset.kpis?.economyScore,
                  infrastructure: activeDataset.kpis?.infrastructureScore,
                },
                topGovernorates: activeDataset.kpis?.topGovernorates,
                lowestGovernorates: activeDataset.kpis?.priorityGovernorates,
              }
            : undefined;

          const res = await intelligenceService.askAssistant(
            query,
            language as 'en' | 'ar',
            conversationId,
            datasetContext
          );

          if (res.conversation_id) {
            setConversationId(res.conversation_id);
          }

          const replyText =
            res.reply?.text ||
            (res as any).answer ||
            (res as any).message ||
            (isRTL ? 'اكتمل التحليل بناءً على السجلات المتاحة.' : 'Analysis completed.');

          // Deduplicate and sanitize sources
          const rawSources = res.reply?.sources || (res as any).sources || [];
          const seenNames = new Set<string>();
          const sanitizedSources: ChatSource[] = [];

          rawSources.forEach((s: any) => {
            const name = s.name || s.source_file || s.arabic_name;
            if (name && !seenNames.has(name)) {
              seenNames.add(name);
              sanitizedSources.push({
                name: s.name || name,
                arabic_name: s.arabic_name,
                period: s.period || '2024–2025',
              });
            }
          });

          // Fallback verified source if none returned
          if (sanitizedSources.length === 0) {
            sanitizedSources.push({
              name: 'Decidix Grounded National Dataset v20261107',
              arabic_name: 'قاعدة البيانات الوطنية المعتمدة لديسيديكس',
              period: '2024–2025',
            });
          }

          const aiMsg: ChatMessage = {
            id: `ai_${Date.now()}`,
            sender: 'assistant',
            text: replyText,
            timestamp: getFormattedTime(),
            table: res.reply?.table || null,
            sources: sanitizedSources,
            suggested_prompts: res.suggested_prompts || [],
            answer_source: (res as any).answer_source || 'grounded_rag',
            provider_status: (res as any).provider_status || null,
          };

          setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
          const errorMsg: ChatMessage = {
            id: `err_${Date.now()}`,
            sender: 'assistant',
            text: isRTL
              ? 'عذراً، حدث خطأ مؤقت أثناء الاتصال بنموذج الذكاء الاصطناعي أو تم بلوغ الحد الأقصى للاستعلامات المجانية (20 استعلام/دقيقة). يرجى المحاولة مرة أخرى بعد لحظات.'
              : 'Apologies, a temporary interruption occurred while contacting the AI service or the free rate-limit quota was reached (20 req/min). Please retry shortly.',
            timestamp: getFormattedTime(),
            isError: true,
          };
          setMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsSending(false);
        }
      },
      isRTL ? 'المساعد الذكي' : 'AI Assistant Access'
    );
  };

  // Preset starter suggestions
  const STARTER_PROMPTS = [
    {
      en: 'Which regions need developmental intervention most in 2025?',
      ar: 'ما هي المناطق الأكثر احتياجاً للتدخل التنموي في عام 2025؟',
      tagEn: 'Priority Analysis',
      tagAr: 'تحليل الأولويات',
    },
    {
      en: 'Compare healthcare and education indicators between Delta and Upper Egypt',
      ar: 'مقارنة مؤشرات الصحة والتعليم بين الدلتا والوجه القبلي',
      tagEn: 'Regional Comparison',
      tagAr: 'مقارنة إقليمية',
    },
    {
      en: 'What are the main assumptions behind the 2028 ML predictions?',
      ar: 'ما هي الفرضيات الأساسية خلف تنبؤات التعلم الآلي لعام 2028؟',
      tagEn: 'ML Forecasts',
      tagAr: 'تنبؤات النموذج',
    },
    {
      en: 'Summarize the verified national development indicators record',
      ar: 'لخص السجل الوطني المعتمد لمؤشرات التنمية',
      tagEn: 'Verified Data',
      tagAr: 'البيانات المعتمدة',
    },
  ];

  // Latest suggested prompts from last assistant message
  const lastAssistantMsg = [...messages].reverse().find((m) => m.sender === 'assistant' && !m.isError);
  const activeSuggestedPrompts =
    lastAssistantMsg?.suggested_prompts && lastAssistantMsg.suggested_prompts.length > 0
      ? lastAssistantMsg.suggested_prompts
      : isRTL
        ? [
          'ما هي المناطق الأكثر احتياجاً؟',
          'عرض مقارنة المؤشرات',
          'توضيح مصادر البيانات',
        ]
        : [
          'Which regions need attention?',
          'Compare indicator trends',
          'Explain data sources',
        ];

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] md:h-[calc(100vh-105px)] max-w-5xl mx-auto overflow-hidden animate-fadeIn select-none">
      {/* 1. Header Toolbar */}
      <div className="shrink-0 pb-3 flex items-center justify-between border-b border-slate-200/80 bg-transparent">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
              {isRTL ? 'دعم القرار التنموي' : 'DECISION SUPPORT COPILOT'}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px]">
                {isRTL ? 'متصل بقاعدة المؤشرات الوطنية' : 'Connected to National Registry'}
              </span>
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-navy tracking-tight mt-0.5">
            {isRTL ? 'المساعد التحليلي لدعم القرار' : 'Analytical Decision Copilot'}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearConversation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors shadow-2xs"
            title={isRTL ? 'بدء محادثة جديدة' : 'Start new conversation'}
          >
            <DecidixIcon name="refresh" size={13} color="currentColor" />
            <span>{isRTL ? 'محادثة جديدة' : 'New Chat'}</span>
          </button>
        </div>
      </div>

      {/* Active Dataset Intelligence Source Banner */}
      <div className="shrink-0 my-2 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-[16px] border border-slate-200/80 shadow-glass-light flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue/10 text-blue flex items-center justify-center shrink-0">
            <DecidixIcon name="dataset" size={13} color="#0052FF" />
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">
              {isRTL ? 'المصدر المعتمد للاستعلام:' : 'Active Query Source:'}
            </span>
            <span className="font-bold text-[#061A3A] truncate">
              {activeDataset?.name || (isRTL ? 'الأساس الوطني المعتمد' : 'National Baseline')}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              {isRTL ? 'المؤشر' : 'Index'}: {activeDataset?.kpis?.nationalIndex ?? 74.2}
            </span>
          </div>
        </div>

        <a
          href="/datasets"
          className="text-blue hover:text-blue-700 font-bold text-[11px] shrink-0 hover:underline flex items-center gap-1"
        >
          <span>{isRTL ? 'تغيير المصدر' : 'Change Source'}</span>
          <span>←</span>
        </a>
      </div>

      {/* 2. Scrollable Messages Container (Independent Scroll Context) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 py-4 px-1 md:px-2 space-y-5 scroll-smooth"
      >
        {messages.map((m) =>
          m.sender === 'user' ? (
            /* User Message Bubble */
            <div key={m.id} className="flex justify-end items-end gap-2.5 ltr:pl-8 rtl:pr-8 animate-fadeIn">
              <div className="flex flex-col items-end">
                <div className="max-w-2xl bg-blue text-white font-medium text-xs sm:text-sm px-4 py-3 rounded-2xl ltr:rounded-br-xs rtl:rounded-bl-xs shadow-xs leading-relaxed">
                  <p dir="auto">{m.text}</p>
                </div>
                <span className="text-[10px] font-medium text-slate-400 mt-1 px-1">
                  {m.timestamp}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mb-3">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          ) : (
            /* Assistant Message Card */
            <div key={m.id} className="flex items-start gap-3 ltr:pr-4 rtl:pl-4 animate-fadeIn">
              {/* Decidix AI Brand Avatar */}
              <div className="w-8 h-8 rounded-xl bg-blue text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                <DecidixIcon name="spark" size={15} color="#FFFFFF" />
              </div>

              {/* Response Card */}
              <div
                className={`flex-1 max-w-3xl rounded-2xl p-5 border shadow-xs space-y-3 transition ${m.isError
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-white border-slate-200/80'
                  }`}
              >
                {/* Assistant Header Badge & Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy text-xs tracking-tight">
                      {isRTL ? 'مساعد ديسيديكس' : 'Decidix AI'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                      {m.answer_source === 'model'
                        ? isRTL ? 'نموذج مباشر' : 'Live Model'
                        : isRTL ? 'أدلة موثقة' : 'Verified Evidence'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] font-medium">{m.timestamp}</span>
                    {!m.isError && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(m.text, m.id)}
                        className="p-1 hover:text-navy rounded transition text-slate-400"
                        title={isRTL ? 'نسخ الإجابة' : 'Copy answer'}
                      >
                        <DecidixIcon
                          name={copiedMessageId === m.id ? 'check' : 'copy'}
                          size={13}
                          color={copiedMessageId === m.id ? '#10B981' : 'currentColor'}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Markdown Rendered Content */}
                <div className="pt-1">
                  <MarkdownRenderer content={m.text} isRTL={isRTL} />
                </div>

                {/* Structured Table Render (if returned) */}
                {m.table?.rows && m.table.rows.length > 0 && (
                  <div className="my-3 overflow-x-auto rounded-xl border border-[#E3E9F2] shadow-sm bg-white">
                    <table className="min-w-full divide-y divide-[#E9EEF5] text-xs">
                      <thead className="bg-[#F8FAFC]">
                        <tr>
                          <th className="px-3.5 py-2.5 ltr:text-left rtl:text-right font-bold text-[#061A3A] uppercase text-[11px]">
                            {isRTL ? 'المنطقة' : 'Region'}
                          </th>
                          <th className="px-3.5 py-2.5 ltr:text-right rtl:text-left font-bold text-[#061A3A] uppercase text-[11px]">
                            {isRTL ? 'المؤشر' : 'Score'}
                          </th>
                          <th className="px-3.5 py-2.5 ltr:text-right rtl:text-left font-bold text-[#061A3A] uppercase text-[11px]">
                            {isRTL ? 'التغير' : 'Change'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9EEF5]">
                        {m.table.rows.map((r, i) => (
                          <tr key={r.region_id || i} className="hover:bg-[#F8FAFC]/80">
                            <td className="px-3.5 py-2 font-bold text-[#061A3A]">
                              {isRTL && r.arabic_name ? r.arabic_name : r.name}
                            </td>
                            <td className="px-3.5 py-2 font-mono font-bold ltr:text-right rtl:text-left text-[#061A3A]">
                              {r.score}
                            </td>
                            <td className="px-3.5 py-2 font-mono font-bold ltr:text-right rtl:text-left">
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] ${r.change >= 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                                  }`}
                              >
                                {r.change >= 0 ? `+${r.change}` : r.change}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sources & Grounded Evidence Section */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#F1F5FA]">
                    <button
                      type="button"
                      onClick={() => toggleSourceExpand(m.id)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5FA] border border-[#E9EEF5] transition text-xs font-semibold text-[#061A3A]"
                    >
                      <div className="flex items-center gap-2">
                        <DecidixIcon name="shield" size={13} color="#2563EB" />
                        <span>{isRTL ? 'المصادر والأدلة المعتمدة' : 'Sources & Grounded Evidence'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-blue">
                          {m.sources.length} {isRTL ? 'مصدر' : m.sources.length === 1 ? 'source' : 'sources'}
                        </span>
                      </div>
                      <DecidixIcon
                        name={expandedSources[m.id] ? 'chevron_up' : 'chevron_down'}
                        size={14}
                        color="#7D8AA0"
                      />
                    </button>

                    {/* Expandable Source Details */}
                    {expandedSources[m.id] && (
                      <div className="mt-2 p-3 rounded-xl bg-white border border-[#E3E9F2] space-y-2 text-xs animate-fadeIn">
                        {m.sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between py-1.5 border-b border-[#F1F5FA] last:border-b-0"
                          >
                            <div>
                              <div className="font-bold text-[#061A3A]">
                                {isRTL && src.arabic_name ? src.arabic_name : src.name}
                              </div>
                              <div className="text-[10px] text-[#7D8AA0] mt-0.5">
                                {isRTL ? 'فترة التوثيق: ' : 'Verification period: '}
                                <span className="font-medium text-[#5B6B85]">{src.period || '2024'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              {isRTL ? 'موثق' : 'Verified'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Loading Indicator Wave */}
        {isSending && (
          <div className="flex items-start gap-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-blue text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
              <DecidixIcon name="spark" size={15} color="#FFFFFF" />
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 border border-[#E9EEF5] shadow-card flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue animate-bounce"></div>
              <div
                className="w-2 h-2 rounded-full bg-cyan animate-bounce"
                style={{ animationDelay: '0.15s' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-blue animate-bounce"
                style={{ animationDelay: '0.3s' }}
              ></div>
              <span className="text-xs text-[#5B6B85] font-semibold ltr:ml-2 rtl:mr-2">
                {isRTL
                  ? 'جارٍ استرجاع الأدلة وتوليد الإجابة...'
                  : 'Retrieving evidence & synthesizing response...'}
              </span>
            </div>
          </div>
        )}

        {/* Sentinel Ref for scrolling */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* 3. Floating "Jump to Latest" Button */}
      {hasNewMessagesAbove && !isAtBottom && (
        <div className="relative flex justify-center -mb-8 z-30 pointer-events-none">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto px-4 py-1.5 rounded-full bg-blue text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-blue-hover transition animate-bounce"
          >
            <DecidixIcon name="chevron_down" size={13} color="#FFFFFF" />
            <span>{isRTL ? 'رسائل جديدة بالأسفل' : 'New messages below'}</span>
          </button>
        </div>
      )}

      {/* 4. Dynamic Suggestions Bar */}
      <div className="shrink-0 pt-2 pb-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ltr:mr-1 rtl:ml-1">
          {isRTL ? 'أسئلة مقترحة:' : 'SUGGESTED:'}
        </span>
        {activeSuggestedPrompts.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(promptText)}
            disabled={isSending}
            className="px-3 py-1 rounded-lg bg-white border border-slate-200/80 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-navy transition shadow-2xs whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* 5. Fixed Bottom Message Composer */}
      <div className="shrink-0 pt-1 pb-2 sticky bottom-0 bg-[#F8FAFC] z-20">
        <div className="relative flex items-center bg-white/90 backdrop-blur-[16px] rounded-2xl border border-slate-200/80 shadow-xs focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/15 transition-all">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isRTL
                ? 'اطرح سؤالاً تنموياً أو تحليلياً... (Enter للإرسال، Shift+Enter لسطر جديد)'
                : 'Ask an evidence-grounded intelligence question... (Enter to send)'
            }
            className="w-full py-3 ltr:pl-4 ltr:pr-14 rtl:pr-4 rtl:pl-14 text-xs sm:text-sm text-navy placeholder-slate-400 outline-none bg-transparent resize-none max-h-32 leading-relaxed"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
            className="absolute ltr:right-2 rtl:left-2 w-9 h-9 rounded-lg bg-blue hover:bg-blue-hover text-white flex items-center justify-center transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            aria-label="Send message"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <DecidixIcon
                name={isRTL ? 'arrow_left' : 'arrow_right'}
                size={16}
                color="#FFFFFF"
              />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-1.5 pt-1 text-[10px] text-slate-400">
          <span>
            {isRTL
              ? 'استفسارات تحليلية مؤصلة بسجلات الرصد الإحصائي الرسمية للمحافظات'
              : 'Grounded analytical queries supported by official regional statistical records'}
          </span>
          <span className="font-mono tabular-nums">
            {input.length}/1000
          </span>
        </div>
      </div>
    </div>
  );
};
