// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CustomerDto _$CustomerDtoFromJson(Map<String, dynamic> json) => CustomerDto(
  id: json['id'] as String?,
  code: json['code'] as String?,
  name: json['name'] as String?,
  address: json['address'] as String?,
  phone: json['phone'] as String?,
);

CustomerPriceDto _$CustomerPriceDtoFromJson(Map<String, dynamic> json) =>
    CustomerPriceDto(
      productId: json['productId'] as String?,
      name: json['name'] as String?,
      sizeKg: (json['sizeKg'] as num?)?.toInt(),
      unit: json['unit'] as String?,
      price: json['price'] as num?,
      basePrice: json['basePrice'] as num?,
      customPrice: json['customPrice'] as num?,
    );
