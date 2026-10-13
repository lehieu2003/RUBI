import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/shells/domain/shell_balance.dart';
import 'package:injectable/injectable.dart';

/// Impl của [ShellsRepository] trên Dio: `GET/PATCH /api/deposits/shells`
/// (envelope `{ success, data|error }`).
@LazySingleton(as: ShellsRepository)
class ShellsRepositoryImpl implements ShellsRepository {
  ShellsRepositoryImpl({required this._dio});

  static const _tag = 'shells';
  static const _path = '/api/deposits/shells';

  final Dio _dio;

  @override
  Future<Result<List<ShellBalance>>> getBalances() {
    return guardApi('getBalances', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(_path);
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Shell deposits response missing `data`'));
      }
      final balances = <ShellBalance>[];
      for (final row in rows) {
        final customerId = row['customerId'];
        final customerName = row['customerName'];
        final shellsOut = row['shellsOut'];
        final shellsIn = row['shellsIn'];
        final depositPerShell = row['depositPerShell'];
        final netDepositOwed = row['netDepositOwed'];
        // Thiếu hay sai kiểu một trường là payload hỏng: không đoán số vỏ
        // hay tiền cọc.
        if (customerId is! String ||
            customerId.isEmpty ||
            customerName is! String ||
            customerName.isEmpty ||
            shellsOut is! int ||
            shellsIn is! int ||
            depositPerShell is! num ||
            netDepositOwed is! num) {
          return Err(MappingValidator.missing('Shell deposit', 'a required field'));
        }
        balances.add(
          ShellBalance(
            customerId: customerId,
            customerName: customerName,
            shellsOut: shellsOut,
            shellsIn: shellsIn,
            depositPerShell: depositPerShell.toDouble(),
            netDepositOwed: netDepositOwed.toDouble(),
          ),
        );
      }
      return Ok(balances);
    });
  }

  @override
  Future<Result<void>> record({
    required String customerId,
    int shellsOut = 0,
    int shellsIn = 0,
  }) {
    return guardApi('record', tag: _tag, run: () async {
      await _dio.patch<dynamic>(
        _path,
        data: {
          'customerId': customerId,
          if (shellsOut > 0) 'shellsOut': shellsOut,
          if (shellsIn > 0) 'shellsIn': shellsIn,
        },
      );
      return const Ok(null);
    });
  }

  @override
  Future<Result<void>> correct({
    required String customerId,
    required int shellsOut,
    required int shellsIn,
  }) {
    return guardApi('correct', tag: _tag, run: () async {
      await _dio.patch<dynamic>(
        _path,
        data: {
          'customerId': customerId,
          'mode': 'SET',
          'shellsOut': shellsOut,
          'shellsIn': shellsIn,
        },
      );
      return const Ok(null);
    });
  }
}
