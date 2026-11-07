import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/repositories/admin_api.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/state_views.dart';

class AdminNotificationsScreen extends ConsumerStatefulWidget {
  const AdminNotificationsScreen({super.key});

  @override
  ConsumerState<AdminNotificationsScreen> createState() => _AdminNotificationsScreenState();
}

class _AdminNotificationsScreenState extends ConsumerState<AdminNotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _arabicTitleController = TextEditingController();
  final _arabicBodyController = TextEditingController();
  final _targetUserIdController = TextEditingController();

  String _targetAudience = 'all'; // 'all', 'test', 'user'
  bool _isSending = false;
  Map<String, dynamic>? _lastSendResult;

  Future<({List<Map<String, dynamic>> campaigns, int total, int page, int perPage})>? _historyFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _bodyController.dispose();
    _arabicTitleController.dispose();
    _arabicBodyController.dispose();
    _targetUserIdController.dispose();
    super.dispose();
  }

  void _loadHistory() {
    setState(() {
      _historyFuture = ref.read(adminApiProvider).getNotificationHistory(page: 1, limit: 30);
    });
  }

  Future<void> _handleSend() async {
    if (!_formKey.currentState!.validate()) return;

    final isAr = Directionality.of(context) == TextDirection.rtl;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.card)),
        title: Text(
          isAr ? 'تأكيد إرسال الإشعار التنبيهي' : 'Confirm Notification Dispatch',
          style: AppTypography.titleM.copyWith(color: AppColors.navy),
        ),
        content: Text(
          isAr
              ? 'هل أنت متأكد من رغبتك في إرسال هذا الإشعار للجمهور المحدد ($_targetAudience)؟ سيتم بث الإشعار فوراً عبر Firebase Cloud Messaging.'
              : 'Are you sure you want to dispatch this push notification to "$_targetAudience"? Messages will be pushed immediately via FCM.',
          style: AppTypography.bodyS.copyWith(color: AppColors.ink),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(isAr ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy,
            ),
            child: Text(
              isAr ? 'إرسال الآن' : 'Dispatch Now',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isSending = true;
      _lastSendResult = null;
    });

    try {
      final res = await ref.read(adminApiProvider).sendNotification(
        title: _titleController.text.trim(),
        body: _bodyController.text.trim(),
        targetAudience: _targetAudience,
        targetUserId: _targetAudience == 'user' ? _targetUserIdController.text.trim() : null,
        arabicTitle: _arabicTitleController.text.trim().isEmpty ? null : _arabicTitleController.text.trim(),
        arabicBody: _arabicBodyController.text.trim().isEmpty ? null : _arabicBodyController.text.trim(),
      );

      if (mounted) {
        setState(() {
          _isSending = false;
          _lastSendResult = res;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAr ? 'تم إرسال الحملة الإشعارية بنجاح!' : 'Notification campaign dispatched successfully!',
            ),
            backgroundColor: AppColors.navy,
          ),
        );

        _loadHistory();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Dispatch failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return DecidixPage(
      eyebrow: isAr ? 'إدارة التنبيهات' : 'NOTIFICATION CENTER',
      title: isAr ? 'الإشعارات التنبيهية والحملات' : 'Push Campaigns & Messaging',
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(color: AppColors.hairline),
          ),
          child: TabBar(
            controller: _tabController,
            labelColor: Colors.white,
            unselectedLabelColor: AppColors.ink,
            indicator: BoxDecoration(
              color: AppColors.navy,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent,
            tabs: [
              Tab(text: isAr ? 'إنشاء إشعار جديد' : 'Compose Campaign'),
              Tab(text: isAr ? 'سجل الحملات السابقة' : 'Campaign History'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        SizedBox(
          height: 680,
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildComposeTab(isAr),
              _buildHistoryTab(isAr),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildComposeTab(bool isAr) {
    return SingleChildScrollView(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Audience Selector Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.hairline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isAr ? 'الجمهور المستهدف' : 'Target Audience',
                    style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      ('all', 'All Active Users', 'جميع المستخدمين النشطين'),
                      ('test', 'Test to My Device', 'إرسال تجريبي لهاتفي'),
                      ('user', 'Specific User', 'مستخدم محدد'),
                    ].map((item) {
                      final isSelected = _targetAudience == item.$1;
                      return ChoiceChip(
                        label: Text(isAr ? item.$3 : item.$2),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _targetAudience = item.$1),
                        selectedColor: AppColors.navy,
                        backgroundColor: AppColors.mist,
                        labelStyle: AppTypography.captionMedium.copyWith(
                          color: isSelected ? Colors.white : AppColors.ink,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                        showCheckmark: false,
                      );
                    }).toList(),
                  ),
                  if (_targetAudience == 'user') ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _targetUserIdController,
                      decoration: InputDecoration(
                        labelText: isAr ? 'معرف المستخدم (User ID)' : 'Target User ID (usr_...)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      validator: (val) {
                        if (_targetAudience == 'user' && (val == null || val.trim().isEmpty)) {
                          return isAr ? 'يرجى إدخال معرف المستخدم' : 'User ID is required';
                        }
                        return null;
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Message Composer Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.hairline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isAr ? 'محتوى الإشعار (بالإنجليزية - أساسي)' : 'Notification Content (English)',
                    style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(
                      labelText: isAr ? 'عنوان الإشعار' : 'Notification Title',
                      hintText: 'e.g. Q4 Economic Update Available',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty
                        ? (isAr ? 'العنوان مطلوب' : 'Title is required')
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _bodyController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: isAr ? 'نص الرسالة' : 'Message Body',
                      hintText: 'e.g. New predictive models for regional investments have been published.',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty
                        ? (isAr ? 'نص الرسالة مطلوب' : 'Message body is required')
                        : null,
                  ),
                  const SizedBox(height: 16),

                  Text(
                    isAr ? 'الترجمة العربية (اختياري للمستخدمين باللغة العربية)' : 'Arabic Translation (Optional)',
                    style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _arabicTitleController,
                    decoration: InputDecoration(
                      labelText: isAr ? 'العنوان بالعربية' : 'Arabic Title',
                      hintText: 'مثال: تحديث اقتصادي جديد',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _arabicBodyController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: isAr ? 'النص بالعربية' : 'Arabic Body',
                      hintText: 'مثال: تم نشر توقعات تنموية جديدة في المنصة.',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Dispatch Result Card (if any)
            if (_lastSendResult != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.successSoft,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        isAr
                            ? 'تم إرسال الحملة بنجاح! المستهدفون: ${_lastSendResult!['targeted_tokens'] ?? 0} | تم التسليم: ${_lastSendResult!['delivered_count'] ?? 0}'
                            : 'Campaign dispatched! Targeted: ${_lastSendResult!['targeted_tokens'] ?? 0} devices | Delivered: ${_lastSendResult!['delivered_count'] ?? 0}',
                        style: AppTypography.captionMedium.copyWith(color: AppColors.navy),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _isSending ? null : _handleSend,
                icon: _isSending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                label: Text(
                  isAr ? 'إرسال الحملة التنبيهية' : 'Dispatch Notification Campaign',
                  style: AppTypography.labelMStrong.copyWith(color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab(bool isAr) {
    return FutureBuilder<({List<Map<String, dynamic>> campaigns, int total, int page, int perPage})>(
      future: _historyFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return ErrorView(
            message: isAr ? 'فشل تحميل سجل الإشعارات' : 'Failed to load campaign history',
            onRetry: _loadHistory,
          );
        }

        final campaigns = snapshot.data?.campaigns ?? [];

        if (campaigns.isEmpty) {
          return EmptyView(
            message: isAr ? 'لا توجد حملات إشعارات سابقة' : 'No past notification campaigns found',
          );
        }

        return ListView.separated(
          itemCount: campaigns.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final c = campaigns[index];
            final title = c['title'] as String? ?? 'Notification';
            final arabicTitle = c['arabicTitle'] as String?;
            final body = c['body'] as String? ?? '';
            final audience = (c['targetAudience'] as String? ?? 'all').toUpperCase();
            final delivered = c['deliveredCount'] as int? ?? 0;
            final failed = c['failedCount'] as int? ?? 0;
            final date = c['createdAt'] != null
                ? DateTime.tryParse(c['createdAt'].toString())?.toLocal().toString().split('.').first
                : '-';

            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.hairline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          isAr && arabicTitle != null ? arabicTitle : title,
                          style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.blueSoft,
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                        child: Text(
                          audience,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.blue),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        date ?? '-',
                        style: AppTypography.captionRegular.copyWith(color: AppColors.fadedInk, fontSize: 11),
                      ),
                      Text(
                        isAr ? '$delivered مستلم • $failed فشل' : '$delivered delivered • $failed failed',
                        style: AppTypography.captionMedium.copyWith(color: AppColors.successText, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
