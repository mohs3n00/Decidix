import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';

export const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await register({
          name,
          email,
          password,
          arabic_name: arabicName || undefined,
        });
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher in Corner */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 text-xs font-semibold rounded-pill bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-hero p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center p-3 shadow-lg mb-3">
            <DecidixIcon name="logo_white" size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">DECIDIX</h1>
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'المنصة الوطنية المتكاملة لدعم اتخاذ القرار الإقليمي'
              : 'Intelligent Regional Decision Support System'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-well bg-rose-50 text-danger text-sm font-medium border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  {isRTL ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="decidix-input"
                  placeholder="e.g. Dr. Ahmed Hassan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  {isRTL ? 'الاسم بالعربية (اختياري)' : 'Arabic Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  className="decidix-input"
                  placeholder="مثال: د. أحمد حسن"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="decidix-input"
              placeholder="user@decidixapp.tech"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="decidix-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="decidix-btn-primary w-full mt-2"
          >
            {isSubmitting
              ? isRTL ? 'جارٍ المعالجة...' : 'Authenticating...'
              : isRegisterMode
              ? isRTL ? 'إنشاء حساب جديد' : 'Create Account'
              : isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-line text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
            }}
            className="text-sm font-semibold text-blue hover:underline"
          >
            {isRegisterMode
              ? isRTL ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In'
              : isRTL ? 'مستخدم جديد؟ إنشاء حساب بالمنصة' : 'New to Decidix? Create an Account'}
          </button>
        </div>

        {/* Security & Staging Info */}
        <div className="mt-6 p-3 rounded-well bg-well text-[11px] text-faded-ink text-center border border-line">
          🔒 {isRTL ? 'جلسة مشفرة عبر JWT & HTTPS — خوادم Heroku Staging' : 'Protected by HS256 JWT & HTTPS on Heroku Staging'}
        </div>
      </div>
    </div>
  );
};
