import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DecidixIcon } from './DecidixIcon';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isRTL?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  isRTL = false,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div
      dir="auto"
      className={`prose prose-sm max-w-none text-[#061A3A] leading-relaxed break-words font-sans ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl md:text-2xl font-black text-[#061A3A] tracking-tight mt-4 mb-2 first:mt-0 font-display">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg md:text-xl font-bold text-[#061A3A] tracking-tight mt-3 mb-2 first:mt-0 font-display">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm md:text-base font-bold text-[#061A3A] mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs md:text-sm font-bold text-[#061A3A] mt-2 mb-1 first:mt-0 uppercase tracking-wider">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p dir="auto" className="text-sm text-[#061A3A] leading-relaxed font-medium mb-3 last:mb-0">
              {children}
            </p>
          ),

          // Bold & Emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-[#061A3A]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-[#5B6B85]">{children}</em>,

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-1 mb-3 text-sm text-[#061A3A] font-medium">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ltr:pl-5 rtl:pr-5 space-y-1 mb-3 text-sm text-[#061A3A] font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="ltr:border-l-4 rtl:border-r-4 border-blue ltr:pl-3.5 rtl:pr-3.5 py-1.5 my-3 bg-[#EFF6FF]/40 rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl text-xs md:text-sm text-[#5B6B85] italic">
              {children}
            </blockquote>
          ),

          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#E3E9F2] shadow-sm bg-white">
              <table className="min-w-full divide-y divide-[#E9EEF5] text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F8FAFC] border-b border-[#E3E9F2]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#E9EEF5] bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#F8FAFC]/70 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 ltr:text-left rtl:text-right font-bold text-[#061A3A] tracking-wider uppercase text-[11px] whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-[#061A3A] font-medium whitespace-nowrap">
              <bdi>{children}</bdi>
            </td>
          ),

          // Code blocks & Inline code
          code: ({ className: codeClassName, children, ...props }: any) => {
            const isInline = !codeClassName && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  dir="ltr"
                  className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-[#F1F5FA] text-[#2563EB] border border-[#E3E9F2] inline-block font-semibold"
                >
                  <bdi>{children}</bdi>
                </code>
              );
            }

            const codeText = String(children).replace(/\n$/, '');
            const blockId = `code_${Math.random().toString(36).substring(2, 9)}`;

            return (
              <div className="relative my-3 rounded-xl overflow-hidden bg-[#061A3A] border border-[#1B2E4B] text-white">
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#041126] border-b border-[#1B2E4B] text-[10px] text-[#7D8AA0] font-mono uppercase tracking-wider">
                  <span>{codeClassName ? codeClassName.replace('language-', '') : 'Code'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeText, blockId)}
                    className="flex items-center gap-1 text-[11px] font-sans font-medium text-[#7D8AA0] hover:text-white transition"
                  >
                    <DecidixIcon
                      name={copiedCodeId === blockId ? 'check' : 'copy'}
                      size={12}
                      color="currentColor"
                    />
                    <span>{copiedCodeId === blockId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre dir="ltr" className="p-3.5 overflow-x-auto text-xs font-mono text-cyan leading-relaxed">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:text-blue-hover underline font-semibold transition"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-[#E9EEF5]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
