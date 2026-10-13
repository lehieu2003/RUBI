// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'product_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ProductDto _$ProductDtoFromJson(Map<String, dynamic> json) => ProductDto(
  id: json['id'] as String?,
  name: json['name'] as String?,
  sizeKg: (json['sizeKg'] as num?)?.toInt(),
  unit: json['unit'] as String?,
  minStock: (json['minStock'] as num?)?.toInt(),
  isActive: json['isActive'] as bool?,
  price: json['price'] as num?,
);
