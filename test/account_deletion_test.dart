import 'package:decidix_app/core/auth/auth_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Account Deletion Unit Tests', () {
    test('AuthState clearAuth resets user and tokens', () {
      const initial = AuthState(
        user: DecidixUser(
          id: 'usr_to_delete',
          name: 'Target User',
          email: 'target@decidix.org',
          role: 'viewer',
        ),
        accessToken: 'valid_jwt_token',
        refreshToken: 'valid_refresh_token',
      );
      expect(initial.isAuthenticated, isTrue);

      final cleared = initial.copyWith(clearAuth: true, isLoading: false);
      expect(cleared.isAuthenticated, isFalse);
      expect(cleared.user, isNull);
      expect(cleared.accessToken, isNull);
      expect(cleared.refreshToken, isNull);
      expect(cleared.errorMessage, isNull);
    });
  });
}

