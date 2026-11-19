import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { DecidixIcon } from '../../components/DecidixIcon';

export const LandingPage: React.FC = () => {
  const { isRTL, language, toggleLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  const logos = [
    { name: 'CAPMAS', arabicName: 'الجهاز المركزي للإحصاء', role: 'Official Statistics Baseline' },
    { name: 'Egypt Vision 2030', arabicName: 'رؤية مصر 2030', role: 'Sustainable Development Strategy' },
    { name: 'Ministry of Planning', arabicName: 'وزارة التخطيط والتنمية الاقتصادية', role: 'Strategic Framework & SDGs' },
    { name: 'UN SDGs', arabicName: 'أهداف التنمية المستدامة', role: 'Global Development Metrics' },
    { name: 'IDSC', arabicName: 'مركز معلومات مجلس الوزراء', role: 'Decision Support Methodology' },
    { name: 'Regional Directorates', arabicName: 'مؤشرات المحافظات الميدانية', role: 'Governorate Field Monitoring' },
  ];

  const features = [
    {
      id: 'analytics',
      badgeEn: 'REGIONAL BENCHMARKING',
      badgeAr: 'مقارنات تنموية بينية',
      titleEn: 'Comprehensive National & Regional Analytics',
      titleAr: 'تحليلات تنموية إقليمية شاملة ومؤشرات مركبة',
      descEn: 'Consolidate disparate socio-economic data across 27 governorates into a calibrated 0-100 composite index. Benchmark regions side-by-side to pinpoint regional disparities and target public interventions effectively.',
      descAr: 'دمج السجلات التنموية الموثقة عبر 27 محافظة في مؤشر تنموي مركب معاير (0-100). تمكين المقارنات البينية الفورية لكشف الفجوات القطاعية وتوجيه مخصصات الاستثمار العام بدقة.',
      bulletsEn: [
        'Multi-sector composite scores (Education, Health, Economy, Infrastructure)',
        'Dual-governorate side-by-side delta matrices with tabular metrics',
        'Automated priority queue ranking based on calculated regional need',
      ],
      bulletsAr: [
        'مؤشرات مركبة دقيقة للتعليم والرعاية الصحية والاقتصاد والبنية التحتية',
        'مصفوفة مقارنة تفاعلية بين محافظتين مع كشف الفروق الرقمية الدقيقة',
        'ترتيب الأولويات التنموية للمراكز والقرى الأكثر احتياجاً للتدخل',
      ],
      link: '/insights',
      linkTextEn: 'Explore Regional Analytics',
      linkTextAr: 'استكشف التحليلات الإقليمية',
      visualType: 'comparison',
    },
    {
      id: 'intelligence',
      badgeEn: 'PREDICTIVE TRAJECTORIES',
      badgeAr: 'الاستشراف الإحصائي والمسارات',
      titleEn: 'Strategic Indicators & Trajectory Projections',
      titleAr: 'استشراف إحصائي للمسارات التنموية والمستهدفات',
      descEn: 'Anticipate regional trajectory trends through 2028-2030 using explainable econometric and regression models fitted to verified historical baselines. Track progress toward Egypt Vision 2030 targets.',
      descAr: 'استشراف المسارات التنموية حتى عام 2028-2030 بنماذج انحدار إحصائية واضحة ومبنية على سجلات الرصد التاريخية، لمتابعة التقدم نحو مستهدفات التنمية المستدامة ورؤية مصر 2030.',
      bulletsEn: [
        'Extrapolated forecast horizons with 95% statistical confidence',
        'Clear distinction between verified historical observations and projections',
        'Empirical time-series modeling for governorate-level indicator trajectories',
      ],
      bulletsAr: [
        'توقعات استشرافية مستقبلية بمستوى ثقة إحصائي يصل إلى 95%',
        'فصل صريح بين الملاحظات الموثقة تاريخياً والتوقعات التجريبية',
        'سلاسل زمنية دقيقة لنمذجة مؤشرات المحافظات حتى 2030',
      ],
      link: '/intelligence',
      linkTextEn: 'View Predictive Trajectories',
      linkTextAr: 'تصفح النماذج الإحصائية',
      visualType: 'chart',
    },
    {
      id: 'simulation',
      badgeEn: 'POLICY WHAT-IF SIMULATOR',
      badgeAr: 'محاكاة السياسات والموازنات',
      titleEn: 'Policy What-If Simulator & Decision Support',
      titleAr: 'محاكي السياسات الاستثمارية ودعم القرار',
      descEn: 'Test capital allocations across sectors to evaluate marginal yields on development indices before committing funds. Consult our grounded decision support copilot citing verified CAPMAS documents with complete provenance.',
      descAr: 'اختبار سيناريوهات توزيع المخصصات الاستثمارية عبر القطاعات لقياس العائد الحدي على مؤشر التنمية قبل التنفيذ، مع استشارة مساعد تحليلي مؤصل يسترجع الوثائق الرسمية والمؤشرات الإحصائية.',
      bulletsEn: [
        'Concave diminishing yield simulation across 4 budgetary levers',
        'Instant marginal gain calculation per $1M invested',
        'Context-aware decision copilot with complete provenance and source citations',
      ],
      bulletsAr: [
        'نموذج رياضي يحاكي أثر المخصصات الاستثمارية عبر 4 قطاعات رئيسية',
        'حساب فوري للعائد الحدي المتوقع على المؤشر لكل مليون جنيه مستثمر',
        'مساعد تحليلي لدعم القرار مستند إلى الوثائق والبيانات الرسمية المعتمدة',
      ],
      link: '/decisions/simulator',
      linkTextEn: 'Launch Policy Simulator',
      linkTextAr: 'تشغيل محاكي السياسات',
      visualType: 'simulator',
    },
  ];

  const steps = [
    {
      num: '01',
      titleEn: 'Ingest & Validate',
      titleAr: 'استيعاب وتدقيق البيانات',
      descEn: 'Heterogeneous socio-economic datasets from CAPMAS and regional directorates undergo automated schema validation, missingness audits, and cryptographic provenance logging.',
      descAr: 'استيعاب السجلات التنموية من الجهاز المركزي للتعئبة العامة والإحصاء والمديريات الإقليمية مع الفحص الآلي لسلامة الهيكل، واكتمال البيانات، وتوثيق المصدر.',
    },
    {
      num: '02',
      titleEn: 'Compute Indices & Forecast',
      titleAr: 'حساب المؤشرات والنمذجة',
      descEn: 'Standardize metrics across Education, Healthcare, Economy, and Infrastructure to calculate composite scores and generate multi-year trajectory projections.',
      descAr: 'معايرة البيانات وحساب المؤشرات المركبة الموزونة لقطاعات التعليم والصحة والاقتصاد والبنية التحتية، وتشغيل نماذج الاستشراف التنبؤي للمحافظات.',
    },
    {
      num: '03',
      titleEn: 'Simulate & Decide',
      titleAr: 'المحاكاة واتخاذ القرار',
      descEn: 'Empower leadership to model what-if budgetary allocations, inspect regional priority queues, track capital projects, and monitor verified community feedback.',
      descAr: 'تمكين صانعي القرار من محاكاة بدائل الميزانيات، وفحص أولويات التدخل العاجلة، ومتابعة تنفيذ المشروعات الوطنية وبلاغات المواطنين الميدانية.',
    },
  ];

  const testimonials = [
    {
      quoteEn: '“Decidix transformed how our regional planning committee prioritizes capital interventions. The What-If Simulator lets us evaluate marginal yields across sectors before committing a single pound of public investment.”',
      quoteAr: '«غيّرت منصة ديسيدكس منهجية عمل لجنة التخطيط الإقليمي في ترتيب أولويات المشروعات. محاكي السياسات يتيح لنا تقييم العائد الحدي بدقة عبر القطاعات قبل اعتماد المخصصات المالية.»',
      authorEn: 'Dr. Mona El-Sherif',
      authorAr: 'د. منى الشريف',
      titleEn: 'Head of Regional Planning & Strategic Monitoring',
      titleAr: 'رئيس قطاع التخطيط الإقليمي والمتابعة الاستراتيجية',
      avatar: 'MS',
      featured: true,
    },
    {
      quoteEn: '“The strict data governance and verifiable CAPMAS data provenance give our analysts complete academic confidence. Every indicator links directly to official sources.”',
      quoteAr: '«حوكمة البيانات الصارمة وموثوقية سجلات الإحصاء الرسمية تمنح باحثينا ومحللينا ثقة علمية كاملة. كل مؤشر مرتبط مباشرة بمصدره المعتمد.»',
      authorEn: 'Eng. Tarek Abdelrahman',
      authorAr: 'م. طارق عبد الرحمن',
      titleEn: 'Director of Data Governance & Systems',
      titleAr: 'مدير حوكمة البيانات ونظم المعلومات',
      avatar: 'TA',
      featured: false,
    },
    {
      quoteEn: '“Comparing Upper Egypt and Delta governorates in a unified composite index with tabular figures provides unprecedented clarity for regional equity research.”',
      quoteAr: '«مقارنة محافظات الصعيد والدلتا عبر مؤشر مركب موحد يوفر وضوحاً إحصائياً غير مسبوق لأبحاث العدالة المكانية والتنمية المستدامة.»',
      authorEn: 'Prof. Hisham El-Kady',
      authorAr: 'أ.د. هشام القاضي',
      titleEn: 'Professor of Development Economics',
      titleAr: 'أستاذ الاقتصاد التنموي والسياسات العامة',
      avatar: 'HK',
      featured: false,
    },
  ];

  const tiers = [
    {
      nameEn: 'Guest / Citizen Explorer',
      nameAr: 'استعراض عام مجاني',
      badgeEn: 'Open Access',
      badgeAr: 'مفتوح للجميع',
      priceEn: '$0',
      priceAr: 'مجاناً',
      subtextEn: 'No account or credit card required',
      subtextAr: 'بدون تسجيل إجباري أو بطاقة ائتمان',
      featuresEn: [
        'Explore national composite development map',
        'View governorates ranking & basic indicators',
        'Browse citizen feedback and community reports',
        'Standard Arabic / English bilingual interface',
      ],
      featuresAr: [
        'تصفح خريطة الجمهورية ونقاط الرصد التنموي',
        'استعراض الترتيب الوطني للمحافظات والمؤشرات العامة',
        'الاطلاع على مشاركات وبلاغات المجتمع المحلي',
        'واجهة ثنائية اللغة كاملة (عربي / إنجليزي)',
      ],
      ctaTextEn: 'Explore as Guest',
      ctaTextAr: 'تصفح كزائر الآن',
      ctaLink: '/overview',
      isPrimary: false,
      isRecommended: false,
    },
    {
      nameEn: 'Institutional Analyst',
      nameAr: 'محلل تنموي معتمد',
      badgeEn: 'Most Popular',
      badgeAr: 'الأكثر طلباً للجهات',
      priceEn: 'Academic Free',
      priceAr: 'مجاني للجهات',
      subtextEn: 'Authorized government & university teams',
      subtextAr: 'للفرق الحكومية والبحثية والجامعية المعتمدة',
      featuresEn: [
        'Multi-sector deep dives (Education, Health, Economy, Infrastructure)',
        'Side-by-side governorate comparison matrix',
        'Historical time-series analysis (2021–2024)',
        'Predictive trajectory models through 2028-2030',
        'Grounded Decision Support consultations',
      ],
      featuresAr: [
        'تحليلات قطاعية متعمقة (تعليم، صحة، اقتصاد، بنية تحتية)',
        'مصفوفة مقارنة ثنائية مفصلة بين المحافظات',
        'سلاسل زمنية تاريخية موثقة (2021–2024)',
        'تنبؤات المسارات المستقبلية حتى 2028-2030',
        'استشارات المساعد التحليلي لدعم القرار التنموي',
      ],
      ctaTextEn: 'Register Analyst Account',
      ctaTextAr: 'إنشاء حساب محلل معتمد',
      ctaLink: '/register',
      isPrimary: true,
      isRecommended: true,
    },
    {
      nameEn: 'Platform Administrator',
      nameAr: 'إدارة المنظومة وصناع القرار',
      badgeEn: 'Executive Role',
      badgeAr: 'صلاحيات قيادية',
      priceEn: 'Sovereign Tier',
      priceAr: 'وصول مؤسسي مخصص',
      subtextEn: 'Authorized planners & system coordinators',
      subtextAr: 'للمخططين المعتمدين ومديري المنظومة الوطنية',
      featuresEn: [
        'All Institutional Analyst capabilities',
        'Policy What-If Simulator with budget levers',
        'National capital projects portfolio register',
        'Targeted FCM push notification dispatch',
        'Dataset ingestion, R2 management & RBAC administration',
      ],
      featuresAr: [
        'كافة صلاحيات المحلل التنموي المعتمد',
        'تشغيل وحفظ سيناريوهات محاكي السياسات والميزانيات',
        'إدارة سجل محفظة المشروعات التنموية الوطنية',
        'إرسال حملات الإشعارات الفورية الموجهة عبر FCM',
        'إدارة مجموعات البيانات في R2 وصلاحيات المستخدمين',
      ],
      ctaTextEn: 'Admin Portal Sign In',
      ctaTextAr: 'تسجيل دخول المسؤول',
      ctaLink: '/login',
      isPrimary: false,
      isRecommended: false,
    },
  ];

  const faqs = [
    {
      qEn: 'What is Decidix and who is it designed for?',
      qAr: 'ما هي منصة ديسيدكس (Decidix) ولمن تم تصميمها؟',
      aEn: 'Decidix is an intelligent national development intelligence and regional decision-support platform. It unites official multi-sector indicators (Education, Healthcare, Economy, Infrastructure) across Egypt into standardized composite indices, helping planners, ministries, and researchers formulate targeted, evidence-based development policies.',
      aAr: 'ديسيدكس هي منصة وطنية ذكية للذكاء التنموي ودعم القرار الإقليمي. توحد المؤشرات الإحصائية الرسمية لقطاعات التعليم والصحة والاقتصاد والبنية التحتية عبر محافظات الجمهورية في مؤشرات مركبة موحدة، لدعم المخططين والجهات التنفيذية والباحثين في صياغة قرارات تنموية مبنية على الأدلة.',
    },
    {
      qEn: 'How does Decidix safeguard team workspaces and institutional data?',
      qAr: 'كيف تضمن المنصة خصوصية وحوكمة بيانات فرق العمل والمؤسسات؟',
      aEn: 'Decidix enforces strict workspace tenancy isolation. Datasets, simulation parameters, and reports uploaded to a personal or institutional team workspace are private to authorized members and never shared with the public baseline, fully compliant with Egyptian Data Protection Law No. 151 of 2020.',
      aAr: 'تعتمد المنصة مبدأ العزل البرمجي التام لمساحات العمل؛ حيث تبقى أي مجموعات بيانات أو سيناريوهات محاكاة يرفعها المستخدم أو الفريق محصورة داخل النطاق الخاص بهم ولا يتم دمجها مع المؤشرات الوطنية العامة أو إتاحتها للمستخدمين الآخرين، وفقاً لأحكام قانون حماية البيانات الشخصية رقم 151 لسنة 2020.',
    },
    {
      qEn: 'Where do the development data and indicators come from?',
      qAr: 'ما هي مصادر البيانات والمؤشرات التنموية المعتمدة؟',
      aEn: 'Canonical data originates from the Central Agency for Public Mobilization and Statistics (CAPMAS 2021–2024 dataset) alongside version-matched regional directorate observations. Every dataset includes cryptographic lineage tracking and missingness validation before ingestion.',
      aAr: 'تستند المؤشرات المعتمدة إلى قواعد بيانات الجهاز المركزي للتعبئة العامة والإحصاء (سجلات CAPMAS المعتمدة 2021-2024) وبيانات المديريات الإقليمية. تخضع كل مجموعة بيانات لتدقيق الاكتمال وتوثيق خط المسار الإحصائي قبل إتاحتها في النظام.',
    },
    {
      qEn: 'How does the What-If Policy Simulator calculate impacts?',
      qAr: 'كيف يعمل محاكي السياسات والاستثمارات التنموية (ماذا لو)؟',
      aEn: 'The simulator employs a concave diminishing marginal returns mathematical model. By adjusting budget levers in $ Millions across Healthcare, Education, Infrastructure, and Economy, planners can observe the predicted incremental gain on the composite development index and review the marginal yield per $1M.',
      aAr: 'يعتمد المحاكي على نموذج رياضي تناقصي يحاكي العائد الحدي للاستثمار. عند تعديل مخصصات الميزانية بملايين الدولارات عبر قطاعات الصحة والتعليم والبنية التحتية والاقتصاد، يحسب النموذج الأثر الحدي المكتسب على مؤشر التنمية وكفاءة العائد لكل مليون دولار.',
    },
    {
      qEn: 'Can the platform be explored freely without creating an account?',
      qAr: 'هل يمكن استعراض المنصة كزائر دون الحاجة لإنشاء حساب؟',
      aEn: 'Yes! Decidix follows a guest-first architectural philosophy. Visitors can openly browse the national composite overview, interactive map, governorate profiles, comparative rankings, and citizen feedback without mandatory sign-in or paywalls.',
      aAr: 'نعم تماماً! تعتمد المنظومة فلسفة الوصول المفتوح؛ حيث يمكن للزوار تصفح لوحة المؤشرات الوطنية، الخريطة التفاعلية، ملفات المحافظات، المقارنات الإقليمية، وبلاغات المجتمع دون الحاجة لتسجيل حساب أو دفع أي رسوم.',
    },
    {
      qEn: 'How does Decidix handle user privacy and account deletion?',
      qAr: 'كيف تضمن ديسيدكس خصوصية المستخدمين وتطبيق حذف الحساب؟',
      aEn: 'We adhere to complete transparent data governance. Users can permanently delete their accounts at any time through the in-app settings or the public deletion portal (/delete-account). Account deletion immediately anonymizes personal credentials, revokes active sessions, and deletes data in accordance with Google Play and national data regulations.',
      aAr: 'نلتزم بالمعايير الصارمة لحوكمة الخصوصية. يتيح النظام للمستخدمين حذف حساباتهم نهائياً في أي وقت عبر الإعدادات أو عبر بوابة الحذف الرسمية (/delete-account)، مما يؤدي فوراً إلى محو البيانات الشخصية وإلغاء الجلسات النشطة وفق اشتراطات الأمان المعتمدة.',
    },
  ];

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col text-navy font-sans ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <DecidixIcon name="splash_mark" size={32} className="shrink-0 transition-transform group-hover:scale-105" />
            <div>
              <span className="font-bold text-lg tracking-tight text-navy block leading-none font-display">
                DECIDIX
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block mt-0.5">
                {isRTL ? 'المنصة الوطنية للذكاء التنموي' : 'National Intelligence Platform'}
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#capabilities" className="hover:text-blue transition-colors duration-150">
              {isRTL ? 'القدرات والحلول' : 'Capabilities'}
            </a>
            <a href="#features" className="hover:text-blue transition-colors duration-150">
              {isRTL ? 'الميزات التنموية' : 'Features'}
            </a>
            <a href="#process" className="hover:text-blue transition-colors duration-150">
              {isRTL ? 'آلية العمل' : 'How It Works'}
            </a>
            <a href="#pricing" className="hover:text-blue transition-colors duration-150">
              {isRTL ? 'باقات الوصول' : 'Access Tiers'}
            </a>
            <a href="#faq" className="hover:text-blue transition-colors duration-150">
              {isRTL ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Dynamic Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-navy text-xs font-semibold border border-slate-200/80 transition-colors shadow-2xs whitespace-nowrap"
              aria-label="Switch Language"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {isAuthenticated ? (
              <NavLink
                to="/overview"
                className="px-4 py-2 rounded-full bg-blue hover:bg-blue-hover text-white text-xs font-bold transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{isRTL ? 'لوحة التحكم' : 'Workspace'}</span>
                <DecidixIcon name="arrow_right" size={13} color="#FFFFFF" />
              </NavLink>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <NavLink
                  to="/login"
                  className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-navy hover:bg-slate-50 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </NavLink>
                <NavLink
                  to="/overview"
                  className="px-4 py-2 rounded-full bg-blue hover:bg-blue-hover text-white text-xs font-bold transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{isRTL ? 'استعراض المنصة' : 'Explore Platform'}</span>
                  <DecidixIcon name="arrow_right" size={13} color="#FFFFFF" />
                </NavLink>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-navy transition"
              aria-label="Toggle Mobile Menu"
            >
              <DecidixIcon name={mobileMenuOpen ? 'close' : 'filter'} size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200/80 px-4 py-4 space-y-3 animate-fadeIn shadow-sm">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-slate-50 hover:text-blue transition"
              >
                {isRTL ? 'القدرات والحلول' : 'Capabilities'}
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-slate-50 hover:text-blue transition"
              >
                {isRTL ? 'الميزات التنموية' : 'Features'}
              </a>
              <a
                href="#process"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-slate-50 hover:text-blue transition"
              >
                {isRTL ? 'آلية العمل' : 'How It Works'}
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-slate-50 hover:text-blue transition"
              >
                {isRTL ? 'باقات الوصول' : 'Access Tiers'}
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-slate-50 hover:text-blue transition"
              >
                {isRTL ? 'الأسئلة الشائعة' : 'FAQ'}
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-lg border border-slate-200/80 text-xs font-semibold text-navy hover:bg-slate-50 transition"
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </NavLink>
              <NavLink
                to="/overview"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-blue text-white text-xs font-bold hover:bg-blue-hover transition shadow-2xs"
              >
                {isRTL ? 'استعراض المنصة كزائر' : 'Explore Platform as Guest'}
              </NavLink>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left / Text Side */}
            <div className="lg:col-span-6 space-y-6">
              {/* Authoritative Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-navy leading-[1.25] font-display">
                {isRTL ? (
                  <>
                    المنصة الوطنية لدعم القرار التنموي والتخطيط الإقليمي
                  </>
                ) : (
                  <>
                    National Intelligent Decision Support & Regional Planning Platform
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                {isRTL
                  ? 'منظومة وطنية متكاملة لرصد مؤشرات التنمية المستدامة، كشف الفجوات الإقليمية للمحافظات الـ 27، ومحاكاة أثر المشروعات والموازنات لدعم اتخاذ القرار المبني على الأدلة والدراسات الميدانية.'
                  : 'An authoritative national intelligence system uniting official indicators across all 27 governorates, modeling policy alternatives, and enabling institutional team collaboration for evidence-based governance.'}
              </p>

              {/* Dual Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <NavLink
                  to="/overview"
                  className="h-11 px-6 rounded-full bg-blue hover:bg-blue-hover text-white text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 whitespace-nowrap"
                >
                  <span>{isRTL ? 'استعراض المنصة كزائر' : 'Explore Platform as Guest'}</span>
                  <DecidixIcon name="arrow_right" size={15} color="#FFFFFF" />
                </NavLink>

                <NavLink
                  to="/login"
                  className="h-11 px-5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-navy text-xs sm:text-sm font-semibold transition-colors shadow-2xs whitespace-nowrap"
                >
                  {isRTL ? 'طلب الوصول المؤسسي' : 'Request Institutional Access'}
                </NavLink>
              </div>

              {/* Trust Indicators */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <DecidixIcon name="check" size={14} color="#2563EB" />
                  <span>{isRTL ? 'بيانات رسمية معتمدة من CAPMAS' : 'CAPMAS verified statistical baseline'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DecidixIcon name="shield" size={14} color="#2563EB" />
                  <span>{isRTL ? 'حوكمة وعزل كامل لمساحات العمل' : 'Isolated Workspace Tenancy'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DecidixIcon name="location" size={14} color="#2563EB" />
                  <span>{isRTL ? 'تغطية شاملة لـ 27 محافظة مصرية' : '27 Governorates Coverage'}</span>
                </div>
              </div>

              {/* Key Numbers Strip */}
              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-2xl font-bold tracking-tight text-navy tabular-nums">74.2</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    {isRTL ? 'المؤشر الوطني المركب' : 'National Index'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-2xl font-bold tracking-tight text-navy tabular-nums">27</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    {isRTL ? 'محافظة مرصودة' : 'Monitored Regions'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">100%</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    {isRTL ? 'مطابقة المؤشرات الرسمية' : 'Official Data Baseline'}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Right / High-Fidelity UI Product Preview */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
                {/* Browser Frame Top Bar */}
                <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  <div className="px-3 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-500 text-center w-52 truncate">
                    decidix.gov.eg/overview/national
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Live v1.0
                  </span>
                </div>

                {/* Dashboard Inner Canvas */}
                <div className="p-5 space-y-4 bg-slate-50/50">
                  {/* Top Bar inside preview */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-blue uppercase tracking-wider">
                        {isRTL ? 'لوحة القيادة التنموية الموحدة' : 'National Overview'}
                      </div>
                      <div className="text-sm font-bold text-navy">
                        {isRTL ? 'جمهورية مصر العربية · مؤشرات الأداء' : 'Arab Republic of Egypt · Indicators'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
                      CAPMAS 2021-2024
                    </span>
                  </div>

                  {/* Stylized Mini Map with Egypt Geo Pins */}
                  <div className="relative h-44 rounded-xl bg-blue-50/40 border border-blue-100 overflow-hidden p-3 flex items-center justify-center">
                    {/* Nile curve SVG representation */}
                    <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M 50 100 Q 52 75 56 60 Q 54 40 50 35 Q 46 25 43 12 M 50 35 Q 54 25 57 12" fill="none" stroke="#2563EB" strokeWidth="3" />
                    </svg>

                    {/* Governorates Interactive Badges */}
                    <div className="absolute top-8 left-[45%] -translate-x-1/2 flex items-center gap-1 bg-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ring-2 ring-cyan/40">
                      <span>{isRTL ? 'القاهرة' : 'Cairo'}</span>
                      <span className="text-cyan tabular-nums">75</span>
                    </div>

                    <div className="absolute top-4 left-[35%] flex items-center gap-1 bg-white text-navy border border-blue text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      <span>{isRTL ? 'الإسكندرية' : 'Alexandria'}</span>
                      <span className="text-blue tabular-nums">78</span>
                    </div>

                    <div className="absolute top-16 left-[50%] flex items-center gap-1 bg-white text-navy border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      <span>{isRTL ? 'الجيزة' : 'Giza'}</span>
                      <span className="text-slate-700 tabular-nums">72</span>
                    </div>

                    <div className="absolute bottom-6 left-[62%] flex items-center gap-1 bg-white text-navy border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      <span>{isRTL ? 'أسوان' : 'Aswan'}</span>
                      <span className="text-slate-700 tabular-nums">68</span>
                    </div>

                    <div className="absolute top-5 left-[60%] flex items-center gap-1 bg-white text-navy border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      <span>{isRTL ? 'بورسعيد' : 'Port Said'}</span>
                      <span className="text-blue tabular-nums">81</span>
                    </div>
                  </div>

                  {/* 4 Sector Mini Progress Rows */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-600">{isRTL ? 'التعليم' : 'Education'}</span>
                        <span className="font-bold text-navy tabular-nums">78%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: '78%' }} />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-600">{isRTL ? 'الصحة' : 'Healthcare'}</span>
                        <span className="font-bold text-navy tabular-nums">82%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: '82%' }} />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-600">{isRTL ? 'الاقتصاد' : 'Economy'}</span>
                        <span className="font-bold text-navy tabular-nums">71%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: '71%' }} />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-600">{isRTL ? 'البنية التحتية' : 'Infrastructure'}</span>
                        <span className="font-bold text-navy tabular-nums">65%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Simulator callout */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <DecidixIcon name="spark" size={14} color="#2563EB" />
                      <span className="font-semibold text-blue-900">
                        {isRTL ? 'محاكاة السياسات: عائد حدي +3.2 نقطة' : 'What-If Yield: +3.2 pts gain'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue text-white">
                      +$25M USD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LOGO CLOUD (Trust & Technologies) */}
      <section className="py-12 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-8">
            {isRTL
              ? 'بنية تحتية موثوقة ومصادر بيانات وطنية معتمدة'
              : 'POWERED BY VERIFIED DATA SOURCES & AUTHORITATIVE ARCHITECTURE'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            {logos.map((lg, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-slate-300 transition-colors flex flex-col items-center text-center shadow-2xs"
              >
                <span className="text-xs font-bold text-navy mb-0.5">
                  {isRTL ? lg.arabicName : lg.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {lg.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURES (3 Alternating Rows) */}
      <section id="features" className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue text-xs font-bold border border-blue-200/80 shadow-2xs">
              <DecidixIcon name="insights" size={13} color="#2563EB" />
              <span>{isRTL ? 'القدرات والحلول التنموية' : 'CORE CAPABILITIES'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
              {isRTL
                ? 'منظومة متكاملة من البيانات إلى القرار'
                : 'From Heterogeneous Data to Confident Decisions'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRTL
                ? 'محاور مترابطة تجمع بين دقة الرصد الإحصائي، وقوة النمذجة الرياضية، ومرونة محاكاة أثر المخصصات المالية.'
                : 'Integrated analytical pillars combining statistical precision, predictive machine learning, and dynamic policy modeling.'}
            </p>
          </div>

          {/* 3 Alternating Feature Rows */}
          {features.map((feat, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={feat.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center ${
                  isEven ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Feature Text */}
                <div className={`lg:col-span-6 space-y-5 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue">
                    {isRTL ? feat.badgeAr : feat.badgeEn}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-navy tracking-tight font-display">
                    {isRTL ? feat.titleAr : feat.titleEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {isRTL ? feat.descAr : feat.descEn}
                  </p>

                  <ul className="space-y-2.5 pt-1 text-xs text-slate-700">
                    {(isRTL ? feat.bulletsAr : feat.bulletsEn).map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-blue-50 text-blue flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60">
                          <DecidixIcon name="check" size={12} color="#2563EB" />
                        </span>
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <NavLink
                      to={feat.link}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:text-blue-hover transition-colors group"
                    >
                      <span>{isRTL ? feat.linkTextAr : feat.linkTextEn}</span>
                      <DecidixIcon name="arrow_right" size={13} color="currentColor" className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </NavLink>
                  </div>
                </div>

                {/* Feature Visual Preview Card */}
                <div className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 relative overflow-hidden">
                    {feat.visualType === 'comparison' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="text-xs font-bold text-navy">
                            {isRTL ? 'مقارنة المحافظات (القاهرة vs الإسكندرية)' : 'Governorate Comparison Matrix'}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            CAPMAS v1.0
                          </span>
                        </div>

                        {/* Dual Horizontal Bars */}
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-navy">
                              <span>{isRTL ? 'المؤشر التنموي العام' : 'Overall Development Index'}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-blue font-bold tabular-nums">75.0</span>
                                <span className="text-cyan font-bold tabular-nums">78.0</span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200/60 tabular-nums">
                                  +3.0 pts
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue rounded-full" style={{ width: '75%' }} />
                              </div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan rounded-full" style={{ width: '78%' }} />
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-navy">
                              <span>{isRTL ? 'قطاع الرعاية الصحية' : 'Healthcare Services Score'}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-blue font-bold tabular-nums">72.0</span>
                                <span className="text-cyan font-bold tabular-nums">76.5</span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200/60 tabular-nums">
                                  +4.5 pts
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue rounded-full" style={{ width: '72%' }} />
                              </div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan rounded-full" style={{ width: '76.5%' }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-50/70 text-xs text-blue-900 border border-blue-200/60 flex items-center justify-between">
                          <span>{isRTL ? 'أولوية التدخل الموصى بها:' : 'Recommended Priority:'}</span>
                          <span className="font-bold text-blue">{isRTL ? 'دعم المشروعات الصغيرة' : 'SME Job Support'}</span>
                        </div>
                      </div>
                    )}

                    {feat.visualType === 'chart' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <div className="text-xs font-bold text-navy">
                              {isRTL ? 'المسار الزمني: الفعلي والتنبؤي' : 'Observed vs Extrapolated Trajectory'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isRTL ? 'أفق النمذجة: 2021 — 2028' : 'Forecast Horizon: 2021 — 2028'}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-blue bg-blue-50 px-2 py-0.5 rounded-full">
                            95% Confidence
                          </span>
                        </div>

                        {/* Trajectory Bar Visual Mockup */}
                        <div className="h-40 flex items-end justify-between gap-3 pt-4 px-2">
                          {[
                            { year: '2021', val: 55.5, kind: 'actual' },
                            { year: '2022', val: 55.7, kind: 'actual' },
                            { year: '2023', val: 55.9, kind: 'actual' },
                            { year: '2024', val: 56.1, kind: 'actual' },
                            { year: '2026', val: 56.5, kind: 'forecast' },
                            { year: '2028', val: 56.9, kind: 'forecast' },
                          ].map((pt) => {
                            const heightPercent = ((pt.val - 50) / 10) * 100;
                            return (
                              <div key={pt.year} className="flex-1 flex flex-col items-center gap-1.5">
                                <span className="text-[10px] font-bold tabular-nums text-slate-600">
                                  {pt.val}
                                </span>
                                <div className="w-full bg-slate-100 rounded-t-md h-24 flex items-end">
                                  <div
                                    className={`w-full rounded-t-md ${
                                      pt.kind === 'forecast' ? 'bg-cyan' : 'bg-blue'
                                    }`}
                                    style={{ height: `${heightPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 tabular-nums">{pt.year}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 flex items-center gap-2">
                          <DecidixIcon name="info" size={14} color="#D97706" />
                          <span>{isRTL ? 'إخلاء علمي: نموذج اتجاه خطي بسيط قابل للتفسير' : 'Academic notice: Explainable linear trend fitting'}</span>
                        </div>
                      </div>
                    )}

                    {feat.visualType === 'simulator' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <div className="text-xs font-bold text-navy">
                              {isRTL ? 'محاكي السيناريوهات والميزانيات' : 'What-If Policy Lever Simulator'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isRTL ? 'نموذج العائد الحدي التناقصي' : 'Diminishing Marginal Return Model'}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            +1.85 pts Gain
                          </span>
                        </div>

                        {/* Sliders Mockup */}
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-navy">
                              <span>{isRTL ? 'مخصصات الصحة' : 'Healthcare Allocation'}</span>
                              <span className="font-bold text-blue tabular-nums">$15M</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue rounded-full" style={{ width: '45%' }} />
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-navy">
                              <span>{isRTL ? 'مخصصات التعليم' : 'Education Spending'}</span>
                              <span className="font-bold text-blue tabular-nums">$10M</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue rounded-full" style={{ width: '30%' }} />
                            </div>
                          </div>
                        </div>

                        {/* Grounded AI Assistant Response Strip */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                            <DecidixIcon name="spark" size={13} color="#2563EB" />
                            <span>{isRTL ? 'تحليل المساعد الذكي المؤصل' : 'Grounded Assistant Insight'}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {isRTL
                              ? 'يوفر الاستثمار في الرعاية الصحية أعلى عائد حدي أولي (+0.42 نقطة/$1M) وفقاً لبيانات CAPMAS.'
                              : 'Healthcare investment yields the highest marginal efficiency (+0.42 pts/$1M) per CAPMAS baseline.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. PROCESS (3 Connected Steps) */}
      <section id="process" className="py-20 lg:py-28 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue text-xs font-bold border border-blue-200/80 shadow-2xs">
              <DecidixIcon name="overview" size={13} color="#2563EB" />
              <span>{isRTL ? 'منهجية العمل' : 'HOW IT OPERATES'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
              {isRTL
                ? 'ثلاث خطوات محكمة من البيانات إلى اتخاذ القرار'
                : 'Three Verified Steps from Ingestion to Deployment'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRTL
                ? 'آلية عمل معيارية تضمن دقة السجلات، وموثوقية النمذجة الرياضية، وحوكمة المتابعة الميدانية.'
                : 'A rigorous workflow ensuring data integrity, mathematical model validation, and actionable policy triage.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((st, sIdx) => (
              <div
                key={sIdx}
                className="bg-slate-50/70 rounded-2xl p-6 border border-slate-200/80 shadow-xs relative flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm font-display">
                    {st.num}
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-2 font-display">
                    {isRTL ? st.titleAr : st.titleEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {isRTL ? st.descAr : st.descEn}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/70 text-[11px] font-semibold text-blue flex items-center gap-1.5">
                  <DecidixIcon name="check" size={12} color="#2563EB" />
                  <span>{isRTL ? 'إجراء مؤتمت بالكامل' : 'Automated Verification'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS (1 Prominent Quote + 2 Supporting) */}
      <section className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue text-xs font-bold border border-blue-200/80 shadow-2xs">
              <DecidixIcon name="shield" size={13} color="#2563EB" />
              <span>{isRTL ? 'آراء الخبراء وصناع القرار' : 'EXECUTIVE TESTIMONIALS'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
              {isRTL ? 'ثقة مبنية على الشفافية والنتائج' : 'Built for Rigor, Trusted by Planners'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRTL
                ? 'شهادات من قيادات التخطيط والباحثين في الاقتصاد التنموي وحوكمة البيانات.'
                : 'Feedback from regional planning directors, data governance leads, and policy economists.'}
            </p>
          </div>

          <div className="space-y-6">
            {/* Prominent Lead Quote */}
            {testimonials.filter((t) => t.featured).map((t, fIdx) => (
              <div
                key={fIdx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 md:p-10 space-y-6"
              >
                <p className="text-base sm:text-lg lg:text-xl font-medium text-navy leading-relaxed font-serif italic">
                  {isRTL ? t.quoteAr : t.quoteEn}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <div className="w-11 h-11 rounded-full bg-blue text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy">{isRTL ? t.authorAr : t.authorEn}</div>
                    <div className="text-xs text-slate-500">{isRTL ? t.titleAr : t.titleEn}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Two Supporting Quotes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.filter((t) => !t.featured).map((t, sIdx) => (
                <div
                  key={sIdx}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-4 flex flex-col justify-between"
                >
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    {isRTL ? t.quoteAr : t.quoteEn}
                  </p>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-navy flex items-center justify-center font-bold text-xs border border-slate-200/80">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-navy">{isRTL ? t.authorAr : t.authorEn}</div>
                      <div className="text-[11px] text-slate-500">{isRTL ? t.titleAr : t.titleEn}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICING / ACCESS TIERS (3 Plans) */}
      <section id="pricing" className="py-20 lg:py-28 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue text-xs font-bold border border-blue-200/80 shadow-2xs">
              <DecidixIcon name="account" size={13} color="#2563EB" />
              <span>{isRTL ? 'مستويات الوصول والصلاحيات' : 'ACCESS & DEPLOYMENT TIERS'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
              {isRTL
                ? 'وصول مفتوح وشامل بدون حواجز دفع'
                : 'Transparent Access Tiers Without Commercial Paywalls'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRTL
                ? 'صُممت ديسيدكس كمنظومة وطنية مفتوحة قائمة على سياسة التكلفة الصفرية لخدمة المخططين والباحثين والمواطنين.'
                : 'Designed with zero billing overhead to empower researchers, public planners, and citizens across the nation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {tiers.map((tier, trIdx) => (
              <div
                key={trIdx}
                className={`rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 relative ${
                  tier.isRecommended
                    ? 'bg-white border-2 border-blue shadow-card ring-4 ring-blue/5'
                    : 'bg-white border border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                {tier.isRecommended && (
                  <div className="absolute -top-3.5 ltr:right-6 rtl:left-6 px-3 py-1 rounded-full bg-blue text-white text-[11px] font-bold shadow-2xs">
                    {isRTL ? tier.badgeAr : tier.badgeEn}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {isRTL ? tier.badgeAr : tier.badgeEn}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-navy mb-2 font-display">
                    {isRTL ? tier.nameAr : tier.nameEn}
                  </h3>

                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-bold tracking-tight text-navy">
                      {isRTL ? tier.priceAr : tier.priceEn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    {isRTL ? tier.subtextAr : tier.subtextEn}
                  </p>

                  <div className="border-t border-slate-100 pt-5 space-y-3 mb-8">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isRTL ? 'الميزات والصلاحيات المتاحة:' : 'INCLUDED CAPABILITIES:'}
                    </span>
                    {(isRTL ? tier.featuresAr : tier.featuresEn).map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-blue-50 text-blue flex items-center justify-center shrink-0 mt-0.5">
                          <DecidixIcon name="check" size={11} color="#2563EB" />
                        </span>
                        <span className="leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <NavLink
                  to={tier.ctaLink}
                  className={`w-full py-3 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] ${
                    tier.isPrimary
                      ? 'bg-blue hover:bg-blue-hover text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-navy'
                  }`}
                >
                  <span>{isRTL ? tier.ctaTextAr : tier.ctaTextEn}</span>
                  <DecidixIcon name="arrow_right" size={13} color="currentColor" />
                </NavLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION (6 Questions) */}
      <section id="faq" className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue text-xs font-bold border border-blue-200/80 shadow-2xs">
              <DecidixIcon name="info" size={13} color="#2563EB" />
              <span>{isRTL ? 'الأسئلة الشائعة والمعلومات' : 'FREQUENTLY ASKED QUESTIONS'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
              {isRTL ? 'إجابات واضحة حول المنظومة' : 'Everything You Need to Know'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRTL
                ? 'تفاصيل كاملة حول مصادر البيانات، النماذج التحليلية، محاكاة الميزانيات، وحوكمة الخصوصية.'
                : 'Detailed clarity on data provenance, predictive modeling, policy simulation, and privacy.'}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left rtl:text-right flex items-center justify-between gap-4 transition hover:bg-slate-50/60"
                  >
                    <span className="text-sm font-bold text-navy">
                      {isRTL ? faq.qAr : faq.qEn}
                    </span>
                    <span className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      <DecidixIcon name="chevron_down" size={14} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fadeIn">
                      {isRTL ? faq.aAr : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. CLOSING BANNER (High-Contrast Inverted Dark Navy) */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0F172A] rounded-3xl p-8 sm:p-12 lg:p-16 text-white border border-slate-800 shadow-xl relative overflow-hidden text-center lg:text-start">
            {/* Ambient cyan/blue glow circles in background */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs font-bold text-cyan uppercase tracking-wider">
                  {isRTL ? 'ابدأ الاستعراض الآن' : 'IMMEDIATE OPEN ACCESS'}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight font-display">
                  {isRTL
                    ? 'ابدأ بتوجيه القرارات التنموية استناداً إلى بيانات موثوقة ونماذج ذكية'
                    : 'Drive National Development with Verified Data and Intelligent Models'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {isRTL
                    ? 'انضم إلى الباحثين والمخططين في استكشاف المؤشرات التنموية لمحافظات مصر ومحاكاة السياسات الاستثمارية بدقة وبدون أي عوائق.'
                    : 'Join planners and analysts exploring regional development indices across Egypt and simulating capital allocation scenarios with absolute clarity.'}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center lg:items-end">
                <NavLink
                  to="/overview"
                  className="h-11 px-7 rounded-full bg-blue hover:bg-blue-hover text-white text-xs sm:text-sm font-bold transition shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>{isRTL ? 'استعراض المنظومة كزائر' : 'Explore Platform Now'}</span>
                  <DecidixIcon name="arrow_right" size={15} color="#FFFFFF" />
                </NavLink>

                <NavLink
                  to="/login"
                  className="h-11 px-6 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  {isRTL ? 'تسجيل الدخول المؤسسي' : 'Institutional Sign In'}
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ENTERPRISE FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
            {/* Brand Presentation & Mission */}
            <div className="lg:col-span-2 space-y-4">
              <NavLink to="/" className="flex items-center gap-2.5">
                <DecidixIcon name="splash_mark" size={32} className="shrink-0" />
                <span className="font-bold text-lg text-navy tracking-tight font-display">DECIDIX</span>
              </NavLink>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                {isRTL
                  ? 'المنصة الوطنية الذكية لدعم القرار التنموي الإقليمي. توحد مؤشرات التنمية وتوفر التحليلات التنبؤية ومحاكاة السياسات لخدمة التخطيط القومي المستدام.'
                  : 'National Regional Decision Support System. Unifying socio-economic indicators, predictive trajectories, and policy simulations for sustainable national progress.'}
              </p>
              <div className="pt-2 text-[11px] text-slate-400">
                {isRTL ? 'جمهورية مصر العربية · منظومة التخطيط التنموي المستدام' : 'Arab Republic of Egypt · Sustainable Development Platform'}
              </div>
            </div>

            {/* Column 1: Core Hubs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'المنظومة والحلول' : 'PLATFORM HUBS'}
              </span>
              <ul className="space-y-2">
                <li>
                  <NavLink to="/overview" className="hover:text-blue transition-colors">
                    {isRTL ? 'اللوحة الوطنية الشاملة' : 'National Overview'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/insights" className="hover:text-blue transition-colors">
                    {isRTL ? 'التحليلات والمقارنات' : 'Regional Analytics'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/intelligence" className="hover:text-blue transition-colors">
                    {isRTL ? 'الذكاء الاستراتيجي والتنبؤات' : 'Predictive Intelligence'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/decisions/simulator" className="hover:text-blue transition-colors">
                    {isRTL ? 'محاكي السياسات (ماذا لو)' : 'What-If Simulator'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/map" className="hover:text-blue transition-colors">
                    {isRTL ? 'خريطة نقاط الرصد الإقليمي' : 'Interactive Map'}
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Column 2: Legal & Governance */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'الحوكمة والشفافية' : 'GOVERNANCE & LEGAL'}
              </span>
              <ul className="space-y-2">
                <li>
                  <NavLink to="/privacy" className="hover:text-blue transition-colors">
                    {isRTL ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/delete-account" className="hover:text-blue transition-colors">
                    {isRTL ? 'بوابة حذف الحساب والمحو' : 'Account Deletion Portal'}
                  </NavLink>
                </li>
                <li>
                  <a href="#faq" className="hover:text-blue transition-colors">
                    {isRTL ? 'معايير الأمان وحوكمة البيانات' : 'Security & Data Governance'}
                  </a>
                </li>
                <li>
                  <NavLink to="/insights/data-quality" className="hover:text-blue transition-colors">
                    {isRTL ? 'تدقيق جودة البيانات ومصادرها' : 'Data Provenance Audit'}
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Column 3: Tools & Access */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'الأدوات والوصول' : 'TOOLS & ACCESS'}
              </span>
              <ul className="space-y-2">
                <li>
                  <NavLink to="/assistant" className="hover:text-blue transition-colors">
                    {isRTL ? 'المساعد الذكي لدعم القرار' : 'AI Assistant'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/datasets" className="hover:text-blue transition-colors">
                    {isRTL ? 'مستودع مجموعات البيانات' : 'Dataset Repository'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/login" className="hover:text-blue transition-colors">
                    {isRTL ? 'تسجيل دخول الأعضاء' : 'Sign In Portal'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="hover:text-blue transition-colors">
                    {isRTL ? 'إنشاء حساب محلل جديد' : 'Register Analyst'}
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row - Clean Minimalist Professional Footer */}
          <div className="pt-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} DECIDIX. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <NavLink to="/privacy" className="hover:text-blue transition-colors">
                {isRTL ? 'الخصوصية وحوكمة البيانات' : 'Privacy & Data Governance'}
              </NavLink>
              <span>•</span>
              <NavLink to="/login" className="hover:text-blue transition-colors">
                {isRTL ? 'بوابة المحللين' : 'Analyst Portal'}
              </NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
