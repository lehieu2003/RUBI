import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/data/staff_repository_impl.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';

/// Một response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recordedFile(String kind, String name) =>
    jsonDecode(
      File('../api/openapi/fixtures/responses/$kind/$name.json').readAsStringSync(),
    ) as Map<String, dynamic>;

Map<String, dynamic> recorded(String operation) =>
    recordedFile('success', operation)['body'] as Map<String, dynamic>;

void main() {
  group('StaffRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late StaffRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = StaffRepositoryImpl(dio: dio);
      requests = [];
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.next(options);
      }));
    });

    tearDown(() => dio.close());

    dynamic sentBody() {
      final raw = requests.last.data;
      return raw is String ? jsonDecode(raw) : raw;
    }

    test('getAccounts: response thật của server → đúng từng field', () async {
      final body = recorded('listStaff');
      adapter.onGet('/api/staff', (server) => server.reply(200, body));

      final accounts = ((await repo.getAccounts()) as Ok<List<StaffAccount>>).value;

      final rows = (body['data'] as Map<String, dynamic>)['users'] as List;
      expect(accounts, hasLength(rows.length));
      for (var i = 0; i < rows.length; i++) {
        final row = rows[i] as Map<String, dynamic>;
        expect(accounts[i].id, row['id']);
        expect(accounts[i].name, row['name']);
        expect(accounts[i].email, row['email']);
        expect(accounts[i].phone, row['phone']);
        expect(accounts[i].role, UserRole.fromName(row['role'] as String));
        expect(accounts[i].isActive, row['isActive']);
      }
    });

    test('getAccounts: vai trò lạ → lỗi, không đoán vai trò', () async {
      adapter.onGet('/api/staff', (server) {
        server.reply(200, {
          'success': true,
          'data': {
            'users': [
              {'id': 'u-1', 'name': 'A', 'email': 'a@x.vn', 'role': 'OWNER', 'isActive': true},
            ],
          },
        });
      });

      expect(
        ((await repo.getAccounts()) as Err<List<StaffAccount>>).failure,
        isA<UnexpectedFailure>(),
      );
    });

    test('createAccount: response thật → tài khoản mới; gửi vai trò dạng server',
        () async {
      final body = recorded('createStaff');
      adapter.onPost('/api/staff', (server) => server.reply(200, body), data: Matchers.any);

      final created = ((await repo.createAccount(
        name: ' Trần Thị Bé ',
        email: ' be@rubi.local ',
        password: 'Tam12345x',
        role: UserRole.driver,
        phone: ' ',
      )) as Ok<StaffAccount>)
          .value;

      final user = (body['data'] as Map<String, dynamic>)['user'] as Map<String, dynamic>;
      expect(created.id, user['id']);
      expect(created.email, user['email']);
      expect(sentBody(), {
        'name': 'Trần Thị Bé',
        'email': 'be@rubi.local',
        'password': 'Tam12345x',
        'role': 'DRIVER',
      });
    });

    test('createAccount: email đã dùng → response thật 409, giữ câu của server',
        () async {
      final fixture = recordedFile('error', 'createStaff.409');
      adapter.onPost('/api/staff', (server) => server.reply(409, fixture['body']),
          data: Matchers.any);

      final res = await repo.createAccount(
        name: 'A',
        email: 'a@rubi.local',
        password: 'Tam12345x',
        role: UserRole.staff,
      );

      expect(
        (res as Err<StaffAccount>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 409,
        ),
      );
    });

    test('updateAccount: response thật → tài khoản sau khi sửa; chỉ gửi trường '
        'được truyền', () async {
      final body = recorded('updateStaff');
      adapter.onPatch('/api/staff/u-1', (server) => server.reply(200, body),
          data: Matchers.any);

      final update = ((await repo.updateAccount('u-1', name: ' Tên mới ')) as Ok<StaffUpdate>).value;

      final data = body['data'] as Map<String, dynamic>;
      expect(update.account.name, (data['user'] as Map<String, dynamic>)['name']);
      expect(update.unassignedOrders, data['unassignedOrders']);
      expect(sentBody(), {'name': 'Tên mới'});
    });

    test('updateAccount: khóa, đổi vai trò, đặt lại mật khẩu, xoá số điện thoại',
        () async {
      adapter.onPatch('/api/staff/u-1', (server) {
        server.reply(200, {
          'success': true,
          'data': {
            'user': {'id': 'u-1', 'name': 'A', 'email': 'a@x.vn', 'phone': null, 'role': 'STAFF', 'isActive': false},
            'unassignedOrders': 2,
          },
        });
      }, data: Matchers.any);

      final update = ((await repo.updateAccount(
        'u-1',
        isActive: false,
        role: UserRole.staff,
        password: 'Moi12345x',
        phone: '',
      )) as Ok<StaffUpdate>)
          .value;

      expect(update.account.isActive, isFalse);
      expect(update.unassignedOrders, 2);
      expect(sentBody(), {
        'phone': '',
        'role': 'STAFF',
        'isActive': false,
        'password': 'Moi12345x',
      });
    });

    test('updateAccount: server từ chối (400) → response thật, giữ câu của server',
        () async {
      final fixture = recordedFile('error', 'updateStaff.400');
      adapter.onPatch('/api/staff/u-1', (server) => server.reply(400, fixture['body']),
          data: Matchers.any);

      expect(
        ((await repo.updateAccount('u-1', isActive: false)) as Err<StaffUpdate>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 400,
        ),
      );
    });
  });
}
