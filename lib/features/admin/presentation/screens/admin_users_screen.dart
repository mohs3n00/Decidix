import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/repositories/admin_api.dart';
import '../../../../core/auth/auth_controller.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/search_field.dart';
import '../../../../shared/widgets/state_views.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  String _searchQuery = '';
  String _selectedStatus = 'all';
  int _currentPage = 1;
  static const int _pageSize = 20;

  bool _isLoading = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _users = [];
  int _totalUsers = 0;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        _searchQuery = query.trim();
        _currentPage = 1;
      });
      _fetchUsers();
    });
  }

  Future<void> _fetchUsers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ref.read(adminApiProvider).getUsers(
        search: _searchQuery.isEmpty ? null : _searchQuery,
        status: _selectedStatus == 'all' ? null : _selectedStatus,
        page: _currentPage,
        limit: _pageSize,
      );

      if (mounted) {
        setState(() {
          _users = res.users;
          _totalUsers = res.total;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String _formatBytes(num bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  void _showUserDetails(Map<String, dynamic> user) {
    final isAr = Directionality.of(context) == TextDirection.rtl;
    final currentAdmin = ref.read(authNotifierProvider).user;
    final isSelf = currentAdmin?.id == user['id'];

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        final status = (user['status'] as String? ?? 'active').toLowerCase();
        final role = (user['role'] as String? ?? 'viewer').toUpperCase();
        final email = user['email'] as String? ?? '';
        final name = user['name'] as String? ?? '';
        final arabicName = user['arabicName'] as String?;
        final datasetCount = user['datasetCount'] as int? ?? 0;
        final storageBytes = user['storageBytes'] as num? ?? 0;
        final isVerified = user['emailVerified'] as bool? ?? false;
        final createdAt = user['createdAt'] != null
            ? DateTime.tryParse(user['createdAt'].toString())?.toLocal().toString().split('.').first
            : '-';

        return Container(
          decoration: const BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.hairline,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr && arabicName != null ? arabicName : name,
                          style: AppTypography.titleM.copyWith(color: AppColors.navy),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(color: AppColors.hairline),
              const SizedBox(height: 12),

              // Metadata details
              _buildDetailRow(isAr ? 'الدور الوظيفي' : 'Role', role),
              _buildDetailRow(isAr ? 'حالة البريد' : 'Email Status', isVerified ? (isAr ? 'مؤكد' : 'Verified') : (isAr ? 'غير مؤكد' : 'Unverified')),
              _buildDetailRow(isAr ? 'تاريخ التسجيل' : 'Registered At', createdAt ?? '-'),
              _buildDetailRow(isAr ? 'مجموعات البيانات المرفوعة' : 'Datasets Uploaded', '$datasetCount'),
              _buildDetailRow(isAr ? 'استهلاك التخزين' : 'Storage Consumed', _formatBytes(storageBytes)),

              const SizedBox(height: 14),

              // Privacy Notice
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.mist,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: AppColors.line),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, size: 16, color: AppColors.ink),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isAr
                            ? 'معيار الخصوصية: لا يمكن للإدارة استعراض السجلات أو الملفات المرفوعة للمستخدم.'
                            : 'Privacy Rule: Dataset contents and private user rows are strictly inaccessible.',
                        style: AppTypography.captionRegular.copyWith(color: AppColors.ink, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Action buttons
              if (isSelf) ...[
                Center(
                  child: Text(
                    isAr ? 'لا يمكنك تعليق أو حذف حسابك الخاص' : 'Self-suspension and deletion are disallowed',
                    style: AppTypography.captionMedium.copyWith(color: AppColors.fadedInk),
                  ),
                ),
              ] else ...[
                Row(
                  children: [
                    if (status == 'active')
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _confirmAction(
                            bottomSheetContext,
                            action: 'suspend',
                            userId: user['id'],
                            userName: name,
                          ),
                          icon: const Icon(Icons.pause_circle_outline, size: 18, color: AppColors.warning),
                          label: Text(
                            isAr ? 'تعليق الحساب' : 'Suspend',
                            style: AppTypography.captionMedium.copyWith(color: AppColors.warningText),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.warning),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                          ),
                        ),
                      )
                    else if (status == 'suspended')
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _confirmAction(
                            bottomSheetContext,
                            action: 'reactivate',
                            userId: user['id'],
                            userName: name,
                          ),
                          icon: const Icon(Icons.play_circle_outline, size: 18, color: Colors.white),
                          label: Text(
                            isAr ? 'إعادة التفعيل' : 'Reactivate',
                            style: AppTypography.captionMedium.copyWith(color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                          ),
                        ),
                      ),
                    if (status != 'deleted') ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _confirmAction(
                            bottomSheetContext,
                            action: 'delete',
                            userId: user['id'],
                            userName: name,
                          ),
                          icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                          label: Text(
                            isAr ? 'حذف الحساب' : 'Soft Delete',
                            style: AppTypography.captionMedium.copyWith(color: AppColors.danger),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.danger),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.captionRegular.copyWith(color: AppColors.ink)),
          Text(value, style: AppTypography.captionMedium.copyWith(color: AppColors.navy)),
        ],
      ),
    );
  }

  Future<void> _confirmAction(
    BuildContext bottomSheetContext, {
    required String action,
    required String userId,
    required String userName,
  }) async {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    final String title = switch (action) {
      'suspend' => isAr ? 'تأكيد تعليق الحساب' : 'Confirm Suspension',
      'reactivate' => isAr ? 'تأكيد إعادة التفعيل' : 'Confirm Reactivation',
      'delete' => isAr ? 'تأكيد حذف الحساب' : 'Confirm Soft Deletion',
      _ => '',
    };

    final String content = switch (action) {
      'suspend' => isAr
          ? 'هل أنت متأكد من تعليق حساب $userName؟ سيتم إنهاء جميع جلسات المستخدم ومنعه من الدخول فوراً.'
          : 'Are you sure you want to suspend $userName? All active sessions will be terminated immediately.',
      'reactivate' => isAr
          ? 'هل أنت متأكد من إعادة تفعيل حساب $userName؟ سيتمكن المستخدم من تسجيل الدخول مجدداً.'
          : 'Are you sure you want to reactivate $userName? They will be allowed to log in again.',
      'delete' => isAr
          ? 'هل أنت متأكد من حذف حساب $userName؟ سيتم إلغاء تفعيل الحساب وحفظ النسب السجلات دون فقدان البيانات.'
          : 'Are you sure you want to soft-delete $userName? Sessions will be revoked while preserving lineage.',
      _ => '',
    };

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.card)),
        title: Text(title, style: AppTypography.titleM.copyWith(color: AppColors.navy)),
        content: Text(content, style: AppTypography.bodyS.copyWith(color: AppColors.ink)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(isAr ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: action == 'delete'
                  ? AppColors.danger
                  : (action == 'suspend' ? AppColors.warning : AppColors.navy),
            ),
            child: Text(
              isAr ? 'تأكيد' : 'Confirm',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    if (bottomSheetContext.mounted) {
      Navigator.of(bottomSheetContext).pop();
    }

    try {
      final api = ref.read(adminApiProvider);
      if (action == 'suspend') {
        await api.suspendUser(userId);
      } else if (action == 'reactivate') {
        await api.reactivateUser(userId);
      } else if (action == 'delete') {
        await api.deleteUser(userId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAr ? 'تم تنفيذ العملية بنجاح' : 'Action executed successfully',
            ),
            backgroundColor: AppColors.navy,
          ),
        );
        _fetchUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Widget _buildStatusBadge(String status) {
    final (bg, fg, label) = switch (status) {
      'suspended' => (AppColors.warningSoft, AppColors.warningText, 'SUSPENDED'),
      'deleted' => (AppColors.dangerSoft, AppColors.dangerText, 'DELETED'),
      _ => (AppColors.successSoft, AppColors.successText, 'ACTIVE'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Directionality.of(context) == TextDirection.rtl;

    return DecidixPage(
      eyebrow: isAr ? 'لوحة تحكم المشرف' : 'ADMIN CONTROL',
      title: isAr ? 'إدارة المستخدمين' : 'User Accounts',
      onRefresh: _fetchUsers,
      children: [
        // Search bar
        SearchField(
          controller: _searchController,
          hint: isAr ? 'ابحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...',
          onChanged: _onSearchChanged,
        ),
        const SizedBox(height: 12),

        // Status Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              ('all', 'All Accounts', 'الكل'),
              ('active', 'Active', 'النشطين'),
              ('suspended', 'Suspended', 'الموقوفين'),
              ('deleted', 'Deleted', 'المحذوفين'),
            ].map((item) {
              final isSelected = _selectedStatus == item.$1;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(isAr ? item.$3 : item.$2),
                  selected: isSelected,
                  onSelected: (_) {
                    setState(() {
                      _selectedStatus = item.$1;
                      _currentPage = 1;
                    });
                    _fetchUsers();
                  },
                  selectedColor: AppColors.navy,
                  backgroundColor: AppColors.white,
                  labelStyle: AppTypography.captionMedium.copyWith(
                    color: isSelected ? Colors.white : AppColors.ink,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    side: BorderSide(
                      color: isSelected ? AppColors.navy : AppColors.hairline,
                    ),
                  ),
                  showCheckmark: false,
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // Results summary
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isAr ? 'عدد المستخدمين: $_totalUsers' : 'Total accounts: $_totalUsers',
              style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
            ),
            if (_isLoading)
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
        const SizedBox(height: 12),

        if (_errorMessage != null)
          ErrorView(
            message: _errorMessage!,
            onRetry: _fetchUsers,
          )
        else if (_users.isEmpty && !_isLoading)
          EmptyView(
            message: isAr ? 'لم يتم العثور على أي مستخدمين' : 'No user accounts found matching your filters',
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _users.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final user = _users[index];
              final name = user['name'] as String? ?? 'User';
              final arabicName = user['arabicName'] as String?;
              final email = user['email'] as String? ?? '';
              final role = (user['role'] as String? ?? 'viewer').toUpperCase();
              final status = (user['status'] as String? ?? 'active').toLowerCase();

              return InkWell(
                onTap: () => _showUserDetails(user),
                borderRadius: BorderRadius.circular(AppRadius.card),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(color: AppColors.hairline),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.blueSoft,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.blue.withValues(alpha: 0.2)),
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: AppTypography.titleM.copyWith(color: AppColors.blue, fontSize: 18),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    isAr && arabicName != null ? arabicName : name,
                                    style: AppTypography.labelMStrong.copyWith(color: AppColors.navy),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.mist,
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Text(
                                    role,
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.ink),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              email,
                              style: AppTypography.captionRegular.copyWith(color: AppColors.ink, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildStatusBadge(status),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
