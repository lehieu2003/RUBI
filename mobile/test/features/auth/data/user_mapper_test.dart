import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/data/dto/auth_dtos.dart';
import 'package:iceflow_mobile/features/auth/data/mappers/user_mapper.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

void main() {
  group('UserRole.fromName', () {
    test('map 3 role chính thức từ server (case-sensitive)', () {
      expect(UserRole.fromName('ADMIN'), UserRole.admin);
      expect(UserRole.fromName('STAFF'), UserRole.staff);
      expect(UserRole.fromName('DRIVER'), UserRole.driver);
    });

    test('null / không rõ → null, không tự suy thành DRIVER', () {
      expect(UserRole.fromName(null), isNull);
      expect(UserRole.fromName('driver'), isNull); // sai hoa-thường → lạ
      expect(UserRole.fromName('OWNER'), isNull);
    });
  });

  group('UserMapper.fromDto', () {
    // Fixture khớp contract backend: user object trong login/me response.
    const driverFixture = {
      'id': 'u-driver-1',
      'email': 'tai@iceflow.vn',
      'name': 'Nguyễn Văn Tài',
      'role': 'DRIVER',
      'factoryId': 'factory-1',
    };

    const expectedUser = User(
      id: 'u-driver-1',
      email: 'tai@iceflow.vn',
      name: 'Nguyễn Văn Tài',
      role: UserRole.driver,
      factoryId: 'factory-1',
    );

    test('fixture DRIVER → Ok(User) đúng dữ liệu và role', () {
      final res = UserMapper.fromDto(UserDto.fromJson(driverFixture));

      expect(res, Ok(expectedUser));
    });

    test('thiếu factoryId → Ok(User) với factoryId null', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture}..remove('factoryId')),
      );

      expect(
        res,
        const Ok(
          User(
            id: 'u-driver-1',
            email: 'tai@iceflow.vn',
            name: 'Nguyễn Văn Tài',
            role: UserRole.driver,
          ),
        ),
      );
    });

    test('mustChangePassword true từ server → User.mustChangePassword true', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture, 'mustChangePassword': true}),
      );

      expect((res as Ok<User>).value.mustChangePassword, isTrue);
    });

    test('mustChangePassword false / thiếu → false', () {
      final explicit = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture, 'mustChangePassword': false}),
      );
      final absent = UserMapper.fromDto(UserDto.fromJson(driverFixture));

      expect((explicit as Ok<User>).value.mustChangePassword, isFalse);
      expect((absent as Ok<User>).value.mustChangePassword, isFalse);
    });

    test('role lạ → Err(UnexpectedFailure "Unknown role")', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture, 'role': 'OWNER'}),
      );

      expect(res.isOk, isFalse);
      final failure = (res as Err<User>).failure;
      expect(failure, isA<UnexpectedFailure>());
      expect((failure as UnexpectedFailure).message, contains('Unknown role'));
    });

    test('role thiếu → Err(UnexpectedFailure)', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture}..remove('role')),
      );

      expect((res as Err<User>).failure, isA<UnexpectedFailure>());
    });

    test('thiếu id → Err(UnexpectedFailure)', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture}..remove('id')),
      );

      expect((res as Err<User>).failure, isA<UnexpectedFailure>());
    });

    test('thiếu email → Err(UnexpectedFailure)', () {
      final res = UserMapper.fromDto(
        UserDto.fromJson({...driverFixture}..remove('email')),
      );

      expect((res as Err<User>).failure, isA<UnexpectedFailure>());
    });
  });
}
