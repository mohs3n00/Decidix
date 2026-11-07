import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DecidixIcon, DecidixIconName } from '../components/DecidixIcon';
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal';
import clsx from 'clsx';

interface NavItem {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: DecidixIconName;
  badge?: string;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: 'overview' },
  { to: '/insights', labelEn: 'Sector Insights', labelAr: 'رؤى القطاعات', icon: 'insights' },
  { to: '/intelligence', labelEn: 'Intelligence Hub', labelAr: 'مركز الذكاء', icon: 'intelligence' },
  { to: '/decisions', labelEn: 'Decisions Hub', labelAr: 'صنع القرار', icon: 'decisions' },
];

const TOOLS_NAV: NavItem[] = [
  { to: '/assistant', labelEn: 'AI Assistant', labelAr: 'المساعد الذكي', icon: 'spark', badge: 'AI' },
  { to: '/datasets', labelEn: 'Data Platform (R2)', labelAr: 'إدارة البيانات (R2)', icon: 'economy' },
  { to: '/map', labelEn: 'Interactive Map', labelAr: 'الخريطة التفاعلية', icon: 'location' },
  { to: '/regions', labelEn: 'Regions Directory', labelAr: 'دليل المناطق', icon: 'overview' },
];

const ANALYTICS_NAV: NavItem[] = [
  { to: '/insights/priority', labelEn: 'Priority Queue', labelAr: 'طابور الأولويات', icon: 'trend_up' },
  { to: '/insights/historical', labelEn: 'Historical Trends', labelAr: 'المسار التاريخي', icon: 'insights' },
  { to: '/insights/comparison', labelEn: 'Region Comparison', labelAr: 'مقارنة المناطق', icon: 'overview' },
  { to: '/insights/data-quality', labelEn: 'Data Quality Audit', labelAr: 'جودة البيانات', icon: 'spark' },
];

const DECISIONS_NAV: NavItem[] = [
  { to: '/intelligence/predictions', labelEn: 'ML Forecasts', labelAr: 'التنبؤات الذكية', icon: 'intelligence' },
  { to: '/intelligence/recommendations', labelEn: 'Recommendations', labelAr: 'التوصيات', icon: 'spark' },
  { to: '/decisions/simulator', labelEn: 'What-If Simulator', labelAr: 'محاكي السياسات', icon: 'decisions' },
  { to: '/decisions/projects', labelEn: 'Projects Portfolio', labelAr: 'سجل المشاريع', icon: 'economy' },
  { to: '/decisions/citizen-reports', labelEn: 'Citizen Reports', labelAr: 'بلاغات المواطنين', icon: 'notifications' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavGroup = (titleEn: string, titleAr: string, items: NavItem[]) => {
    return (
      <div className="mb-6">
        <div className="px-4 mb-2 text-xs font-semibold tracking-wider uppercase text-faded-ink/80">
          {isRTL ? titleAr : titleEn}
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                  isActive
                    ? 'bg-blue text-white shadow-sm font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <DecidixIcon
                      name={item.icon}
                      size={18}
                      color={isActive ? '#FFFFFF' : 'currentColor'}
                    />
                    <span>{isRTL ? item.labelAr : item.labelEn}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-pill',
                        isActive ? 'bg-white text-blue' : 'bg-cyan text-navy'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-mist">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between bg-navy px-4 py-3 text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <DecidixIcon name="logo_white" size={28} />
          <span className="font-bold tracking-tight text-lg">DECIDIX</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-white/10 hover:bg-white/20"
          >
            {language === 'en' ? 'العربية' : 'EN'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Main Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={clsx(
          'fixed inset-y-0 z-40 w-72 bg-navy text-white flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0',
          isRTL ? 'right-0' : 'left-0',
          mobileMenuOpen ? 'translate-x-0' : isRTL ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-white/10">
            <DecidixIcon name="logo_white" size={36} />
            <div>
              <div className="font-extrabold text-xl tracking-tight leading-none text-white">
                DECIDIX
              </div>
              <div className="text-[11px] text-faded-ink tracking-wide font-medium mt-1">
                {isRTL ? 'منصة دعم القرار الإقليمي' : 'Decision Intelligence'}
              </div>
            </div>
          </div>

          {/* Navigation Links Scrollable Area */}
          <nav className="p-4 overflow-y-auto max-h-[calc(100vh-170px)]">
            {renderNavGroup('Core Navigation', 'التنقل الرئيسي', PRIMARY_NAV)}
            {renderNavGroup('Data & Assistant', 'البيانات والمساعد', TOOLS_NAV)}
            {renderNavGroup('Analytical Deep Dives', 'التحليلات العميقة', ANALYTICS_NAV)}
            {renderNavGroup('Decisions & Planning', 'التخطيط والسياسات', DECISIONS_NAV)}
            {isAdmin && renderNavGroup('Admin Portal', 'بوابة الإدارة', ADMIN_NAV)}
          </nav>
        </div>

        {/* User Account / Session Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-blue text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-white truncate">
                  {user?.name || (isRTL ? 'مستخدم المنصة' : 'Decidix User')}
                </div>
                <div className="text-xs text-cyan uppercase font-bold tracking-wider">
                  {user?.role || 'VIEWER'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPasswordModalOpen(true)}
                title={isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                ⚙
              </button>
              <button
                onClick={handleLogout}
                title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-white/10 transition"
              >
                ⎋
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-line shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-ink uppercase tracking-wider">
              {isRTL ? 'المنظومة متصلة — سحابة Heroku Staging & R2' : 'Decidix Platform Active — Heroku Staging & Cloudflare R2'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <NavLink
              to="/datasets"
              className="text-xs font-semibold px-3 py-1.5 rounded-pill bg-blue/10 text-blue hover:bg-blue/20 transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{isRTL ? 'رفع بيانات R2' : 'Upload Dataset'}</span>
            </NavLink>

            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold px-3 py-1.5 rounded-pill bg-well hover:bg-line text-navy border border-line transition"
            >
              {language === 'en' ? 'العربية (AR)' : 'English (EN)'}
            </button>

            <div className="h-4 w-px bg-line"></div>

            <button
              onClick={() => setPasswordModalOpen(true)}
              className="text-xs font-semibold text-ink hover:text-navy transition"
            >
              {isRTL ? 'الأمان' : 'Security'}
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
