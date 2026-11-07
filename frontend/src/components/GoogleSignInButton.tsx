import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError: (error: string) => void;
  isLoading?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  isLoading = false,
}) => {
  const { isRTL } = useLanguage();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    let checkInterval: any = null;

    const initGis = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                try {
                  await onSuccess(response.credential);
                } catch (err: any) {
                  onError(err?.message || 'Google authentication failed.');
                }
              } else {
                onError('No credential received from Google.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button into container
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: isRTL ? 'right' : 'left',
            width: 380,
          });

          setGisLoaded(true);
        } catch (e: any) {
          console.warn('Google Identity Services render warning:', e);
          setRenderFailed(true);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      // Poll briefly for script load if not yet ready
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGis();
        } else if (attempts > 30) {
          clearInterval(checkInterval);
          setRenderFailed(true);
        }
      }, 100);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isRTL, onSuccess, onError]);

  const handleCustomClick = () => {
    if (isLoading) return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google OneTap prompt dismissed or blocked, attempting render');
          }
        });
      } catch (err: any) {
        onError(err?.message || 'Failed to open Google Sign-In prompt.');
      }
    } else {
      onError('Google Identity Services is initializing. Please try again in a moment.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Container for official Google Identity Services rendered button */}
      <div
        ref={buttonRef}
        className={`w-full flex justify-center ${gisLoaded && !renderFailed ? 'block' : 'hidden'}`}
        style={{ minHeight: '44px' }}
      />

      {/* Styled custom Decidix branded Google Button if official button is initializing or on custom click */}
      {(!gisLoaded || renderFailed) && (
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={isLoading}
          className="w-full h-[48px] px-4 rounded-pill border border-line bg-white hover:bg-well hover:border-hairline text-navy font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
        >
          {/* Authentic Multi-Color Google G Logo SVG */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>
            {isLoading
              ? isRTL ? 'جارٍ الاتصال بحساب Google...' : 'Connecting to Google...'
              : isRTL ? 'المتابعة باستخدام Google' : 'Continue with Google'}
          </span>
        </button>
      )}
    </div>
  );
};
