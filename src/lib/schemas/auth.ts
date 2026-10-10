import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(1, { message: 'Vui lòng nhập mật khẩu' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
