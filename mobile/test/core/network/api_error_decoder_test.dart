import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';

void main() {
  group('mapDioError', () {
    RequestOptions opts(String path) => RequestOptions(path: path);

    test('connectionTimeout → NetworkFailure (chắc chắn chưa gửi)', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.connectionTimeout,
      );
      expect(mapDioError(err), const NetworkFailure());
    });

    test('connectionError do socket (không mở được kết nối) → chắc chắn chưa gửi',
        () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.connectionError,
        error: const SocketException('Connection refused'),
      );
      expect(mapDioError(err), const NetworkFailure());
    });

    test('connectionError sau khi đã gửi (đứt trước khi có header) → chưa rõ',
        () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.connectionError,
        error: const HttpException(
          'Connection closed before full header was received',
        ),
      );
      expect(mapDioError(err), const NetworkFailure(outcomeUnknown: true));
    });

    for (final type in [
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.transformTimeout,
    ]) {
      test('$type → NetworkFailure chưa rõ server đã lưu chưa', () {
        final err = DioException(requestOptions: opts('/x'), type: type);
        final failure = mapDioError(err);
        expect(failure, const NetworkFailure(outcomeUnknown: true));
        // Câu hiển thị chung không đổi với các nơi gọi khác.
        expect(failureMessage(failure), FailureMessages.network);
      });
    }

    test('500 có error trong body → ServerFailure message từ body', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 500,
          data: {'success': false, 'error': 'Internal server error'},
        ),
      );
      expect(
        mapDioError(err),
        const ServerFailure('Internal server error', statusCode: 500),
      );
    });

    test('400 không có error trong body → ServerFailure message mặc định', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 400,
          data: {'success': false},
        ),
      );
      expect(
        mapDioError(err),
        ServerFailure(FailureMessages.unexpected, statusCode: 400),
      );
    });

    test('401 không có body → AuthFailure với message mặc định', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 401,
        ),
      );
      expect(
        mapDioError(err),
        AuthFailure(FailureMessages.sessionExpired, statusCode: 401),
      );
    });

    test('401 serverMessage param ưu tiên hơn body', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 401,
          data: {'success': false, 'error': 'Token expired'},
        ),
      );
      expect(
        mapDioError(err, serverMessage: 'override'),
        const AuthFailure('override', statusCode: 401),
      );
    });

    test('401 có error trong body → AuthFailure giữ message từ body', () {
      final err = DioException(
        requestOptions: opts('/api/auth/login'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/api/auth/login'),
          statusCode: 401,
          data: {'success': false, 'error': 'Email hoặc mật khẩu không đúng'},
        ),
      );
      expect(
        mapDioError(err),
        const AuthFailure('Email hoặc mật khẩu không đúng', statusCode: 401),
      );
    });

    test('error lạ → UnexpectedFailure', () {
      expect(
        mapDioError(StateError('boom')),
        isA<UnexpectedFailure>(),
      );
    });
  });
}
