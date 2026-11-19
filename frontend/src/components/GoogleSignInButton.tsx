import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com';

const AUTHORIZED_OAUTH_REDIRECT_URI =
  'https://decidix-web-staging.20912023100049.workers.dev';

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
        oauth2?: {
          initTokenClient: (config: any) => any;
          initCodeClient: (config: any) => any;
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
  const [isTriggering, setIsTriggering] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);

  // Check URL hash or pending storage for OAuth response
  useEffect(() => {
    // 1. Check direct hash (if redirected in same window)
    const hash = window.location.hash;
    if (hash && hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get('id_token');
      if (idToken) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setIsTriggering(true);
        onSuccess(idToken).catch((err) => {
          onError(err?.message || 'Google token verification failed.');
        }).finally(() => {
          setIsTriggering(false);
        });
        return;
      }
    }

    // 2. Check pending sessionStorage token from App.tsx redirect handler
    const pendingToken = sessionStorage.getItem('decidix_pending_google_id_token');
    if (pendingToken) {
      sessionStorage.removeItem('decidix_pending_google_id_token');
      setIsTriggering(true);
      onSuccess(pendingToken).catch((err) => {
        onError(err?.message || 'Google token verification failed.');
      }).finally(() => {
        setIsTriggering(false);
      });
    }

    // 3. Listen for custom event from App.tsx
    const handleTokenEvent = (e: any) => {
      if (e.detail?.idToken) {
        setIsTriggering(true);
        onSuccess(e.detail.idToken).catch((err) => {
          onError(err?.message || 'Google token verification failed.');
        }).finally(() => {
          setIsTriggering(false);
        });
      }
    };

    window.addEventListener('decidix:google:id_token', handleTokenEvent);
    return () => window.removeEventListener('decidix:google:id_token', handleTokenEvent);
  }, [onSuccess, onError]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const allowedOrigins = [
      window.location.origin,
      'https://web.decidixapp.tech',
      'https://decidixapp.tech',
      'https://decidix-web-staging.20912023100049.workers.dev',
    ];

    const handleMessage = async (event: MessageEvent) => {
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === 'DECIDIX_GOOGLE_AUTH_SUCCESS' && event.data?.idToken) {
        setIsTriggering(true);
        try {
          await onSuccess(event.data.idToken);
        } catch (err: any) {
          onError(err?.message || 'Google authentication failed.');
        } finally {
          setIsTriggering(false);
        }
      } else if (event.data?.type === 'DECIDIX_GOOGLE_AUTH_ERROR') {
        onError(event.data?.error || 'Google authentication failed.');
        setIsTriggering(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  // Initialize GIS if available
  useEffect(() => {
    let checkInterval: any = null;

    const initGis = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                setIsTriggering(true);
                try {
                  await onSuccess(response.credential);
                } catch (err: any) {
                  onError(err?.message || 'Google authentication failed.');
                } finally {
                  setIsTriggering(false);
                }
              } else {
                onError('No credential received from Google.');
                setIsTriggering(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          setGisLoaded(true);

          // Attempt Google One Tap passively in background (if supported and permitted)
          try {
            window.google.accounts.id.prompt();
          } catch {
            // Ignored if prompt is blocked or not displayed
          }
        } catch (e: any) {
          console.warn('Google Identity Services init warning:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGis();
        } else if (attempts > 30) {
          clearInterval(checkInterval);
        }
      }, 100);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [onSuccess, onError]);

  // Launch OAuth Popup with verified authorized redirect URI
  const launchOAuthPopup = useCallback(() => {
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      AUTHORIZED_OAUTH_REDIRECT_URI
    )}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${Date.now()}`;

    try {
      const popup = window.open(
        authUrl,
        'decidix_google_auth',
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      );

      if (!popup || popup.closed) {
        onError(
          isRTL
            ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتسجيل الدخول.'
            : 'Pop-up was blocked by browser. Please enable pop-ups to sign in with Google.'
        );
        setIsTriggering(false);
        return;
      }

      // Check popup periodically for closure or redirect to same-origin
      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            setIsTriggering(false);
            return;
          }

          if (
            popup.location &&
            (popup.location.origin === window.location.origin ||
              popup.location.origin === AUTHORIZED_OAUTH_REDIRECT_URI)
          ) {
            const hash = popup.location.hash;
            if (hash && hash.includes('id_token=')) {
              clearInterval(timer);
              const params = new URLSearchParams(hash.substring(1));
              const idToken = params.get('id_token');
              popup.close();
              if (idToken) {
                onSuccess(idToken)
                  .catch((err) => {
                    onError(err?.message || 'Google token verification failed.');
                  })
                  .finally(() => {
                    setIsTriggering(false);
                  });
              }
            }
          }
        } catch {
          // Cross-origin access to popup.location is expected while on accounts.google.com
        }
      }, 500);
    } catch (err: any) {
      onError(err?.message || 'Failed to open Google authentication window.');
      setIsTriggering(false);
    }
  }, [isRTL, onSuccess, onError]);

  const handleCustomClick = () => {
    if (isLoading || isTriggering) return;
    setIsTriggering(true);
    // Launch synchronously to prevent browser popup blockers
    launchOAuthPopup();
  };

  const activeLoading = isLoading || isTriggering;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Branded Decidix Google Button with guaranteed single-line typography */}
      <button
        type="button"
        onClick={handleCustomClick}
        disabled={activeLoading}
        className="w-full h-11 px-5 rounded-full border border-[#E3E9F2] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D9E4] text-navy font-semibold text-xs flex items-center justify-center gap-3 transition shadow-sm active:scale-[0.99] disabled:opacity-60 flex-nowrap cursor-pointer"
      >
        {/* Authentic Multi-Color Google G Logo SVG */}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span className="whitespace-nowrap shrink-0">
          {activeLoading
            ? isRTL
              ? 'جارٍ الاتصال بحساب Google...'
              : 'Connecting to Google...'
            : isRTL
            ? 'المتابعة باستخدام Google'
            : 'Continue with Google'}
        </span>
      </button>

      {/* Hidden GIS container for Google Identity Services initialization */}
      <div ref={buttonRef} className="hidden" />
    </div>
  );
};
