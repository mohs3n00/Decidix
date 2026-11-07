import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/auth_controller.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_shadows.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../core/localization/locale_controller.dart';
import '../../../../shared/widgets/brand_backdrop.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isRegistering = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _showForgotPasswordDialog(BuildContext parentContext, bool isAr) {
    final resetEmailController = TextEditingController(text: _emailController.text);
    bool isSubmitting = false;

    showDialog<void>(
      context: parentContext,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            title: Row(
              children: [
                const Icon(Icons.lock_reset, color: AppColors.blue, size: 24),
                const SizedBox(width: 8),
                Text(
                  isAr ? 'استعادة كلمة المرور' : 'Reset Password',
                  style: AppTypography.titleM.copyWith(color: AppColors.navy),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAr
                      ? 'أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور.'
                      : 'Enter your email address to receive a secure password reset link.',
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
                const SizedBox(height: 16),
                TextField(
                  key: const ValueKey('reset_email_field'),
                  controller: resetEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: isAr ? 'البريد الإلكتروني' : 'Email Address',
                    prefixIcon: const Icon(Icons.mail_outline, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                child: Text(isAr ? 'إلغاء' : 'Cancel'),
              ),
              FilledButton(
                key: const ValueKey('send_reset_link_button'),
                onPressed: isSubmitting
                    ? null
                    : () async {
                        setDialogState(() => isSubmitting = true);
                        final result = await ref
                            .read(authNotifierProvider.notifier)
                            .requestPasswordReset(resetEmailController.text);
                        if (parentContext.mounted) {
                          Navigator.of(dialogCtx).pop();
                          ScaffoldMessenger.of(parentContext).showSnackBar(
                            SnackBar(
                              content: Text(result.message),
                              backgroundColor:
                                  result.success ? AppColors.navy : AppColors.danger,
                            ),
                          );
                        }
                      },
                child: isSubmitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : Text(isAr ? 'إرسال الرابط' : 'Send Link'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final fmt = context.fmt;
    final locale = ref.watch(localeNotifierProvider);
    final isAr = locale.languageCode == 'ar';
    final langToggleLabel = isAr ? 'English' : 'عربي';

    return Scaffold(
      backgroundColor: AppColors.mist,
      body: BrandBackdrop(
        child: SafeArea(
          child: Column(
            children: [
              // Top language switcher bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    InkWell(
                      onTap: () {
                        ref.read(localeNotifierProvider.notifier).toggleLocale();
                      },
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          border: Border.all(color: AppColors.hairline),
                          boxShadow: AppShadows.card,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.language, size: 16, color: AppColors.blue),
                            const SizedBox(width: 8),
                            Text(
                              langToggleLabel,
                              style: AppTypography.labelM.copyWith(color: AppColors.navy),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Main login container
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(AppRadius.card),
                          border: Border.all(color: AppColors.hairline),
                          boxShadow: AppShadows.card,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Brand Logo Icon
                            Container(
                              width: 72,
                              height: 72,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.blueSoft,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.blue.withValues(alpha: 0.2),
                                  width: 1.5,
                                ),
                              ),
                              child: SvgPicture.asset(
                                AppAssets.logoNavy,
                                colorFilter: const ColorFilter.mode(
                                  AppColors.blue,
                                  BlendMode.srcIn,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),

                            // App Brand Name & Tagline
                            Text(
                              fmt.tr('login_title'),
                              style: AppTypography.headingPage.copyWith(
                                color: AppColors.navy,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              fmt.tr('login_tagline'),
                              style: AppTypography.labelM.copyWith(
                                color: AppColors.blue,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              fmt.tr('login_subtitle'),
                              textAlign: TextAlign.center,
                              style: AppTypography.captionRegular.copyWith(
                                color: AppColors.ink,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 28),

                            // Error state banner if any
                            if (authState.errorMessage != null) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.dangerSoft,
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(
                                      Icons.error_outline,
                                      size: 18,
                                      color: AppColors.danger,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        authState.errorMessage!,
                                        style: AppTypography.captionRegular.copyWith(
                                          color: AppColors.dangerText,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 20),
                            ],

                            // Name field (only for registration)
                            if (_isRegistering) ...[
                              TextField(
                                key: const ValueKey('name_field'),
                                controller: _nameController,
                                decoration: InputDecoration(
                                  labelText: isAr ? 'الاسم الكامل' : 'Full Name',
                                  prefixIcon: const Icon(Icons.person_outline, size: 20),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],

                            // Email / password sign-in (independent of Google OAuth).
                            TextField(
                              key: const ValueKey('email_field'),
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              decoration: InputDecoration(
                                labelText: isAr ? 'البريد الإلكتروني' : 'Email',
                                prefixIcon: const Icon(Icons.mail_outline, size: 20),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              key: const ValueKey('password_field'),
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              autofillHints: const [AutofillHints.password],
                              decoration: InputDecoration(
                                labelText: isAr ? 'كلمة المرور' : 'Password',
                                prefixIcon: const Icon(Icons.lock_outline, size: 20),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  ),
                                  onPressed: () =>
                                      setState(() => _obscurePassword = !_obscurePassword),
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                            ),
                            if (!_isRegistering) ...[
                              const SizedBox(height: 4),
                              Align(
                                alignment: AlignmentDirectional.centerEnd,
                                child: TextButton(
                                  key: const ValueKey('forgot_password_button'),
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  onPressed: () => _showForgotPasswordDialog(context, isAr),
                                  child: Text(
                                    isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?',
                                    style: AppTypography.captionMedium.copyWith(color: AppColors.blue),
                                  ),
                                ),
                              ),
                            ],
                            if (_isRegistering) ...[
                              const SizedBox(height: 12),
                              TextField(
                                key: const ValueKey('confirm_password_field'),
                                controller: _confirmPasswordController,
                                obscureText: _obscureConfirmPassword,
                                decoration: InputDecoration(
                                  labelText: isAr ? 'تأكيد كلمة المرور' : 'Confirm Password',
                                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
                                    ),
                                    onPressed: () =>
                                        setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: FilledButton(
                                onPressed: authState.isLoading
                                    ? null
                                    : () async {
                                        if (_isRegistering &&
                                            _passwordController.text != _confirmPasswordController.text) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                isAr
                                                    ? 'كلمات المرور غير متطابقة.'
                                                    : 'Passwords do not match.',
                                              ),
                                              backgroundColor: AppColors.danger,
                                            ),
                                          );
                                          return;
                                        }
                                        bool success;
                                        if (_isRegistering) {
                                          success = await ref
                                              .read(authNotifierProvider.notifier)
                                              .register(
                                                name: _nameController.text,
                                                email: _emailController.text,
                                                password: _passwordController.text,
                                              );
                                          if (success && context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                  isAr
                                                      ? 'تم إنشاء الحساب بنجاح! تفقد بريدك لتأكيد الحساب.'
                                                      : 'Account created! Please check your email for the verification link.',
                                                ),
                                                backgroundColor: AppColors.navy,
                                              ),
                                            );
                                          }
                                        } else {
                                          success = await ref
                                              .read(authNotifierProvider.notifier)
                                              .signInWithPassword(
                                                email: _emailController.text,
                                                password: _passwordController.text,
                                              );
                                        }
                                        if (success && context.mounted) {
                                          context.go('/overview/dashboard');
                                        }
                                      },
                                child: Text(_isRegistering
                                    ? (isAr ? 'إنشاء حساب جديد' : 'Create an Account')
                                    : (isAr ? 'تسجيل الدخول بالبريد' : 'Sign in with email')),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _isRegistering = !_isRegistering;
                                });
                              },
                              child: Text(
                                _isRegistering
                                    ? (isAr ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In')
                                    : (isAr ? 'ليس لديك حساب؟ إنشاء حساب جديد' : "Don't have an account? Create one"),
                                style: AppTypography.captionMedium.copyWith(color: AppColors.blue),
                              ),
                            ),
                            const SizedBox(height: 18),
                            Row(
                              children: [
                                const Expanded(child: Divider()),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  child: Text(
                                    isAr ? 'أو' : 'or',
                                    style: AppTypography.captionRegular,
                                  ),
                                ),
                                const Expanded(child: Divider()),
                              ],
                            ),
                            const SizedBox(height: 18),

                            // Google Sign-In Button (Primary Authentication Action)
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: authState.isLoading
                                    ? null
                                    : () async {
                                        final success = await ref
                                            .read(authNotifierProvider.notifier)
                                            .signInWithGoogle();
                                        if (success && context.mounted) {
                                          context.go('/overview/dashboard');
                                        }
                                      },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.white,
                                  foregroundColor: AppColors.navy,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                    side: const BorderSide(color: AppColors.line),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                ),
                                child: authState.isLoading
                                    ? Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: AppColors.blue,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Text(
                                            fmt.tr('login_signing_in'),
                                            style: AppTypography.labelM.copyWith(
                                              color: AppColors.ink,
                                            ),
                                          ),
                                        ],
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          _GoogleGIcon(),
                                          const SizedBox(width: 12),
                                          Flexible(
                                            child: Text(
                                              fmt.tr('login_btn_google'),
                                              style: AppTypography.labelM.copyWith(
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.navy,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            if (AppConfig.useMock) SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: TextButton(
                                onPressed: authState.isLoading
                                    ? null
                                    : () async {
                                        final success = await ref
                                            .read(authNotifierProvider.notifier)
                                            .signInWithDemoGoogle();
                                        if (success && context.mounted) {
                                          context.go('/overview/dashboard');
                                        }
                                      },
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.ink,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                                child: Text(
                                  fmt.tr('login_btn_demo'),
                                  style: AppTypography.captionMedium.copyWith(
                                    color: AppColors.blue,
                                  ),
                                ),
                              ),
                            ),

                            const Divider(height: 32),

                            // University project zero-cost badge
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.school_outlined,
                                  size: 14,
                                  color: AppColors.fadedInk,
                                ),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    fmt.tr('login_disclaimer'),
                                    textAlign: TextAlign.center,
                                    style: AppTypography.captionRegular.copyWith(
                                      color: AppColors.fadedInk,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GoogleGIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          'G',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w900,
            fontFamily: 'sans-serif',
            color: const Color(0xFF4285F4),
          ),
        ),
      ),
    );
  }
}
