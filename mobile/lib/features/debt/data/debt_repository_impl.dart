import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/network/idempotency.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_dto.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/debt/data/dto/debt_dtos.dart';
import 'package:iceflow_mobile/features/debt/data/mappers/debt_mapper.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [DebtRepository] trên Dio.
@LazySingleton(as: DebtRepository)
class DebtRepositoryImpl implements DebtRepository {
  DebtRepositoryImpl({required this._dio});

  static const _tag = 'debt';

  final Dio _dio;

  @override
  Future<Result<List<CustomerDebt>>> getDebts() {
    return guardApi('getDebts', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/reports/debt');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Debt report response missing `data`'));
      }
      final debts = <CustomerDebt>[];
      for (final row in rows) {
        switch (DebtMapper.fromDebtDto(CustomerDebtDto.fromJson(row))) {
          case Ok<CustomerDebt>(:final value):
            debts.add(value);
          case Err<CustomerDebt>(:final failure):
            return Err(failure);
        }
      }
      return Ok(debts);
    });
  }

  @override
  Future<Result<Paginated<LedgerEntry>>> getLedger(
    String customerId, {
    PageParams page = const PageParams(),
  }) {
    return guardApi('getLedger', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(
        '/api/customers/$customerId/ledger',
        queryParameters: page.toQuery(),
      );
      final rows = apiDataList(res.data);
      final meta = apiMeta(res.data);
      if (rows == null || meta == null) {
        return const Err(
          UnexpectedFailure('Ledger response missing `data` or `meta`'),
        );
      }
      final entries = <LedgerEntry>[];
      for (final row in rows) {
        switch (DebtMapper.fromEntryDto(LedgerEntryDto.fromJson(row))) {
          case Ok<LedgerEntry>(:final value):
            entries.add(value);
          case Err<LedgerEntry>(:final failure):
            return Err(failure);
        }
      }
      return PaginationDto.fromJson(meta).toPage(entries);
    });
  }

  @override
  Future<Result<PaymentReceipt>> recordPayment({
    required String customerId,
    required int amount,
    String? notes,
    String? idempotencyKey,
  }) {
    return guardApi('recordPayment', tag: _tag, run: () async {
      final trimmed = notes?.trim();
      final res = await _dio.post<dynamic>(
        '/api/customers/$customerId/payments',
        data: {
          'amount': amount,
          if (trimmed != null && trimmed.isNotEmpty) 'notes': trimmed,
        },
        options: idempotencyOptions(idempotencyKey),
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Payment response missing `data`'));
      }
      return DebtMapper.fromReceiptDto(PaymentReceiptDto.fromJson(data));
    });
  }
}
