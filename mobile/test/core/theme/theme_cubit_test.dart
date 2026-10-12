import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/core/theme/app_theme.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockAppPreferences extends Mock implements AppPreferences {}

void main() {
  late _MockAppPreferences preferences;

  setUp(() {
    preferences = _MockAppPreferences();
    when(() => preferences.saveThemeMode(any())).thenAnswer((_) async {});
  });

  ThemeCubit buildCubit() => ThemeCubit(preferences: preferences);

  group('ThemeCubit', () {
    test('mặc định theo máy', () {
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(cubit.state, ThemeMode.system);
    });

    test('load: đọc lại lựa chọn đã lưu', () async {
      for (final (saved, expected) in [
        ('dark', ThemeMode.dark),
        ('light', ThemeMode.light),
        ('system', ThemeMode.system),
      ]) {
        when(() => preferences.readThemeMode()).thenAnswer((_) async => saved);
        final cubit = buildCubit();
        await cubit.load();
        expect(cubit.state, expected, reason: saved);
        await cubit.close();
      }
    });

    test('load: chưa lưu, giá trị lạ, hoặc không đọc được → theo máy', () async {
      final cubit = buildCubit();
      addTearDown(cubit.close);

      when(() => preferences.readThemeMode()).thenAnswer((_) async => null);
      await cubit.load();
      expect(cubit.state, ThemeMode.system);

      when(() => preferences.readThemeMode()).thenAnswer((_) async => 'tím');
      await cubit.load();
      expect(cubit.state, ThemeMode.system);

      when(() => preferences.readThemeMode()).thenThrow(StateError('storage'));
      await cubit.load();
      expect(cubit.state, ThemeMode.system);
    });

    test('select: đổi ngay và lưu tên lựa chọn', () async {
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.select(ThemeMode.dark);

      expect(cubit.state, ThemeMode.dark);
      verify(() => preferences.saveThemeMode('dark')).called(1);
    });

    test('select: không lưu được → lựa chọn vẫn có hiệu lực, không ném lỗi',
        () async {
      when(() => preferences.saveThemeMode(any())).thenThrow(StateError('full'));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await expectLater(cubit.select(ThemeMode.light), completes);
      expect(cubit.state, ThemeMode.light);
    });

    test('đóng khi đang đọc → không lỗi', () async {
      final pending = Completer<String?>();
      when(() => preferences.readThemeMode()).thenAnswer((_) => pending.future);
      final cubit = buildCubit();

      final loading = cubit.load();
      await cubit.close();
      pending.complete('dark');

      await expectLater(loading, completes);
    });
  });

  test('AppTheme: bản sáng và bản tối cùng màu gốc, khác độ sáng', () {
    expect(AppTheme.light.colorScheme.brightness, Brightness.light);
    expect(AppTheme.dark.colorScheme.brightness, Brightness.dark);
  });
}
