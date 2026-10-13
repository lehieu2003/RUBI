import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';
import 'package:iceflow_mobile/features/staff/domain/repositories/staff_repository.dart';
import 'package:iceflow_mobile/features/staff/presentation/cubit/staff_cubit.dart';
import 'package:mocktail/mocktail.dart';

import 'staff_fixtures.dart';

class _MockRepo extends Mock implements StaffRepository {}

void main() {
  setUpAll(() => registerFallbackValue(UserRole.staff));

  late _MockRepo repo;
  late StaffCubit cubit;

  void stubUpdate(Result<StaffUpdate> result) {
    when(
      () => repo.updateAccount(
        any(),
        name: any(named: 'name'),
        phone: any(named: 'phone'),
        role: any(named: 'role'),
        isActive: any(named: 'isActive'),
        password: any(named: 'password'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() async {
    repo = _MockRepo();
    cubit = StaffCubit(repo: repo);
    when(() => repo.getAccounts()).thenAnswer((_) async => const Ok(accounts));
    await cubit.load();
  });

  tearDown(() => cubit.close());

  test('load → mọi tài khoản; lỗi khi làm mới → giữ danh sách đang xem', () async {
    expect(cubit.state.status, ViewStatus.loaded);
    expect(cubit.state.accounts, accounts);

    when(() => repo.getAccounts())
        .thenAnswer((_) async => const Err(NetworkFailure()));
    await cubit.load();
    expect(cubit.state.status, ViewStatus.error);
    expect(cubit.state.accounts, accounts);
    expect(cubit.state.errorMessage, FailureMessages.network);
  });

  test('create → báo phải đổi mật khẩu tạm, tải lại danh sách', () async {
    when(
      () => repo.createAccount(
        name: any(named: 'name'),
        email: any(named: 'email'),
        password: any(named: 'password'),
        role: any(named: 'role'),
        phone: any(named: 'phone'),
      ),
    ).thenAnswer(
      (_) async => const Ok(
        StaffAccount(id: 'u-9', name: 'Trần Thị Bé', email: 'be@rubi.local', role: UserRole.driver, isActive: true),
      ),
    );
    clearInteractions(repo);

    final result = await cubit.create(
      name: 'Trần Thị Bé',
      email: 'be@rubi.local',
      password: 'Tam12345x',
      role: UserRole.driver,
    );

    expect(result, (ok: true, message: AppStrings.staffCreated('Trần Thị Bé')));
    verify(
      () => repo.createAccount(
        name: 'Trần Thị Bé',
        email: 'be@rubi.local',
        password: 'Tam12345x',
        role: UserRole.driver,
        phone: null,
      ),
    ).called(1);
    verify(() => repo.getAccounts()).called(1);
  });

  test('create: email đã dùng → câu của server, không tải lại', () async {
    when(
      () => repo.createAccount(
        name: any(named: 'name'),
        email: any(named: 'email'),
        password: any(named: 'password'),
        role: any(named: 'role'),
        phone: any(named: 'phone'),
      ),
    ).thenAnswer((_) async => const Err(ServerFailure('Email đã được sử dụng')));
    clearInteractions(repo);

    final result = await cubit.create(
      name: 'A',
      email: 'van@rubi.local',
      password: 'Tam12345x',
      role: UserRole.staff,
    );

    expect(result, (ok: false, message: 'Email đã được sử dụng'));
    verifyNever(() => repo.getAccounts());
  });

  test('edit → gửi tên và số điện thoại, thay tài khoản đó trong danh sách',
      () async {
    final edited = copyOf(van, name: 'Nguyễn Thị Vân Anh', phone: '0911000111');
    stubUpdate(Ok(StaffUpdate(account: edited)));

    final result = await cubit.edit(van, name: 'Nguyễn Thị Vân Anh', phone: '0911000111');

    expect(result, (ok: true, message: AppStrings.staffSaved('Nguyễn Thị Vân Anh')));
    verify(
      () => repo.updateAccount('u-staff', name: 'Nguyễn Thị Vân Anh', phone: '0911000111'),
    ).called(1);
    expect(cubit.state.accounts, [edited, tai, lockedLoc, boss]);
  });

  test('setRole: tài xế thành nhân viên → báo vai trò mới và số đơn bị gỡ',
      () async {
    stubUpdate(
      Ok(StaffUpdate(account: copyOf(tai, role: UserRole.staff), unassignedOrders: 3)),
    );

    final result = await cubit.setRole(tai, UserRole.staff);

    expect(result.ok, isTrue);
    expect(
      result.message,
      '${AppStrings.staffRoleChanged('Phạm Văn Tài', AppStrings.roleStaff)} '
      '${AppStrings.staffOrdersUnassigned(3)}',
    );
    verify(() => repo.updateAccount('u-driver', role: UserRole.staff)).called(1);
    expect(cubit.state.accounts[1].role, UserRole.staff);
  });

  test('setActive: khóa → báo đã khóa; mở khóa → báo đã mở', () async {
    stubUpdate(Ok(StaffUpdate(account: copyOf(van, isActive: false))));
    final locked = await cubit.setActive(van, active: false);
    expect(locked, (ok: true, message: AppStrings.staffLocked('Nguyễn Thị Vân')));
    verify(() => repo.updateAccount('u-staff', isActive: false)).called(1);
    expect(cubit.state.accounts.first.isActive, isFalse);

    stubUpdate(Ok(StaffUpdate(account: copyOf(lockedLoc, isActive: true))));
    final unlocked = await cubit.setActive(lockedLoc, active: true);
    expect(unlocked, (ok: true, message: AppStrings.staffUnlocked('Hoàng Văn Lộc')));
    expect(cubit.state.accounts[2].isActive, isTrue);
  });

  test('resetPassword → gửi mật khẩu mới, báo phải đổi ở lần đăng nhập kế',
      () async {
    stubUpdate(const Ok(StaffUpdate(account: van)));

    final result = await cubit.resetPassword(van, 'Moi12345x');

    expect(result, (ok: true, message: AppStrings.staffPasswordReset('Nguyễn Thị Vân')));
    verify(() => repo.updateAccount('u-staff', password: 'Moi12345x')).called(1);
  });

  test('server từ chối → câu của server, danh sách giữ nguyên', () async {
    stubUpdate(const Err(ServerFailure('Số điện thoại đã thuộc về tài xế khác')));

    final result = await cubit.edit(tai, name: 'Phạm Văn Tài', phone: '0909000000');

    expect(result, (ok: false, message: 'Số điện thoại đã thuộc về tài xế khác'));
    expect(cubit.state.accounts, accounts);
  });
}
