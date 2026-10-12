// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'debt_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CustomerDebtDto _$CustomerDebtDtoFromJson(Map<String, dynamic> json) =>
    CustomerDebtDto(
      customerId: json['customerId'] as String?,
      customerName: json['customerName'] as String?,
      outstandingDebt: json['outstandingDebt'] as num?,
      lastPaymentDate: json['lastPaymentDate'] as String?,
    );

LedgerEntryDto _$LedgerEntryDtoFromJson(Map<String, dynamic> json) =>
    LedgerEntryDto(
      id: json['id'] as String?,
      customerId: json['customerId'] as String?,
      type: json['type'] as String?,
      amount: json['amount'] as num?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String?,
    );

PaymentReceiptDto _$PaymentReceiptDtoFromJson(Map<String, dynamic> json) =>
    PaymentReceiptDto(
      payment: json['payment'] == null
          ? null
          : LedgerEntryDto.fromJson(json['payment'] as Map<String, dynamic>),
      outstandingDebt: json['outstandingDebt'] as num?,
    );
