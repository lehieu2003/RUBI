// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'driver_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DriverOrdersDataDto _$DriverOrdersDataDtoFromJson(Map<String, dynamic> json) =>
    DriverOrdersDataDto(
      orders: (json['orders'] as List<dynamic>?)
          ?.map((e) => OrderDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

OrderDto _$OrderDtoFromJson(Map<String, dynamic> json) => OrderDto(
  id: json['id'] as String?,
  total: json['total'] as num?,
  status: json['status'] as String?,
  createdAt: json['createdAt'] as String?,
  deliveredAt: json['deliveredAt'] as String?,
  customer: json['customer'] == null
      ? null
      : CustomerDto.fromJson(json['customer'] as Map<String, dynamic>),
  orderItems: (json['orderItems'] as List<dynamic>?)
      ?.map((e) => OrderItemDto.fromJson(e as Map<String, dynamic>))
      .toList(),
);

CustomerDto _$CustomerDtoFromJson(Map<String, dynamic> json) => CustomerDto(
  name: json['name'] as String?,
  address: json['address'] as String?,
  phone: json['phone'] as String?,
);

OrderItemDto _$OrderItemDtoFromJson(Map<String, dynamic> json) => OrderItemDto(
  product: json['product'] == null
      ? null
      : ProductDto.fromJson(json['product'] as Map<String, dynamic>),
  quantity: json['quantity'] as num?,
  unitPrice: json['unitPrice'] as num?,
  lineTotal: json['lineTotal'] as num?,
);

ProductDto _$ProductDtoFromJson(Map<String, dynamic> json) =>
    ProductDto(name: json['name'] as String?);
