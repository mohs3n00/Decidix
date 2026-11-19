import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { DecidixIcon } from './DecidixIcon';

export const LegalFooter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isRTL, language, toggleLanguage } = useLanguage();

  return (
    <footer className={`bg-[#F8FAFC] text-[#061A3A] border-t border-[#E2E8F0] py-8 px-4 md:px-8 ${className}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-6 border-b border-[#E2E8F0]">
          {/* Logo & Platform Name (Direct Logo without AI Frame) */}
          <div className="flex items-center gap-3">
            <DecidixIcon name="splash_mark" size={32} className="shrink-0" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#061A3A] block">DECIDIX</span>
              <span className="text-[10px] text-[#64748B] font-semibold tracking-wider uppercase block">
                {isRTL ? 'المنصة الوطنية الذكية لدعم القرار' : 'National Intelligence Platform'}
              </span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <NavLink
              to="/landing"
              className="text-[#64748B] hover:text-blue transition py-1 font-medium whitespace-nowrap"
            >
              {isRTL ? 'عن المنصة' : 'About Decidix'}
            </NavLink>
            <span className="text-[#CBD5E1]">•</span>
            <NavLink
              to="/"
              className="text-[#64748B] hover:text-blue transition py-1 font-medium whitespace-nowrap"
            >
              {isRTL ? 'استعراض المنصة' : 'Explore Platform'}
            </NavLink>
            <span className="text-[#CBD5E1]">•</span>
            <NavLink
              to="/privacy"
              className="text-[#64748B] hover:text-blue transition py-1 font-medium whitespace-nowrap"
            >
              {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </NavLink>
            <span className="text-[#CBD5E1]">•</span>
            <NavLink
              to="/delete-account"
              className="text-rose-600 hover:text-rose-700 transition py-1 font-semibold whitespace-nowrap"
            >
              {isRTL ? 'حذف الحساب والبيانات' : 'Delete Account & Data'}
            </NavLink>
            <span className="text-[#CBD5E1]">•</span>
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 rounded-full bg-white hover:bg-[#F1F5F9] text-[#061A3A] font-semibold border border-[#E2E8F0] shadow-2xs transition whitespace-nowrap"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>

        {/* Footer Subtext */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px] text-[#64748B]">
          <p className="leading-relaxed">
            {isRTL
              ? 'ديسيدكس — منظومة وطنية متكاملة لرصد مؤشرات التنمية المستدامة، دعم اتخاذ القرار الإقليمي، ومحاكاة السياسات الاستثمارية.'
              : 'Decidix — National intelligent decision-support system for regional planning, sustainable development monitoring, and policy simulation.'}
          </p>
          <div className="shrink-0 text-[#94A3B8] font-medium whitespace-nowrap">
            © {new Date().getFullYear()} DECIDIX. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>
        </div>
      </div>
    </footer>
  );
};
