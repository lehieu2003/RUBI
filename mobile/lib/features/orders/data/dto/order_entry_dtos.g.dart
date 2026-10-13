// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_entry_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CustomerOptionDto _$CustomerOptionDtoFromJson(Map<String, dynamic> json) =>
    CustomerOptionDto(
      id: json['id'] as String?,
      code: json['code'] as String?,
      name: json['name'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
    );

PricedProductDto _$PricedProductDtoFromJson(Map<String, dynamic> json) =>
    PricedProductDto(
      productId: json['productId'] as String?,
      name: json['name'] as String?,
      sizeKg: (json['sizeKg'] as num?)?.toInt(),
      unit: json['unit'] as String?,
      price: json['price'] as num?,
      sellable: (json['sellable'] as num?)?.toInt(),
    );

CreatedOrderDto _$CreatedOrderDtoFromJson(Map<String, dynamic> json) =>
    CreatedOrderDto(
      id: json['id'] as String?,
      total: json['total'] as num?,
      customerName: json['customerName'] as String?,
    );
