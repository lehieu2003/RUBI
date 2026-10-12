// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'audit_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuditEntryDto _$AuditEntryDtoFromJson(Map<String, dynamic> json) =>
    AuditEntryDto(
      id: json['id'] as String?,
      action: json['action'] as String?,
      summary: json['summary'] as String?,
      userName: json['userName'] as String?,
      orderCode: json['orderCode'] as String?,
      customerName: json['customerName'] as String?,
      createdAt: json['createdAt'] as String?,
    );
