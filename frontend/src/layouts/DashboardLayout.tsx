import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { DecidixIcon, DecidixIconName } from '../components/DecidixIcon';

interface NavItem {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: DecidixIconName;
  badge?: string;
  adminOnly?: boolean;
}

const WORKSPACE_NAV: NavItem[] = [
  { to: '/overview', labelEn: 'Overview', labelAr: 'الرئيسية', icon: 'overview' },
  { to: '/insights', labelEn: 'Insights', labelAr: 'التحليلات', icon: 'insights' },
  { to: '/intelligence', labelEn: 'Intelligence', labelAr: 'الذكاء الاستراتيجي', icon: 'intelligence' },
  { to: '/decisions', labelEn: 'Decisions', labelAr: 'دعم القرار', icon: 'decisions' },
];

const TOOLS_NAV: NavItem[] = [
  { to: '/datasets', labelEn: 'Datasets', labelAr: 'مجموعات البيانات', icon: 'economy' },
  { to: '/team', labelEn: 'Teams & Workspaces', labelAr: 'فرق العمل والمؤسسة', icon: 'account' },
  { to: '/assistant', labelEn: 'AI Assistant', labelAr: 'المساعد الذكي', icon: 'spark' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', labelEn: 'Admin overview', labelAr: 'لوحة الإدارة', icon: 'overview', adminOnly: true },
  { to: '/admin/users', labelEn: 'User management', labelAr: 'إدارة المستخدمين', icon: 'account', adminOnly: true },
  { to: '/admin/notifications', labelEn: 'Notifications', labelAr: 'مركز الإشعارات', icon: 'notifications', adminOnly: true },
];

export const DashboardLayout: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { language, isRTL, toggleLanguage } = useLanguage();
  const {
    activeDataset,
    approvedDatasets,
    selectActiveDataset,
    currentWorkspaceName,
    teams,
    activeTeam,
    switchWorkspace,
  } = useWorkspace();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Desktop collapsible sidebar state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('decidix_sidebar_collapsed') === 'true';
  });

  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('decidix_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close mobile drawer on route change & handle body scroll lock
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getBreadcrumb = (): { section: string; title: string } => {
    const p = location.pathname;
    const ws = isRTL ? 'مساحة العمل' : 'Workspace';
    const adminWs = isRTL ? 'مساحة العمل / الإدارة' : 'Workspace / Admin';

    if (p === '/' || p === '/overview' || p === '/overview/dashboard') return { section: ws, title: isRTL ? 'نظرة عامة' : 'Overview' };
    if (p.startsWith('/insights')) {
      if (p.includes('/comparison')) return { section: ws, title: isRTL ? 'مقارنة المناطق' : 'Insights / Region Comparison' };
      if (p.includes('/historical')) return { section: ws, title: isRTL ? 'التحليل التاريخي' : 'Insights / Historical Analysis' };
      if (p.includes('/priority')) return { section: ws, title: isRTL ? 'أولويات التنمية' : 'Insights / Development Priority' };
      if (p.includes('/data-quality')) return { section: ws, title: isRTL ? 'جودة البيانات' : 'Insights / Data Quality' };
      return { section: ws, title: isRTL ? 'التحليلات' : 'Insights' };
    }
    if (p.startsWith('/intelligence')) {
      if (p.includes('/predictions')) return { section: ws, title: isRTL ? 'تنبؤات الذكاء الاصطناعي' : 'Intelligence / ML Predictions' };
      if (p.includes('/recommendations')) return { section: ws, title: isRTL ? 'التوصيات الذكية' : 'Intelligence / AI Recommendations' };
      return { section: ws, title: isRTL ? 'الذكاء الاستراتيجي' : 'Intelligence' };
    }
    if (p.startsWith('/decisions')) {
      if (p.includes('/simulator')) return { section: ws, title: isRTL ? 'محاكي السياسات' : 'Decisions / What-If Simulator' };
      if (p.includes('/projects')) return { section: ws, title: isRTL ? 'مشاريع التنمية' : 'Decisions / Development Projects' };
      if (p.includes('/citizen-reports')) return { section: ws, title: isRTL ? 'مشاركات المواطنين' : 'Decisions / Citizen Reports' };
      return { section: ws, title: isRTL ? 'دعم القرار' : 'Decisions' };
    }
    if (p === '/datasets') return { section: ws, title: isRTL ? 'مجموعات البيانات' : 'Datasets' };
    if (p === '/team') return { section: ws, title: isRTL ? 'فرق العمل والمؤسسة' : 'Teams & Collaboration' };
    if (p === '/assistant') return { section: ws, title: isRTL ? 'المساعد الذكي' : 'AI Assistant' };
    if (p === '/map') return { section: ws, title: isRTL ? 'الخريطة التفاعلية' : 'Overview / Interactive Map' };
    if (p === '/regions') return { section: ws, title: isRTL ? 'سجل المناطق' : 'Overview / Regions' };
    if (p.startsWith('/regions/')) return { section: ws, title: isRTL ? 'الملف الإقليمي' : 'Overview / Region Profile' };
    if (p === '/account') return { section: ws, title: isRTL ? 'إعدادات الحساب' : 'Account & Security' };
    if (p.startsWith('/admin')) {
      if (p.includes('/users')) return { section: adminWs, title: isRTL ? 'إدارة المستخدمين' : 'User management' };
      if (p.includes('/notifications')) return { section: adminWs, title: isRTL ? 'مركز الإشعارات' : 'Notifications' };
      return { section: adminWs, title: isRTL ? 'لوحة الإدارة' : 'Admin overview' };
    }
    return { section: ws, title: isRTL ? 'المنصة' : 'Platform' };
  };

  const breadcrumb = getBreadcrumb();

  const renderNavGroup = (titleEn: string, titleAr: string, items: NavItem[], isCollapsed = false) => {
    return (
      <div className="mb-4">
        {!isCollapsed ? (
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
            {isRTL ? titleAr : titleEn}
          </div>
        ) : (
          <div className="h-px bg-slate-200/80 my-2 mx-2" />
        )}
        <div className="space-y-1">
          {items.map((item) => {
            const isActive =
              item.to === '/overview'
                ? location.pathname === '/overview' || location.pathname === '/overview/dashboard'
                : location.pathname.startsWith(item.to);

            const label = isRTL ? item.labelAr : item.labelEn;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                title={isCollapsed ? label : undefined}
                className={`group flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                } min-h-[42px] py-2 rounded-xl text-xs font-semibold transition-colors duration-150 select-none ${
                  isActive
                    ? 'bg-[#2563EB]/10 text-[#2563EB] font-bold rounded-xl shadow-2xs'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100/70'
                }`}
              >
                <div className={`flex items-center gap-2.5 truncate ${isCollapsed ? 'justify-center' : ''}`}>
                  <DecidixIcon
                    name={item.icon}
                    size={18}
                    color={isActive ? '#2563EB' : '#64748B'}
                    className="shrink-0 transition-colors duration-150 group-hover:text-blue"
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-blue text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen md:h-screen md:overflow-hidden bg-[#F8FAFC] flex flex-col md:flex-row ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* 1. MOBILE TOP HEADER (56px, Clean, Light Theme, No Artificial Box) */}
      <header className="md:hidden h-14 px-3 sm:px-4 bg-white border-b border-[#E2E8F0] sticky top-0 z-40 flex items-center justify-between shadow-2xs shrink-0">
        {/* Left: Direct Logo + Clean Brand Text */}
        <NavLink to="/overview" className="flex items-center gap-2 min-h-[44px]">
          <DecidixIcon name="splash_mark" size={28} className="shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-sm tracking-tight text-[#061A3A] leading-tight block">
              DECIDIX
            </span>
            <span className="hidden sm:block text-[9px] text-[#64748B] font-semibold tracking-wider uppercase leading-none">
              {isRTL ? 'الذكاء التنموي' : 'National Intelligence'}
            </span>
          </div>
        </NavLink>

        {/* Right: Language, Auth & Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Toggle Pill */}
          <button
            onClick={toggleLanguage}
            className="h-8 px-2.5 text-[11px] font-semibold rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#061A3A] border border-[#E2E8F0] transition whitespace-nowrap shrink-0"
            aria-label="Toggle language"
          >
            {language === 'en' ? 'العربية' : 'EN'}
          </button>

          {/* User Sign In / Account Avatar */}
          {!isAuthenticated ? (
            <NavLink
              to="/login"
              className="h-8 px-3 text-[11px] font-bold rounded-full bg-blue hover:bg-blue-hover text-white transition shadow-2xs whitespace-nowrap shrink-0 flex items-center justify-center"
            >
              {isRTL ? 'دخول' : 'Sign In'}
            </NavLink>
          ) : (
            <NavLink
              to="/account"
              className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0"
              aria-label="User account"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </NavLink>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 text-[#061A3A] hover:bg-[#F1F5F9] rounded-xl flex items-center justify-center transition shrink-0 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <DecidixIcon name="close" size={20} color="#061A3A" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* 2. MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-[#061A3A]/40 backdrop-blur-xs z-40 transition-opacity animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* 3. MOBILE OFF-CANVAS DRAWER (100% Light Theme) */}
      <aside
        className={`md:hidden fixed inset-y-0 start-0 w-[280px] max-w-[85vw] bg-white border-r border-[#E2E8F0] z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Drawer Top Header */}
          <div className="h-16 px-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <NavLink to="/overview" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
              <DecidixIcon name="splash_mark" size={30} className="shrink-0" />
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#061A3A] block">
                  DECIDIX
                </span>
                <span className="text-[9px] text-[#64748B] font-semibold tracking-wider uppercase block">
                  {isRTL ? 'الذكاء التنموي الوطني' : 'National Intelligence'}
                </span>
              </div>
            </NavLink>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#64748B] hover:text-[#061A3A] rounded-lg hover:bg-[#F1F5F9] transition"
              aria-label="Close menu"
            >
              <DecidixIcon name="close" size={20} color="#061A3A" />
            </button>
          </div>

          {/* Drawer Nav Links */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {renderNavGroup('Workspace', 'مساحة العمل', WORKSPACE_NAV, false)}
            {renderNavGroup('Tools', 'الأدوات والبيانات', TOOLS_NAV, false)}
            {isAdmin && renderNavGroup('Admin', 'الإدارة المتقدمة', ADMIN_NAV, false)}
          </nav>
        </div>

        {/* Drawer Bottom Account / Sign In */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          {!isAuthenticated ? (
            <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
              <div className="text-xs font-bold text-[#061A3A]">
                {isRTL ? 'وضع الاستعراض العام' : 'Guest Mode'}
              </div>
              <p className="text-[11px] text-[#64748B] leading-snug">
                {isRTL ? 'تصفح التقارير والمؤشرات مجاناً.' : 'Browse public indicators freely.'}
              </p>
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-8 px-3 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs whitespace-nowrap"
              >
                <span>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
                <DecidixIcon name="arrow_right" size={13} color="#FFFFFF" />
              </NavLink>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <NavLink
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white transition flex-1 overflow-hidden"
              >
                <div className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-[#061A3A] truncate">
                    {user?.name || (isRTL ? 'مستخدم ديسيدكس' : 'Decidix User')}
                  </div>
                  <div className="text-[10px] text-blue font-bold uppercase tracking-wider">
                    {user?.role || 'VIEWER'}
                  </div>
                </div>
              </NavLink>

              <button
                onClick={handleLogout}
                title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                className="p-2 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-white transition"
              >
                <DecidixIcon name="back" size={16} color="currentColor" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 4. DESKTOP COLLAPSIBLE SIDEBAR (100% Light Theme, Locked to Screen, Fixed Viewport Height) */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-white border-e border-[#E2E8F0] h-full shrink-0 z-30 transition-all duration-300 ease-in-out select-none ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div
            className={`h-16 px-4 border-b border-[#E2E8F0] flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <NavLink
              to="/overview"
              className={`flex items-center gap-3 overflow-hidden ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title={sidebarCollapsed ? (isRTL ? 'لوحة المتابعة — ديسيدكس' : 'Decidix — Overview') : undefined}
            >
              <DecidixIcon name="splash_mark" size={32} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="overflow-hidden">
                  <span className="font-extrabold text-lg tracking-tight text-[#061A3A] block leading-none">
                    DECIDIX
                  </span>
                  <span className="text-[10px] text-[#64748B] font-semibold tracking-wider uppercase block mt-0.5">
                    {isRTL ? 'الذكاء التنموي الوطني' : 'National Intelligence'}
                  </span>
                </div>
              )}
            </NavLink>
          </div>

          {/* Navigation Scroll Area (Independent scrolling inside sidebar only) */}
          <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-1">
            {renderNavGroup('Workspace', 'مساحة العمل', WORKSPACE_NAV, sidebarCollapsed)}
            {renderNavGroup('Tools', 'الأدوات والبيانات', TOOLS_NAV, sidebarCollapsed)}
            {isAdmin && renderNavGroup('Admin', 'الإدارة المتقدمة', ADMIN_NAV, sidebarCollapsed)}
          </nav>
        </div>

        {/* Sidebar Footer: Pinned at bottom of sidebar */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          {!isAuthenticated ? (
            sidebarCollapsed ? (
              <NavLink
                to="/login"
                state={{ from: location }}
                title={isRTL ? 'تسجيل الدخول' : 'Sign In'}
                className="w-10 h-10 mx-auto rounded-xl bg-blue hover:bg-blue-hover text-white flex items-center justify-center transition shadow-2xs"
              >
                <DecidixIcon name="user" size={16} color="#FFFFFF" />
              </NavLink>
            ) : (
              <NavLink
                to="/login"
                state={{ from: location }}
                className="w-full h-9 px-3 rounded-xl bg-blue hover:bg-blue-hover text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-2xs whitespace-nowrap"
              >
                <DecidixIcon name="user" size={14} color="#FFFFFF" />
                <span>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
              </NavLink>
            )
          ) : (
            sidebarCollapsed ? (
              <NavLink
                to="/account"
                title={`${user?.name || 'Account'} (${user?.role || 'User'})`}
                className="w-10 h-10 mx-auto rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs shadow-2xs"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </NavLink>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <NavLink
                  to="/account"
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white transition flex-1 overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-[#061A3A] truncate">
                      {user?.name || (isRTL ? 'مستخدم المنصة' : 'Decidix User')}
                    </div>
                    <div className="text-[10px] text-blue font-bold uppercase tracking-wider">
                      {user?.role || 'VIEWER'}
                    </div>
                  </div>
                </NavLink>

                <button
                  onClick={handleLogout}
                  title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-white transition"
                >
                  <DecidixIcon name="back" size={16} color="currentColor" />
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* 5. MAIN APPLICATION AREA (Dedicated Scrollable Viewport, Zero Double Scrollbars) */}
      <div className="flex-1 h-full md:overflow-y-auto flex flex-col min-w-0">
        {/* DESKTOP TOP HEADER (Sticky, Backdrop Blur & Subtle SaaS Polish) */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-6 md:px-8 header-frosted sticky top-0 z-20 shadow-2xs">
          {/* Left: Collapsible Sidebar Toggle & Breadcrumb */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-navy transition-colors duration-150 focus:outline-none"
              title={
                sidebarCollapsed
                  ? isRTL ? 'توسيع القائمة الجانبية' : 'Expand Sidebar'
                  : isRTL ? 'طي القائمة الجانبية' : 'Collapse Sidebar'
              }
              aria-label="Toggle sidebar"
            >
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>{breadcrumb.section}</span>
              <DecidixIcon name="chevron_right" size={11} color="#94A3B8" />
              <span className="text-navy font-bold">{breadcrumb.title}</span>
            </div>

            {/* Active Dataset Selector Dropdown */}
            <div className="relative ms-2">
              <button
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="h-8 px-2.5 rounded-lg border border-slate-200/90 bg-slate-100/80 hover:bg-slate-200/70 text-[11px] font-bold text-[#061A3A] flex items-center gap-1.5 transition shadow-2xs"
                title={isRTL ? 'اختيار مجموعة البيانات النشطة للتحليل' : 'Select Active Dataset'}
              >
                <div className="w-2 h-2 rounded-full bg-[#21EAF4] animate-pulse" />
                <DecidixIcon name="dataset" size={14} color="#0052FF" />
                <span className="max-w-[140px] sm:max-w-[180px] truncate">
                  {activeDataset?.name || (isRTL ? 'الأساس الوطني المعتمد' : 'National Baseline')}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue/10 text-blue font-mono">
                  {activeDataset?.kpis?.nationalIndex ?? 74.2}
                </span>
                <DecidixIcon name="chevron_down" size={10} color="#64748B" />
              </button>

              {workspaceMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setWorkspaceMenuOpen(false)}
                  />
                  <div className="absolute start-0 mt-1.5 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 py-2 animate-in fade-in">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isRTL ? 'مجموعات البيانات المعتمدة في المنظومة' : 'APPROVED PLATFORM DATASETS'}</span>
                      <span className="text-[10px] text-blue font-semibold">{approvedDatasets.length} {isRTL ? 'مجموعات' : 'datasets'}</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto px-1 space-y-1">
                      {approvedDatasets.map((ds) => {
                        const isSelected = activeDataset?.id === ds.id;
                        return (
                          <button
                            key={ds.id}
                            onClick={() => {
                              selectActiveDataset(ds.id);
                              setWorkspaceMenuOpen(false);
                            }}
                            className={`w-full p-2.5 rounded-xl text-start flex items-start justify-between text-xs transition ${
                              isSelected
                                ? 'bg-blue/10 text-blue font-bold border border-blue/20'
                                : 'text-[#061A3A] hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'bg-blue text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <DecidixIcon name="dataset" size={14} color="currentColor" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-[#061A3A]">{ds.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal flex items-center gap-2 mt-0.5">
                                  <span>{ds.coverage}</span>
                                  <span>•</span>
                                  <span>{ds.recordCount} {isRTL ? 'سجل' : 'records'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0 ms-2">
                              <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {ds.kpis?.nationalIndex}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] text-blue font-semibold">{isRTL ? 'النشطة' : 'Active'}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 px-2">
                      <button
                        onClick={() => {
                          setWorkspaceMenuOpen(false);
                          navigate('/datasets');
                        }}
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#061A3A] text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <DecidixIcon name="plus" size={13} color="#0052FF" />
                        <span>{isRTL ? 'سجل وإدارة المجموعات (+ رفع بيانات)' : 'Manage & Upload Datasets'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-3">
            {/* Search Input Box with ⌘K Hint */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'بحث سريع...' : 'Search or command...'}
                className="w-56 lg:w-64 h-9 ltr:pl-9 ltr:pr-12 rtl:pr-9 rtl:pl-12 rounded-lg bg-slate-100/70 border border-slate-200/80 focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15 text-xs text-navy placeholder-slate-400 outline-none transition-all duration-150"
              />
              <div className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center pointer-events-none text-slate-400">
                <DecidixIcon name="search" size={13} color="#94A3B8" />
              </div>
              <div className="absolute inset-y-0 ltr:right-2 rtl:left-2 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="h-9 px-3.5 rounded-lg bg-white border border-slate-200/80 text-xs font-semibold text-navy hover:bg-slate-50 hover:border-slate-300 transition-colors duration-150 shadow-2xs whitespace-nowrap"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {/* Notification Bell Icon */}
            <NavLink
              to={isAdmin ? '/admin/notifications' : '#'}
              className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-navy hover:border-slate-300 hover:bg-slate-50 transition-colors duration-150 shadow-2xs shrink-0"
              title={isRTL ? 'الإشعارات' : 'Notifications'}
            >
              <DecidixIcon name="notifications" size={15} color="currentColor" />
            </NavLink>

            {/* User Account / Guest Sign-In */}
            {!isAuthenticated ? (
              <NavLink
                to="/login"
                state={{ from: location }}
                className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 shadow-2xs whitespace-nowrap"
              >
                <span>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
              </NavLink>
            ) : (
              <NavLink
                to="/account"
                className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-navy hover:border-blue transition-colors duration-150 shadow-2xs shrink-0"
                title={isRTL ? 'الملف الشخصي' : 'Account profile'}
              >
                <div className="w-7 h-7 rounded-full bg-blue text-white flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </NavLink>
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-5">
            {location.state?.registered && (
              <div className="p-4 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#061A3A] text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <DecidixIcon name="check" size={18} color="#2563EB" />
                  <span className="leading-relaxed">
                    {isRTL
                      ? 'تم إنشاء الحساب بنجاح! تم تسجيل دخولك تلقائياً، وتفقد بريدك الإلكتروني لتأكيد الحساب.'
                      : 'Account created successfully! You are now signed in. Please check your email for the verification link.'}
                  </span>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>

        {/* Minimal Clean Dashboard Footer */}
        <footer className="mt-auto px-6 sm:px-8 py-3.5 border-t border-slate-200/60 bg-white/50 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div>
            © {new Date().getFullYear()} DECIDIX — {isRTL ? 'منظومة دعم القرار التنموي والتخطيط الإقليمي' : 'National Development Decision Support'}
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/privacy" className="hover:text-blue transition-colors">
              {isRTL ? 'الخصوصية وحماية البيانات' : 'Privacy'}
            </NavLink>
            <span>·</span>
            <NavLink to="/landing" className="hover:text-blue transition-colors">
              {isRTL ? 'عن المنصة' : 'About'}
            </NavLink>
          </div>
        </footer>
      </div>
    </div>
  );
};
