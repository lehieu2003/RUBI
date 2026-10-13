import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/data/dto/staff_dtos.dart';
import 'package:iceflow_mobile/features/staff/data/mappers/staff_mapper.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';
import 'package:iceflow_mobile/features/staff/domain/repositories/staff_repository.dart';
import 'package:injectable/injectable.dart';

/// Giá trị vai trò gửi cho server.
String _wireRole(UserRole role) => switch (role) {
      UserRole.admin => 'ADMIN',
      UserRole.staff => 'STAFF',
      UserRole.driver => 'DRIVER',
    };

/// Impl của [StaffRepository] trên Dio.
@LazySingleton(as: StaffRepository)
class StaffRepositoryImpl implements StaffRepository {
  StaffRepositoryImpl({required this._dio});

  static const _tag = 'staff';

  final Dio _dio;

  @override
  Future<Result<List<StaffAccount>>> getAccounts() {
    return guardApi('getAccounts', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/staff');
      final rows = apiDataObject(res.data)?['users'];
      if (rows is! List) {
        return const Err(UnexpectedFailure('Staff response missing `data.users`'));
      }
      final accounts = <StaffAccount>[];
      for (final row in rows) {
        if (row is! Map<String, dynamic>) {
          return const Err(UnexpectedFailure('Staff response has a non-object user'));
        }
        switch (StaffMapper.fromDto(StaffAccountDto.fromJson(row))) {
          case Ok<StaffAccount>(:final value):
            accounts.add(value);
          case Err<StaffAccount>(:final failure):
            return Err(failure);
        }
      }
      return Ok(accounts);
    });
  }

  @override
  Future<Result<StaffAccount>> createAccount({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    String? phone,
  }) {
    return guardApi('createAccount', tag: _tag, run: () async {
      final trimmedPhone = phone?.trim() ?? '';
      final res = await _dio.post<dynamic>(
        '/api/staff',
        data: {
          'name': name.trim(),
          'email': email.trim(),
          // Mật khẩu gửi nguyên văn: khoảng trắng cũng là ký tự của mật khẩu.
          'password': password,
          'role': _wireRole(role),
          if (trimmedPhone.isNotEmpty) 'phone': trimmedPhone,
        },
      );
      final user = apiDataObject(res.data)?['user'];
      if (user is! Map<String, dynamic>) {
        return const Err(
          UnexpectedFailure('Create account response missing `data.user`'),
        );
      }
      return StaffMapper.fromDto(StaffAccountDto.fromJson(user));
    });
  }

  @override
  Future<Result<StaffUpdate>> updateAccount(
    String id, {
    String? name,
    String? phone,
    UserRole? role,
    bool? isActive,
    String? password,
  }) {
    return guardApi('updateAccount', tag: _tag, run: () async {
      final res = await _dio.patch<dynamic>(
        '/api/staff/$id',
        data: {
          if (name != null) 'name': name.trim(),
          // Chuỗi rỗng là xoá số điện thoại.
          if (phone != null) 'phone': phone.trim(),
          if (role != null) 'role': _wireRole(role),
          'isActive': ?isActive,
          'password': ?password,
        },
      );
      final data = apiDataObject(res.data);
      final user = data?['user'];
      if (user is! Map<String, dynamic>) {
        return const Err(
          UnexpectedFailure('Update account response missing `data.user`'),
        );
      }
      final unassigned = data?['unassignedOrders'];
      return switch (StaffMapper.fromDto(StaffAccountDto.fromJson(user))) {
        Ok<StaffAccount>(:final value) => Ok(
            StaffUpdate(
              account: value,
              unassignedOrders: unassigned is int ? unassigned : 0,
            ),
          ),
        Err<StaffAccount>(:final failure) => Err(failure),
      };
    });
  }
}
