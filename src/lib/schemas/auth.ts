import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().transform(v => v.trim().toLowerCase()).pipe(z.string().email({ message: 'Email không hợp lệ' })),
  password: z.string().min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' }),
  name: z.string().min(2, { message: 'Tên phải có ít nhất 2 ký tự' }).max(100),
  phone: z.string().min(9, { message: 'Số điện thoại không hợp lệ' }).max(15),
  factoryName: z.string().min(2, { message: 'Tên xưởng phải có ít nhất 2 ký tự' }).max(100),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(1, { message: 'Vui lòng nhập mật khẩu' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
