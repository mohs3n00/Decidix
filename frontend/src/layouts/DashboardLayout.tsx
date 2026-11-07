import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DecidixIcon, DecidixIconName } from '../components/DecidixIcon';
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal';

interface NavItem {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: DecidixIconName;
  badge?: string;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', labelEn: 'Overview', labelAr: 'الرئيسية', icon: 'overview' },
  { to: '/insights', labelEn: 'Insights', labelAr: 'الرؤى والتحليلات', icon: 'insights' },
  { to: '/intelligence', labelEn: 'Intelligence', labelAr: 'الذكاء الاستراتيجي', icon: 'intelligence' },
  { to: '/decisions', labelEn: 'Decisions', labelAr: 'دعم القرار', icon: 'decisions' },
];

const TOOLS_NAV: NavItem[] = [
  { to: '/datasets', labelEn: 'R2 Datasets', labelAr: 'مجموعات البيانات R2', icon: 'economy' },
  { to: '/assistant', labelEn: 'AI Assistant', labelAr: 'المساعد الذكي', icon: 'spark' },
  { to: '/map', labelEn: 'Geographic Map', labelAr: 'الخريطة التفاعلية', icon: 'location' },
  { to: '/regions', labelEn: 'All Regions', labelAr: 'سجل المناطق', icon: 'location' },
];

const ANALYTICS_NAV: NavItem[] = [
  { to: '/insights/comparison', labelEn: 'Cross-Region Matrix', labelAr: 'المقارنة البينية', icon: 'insights' },
  { to: '/insights/historical', labelEn: 'Historical Trends', labelAr: 'التحليل التاريخي', icon: 'insights' },
  { to: '/insights/priority', labelEn: 'Priority Queue', labelAr: 'أولويات التدخل', icon: 'insights' },
  { to: '/insights/data-quality', labelEn: 'Data Freshness', labelAr: 'جودة وتزامن البيانات', icon: 'insights' },
];

