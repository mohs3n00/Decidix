import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { LegalFooter } from '../../components/LegalFooter';

export const PrivacyPolicyScreen: React.FC = () => {
  const { isRTL, language, toggleLanguage } = useLanguage();

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col text-navy ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Top Navigation Bar (100% Light Theme) */}
      <header className="bg-white text-[#061A3A] border-b border-[#E2E8F0] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <DecidixIcon name="splash_mark" size={28} className="shrink-0" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#061A3A] block leading-none">DECIDIX</span>
              <span className="text-[10px] text-[#64748B] font-semibold tracking-wider uppercase block mt-0.5">
                {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#061A3A] text-xs font-semibold border border-[#E2E8F0] transition whitespace-nowrap"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            <NavLink
              to="/"
              className="px-4 py-1.5 rounded-full bg-blue hover:bg-blue-hover text-white text-xs font-bold transition shadow-2xs whitespace-nowrap"
            >
              {isRTL ? 'العودة للمنصة' : 'Back to App'}
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10">
        <div className="bg-white rounded-2xl border border-[#E3E9F2] shadow-sm p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="border-b border-[#E3E9F2] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue/10 text-blue text-xs font-bold mb-3">
              <DecidixIcon name="check" size={12} color="#2563EB" />
              <span>{isRTL ? 'وثيقة خصوصية شفافة ومعتمدة' : 'Transparent Architecture Disclosure'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-navy">
              {isRTL ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection Policy'}
            </h1>
            <p className="text-xs text-faded-ink mt-2">
              {isRTL
                ? 'آخر تحديث: نوفمبر 2026 • تنطبق على منصة ديسيدكس الذكية (الويب وتطبيق الهاتف)'
                : 'Last Updated: November 2026 • Applies to Decidix Smart Platform (Web & Mobile)'}
            </p>
          </div>

          {/* Section 1: Project Identity & Nature */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '1. طبيعة المنصة وهوية المنظومة' : '1. Platform Identity & Governance'}
            </h2>
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-2">
              <p>
                {isRTL
                  ? 'منصة ديسيدكس (Decidix) هي منظومة وطنية ذكية للذكاء التنموي ودعم اتخاذ القرار المؤسسي والتخطيط الإقليمي المستدام، مصممة وفق أعلى معايير الأمان وحوكمة البيانات وحماية الخصوصية.'
                  : 'Decidix is an authoritative national development intelligence and regional decision-support system, built under rigorous standards of data governance, security, and privacy protection.'}
              </p>
              <p>
                {isRTL
                  ? 'نحن نلتزم بالوضوح التام فيما يتعلق بمصادر البيانات، وتقنيات المعالجة، والخدمات السحابية المستخدمة، دون أي ادعاءات مضللة أو جهات وهمية.'
                  : 'We strictly adhere to complete factual honesty regarding data origins, processing technologies, and cloud providers, without fabricated addresses or misleading certifications.'}
              </p>
            </div>
          </section>

          {/* Section 2: Data Collected */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '2. البيانات التي نقوم بجمعها' : '2. Information We Collect'}
            </h2>
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-2">
              <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-1.5">
                <li>
                  <strong>{isRTL ? 'بيانات الحساب الشخصي:' : 'Account Credentials:'}</strong>{' '}
                  {isRTL
                    ? 'الاسم، البريد الإلكتروني، كلمات المرور المشفرة بتشفير bcrypt المقاوم للاختراق، والاسم العربي الاختياري.'
                    : 'Full name, email address, secure bcrypt-hashed passwords, and optional Arabic name.'}
                </li>
                <li>
                  <strong>{isRTL ? 'المصادقة عبر Google:' : 'Google Sign-In Authentication:'}</strong>{' '}
                  {isRTL
                    ? 'عند اختيار الدخول بحساب Google، نتلقى معرّف Google ID Token الآمن، والاسم، والبريد المؤكد للتحقق من الهوية فقط. لا نصل إلى جهات اتصالك أو ملفات Drive الخاصة بك.'
                    : 'When choosing Google Sign-In, we receive only the verified ID token, name, and email via Google Identity Services. We never access your contacts or Google Drive.'}
                </li>
                <li>
                  <strong>{isRTL ? 'بيانات التفاعل والمحاكاة:' : 'Simulation & Analytics Data:'}</strong>{' '}
                  {isRTL
                    ? 'سيناريوهات المحاكاة، التوصيات المحفوظة، محادثات المساعد الذكي، وتقارير المشاركة المجتمعية المقدمة عبر المنصة.'
                    : 'Policy simulation parameters, saved recommendations, AI assistant conversations, and community reports submitted through the platform.'}
                </li>
                <li>
                  <strong>{isRTL ? 'رموز الأجهزة للإشعارات:' : 'Device Notification Tokens:'}</strong>{' '}
                  {isRTL
                    ? 'رموز Firebase Cloud Messaging (FCM) المجهولة لتوصيل التنبيهات الإدارية والتنموية الهامة إلى جهازك.'
                    : 'Anonymous Firebase Cloud Messaging (FCM) device tokens used strictly to deliver priority alerts to your device.'}
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Architecture & Third-Party Processors */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '3. البنية التقنية ومزودو الخدمات' : '3. Technical Architecture & Third-Party Processors'}
            </h2>
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E3E9F2]">
                  <div className="font-bold text-navy mb-1">{isRTL ? 'الاستضافة السحابية' : 'Cloud Hosting'}</div>
                  <div className="text-faded-ink">
                    {isRTL
                      ? 'واجهة الويب مستضافة على Cloudflare Workers، وخادم الـ API مستضاف على منصة Heroku.'
                      : 'Frontend hosted on Cloudflare Workers; Node.js backend hosted on Heroku.'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E3E9F2]">
                  <div className="font-bold text-navy mb-1">{isRTL ? 'قاعدة البيانات ونظام السجلات' : 'System of Record'}</div>
                  <div className="text-faded-ink">
                    {isRTL
                      ? 'قاعدة بيانات PostgreSQL العلائقية لتخزين البيانات الرسمية والمصادقة وإدارة الجلسات.'
                      : 'PostgreSQL relational database for transactional records, sessions, and analytical datasets.'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E3E9F2]">
                  <div className="font-bold text-navy mb-1">{isRTL ? 'تخزين مجموعات البيانات' : 'Dataset Storage'}</div>
                  <div className="text-faded-ink">
                    {isRTL
                      ? 'تخزين الملفات السحابي الآمن عبر Cloudflare R2 لأرشيف المؤشرات التنموية.'
                      : 'Cloudflare R2 object storage for national datasets and analytical CSV archives.'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E3E9F2]">
                  <div className="font-bold text-navy mb-1">{isRTL ? 'محرك التحليل والاسترجاع المعرفي' : 'Analytical Decision Engine'}</div>
                  <div className="text-faded-ink">
                    {isRTL
                      ? 'محرك تحليل إحصائي مؤصل يسترجع مؤشرات CAPMAS الرسمية محلياً دون إرسال بيانات المستخدمين إلى أطراف تجارية.'
                      : 'Analytical inference engine retrieving official CAPMAS metrics locally without exposing user queries to commercial ad trackers.'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Team Workspaces & Institutional Privacy */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '4. خصوصية مساحات العمل الفردية وفرق العمل المؤسسية' : '4. Workspaces & Institutional Data Isolation'}
            </h2>
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-2">
              <p>
                {isRTL
                  ? 'تلتزم المنصة بمبدأ العزل التام لمساحات العمل (Workspaces Isolation)؛ حيث تظل أي ملفات أو مجموعات بيانات يرفعها المستخدم الفردي أو فريق عمل مؤسسي مقتصرة حصرياً على حسابه أو أعضاء فريقه المصرح لهم، ولا تُشارك إطلاقاً مع عموم مستخدمي المنصة.'
                  : 'Decidix enforces strict workspace tenancy isolation. Datasets, simulation parameters, and reports uploaded to a personal or institutional team workspace are private to authorized members and never shared with the public baseline.'}
              </p>
              <p>
                {isRTL
                  ? 'تتوافق معالجة البيانات مع قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، ومبادئ سرية الإحصاءات الرسمية لقانون رقم 35 لسنة 1960، مع حظر كامل لأي استغلال تجاري أو إعلاني للبيانات.'
                  : 'All data processing complies with Egyptian Data Privacy Law No. 151 of 2020 and statistical confidentiality principles under Law No. 35 of 1960, strictly prohibiting any commercial monetization.'}
              </p>
            </div>
          </section>

          {/* Section 5: Account Deletion & User Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '5. حق حذف الحساب والبيانات (Google Play Compliance)' : '5. Account Deletion & Right to Erasure'}
            </h2>
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-3">
              <p>
                {isRTL
                  ? 'يحق لكل مستخدم مسجل طلب حذف حسابه وجميع بياناته المرتبطة بشكل فوري ونهائي، سواء من داخل إعدادات التطبيق أو عبر الرابط المخصص لحذف الحسابات المتوافق مع سياسات متجر Google Play.'
                  : 'Every registered user has the unconditional right to delete their account and personal data immediately, both from within the application settings and via our dedicated public account deletion web portal in full compliance with Google Play Developer policies.'}
              </p>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="font-bold text-xs flex items-center gap-2">
                  <DecidixIcon name="close" size={14} color="#E11D48" />
                  <span>{isRTL ? 'ماذا يحدث عند حذف حسابك؟' : 'What happens upon account deletion?'}</span>
                </div>
                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-1 text-[11px]">
                  <li>{isRTL ? 'يتم تغيير حالة الحساب إلى "محذوف" وإلغاء تنشيطه فوراً.' : 'Account status is set to "deleted" and permanently deactivated.'}</li>
                  <li>{isRTL ? 'يتم إلغاء وإبطال جميع جلسات الدخول ورموز JWT فوراً.' : 'All active sessions and refresh tokens are immediately revoked.'}</li>
                  <li>{isRTL ? 'يتم إلغاء تنشيط جميع رموز إشعارات الأجهزة المسجلة.' : 'All associated device notification tokens are deactivated.'}</li>
                  <li>{isRTL ? 'يُمنع تسجيل الدخول مجدداً بالحساب الملغى.' : 'Subsequent login attempts are permanently barred.'}</li>
                </ul>
              </div>
              <div>
                <NavLink
                  to="/delete-account"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <span>{isRTL ? 'الانتقال إلى صفحة حذف الحساب' : 'Go to Account Deletion Portal'}</span>
                  <DecidixIcon name="arrow_right" size={13} color="#FFFFFF" />
                </NavLink>
              </div>
            </div>
          </section>

          {/* Section 6: Contact & Verification */}
          <section className="space-y-3 border-t border-[#E3E9F2] pt-6">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              {isRTL ? '6. التواصل والاستفسارات' : '6. Inquiries & Verification'}
            </h2>
            <p className="text-xs text-[#4A5568] leading-relaxed">
              {isRTL
                ? 'لأي استفسارات بخصوص خصوصية بياناتك أو التحقق من آليات الحذف، يمكنك التواصل مع فريق عمل ديسيدكس عبر الرابط الرسمي للمنصة أو إدارة الحساب مباشرة.'
                : 'For any inquiries regarding personal data privacy, system integrity, or deletion verification, you can communicate with the Decidix engineering team directly through the platform.'}
            </p>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
};
