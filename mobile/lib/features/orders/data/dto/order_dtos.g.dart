// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OfficeOrderDto _$OfficeOrderDtoFromJson(Map<String, dynamic> json) =>
    OfficeOrderDto(
      id: json['id'] as String?,
      status: json['status'] as String?,
      total: json['total'] as num?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String?,
      deliveredAt: json['deliveredAt'] as String?,
      completedAt: json['completedAt'] as String?,
      customer: json['customer'] == null
          ? null
          : OrderCustomerDto.fromJson(json['customer'] as Map<String, dynamic>),
      driver: json['driver'] == null
          ? null
          : OrderDriverDto.fromJson(json['driver'] as Map<String, dynamic>),
      orderItems: (json['orderItems'] as List<dynamic>?)
          ?.map((e) => OrderLineDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

OrderCustomerDto _$OrderCustomerDtoFromJson(Map<String, dynamic> json) =>
    OrderCustomerDto(
      code: json['code'] as String?,
      name: json['name'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
    );

OrderDriverDto _$OrderDriverDtoFromJson(Map<String, dynamic> json) =>
    OrderDriverDto(id: json['id'] as String?, name: json['name'] as String?);

OrderLineDto _$OrderLineDtoFromJson(Map<String, dynamic> json) => OrderLineDto(
  id: json['id'] as String?,
  quantity: (json['quantity'] as num?)?.toInt(),
  unitPrice: json['unitPrice'] as num?,
  lineTotal: json['lineTotal'] as num?,
  actualQty: (json['actualQty'] as num?)?.toInt(),
  product: json['product'] == null
      ? null
      : OrderProductDto.fromJson(json['product'] as Map<String, dynamic>),
);

OrderProductDto _$OrderProductDtoFromJson(Map<String, dynamic> json) =>
    OrderProductDto(
      name: json['name'] as String?,
      sizeKg: (json['sizeKg'] as num?)?.toInt(),
      unit: json['unit'] as String?,
    );

OrderCountsDto _$OrderCountsDtoFromJson(Map<String, dynamic> json) =>
    OrderCountsDto(
      total: (json['total'] as num?)?.toInt(),
      byStatus: (json['byStatus'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ),
    );

DriverOptionDto _$DriverOptionDtoFromJson(Map<String, dynamic> json) =>
    DriverOptionDto(
      id: json['id'] as String?,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
    );