const DECISIONS_NAV: NavItem[] = [
  { to: '/intelligence/predictions', labelEn: 'Forecast Models', labelAr: 'نماذج التنبؤ', icon: 'intelligence' },
  { to: '/intelligence/recommendations', labelEn: 'Interventions', labelAr: 'التوصيات الذكية', icon: 'intelligence' },
  { to: '/decisions/simulator', labelEn: 'What-If Simulator', labelAr: 'محاكي السياسات', icon: 'decisions' },
  { to: '/decisions/projects', labelEn: 'Project Tracker', labelAr: 'محفظة المشاريع', icon: 'decisions' },
  { to: '/decisions/citizen-reports', labelEn: 'Citizen Feedback', labelAr: 'مشاركات المواطنين', icon: 'decisions' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', labelEn: 'Admin Overview', labelAr: 'لوحة الإدارة', icon: 'account', adminOnly: true },
  { to: '/admin/users', labelEn: 'User Accounts', labelAr: 'إدارة المستخدمين', icon: 'account', adminOnly: true },
  { to: '/admin/notifications', labelEn: 'Push Broadcasts', labelAr: 'مركز الإشعارات', icon: 'notifications', adminOnly: true },
];

export const DashboardLayout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { language, isRTL, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavGroup = (titleEn: string, titleAr: string, items: NavItem[]) => {
    return (
      <div className="space-y-1 mb-5">
        <div className="px-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-faded-ink select-none">
          {isRTL ? titleAr : titleEn}
        </div>
        {items.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-pill text-xs font-semibold transition select-none ${
                isActive
                  ? 'bg-blue text-white shadow-decidix-tab font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <DecidixIcon
                  name={item.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : '#A5B4CB'}
                  className="shrink-0"
                />
                <span className="truncate">{isRTL ? item.labelAr : item.labelEn}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-pill shrink-0 ${
                    isActive ? 'bg-white text-blue' : 'bg-white/10 text-cyan'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-mist flex flex-col md:flex-row ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile Top App Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-navy text-white border-b border-white/10 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center p-1.5">
            <DecidixIcon name="logo_white" size={20} />
          </div>
          <span className="font-black text-sm tracking-tight font-display">DECIDIX</span>
        </div>

        <div className="flex items-center gap-2">
          {!user?.email_verified && (
            <NavLink
              to="/account"
              className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-amber-500/20 text-amber-300 border border-amber-400/30"
            >
              ⚠️ {isRTL ? 'تأكيد' : 'Verify'}
            </NavLink>
          )}

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-white/10 text-white"
          >
            {language === 'en' ? 'العربية' : 'EN'}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-white/80 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Persistent Left Sidebar */}
      <aside
        className={`w-64 bg-navy text-white flex-shrink-0 flex flex-col justify-between border-r border-white/10 z-30 transition-transform md:translate-x-0 ${
          mobileMenuOpen ? 'fixed inset-y-0 start-0 translate-x-0 z-50' : 'hidden md:flex'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-2 shadow-sm border border-white/10">
                <DecidixIcon name="logo_white" size={24} />
              </div>
              <div>
                <div className="font-black text-lg text-white tracking-tight font-display">DECIDIX</div>
                <div className="text-[10px] text-cyan uppercase font-bold tracking-wider">Regional Intelligence</div>
              </div>
            </div>

            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden text-white/70 hover:text-white p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Navigation Scroll Area */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {renderNavGroup('Core Navigation', 'التنقل الرئيسي', PRIMARY_NAV)}
            {renderNavGroup('Data & Assistant', 'البيانات والمساعد', TOOLS_NAV)}
            {renderNavGroup('Analytical Deep Dives', 'التحليلات العميقة', ANALYTICS_NAV)}
            {renderNavGroup('Decisions & Planning', 'التخطيط والسياسات', DECISIONS_NAV)}
            {isAdmin && renderNavGroup('Admin Portal', 'بوابة الإدارة', ADMIN_NAV)}
          </nav>
        </div>

        {/* User Account / Session Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/25">
          <div className="flex items-center justify-between gap-2">
            <NavLink
              to="/account"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 p-1.5 rounded-xl transition flex-1 overflow-hidden ${
                  isActive ? 'bg-white/15' : 'hover:bg-white/10'
                }`
              }
              title={isRTL ? 'إدارة الملف الشخصي' : 'Manage Profile & Security'}
            >
              <div className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-decidix-pill">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {user?.name || (isRTL ? 'مستخدم المنصة' : 'Decidix User')}
                </div>
                <div className="text-[10px] text-cyan font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>{user?.role || 'VIEWER'}</span>
                  {user?.email_verified && <span className="text-emerald-400">✓</span>}
                </div>
              </div>
            </NavLink>

            <div className="flex items-center gap-1 shrink-0">
              <NavLink
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                title={isRTL ? 'إعدادات الحساب' : 'Account Settings'}
                className={({ isActive }) =>
                  `p-1.5 rounded-lg transition ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <DecidixIcon name="account" size={14} color="#A5B4CB" />
              </NavLink>
              <button
                onClick={handleLogout}
                title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                className="p-1.5 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-white/10 transition"
              >
                <DecidixIcon name="back" size={14} color="#F87171" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 decidix-brand-backdrop">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-hairline shadow-sm relative z-20">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-ink">
              {isRTL
                ? 'المنظومة متصلة — سحابة Heroku Staging وقاعدة البيانات المكانية'
                : 'Platform Connected — Heroku Staging & Cloudflare R2'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!user?.email_verified && (
              <NavLink
                to="/account"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition shadow-sm"
              >
                <span>⚠️</span>
                <span>{isRTL ? 'تأكيد البريد الإلكتروني' : 'Verify Email'}</span>
              </NavLink>
            )}

            <NavLink
              to="/datasets"
              className="decidix-chip text-xs font-semibold bg-white border border-hairline hover:bg-well transition"
            >
              <DecidixIcon name="economy" size={14} color="var(--color-blue)" />
              <span>{isRTL ? 'إدارة البيانات R2' : 'R2 Data Platform'}</span>
            </NavLink>

            <button
              onClick={toggleLanguage}
              className="decidix-chip text-xs font-semibold bg-well hover:bg-hairline text-navy border border-hairline transition"
            >
              {language === 'en' ? 'العربية' : 'English (EN)'}
            </button>

            <div className="h-4 w-px bg-hairline" />

            <NavLink
              to="/account"
              className={({ isActive }) =>
                `p-2 rounded-pill transition border ${
                  isActive ? 'bg-navy text-white border-navy' : 'bg-well hover:bg-hairline text-ink hover:text-navy border-hairline'
                }`
              }
              title={isRTL ? 'إعدادات الحساب' : 'Account Security'}
            >
              <DecidixIcon name="account" size={16} />
            </NavLink>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10">
          <div className="max-w-[1360px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Change Password Dialog fallback */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
