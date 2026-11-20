import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { GrainOverlay } from '../../components/GrainOverlay';
import { GlassStatCard } from '../../components/GlassStatCard';
import { InteractiveActionButton } from '../../components/InteractiveActionButton';

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
      quoteEn: '"Decidix transformed how our regional planning committee prioritizes capital interventions. The What-If Simulator lets us evaluate marginal yields across sectors before committing a single pound of public investment."',
      quoteAr: '«غيّرت منصة ديسيدكس منهجية عمل لجنة التخطيط الإقليمي في ترتيب أولويات المشروعات. محاكي السياسات يتيح لنا تقييم العائد الحدي بدقة عبر القطاعات قبل اعتماد المخصصات المالية.»',
      authorEn: 'Dr. Mona El-Sherif',
      authorAr: 'د. منى الشريف',
      titleEn: 'Head of Regional Planning & Strategic Monitoring',
      titleAr: 'رئيس قطاع التخطيط الإقليمي والمتابعة الاستراتيجية',
      avatar: 'MS',
      featured: true,
    },
    {
      quoteEn: '"The strict data governance and verifiable CAPMAS data provenance give our analysts complete academic confidence. Every indicator links directly to official sources."',
      quoteAr: '«حوكمة البيانات الصارمة وموثوقية سجلات الإحصاء الرسمية تمنح باحثينا ومحللينا ثقة علمية كاملة. كل مؤشر مرتبط مباشرة بمصدره المعتمد.»',
      authorEn: 'Eng. Tarek Abdelrahman',
      authorAr: 'م. طارق عبد الرحمن',
      titleEn: 'Director of Data Governance & Systems',
      titleAr: 'مدير حوكمة البيانات ونظم المعلومات',
      avatar: 'TA',
      featured: false,
    },
    {
      quoteEn: '"Comparing Upper Egypt and Delta governorates in a unified composite index with tabular figures provides unprecedented clarity for regional equity research."',
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
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col text-navy font-sans overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'}`}>

      {/* ===== 1. FLOATING GLASS NAVBAR ===== */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <div className="glass-nav rounded-full px-4 py-1.5 shadow-glass-dark flex items-center justify-between gap-2">

          {/* Logo — bare icon, no box */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0" aria-label="Decidix Home">
            <DecidixIcon name="splash_mark" size={34} />
            <span className="hidden sm:block font-bold text-sm tracking-tight text-white font-display">DECIDIX</span>
          </NavLink>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <a href="#capabilities" className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 transition">
              {isRTL ? 'القدرات' : 'Capabilities'}
            </a>
            <a href="#features" className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 transition">
              {isRTL ? 'الميزات' : 'Features'}
            </a>
            <a href="#process" className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 transition">
              {isRTL ? 'آلية العمل' : 'How It Works'}
            </a>
            <a href="#pricing" className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 transition">
              {isRTL ? 'باقات الوصول' : 'Access Tiers'}
            </a>
            <a href="#faq" className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 transition">
              {isRTL ? 'الأسئلة' : 'FAQ'}
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition"
              aria-label="Switch Language"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {isAuthenticated ? (
              <NavLink
                to="/overview"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-4 py-2 rounded-full transition hidden sm:flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{isRTL ? 'لوحة التحكم' : 'Workspace'}</span>
                <DecidixIcon name="arrow_right" size={12} color="#FFFFFF" />
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="text-white/80 hover:bg-white/10 rounded-full px-3 py-1.5 text-xs font-semibold transition hidden sm:block whitespace-nowrap"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </NavLink>
                <NavLink
                  to="/overview"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-4 py-2 rounded-full transition hidden sm:flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{isRTL ? 'استعراض المنصة' : 'Explore'}</span>
                  <DecidixIcon name="arrow_right" size={12} color="#FFFFFF" />
                </NavLink>
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full text-white/80 hover:bg-white/10 transition"
              aria-label="Toggle Mobile Menu"
            >
              <DecidixIcon name={mobileMenuOpen ? 'close' : 'filter'} size={18} color="#FFFFFF" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 glass-nav rounded-2xl px-4 py-4 space-y-3 shadow-glass-dark">
            <nav className="flex flex-col space-y-1 text-sm font-semibold">
              {[
                { href: '#capabilities', en: 'Capabilities', ar: 'القدرات والحلول' },
                { href: '#features', en: 'Features', ar: 'الميزات التنموية' },
                { href: '#process', en: 'How It Works', ar: 'آلية العمل' },
                { href: '#pricing', en: 'Access Tiers', ar: 'باقات الوصول' },
                { href: '#faq', en: 'FAQ', ar: 'الأسئلة الشائعة' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-xl text-white/80 hover:bg-white/10 transition text-xs"
                >
                  {isRTL ? item.ar : item.en}
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </NavLink>
              <NavLink
                to="/overview"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition"
              >
                {isRTL ? 'استعراض المنصة كزائر' : 'Explore Platform as Guest'}
              </NavLink>
            </div>
          </div>
        )}
      </header>

      {/* ===== 2. HERO SECTION ===== */}
      <section className="relative overflow-hidden min-h-[92vh] bg-hero-dark rounded-[2.5rem] mt-20 mx-4 sm:mx-6 lg:mx-8 flex items-center">
        {/* Grain texture */}
        <GrainOverlay />

        {/* Background wordmark */}
        <div className="bg-wordmark select-none pointer-events-none" aria-hidden="true">DECIDIX</div>

        {/* Geometric grid overlay */}
        <div className="absolute inset-0 grid-lineart opacity-30 pointer-events-none" />

        {/* Ambient glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#21EAF4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-8 sm:px-12 lg:px-16 py-16">

          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Eyebrow */}
            <div className="text-eyebrow text-[#21EAF4] mb-4">
              {isRTL ? 'ذكاء التنمية الوطنية' : 'National Development Intelligence'}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white display-heading animate-fade-in-up">
              {isRTL
                ? 'المنصة الوطنية لدعم القرار التنموي والتخطيط الإقليمي'
                : 'National Intelligent Decision Support & Regional Planning Platform'}
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-base leading-relaxed mt-4 max-w-lg animate-fade-in-up animation-delay-100">
              {isRTL
                ? 'منظومة وطنية متكاملة لرصد مؤشرات التنمية المستدامة، كشف الفجوات الإقليمية للمحافظات الـ 27، ومحاكاة أثر المشروعات والموازنات لدعم اتخاذ القرار المبني على الأدلة.'
                : 'An authoritative national intelligence system uniting official indicators across all 27 governorates, modeling policy alternatives, and enabling evidence-based governance.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-6 animate-fade-in-up animation-delay-200">
              <NavLink to="/overview">
                <InteractiveActionButton variant="dark">
                  {isRTL ? 'استعراض المنصة كزائر' : 'Explore Platform as Guest'}
                </InteractiveActionButton>
              </NavLink>
              <NavLink
                to="/login"
                className="h-12 px-6 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center whitespace-nowrap"
              >
                {isRTL ? 'طلب الوصول المؤسسي' : 'Request Institutional Access'}
              </NavLink>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 mt-4 animate-fade-in-up animation-delay-300">
              {[
                { icon: 'check', en: 'CAPMAS verified baseline', ar: 'بيانات رسمية معتمدة من CAPMAS' },
                { icon: 'shield', en: 'Isolated Workspace Tenancy', ar: 'حوكمة وعزل كامل للبيانات' },
                { icon: 'location', en: '27 Governorates Coverage', ar: 'تغطية شاملة لـ 27 محافظة' },
              ].map((chip) => (
                <span
                  key={chip.en}
                  className="border border-white/10 rounded-full px-3 py-1 text-xs text-white/60 flex items-center gap-1.5"
                >
                  <DecidixIcon name={chip.icon} size={12} color="#21EAF4" />
                  {isRTL ? chip.ar : chip.en}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN — Glass Stat Cards */}
          <div className="flex flex-col gap-4">
            <GlassStatCard
              metric="74.2"
              caption={isRTL ? 'المؤشر الوطني المركب' : 'National Index'}
            />
            <GlassStatCard
              metric="27"
              caption={isRTL ? 'محافظة مرصودة' : 'Monitored Regions'}
            />
            <GlassStatCard
              metric="100%"
              caption={isRTL ? 'مطابقة المؤشرات الرسمية' : 'Official Data Baseline'}
              delta={isRTL ? '4 قطاعات أساسية' : '4 Core Sectors'}
            />
          </div>
        </div>
      </section>

      {/* ===== 3. LOGO CLOUD ===== */}
      <section id="capabilities" className="py-12 bg-white scroll-mt-24">
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
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:border-slate-300 transition-colors flex flex-col items-center text-center shadow-2xs"
              >
                <span className="text-xs font-bold text-navy mb-0.5">
                  {isRTL ? lg.arabicName : lg.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{lg.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. FEATURES SECTION ===== */}
      <section
        id="features"
        className="bg-[#F5F7FA] rounded-[2.5rem] mx-4 sm:mx-6 lg:mx-8 my-8 py-20 px-8 sm:px-12 lg:px-16 scroll-mt-24"
      >
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200/80">
            <DecidixIcon name="insights" size={13} color="#2563EB" />
            <span>{isRTL ? 'القدرات والحلول التنموية' : 'CORE CAPABILITIES'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy font-display">
            {isRTL ? 'منظومة متكاملة من البيانات إلى القرار' : 'From Heterogeneous Data to Confident Decisions'}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isRTL
              ? 'محاور مترابطة تجمع بين دقة الرصد الإحصائي، وقوة النمذجة الرياضية، ومرونة محاكاة أثر المخصصات المالية.'
              : 'Integrated analytical pillars combining statistical precision, predictive machine learning, and dynamic policy modeling.'}
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-16">
          {features.map((feat, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={feat.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center`}
              >
                {/* Feature Text */}
                <div className={`space-y-5 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
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
                        <span className="w-5 h-5 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60">
                          <DecidixIcon name="check" size={12} color="#2563EB" />
                        </span>
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <NavLink
                      to={feat.link}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors group"
                    >
                      <span>{isRTL ? feat.linkTextAr : feat.linkTextEn}</span>
                      <DecidixIcon name="arrow_right" size={13} color="currentColor" className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </NavLink>
                  </div>
                </div>

                {/* Feature Visual — Large Showcase Card */}
                <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-glass-light p-6 relative overflow-hidden">
                    {/* Internal glass analytics panel header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mb-0.5">
                          {isRTL ? feat.badgeAr : feat.badgeEn}
                        </div>
                        <div className="text-sm font-bold text-navy">
                          {feat.visualType === 'comparison' && (isRTL ? 'مقارنة المحافظات' : 'Governorate Comparison Matrix')}
                          {feat.visualType === 'chart' && (isRTL ? 'المسار الزمني: الفعلي والتنبؤي' : 'Observed vs Extrapolated Trajectory')}
                          {feat.visualType === 'simulator' && (isRTL ? 'محاكي السيناريوهات' : 'What-If Policy Simulator')}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                        CAPMAS 2021-2024
                      </span>
                    </div>

                    {feat.visualType === 'comparison' && (
                      <div className="space-y-3">
                        {[
                          { labelEn: 'Overall Development Index', labelAr: 'المؤشر التنموي العام', v1: 75, v2: 78, delta: '+3.0 pts' },
                          { labelEn: 'Healthcare Services Score', labelAr: 'قطاع الرعاية الصحية', v1: 72, v2: 76.5, delta: '+4.5 pts' },
                        ].map((row) => (
                          <div key={row.labelEn} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-navy">
                              <span>{isRTL ? row.labelAr : row.labelEn}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[#2563EB] font-bold tabular-nums">{row.v1}</span>
                                <span className="text-[#21EAF4] font-bold tabular-nums">{row.v2}</span>
                                <span className="text-[10px] font-bold text-[#21EAF4] bg-[#21EAF4]/10 px-2 py-0.5 rounded tabular-nums">{row.delta}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="sector-bar"><div className="sector-bar-fill" style={{ width: `${row.v1}%`, background: '#2563EB' }} /></div>
                              <div className="sector-bar"><div className="sector-bar-fill" style={{ width: `${row.v2}%`, background: '#21EAF4' }} /></div>
                            </div>
                          </div>
                        ))}
                        <div className="p-3 rounded-xl bg-blue-50/70 text-xs text-blue-900 border border-blue-200/60 flex items-center justify-between">
                          <span>{isRTL ? 'أولوية التدخل الموصى بها:' : 'Recommended Priority:'}</span>
                          <span className="font-bold text-[#2563EB]">{isRTL ? 'دعم المشروعات الصغيرة' : 'SME Job Support'}</span>
                        </div>
                      </div>
                    )}

                    {feat.visualType === 'chart' && (
                      <div className="space-y-4">
                        <div className="text-[10px] text-slate-400 mb-2">
                          {isRTL ? 'أفق النمذجة: 2021 — 2028' : 'Forecast Horizon: 2021 — 2028'}
                        </div>
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
                                <span className="text-[10px] font-bold tabular-nums text-slate-600">{pt.val}</span>
                                <div className="w-full bg-slate-100 rounded-t-md h-24 flex items-end">
                                  <div
                                    className="w-full rounded-t-md"
                                    style={{
                                      height: `${heightPercent}%`,
                                      background: pt.kind === 'forecast' ? '#21EAF4' : '#2563EB',
                                    }}
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
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 tabular-nums">+1.85 pts Gain</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { labelEn: 'Healthcare Allocation', labelAr: 'مخصصات الصحة', value: '$15M', pct: 45 },
                            { labelEn: 'Education Spending', labelAr: 'مخصصات التعليم', value: '$10M', pct: 30 },
                          ].map((item) => (
                            <div key={item.labelEn} className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-navy">
                                <span>{isRTL ? item.labelAr : item.labelEn}</span>
                                <span className="font-bold text-[#2563EB] tabular-nums">{item.value}</span>
                              </div>
                              <div className="sector-bar">
                                <div className="sector-bar-fill" style={{ width: `${item.pct}%`, background: '#2563EB' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
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

      {/* ===== 5. HOW IT WORKS — DARK ANALYTICAL WORKFLOW ===== */}
      <section
        id="process"
        className="relative bg-navy-gradient rounded-[2.5rem] overflow-hidden mx-4 sm:mx-6 lg:mx-8 my-8 py-20 px-8 sm:px-12 lg:px-16 scroll-mt-24"
      >
        <GrainOverlay />
        {/* Grid lineart overlay */}
        <div className="absolute inset-0 grid-lineart opacity-20 pointer-events-none" />

        <div className="relative z-10">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#21EAF4] text-xs font-bold border border-white/10">
              <DecidixIcon name="overview" size={13} color="#21EAF4" />
              <span>{isRTL ? 'منهجية العمل' : 'HOW IT OPERATES'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display">
              {isRTL
                ? 'ثلاث خطوات محكمة من البيانات إلى اتخاذ القرار'
                : 'Three Verified Steps from Ingestion to Deployment'}
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              {isRTL
                ? 'آلية عمل معيارية تضمن دقة السجلات، وموثوقية النمذجة الرياضية، وحوكمة المتابعة الميدانية.'
                : 'A rigorous workflow ensuring data integrity, mathematical model validation, and actionable policy triage.'}
            </p>
          </div>

          {/* 2-column layout: Steps + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left — Numbered Steps */}
            <div className="flex flex-col gap-5">
              {steps.map((st) => (
                <div key={st.num} className="glass-dark rounded-2xl p-6">
                  <div className="text-eyebrow text-[#21EAF4] mb-3">{st.num}</div>
                  <h3 className="text-base font-bold text-white mb-2 font-display">
                    {isRTL ? st.titleAr : st.titleEn}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {isRTL ? st.descAr : st.descEn}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 text-[11px] font-semibold text-[#21EAF4] flex items-center gap-1.5">
                    <DecidixIcon name="check" size={12} color="#21EAF4" />
                    <span>{isRTL ? 'إجراء مؤتمت بالكامل' : 'Automated Verification'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right — Executive Preview Card */}
            <div className={`tilt-card-ltr ${isRTL ? 'rtl:tilt-card-rtl' : ''}`}>
              <div className="glass-dark rounded-2xl p-6 h-full">
                <div className="mb-4">
                  <div className="text-eyebrow text-[#21EAF4] mb-2">
                    {isRTL ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard Preview'}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {isRTL ? 'جمهورية مصر العربية · نظرة عامة وطنية' : 'Arab Republic of Egypt · National Overview'}
                  </div>
                </div>

                {/* Mini map mock */}
                <div className="relative h-44 rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-4 p-3 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 50 100 Q 52 75 56 60 Q 54 40 50 35 Q 46 25 43 12 M 50 35 Q 54 25 57 12" fill="none" stroke="#21EAF4" strokeWidth="3" />
                  </svg>
                  <div className="absolute top-8 left-[45%] -translate-x-1/2 flex items-center gap-1 bg-[#061A3A] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ring-1 ring-[#21EAF4]/40">
                    <span>{isRTL ? 'القاهرة' : 'Cairo'}</span>
                    <span className="text-[#21EAF4] tabular-nums">75</span>
                  </div>
                  <div className="absolute top-4 left-[35%] flex items-center gap-1 bg-white/10 text-white border border-white/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <span>{isRTL ? 'الإسكندرية' : 'Alexandria'}</span>
                    <span className="text-[#2563EB] tabular-nums">78</span>
                  </div>
                  <div className="absolute bottom-6 left-[62%] flex items-center gap-1 bg-white/10 text-white border border-white/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <span>{isRTL ? 'أسوان' : 'Aswan'}</span>
                    <span className="text-slate-300 tabular-nums">68</span>
                  </div>
                </div>

                {/* Sector bars */}
                <div className="space-y-2">
                  {[
                    { en: 'Education', ar: 'التعليم', pct: 78 },
                    { en: 'Healthcare', ar: 'الصحة', pct: 82 },
                    { en: 'Economy', ar: 'الاقتصاد', pct: 71 },
                    { en: 'Infrastructure', ar: 'البنية التحتية', pct: 65 },
                  ].map((sector) => (
                    <div key={sector.en} className="flex items-center gap-3">
                      <span className="text-[10px] text-white/60 w-20 shrink-0">{isRTL ? sector.ar : sector.en}</span>
                      <div className="flex-1 sector-bar">
                        <div className="sector-bar-fill" style={{ width: `${sector.pct}%`, background: 'linear-gradient(90deg, #2563EB, #21EAF4)' }} />
                      </div>
                      <span className="text-[10px] font-bold text-white tabular-nums w-7 text-right">{sector.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. TESTIMONIALS ===== */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200/80">
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
            {testimonials.filter((t) => t.featured).map((t, fIdx) => (
              <div key={fIdx} className="bg-white rounded-2xl border border-slate-200/80 shadow-glass-light p-8 md:p-10 space-y-6">
                <p className="text-base sm:text-lg lg:text-xl font-medium text-navy leading-relaxed italic">
                  {isRTL ? t.quoteAr : t.quoteEn}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy">{isRTL ? t.authorAr : t.authorEn}</div>
                    <div className="text-xs text-slate-500">{isRTL ? t.titleAr : t.titleEn}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.filter((t) => !t.featured).map((t, sIdx) => (
                <div key={sIdx} className="bg-white rounded-2xl border border-slate-200/80 shadow-glass-light p-6 sm:p-8 space-y-4 flex flex-col justify-between">
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

      {/* ===== 7. ACCESS TIERS — BENTO CARDS ===== */}
      <section
        id="pricing"
        className="bg-[#F5F7FA] rounded-[2.5rem] mx-4 sm:mx-6 lg:mx-8 my-8 py-16 px-8 sm:px-12 lg:px-16 scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200/80">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier, trIdx) => (
            <div
              key={trIdx}
              className={`bg-white rounded-[2rem] border border-slate-200/80 overflow-hidden shadow-glass-light flex flex-col ${
                tier.isRecommended ? 'ring-2 ring-[#2563EB]/30' : ''
              }`}
            >
              {/* Top dark strip with grain */}
              <div className="h-24 bg-navy-gradient relative overflow-hidden">
                <GrainOverlay opacity={0.08} />
                <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-4">
                  {tier.isRecommended && (
                    <span className="absolute top-3 ltr:right-4 rtl:left-4 px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold">
                      {isRTL ? tier.badgeAr : tier.badgeEn}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    {isRTL ? tier.badgeAr : tier.badgeEn}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="text-lg font-bold text-navy mb-1 font-display">
                    {isRTL ? tier.nameAr : tier.nameEn}
                  </h3>
                  <div className="text-2xl font-bold tracking-tight text-navy my-2 tabular-nums">
                    {isRTL ? tier.priceAr : tier.priceEn}
                  </div>
                  <p className="text-xs text-slate-500 mb-5">
                    {isRTL ? tier.subtextAr : tier.subtextEn}
                  </p>

                  <div className="border-t border-slate-100 pt-4 space-y-2.5 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isRTL ? 'الميزات والصلاحيات المتاحة:' : 'INCLUDED CAPABILITIES:'}
                    </span>
                    {(isRTL ? tier.featuresAr : tier.featuresEn).map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                          <DecidixIcon name="check" size={11} color="#2563EB" />
                        </span>
                        <span className="leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <NavLink to={tier.ctaLink}>
                  <InteractiveActionButton variant="light">
                    {isRTL ? tier.ctaTextAr : tier.ctaTextEn}
                  </InteractiveActionButton>
                </NavLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 8. FAQ SECTION ===== */}
      <section id="faq" className="py-20 lg:py-24 bg-white scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200/80">
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
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left rtl:text-right flex items-center justify-between gap-4 transition hover:bg-slate-50/60"
                  >
                    <span className="text-sm font-bold text-navy">
                      {isRTL ? faq.qAr : faq.qEn}
                    </span>
                    <span className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                      <DecidixIcon name="chevron_down" size={14} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {isRTL ? faq.aAr : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 9. CLOSING BANNER ===== */}
      <section className="py-16 lg:py-20 bg-white mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="bg-navy-gradient rounded-[2.5rem] relative overflow-hidden px-8 sm:px-12 lg:px-16 py-16">
          <GrainOverlay />
          <div className="absolute inset-0 grid-lineart opacity-10 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#21EAF4]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-center lg:text-start">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold text-[#21EAF4] uppercase tracking-wider">
                {isRTL ? 'ابدأ الاستعراض الآن' : 'IMMEDIATE OPEN ACCESS'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight font-display">
                {isRTL
                  ? 'ابدأ بتوجيه القرارات التنموية استناداً إلى بيانات موثوقة ونماذج ذكية'
                  : 'Drive National Development with Verified Data and Intelligent Models'}
              </h2>
              <p className="text-xs sm:text-sm text-white/50 max-w-2xl leading-relaxed">
                {isRTL
                  ? 'انضم إلى الباحثين والمخططين في استكشاف المؤشرات التنموية لمحافظات مصر ومحاكاة السياسات الاستثمارية بدقة وبدون أي عوائق.'
                  : 'Join planners and analysts exploring regional development indices across Egypt and simulating capital allocation scenarios with absolute clarity.'}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center lg:items-end">
              <NavLink
                to="/overview"
                className="h-11 px-7 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>{isRTL ? 'استعراض المنظومة كزائر' : 'Explore Platform Now'}</span>
                <DecidixIcon name="arrow_right" size={15} color="#FFFFFF" />
              </NavLink>
              <NavLink
                to="/login"
                className="h-11 px-6 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs sm:text-sm font-semibold transition flex items-center justify-center whitespace-nowrap"
              >
                {isRTL ? 'تسجيل الدخول المؤسسي' : 'Institutional Sign In'}
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 10. ENTERPRISE FOOTER ===== */}
      <footer className="bg-[#F8FAFC] border-t border-slate-200/80 pt-16 pb-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">

            {/* Brand */}
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
              <div className="text-[11px] text-slate-400">
                {isRTL ? 'جمهورية مصر العربية · منظومة التخطيط التنموي المستدام' : 'Arab Republic of Egypt · Sustainable Development Platform'}
              </div>
            </div>

            {/* Platform Hubs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'المنظومة والحلول' : 'PLATFORM HUBS'}
              </span>
              <ul className="space-y-2">
                <li><NavLink to="/overview" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'اللوحة الوطنية الشاملة' : 'National Overview'}</NavLink></li>
                <li><NavLink to="/insights" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'التحليلات والمقارنات' : 'Regional Analytics'}</NavLink></li>
                <li><NavLink to="/intelligence" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'الذكاء الاستراتيجي والتنبؤات' : 'Predictive Intelligence'}</NavLink></li>
                <li><NavLink to="/decisions/simulator" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'محاكي السياسات (ماذا لو)' : 'What-If Simulator'}</NavLink></li>
                <li><NavLink to="/map" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'خريطة نقاط الرصد الإقليمي' : 'Interactive Map'}</NavLink></li>
              </ul>
            </div>

            {/* Governance */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'الحوكمة والشفافية' : 'GOVERNANCE & LEGAL'}
              </span>
              <ul className="space-y-2">
                <li><NavLink to="/privacy" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy'}</NavLink></li>
                <li><NavLink to="/delete-account" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'بوابة حذف الحساب والمحو' : 'Account Deletion Portal'}</NavLink></li>
                <li><a href="#faq" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'معايير الأمان وحوكمة البيانات' : 'Security & Data Governance'}</a></li>
                <li><NavLink to="/insights/data-quality" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'تدقيق جودة البيانات ومصادرها' : 'Data Provenance Audit'}</NavLink></li>
              </ul>
            </div>

            {/* Tools & Access */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                {isRTL ? 'الأدوات والوصول' : 'TOOLS & ACCESS'}
              </span>
              <ul className="space-y-2">
                <li><NavLink to="/assistant" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'المساعد الذكي لدعم القرار' : 'AI Assistant'}</NavLink></li>
                <li><NavLink to="/datasets" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'مستودع مجموعات البيانات' : 'Dataset Repository'}</NavLink></li>
                <li><NavLink to="/login" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'تسجيل دخول الأعضاء' : 'Sign In Portal'}</NavLink></li>
                <li><NavLink to="/register" className="hover:text-[#2563EB] transition-colors">{isRTL ? 'إنشاء حساب محلل جديد' : 'Register Analyst'}</NavLink></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} DECIDIX. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </div>
            <div className="flex items-center gap-4">
              <NavLink to="/privacy" className="hover:text-[#2563EB] transition-colors">
                {isRTL ? 'الخصوصية وحوكمة البيانات' : 'Privacy & Data Governance'}
              </NavLink>
              <span>·</span>
              <NavLink to="/login" className="hover:text-[#2563EB] transition-colors">
                {isRTL ? 'بوابة المحللين' : 'Analyst Portal'}
              </NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
