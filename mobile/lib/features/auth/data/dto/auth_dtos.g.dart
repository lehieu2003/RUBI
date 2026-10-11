// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserDto _$UserDtoFromJson(Map<String, dynamic> json) => UserDto(
  id: json['id'] as String?,
  email: json['email'] as String?,
  name: json['name'] as String?,
  role: json['role'] as String?,
  factoryId: json['factoryId'] as String?,
  mustChangePassword: json['mustChangePassword'] as bool?,
);

LoginDataDto _$LoginDataDtoFromJson(Map<String, dynamic> json) => LoginDataDto(
  user: json['user'] == null
      ? null
      : UserDto.fromJson(json['user'] as Map<String, dynamic>),
  token: json['token'] as String?,
);

MeDataDto _$MeDataDtoFromJson(Map<String, dynamic> json) => MeDataDto(
  user: json['user'] == null
      ? null
      : UserDto.fromJson(json['user'] as Map<String, dynamic>),
);

ChangePasswordDataDto _$ChangePasswordDataDtoFromJson(
  Map<String, dynamic> json,
) => ChangePasswordDataDto(token: json['token'] as String?);
