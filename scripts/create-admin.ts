/**
 * Creates the single manager (ADMIN) account.
 *
 *   npm run admin:create
 *
 * Asks for the details interactively so no credential ever lives in the
 * code base or the shell history. Refuses to run when a manager already
 * exists: there is exactly one, and nobody can create one from the app.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'node:readline';
import { validatePassword } from '../src/lib/password';

const FACTORY_NAME = 'Nhà máy đá tinh khiết Rubi';
const prisma = new PrismaClient();

// One queue of input lines, so the script works both typed and piped.
const rl = readline.createInterface({ input: process.stdin, terminal: false });
const pending: string[] = [];
const waiters: ((line: string | null) => void)[] = [];
let closed = false;
rl.on('line', (line) => {
  const waiter = waiters.shift();
  if (waiter) waiter(line);
  else pending.push(line);
});
rl.on('close', () => {
  closed = true;
  for (const waiter of waiters.splice(0)) waiter(null);
});

function nextLine(): Promise<string | null> {
  if (pending.length > 0) return Promise.resolve(pending.shift()!);
  if (closed) return Promise.resolve(null);
  return new Promise((resolve) => waiters.push(resolve));
}

async function ask(question: string, { hidden = false } = {}): Promise<string> {
  process.stdout.write(question);
  const tty = hidden && process.stdin.isTTY ? process.stdin : null;
  // Raw mode stops the terminal from echoing the password as it is typed.
  tty?.setRawMode(true);
  const line = await nextLine();
  tty?.setRawMode(false);
  if (tty) process.stdout.write('\n');
  if (line === null) throw new Error('Đã hủy: không nhận được dữ liệu nhập.');
  return line.replace(/[\r\n\u0003\u0004]/g, '').trim();
}

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { email: true },
  });
  if (existing) {
    throw new Error(
      `Đã có tài khoản Quản lý (${existing.email}). Hệ thống chỉ có một Quản lý; ` +
        'đổi mật khẩu trong Cài đặt > Bảo mật thay vì tạo mới.'
    );
  }

  const email = (await ask('Email Quản lý: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error('Email này đã được dùng cho một tài khoản khác.');
  }

  const name = await ask('Họ tên: ');
  if (name.length < 2) throw new Error('Họ tên phải có ít nhất 2 ký tự.');

  const password = await ask('Mật khẩu (ít nhất 8 ký tự, gồm chữ và số): ', { hidden: true });
  const policyError = validatePassword(password);
  if (policyError) throw new Error(policyError);
  const confirm = await ask('Nhập lại mật khẩu: ', { hidden: true });
  if (confirm !== password) throw new Error('Mật khẩu nhập lại không khớp.');

  const factory =
    (await prisma.factory.findFirst({ orderBy: { createdAt: 'asc' } })) ??
    (await prisma.factory.create({ data: { name: FACTORY_NAME, onboardingCompleted: true } }));

  await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isFactoryOwner: true,
      factoryId: factory.id,
    },
  });

  console.log(`\n✓ Đã tạo tài khoản Quản lý ${email} cho "${factory.name}".`);
}

main()
  .catch((error) => {
    console.error(`\n✖ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
