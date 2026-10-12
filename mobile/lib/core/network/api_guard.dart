import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';

/// Chạy một lời gọi API của repository và bảo đảm chỉ có `Result` đi ra:
/// lỗi Dio → failure tương ứng (giữ câu của server), mọi exception khác
/// (TypeError khi parse field sai kiểu...) → `UnexpectedFailure` kèm log.
Future<Result<T>> guardApi<T>(
  String operation, {
  required String tag,
  required Future<Result<T>> Function() run,
}) async {
  try {
    return await run();
  } on DioException catch (err) {
    return Err(mapDioError(err));
  } catch (e, stackTrace) {
    AppLogger.error(
      'Unexpected $operation failure',
      error: e,
      stackTrace: stackTrace,
      tag: tag,
    );
    return Err(UnexpectedFailure('Unexpected $operation failure: $e'));
  }
}

/// `data` của envelope `{ success, data }` khi nó là object; `null` nếu
/// payload không có `data` dạng object.
Map<String, dynamic>? apiDataObject(Object? body) {
  final data = body is Map<String, dynamic> ? body['data'] : null;
  return data is Map<String, dynamic> ? data : null;
}

/// `data` của envelope khi nó là danh sách object; `null` nếu không phải
/// danh sách, hoặc có phần tử không phải object.
List<Map<String, dynamic>>? apiDataList(Object? body) {
  final data = body is Map<String, dynamic> ? body['data'] : null;
  if (data is! List) return null;
  final items = <Map<String, dynamic>>[];
  for (final item in data) {
    if (item is! Map<String, dynamic>) return null;
    items.add(item);
  }
  return items;
}

/// `meta` của một response phân trang; `null` nếu thiếu.
Map<String, dynamic>? apiMeta(Object? body) {
  final meta = body is Map<String, dynamic> ? body['meta'] : null;
  return meta is Map<String, dynamic> ? meta : null;
}
