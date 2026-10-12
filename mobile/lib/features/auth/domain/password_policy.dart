/// Yêu cầu của mật khẩu mới, giống server (`src/lib/password.ts`) để báo lỗi
/// ngay trên máy. Server vẫn là nơi quyết định cuối (kể cả danh sách mật khẩu
/// dễ đoán, app không giữ).
abstract final class PasswordPolicy {
  static const hint = 'Ít nhất 8 ký tự, gồm cả chữ và số';

  /// Câu báo lỗi tiếng Việt, hoặc `null` khi mật khẩu đạt yêu cầu.
  static String? validate(String password) {
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (password.length > 72) return 'Mật khẩu tối đa 72 ký tự';
    final hasLetter = RegExp(r'\p{L}', unicode: true).hasMatch(password);
    final hasDigit = RegExp(r'\d').hasMatch(password);
    if (!hasLetter || !hasDigit) return 'Mật khẩu phải gồm cả chữ và số';
    return null;
  }
}
