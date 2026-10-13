import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';
import 'package:iceflow_mobile/features/staff/domain/repositories/staff_repository.dart';
import 'package:iceflow_mobile/features/staff/presentation/cubit/staff_cubit.dart';
import 'package:iceflow_mobile/features/staff/presentation/screens/staff_screen.dart';
import 'package:mocktail/mocktail.dart';

import 'staff_fixtures.dart';

class _MockRepo extends Mock implements StaffRepository {}

void main() {
  setUpAll(() => registerFallbackValue(UserRole.staff));

  late _MockRepo repo;

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

  void stubCreate(Result<StaffAccount> result) {
    when(
      () => repo.createAccount(
        name: any(named: 'name'),
        email: any(named: 'email'),
        password: any(named: 'password'),
        role: any(named: 'role'),
        phone: any(named: 'phone'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockRepo();
    sl.registerFactory<StaffCubit>(() => StaffCubit(repo: repo));
    when(() => repo.getAccounts()).thenAnswer((_) async => const Ok(accounts));
  });

  tearDown(() => sl.unregister<StaffCubit>());

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: StaffScreen()));
    await tester.pump();
  }

  Finder tile(String id) => find.byKey(Key('staff_$id'));

  Future<void> openAccount(WidgetTester tester, String id) async {
    await tester.tap(tile(id));
    await tester.pumpAndSettle();
  }

  group('danh sách', () {
    testWidgets('mỗi tài khoản: tên, vai trò, email; tài khoản khóa có nhãn',
        (tester) async {
      await pumpScreen(tester);

      expect(
        find.descendant(
          of: tile('u-staff'),
          matching: find.text('${AppStrings.roleStaff} · van@rubi.local'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: tile('u-driver'),
          matching: find.text('${AppStrings.roleDriver} · tai@rubi.local'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: tile('u-locked'),
          matching: find.text(AppStrings.staffLockedBadge),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: tile('u-staff'), matching: find.text(AppStrings.staffLockedBadge)),
        findsNothing,
      );
    });

    testWidgets('tài khoản Quản lý chỉ xem: bấm không mở gì', (tester) async {
      await pumpScreen(tester);

      expect(tester.widget<ListTile>(tile('u-admin')).onTap, isNull);
      expect(
        find.descendant(
          of: tile('u-admin'),
          matching: find.textContaining('Quản lý'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getAccounts())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getAccounts()).thenAnswer((_) async => const Ok(accounts));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(tile('u-staff'), findsOneWidget);
    });
  });

  group('tạo tài khoản', () {
    Future<void> openDialog(WidgetTester tester) async {
      await pumpScreen(tester);
      await tester.tap(find.byKey(const Key('staff_new')));
      await tester.pumpAndSettle();
    }

    testWidgets('thiếu tên / email hoặc mật khẩu yếu → báo ngay, không gọi server',
        (tester) async {
      await openDialog(tester);
      await tester.tap(find.byKey(const Key('staff_new_save')));
      await tester.pump();
      expect(find.text(AppStrings.staffNameEmailRequired), findsOneWidget);

      await tester.enterText(find.byKey(const Key('staff_new_name')), 'Trần Thị Bé');
      await tester.enterText(find.byKey(const Key('staff_new_email')), 'be@rubi.local');
      await tester.enterText(find.byKey(const Key('staff_new_password')), '12345678');
      await tester.tap(find.byKey(const Key('staff_new_save')));
      await tester.pump();
      expect(find.text('Mật khẩu phải gồm cả chữ và số'), findsOneWidget);
      verifyNever(
        () => repo.createAccount(
          name: any(named: 'name'),
          email: any(named: 'email'),
          password: any(named: 'password'),
          role: any(named: 'role'),
          phone: any(named: 'phone'),
        ),
      );
    });

    testWidgets('chọn Tài xế, nhập đủ → tạo đúng vai trò và báo phải đổi mật khẩu',
        (tester) async {
      stubCreate(
        const Ok(
          StaffAccount(id: 'u-9', name: 'Trần Thị Bé', email: 'be@rubi.local', role: UserRole.driver, isActive: true),
        ),
      );
      await openDialog(tester);
      await tester.tap(find.text(AppStrings.roleDriver).last);
      await tester.pump();
      await tester.enterText(find.byKey(const Key('staff_new_name')), 'Trần Thị Bé');
      await tester.enterText(find.byKey(const Key('staff_new_email')), 'be@rubi.local');
      await tester.enterText(find.byKey(const Key('staff_new_phone')), '0903123456');
      await tester.enterText(find.byKey(const Key('staff_new_password')), 'Tam12345x');
      await tester.tap(find.byKey(const Key('staff_new_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.createAccount(
          name: 'Trần Thị Bé',
          email: 'be@rubi.local',
          password: 'Tam12345x',
          role: UserRole.driver,
          phone: '0903123456',
        ),
      ).called(1);
      expect(find.byKey(const Key('staff_new_save')), findsNothing);
      expect(find.text(AppStrings.staffCreated('Trần Thị Bé')), findsOneWidget);
    });

    testWidgets('email đã dùng → hộp vẫn mở với câu của server', (tester) async {
      stubCreate(const Err(ServerFailure('Email đã được sử dụng')));
      await openDialog(tester);
      await tester.enterText(find.byKey(const Key('staff_new_name')), 'A');
      await tester.enterText(find.byKey(const Key('staff_new_email')), 'van@rubi.local');
      await tester.enterText(find.byKey(const Key('staff_new_password')), 'Tam12345x');
      await tester.tap(find.byKey(const Key('staff_new_save')));
      await tester.pumpAndSettle();

      expect(find.text('Email đã được sử dụng'), findsOneWidget);
      expect(find.byKey(const Key('staff_new_save')), findsOneWidget);
    });
  });

  group('thao tác trên một tài khoản', () {
    testWidgets('sửa tên và số điện thoại', (tester) async {
      stubUpdate(Ok(StaffUpdate(account: copyOf(van, name: 'Vân Anh', phone: '0911000111'))));
      await pumpScreen(tester);
      await openAccount(tester, 'u-staff');

      await tester.tap(find.byKey(const Key('staff_edit')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('staff_edit_name')), 'Vân Anh');
      await tester.enterText(find.byKey(const Key('staff_edit_phone')), '0911000111');
      await tester.tap(find.byKey(const Key('staff_edit_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.updateAccount('u-staff', name: 'Vân Anh', phone: '0911000111'),
      ).called(1);
      expect(find.text(AppStrings.staffSaved('Vân Anh')), findsOneWidget);
      expect(find.descendant(of: tile('u-staff'), matching: find.text('Vân Anh')), findsOneWidget);
    });

    testWidgets('tài xế → nhân viên: cảnh báo đơn bị gỡ, xác nhận rồi mới đổi',
        (tester) async {
      stubUpdate(
        Ok(StaffUpdate(account: copyOf(tai, role: UserRole.staff), unassignedOrders: 2)),
      );
      await pumpScreen(tester);
      await openAccount(tester, 'u-driver');

      expect(find.text(AppStrings.staffRoleButton(AppStrings.roleStaff)), findsOneWidget);
      await tester.tap(find.byKey(const Key('staff_role')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.staffRoleFromDriverBody('Phạm Văn Tài')), findsOneWidget);
      verifyNever(() => repo.updateAccount(any(), role: any(named: 'role')));

      await tester.tap(find.byKey(const Key('staff_confirm')));
      await tester.pumpAndSettle();
      verify(() => repo.updateAccount('u-driver', role: UserRole.staff)).called(1);
      expect(find.textContaining(AppStrings.staffOrdersUnassigned(2)), findsOneWidget);
    });

    testWidgets('đặt lại mật khẩu: mật khẩu yếu bị chặn, đạt thì gửi', (tester) async {
      stubUpdate(const Ok(StaffUpdate(account: van)));
      await pumpScreen(tester);
      await openAccount(tester, 'u-staff');

      await tester.tap(find.byKey(const Key('staff_reset')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('staff_reset_password')), 'ngan');
      await tester.tap(find.byKey(const Key('staff_reset_save')));
      await tester.pump();
      expect(find.text('Mật khẩu phải có ít nhất 8 ký tự'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('staff_reset_password')), 'Moi12345x');
      await tester.tap(find.byKey(const Key('staff_reset_save')));
      await tester.pumpAndSettle();
      verify(() => repo.updateAccount('u-staff', password: 'Moi12345x')).called(1);
      expect(find.text(AppStrings.staffPasswordReset('Nguyễn Thị Vân')), findsOneWidget);
    });

    testWidgets('khóa: hỏi lại, huỷ thì không làm gì; đồng ý thì khóa',
        (tester) async {
      stubUpdate(Ok(StaffUpdate(account: copyOf(van, isActive: false))));
      await pumpScreen(tester);
      await openAccount(tester, 'u-staff');

      await tester.tap(find.byKey(const Key('staff_lock')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.staffLockTitle('Nguyễn Thị Vân')), findsOneWidget);
      await tester.tap(find.text(AppStrings.cancelButton));
      await tester.pumpAndSettle();
      verifyNever(() => repo.updateAccount(any(), isActive: any(named: 'isActive')));

      await tester.tap(find.byKey(const Key('staff_lock')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('staff_confirm')));
      await tester.pumpAndSettle();
      verify(() => repo.updateAccount('u-staff', isActive: false)).called(1);
      expect(find.text(AppStrings.staffLocked('Nguyễn Thị Vân')), findsOneWidget);
      expect(
        find.descendant(of: tile('u-staff'), matching: find.text(AppStrings.staffLockedBadge)),
        findsOneWidget,
      );
    });

    testWidgets('tài khoản đang khóa: mở khóa ngay, không hỏi lại', (tester) async {
      stubUpdate(Ok(StaffUpdate(account: copyOf(lockedLoc, isActive: true))));
      await pumpScreen(tester);
      await openAccount(tester, 'u-locked');

      expect(find.text(AppStrings.staffUnlockButton), findsOneWidget);
      await tester.tap(find.byKey(const Key('staff_lock')));
      await tester.pumpAndSettle();

      verify(() => repo.updateAccount('u-locked', isActive: true)).called(1);
      expect(find.text(AppStrings.staffUnlocked('Hoàng Văn Lộc')), findsOneWidget);
    });

    testWidgets('server từ chối → báo câu của server', (tester) async {
      stubUpdate(const Err(ServerFailure('Số điện thoại đã thuộc về tài xế khác')));
      await pumpScreen(tester);
      await openAccount(tester, 'u-driver');
      await tester.tap(find.byKey(const Key('staff_edit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('staff_edit_save')));
      await tester.pumpAndSettle();

      expect(find.text('Số điện thoại đã thuộc về tài xế khác'), findsOneWidget);
    });
  });

  testWidgets('màn hình 360dp, tên và email dài → không overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    when(() => repo.getAccounts()).thenAnswer(
      (_) async => const Ok([
        StaffAccount(
          id: 'u-long',
          name: 'Nguyễn Hoàng Thiên Phúc Bảo Long Quang Minh',
          email: 'nguyen.hoang.thien.phuc.bao.long@nhamaydarubi.example.vn',
          role: UserRole.driver,
          isActive: false,
          phone: '0909777888',
        ),
      ]),
    );
    await pumpScreen(tester);
    expect(tester.takeException(), isNull);

    await openAccount(tester, 'u-long');
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const Key('staff_reset')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text(AppStrings.cancelButton));
    await tester.pumpAndSettle();
    Navigator.of(tester.element(find.byKey(const Key('staff_lock')))).pop();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('staff_new')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
