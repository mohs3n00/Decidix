import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/auth_controller.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';

class MustChangePasswordDialog extends ConsumerStatefulWidget {
  const MustChangePasswordDialog({super.key});

  static Future<void> showIfNeeded(BuildContext context, WidgetRef ref) async {
    final user = ref.read(authNotifierProvider).user;
    if (user != null && user.mustChangePassword) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (_) => const MustChangePasswordDialog(),
      );
    }
  }

  @override
  ConsumerState<MustChangePasswordDialog> createState() => _MustChangePasswordDialogState();
}

class _MustChangePasswordDialogState extends ConsumerState<MustChangePasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final notifier = ref.read(authNotifierProvider.notifier);
    final result = await notifier.changePassword(
      currentPassword: _currentController.text.trim(),
      newPassword: _newController.text.trim(),
    );

    if (!mounted) return;

    if (result.success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppColors.navy,
        ),
      );
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = result.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return PopScope(
      canPop: false,
      child: AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
        contentPadding: const EdgeInsets.symmetric(horizontal: 24),
        actionsPadding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.warningSoft,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: const Icon(Icons.lock_reset, color: AppColors.warning, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                isAr ? 'تغيير كلمة المرور المؤقتة' : 'Set Permanent Password',
                style: AppTypography.titleM.copyWith(fontSize: 18, color: AppColors.navy),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAr
                      ? 'لأسباب أمنية، يجب عليك تغيير كلمة المرور المؤقتة لإنشاء كلمة مرور دائمة لحساب المشرف.'
                      : 'For security compliance, you must set a permanent password before continuing as an administrator.',
                  style: AppTypography.bodyS.copyWith(color: AppColors.ink),
                ),
                const SizedBox(height: 16),
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.dangerSoft,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, size: 16, color: AppColors.danger),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: AppTypography.captionRegular.copyWith(color: AppColors.dangerText),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  isAr ? 'كلمة المرور المؤقتة الحالية' : 'Current Temporary Password',
                  style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _currentController,
                  obscureText: _obscureCurrent,
                  decoration: InputDecoration(
                    hintText: isAr ? 'أدخل كلمة المرور المؤقتة' : 'Enter temporary password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscureCurrent ? Icons.visibility_off : Icons.visibility, size: 20),
                      onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty
                      ? (isAr ? 'مطلوب إدخال كلمة المرور الحالية' : 'Current password required')
                      : null,
                ),
                const SizedBox(height: 12),
                Text(
                  isAr ? 'كلمة المرور الجديدة' : 'New Password',
                  style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _newController,
                  obscureText: _obscureNew,
                  decoration: InputDecoration(
                    hintText: isAr ? '8 أحرف على الأقل' : 'At least 8 characters',
                    suffixIcon: IconButton(
                      icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, size: 20),
                      onPressed: () => setState(() => _obscureNew = !_obscureNew),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().length < 8) {
                      return isAr ? 'يجب أن لا تقل عن 8 أحرف' : 'Must be at least 8 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                Text(
                  isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password',
                  style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _confirmController,
                  obscureText: _obscureConfirm,
                  decoration: InputDecoration(
                    hintText: isAr ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 20),
                      onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  validator: (val) {
                    if (val != _newController.text) {
                      return isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      isAr ? 'حفظ كلمة المرور والدخول' : 'Save & Continue',
                      style: AppTypography.labelMStrong.copyWith(color: Colors.white),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
