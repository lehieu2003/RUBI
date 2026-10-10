// Shared password policy for every place a password is set: account
// creation, manager reset, self-service change and the create-admin script.

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'matkhau123',
  'qwerty123',
  'abc12345',
  'a1234567',
  'iloveyou1',
  '11111111',
  '00000000',
]);

export const PASSWORD_HINT = 'Ít nhất 8 ký tự, gồm cả chữ và số';

/** Returns a Vietnamese error message, or null when the password is acceptable. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  if (password.length > 72) {
    return 'Mật khẩu tối đa 72 ký tự';
  }
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    return 'Mật khẩu phải gồm cả chữ và số';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Mật khẩu này quá dễ đoán, vui lòng chọn mật khẩu khác';
  }
  return null;
}
