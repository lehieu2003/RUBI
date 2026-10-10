import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:iceflow_mobile/core/location/location_service.dart';
import 'package:mocktail/mocktail.dart';

class _MockGeolocatorFacade extends Mock implements GeolocatorFacade {}

Position _position({double lat = 10.7769, double lng = 106.7009}) =>
    Position(
      latitude: lat,
      longitude: lng,
      timestamp: DateTime(2026, 10, 7),
      accuracy: 5,
      altitude: 10,
      altitudeAccuracy: 1,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

void main() {
  late _MockGeolocatorFacade geo;
  late LocationService service;

  setUp(() {
    geo = _MockGeolocatorFacade();
    service = LocationService(geo: geo);
  });

  group('LocationService.getCurrentPosition', () {
    test('permission granted (whileInUse) → GeoPoint, no re-request', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.whileInUse);
      when(() => geo.getCurrentPosition())
          .thenAnswer((_) async => _position(lat: 21.0285, lng: 105.8542));

      final point = await service.getCurrentPosition();

      expect(point, isNotNull);
      expect(point!.lat, 21.0285);
      expect(point.lng, 105.8542);
      verifyNever(() => geo.requestPermission());
    });

    test('permission granted (always) → GeoPoint', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.always);
      when(() => geo.getCurrentPosition())
          .thenAnswer((_) async => _position(lat: 16.0544, lng: 108.2022));

      final point = await service.getCurrentPosition();

      expect(point, isNotNull);
      expect(point!.lat, 16.0544);
      expect(point.lng, 108.2022);
    });

    test('GeoPoint is Equatable with matching coordinates', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.whileInUse);
      when(() => geo.getCurrentPosition())
          .thenAnswer((_) async => _position(lat: 21.0285, lng: 105.8542));

      final point = await service.getCurrentPosition();

      expect(point, equals(const GeoPoint(lat: 21.0285, lng: 105.8542)));
    });

    test('denied, request denied → null', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.denied);
      when(() => geo.requestPermission())
          .thenAnswer((_) async => LocationPermission.denied);

      expect(await service.getCurrentPosition(), isNull);
    });

    test('denied, request deniedForever → null', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.denied);
      when(() => geo.requestPermission())
          .thenAnswer((_) async => LocationPermission.deniedForever);

      expect(await service.getCurrentPosition(), isNull);
    });

    test('deniedForever initially → null without requesting', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.deniedForever);

      expect(await service.getCurrentPosition(), isNull);
      verifyNever(() => geo.requestPermission());
    });

    test('unableToDetermine → null', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.unableToDetermine);

      expect(await service.getCurrentPosition(), isNull);
    });

    test('facade checkPermission throws → null', () async {
      when(() => geo.checkPermission()).thenThrow(Exception('boom'));

      expect(await service.getCurrentPosition(), isNull);
    });

    test('facade getCurrentPosition throws → null', () async {
      when(() => geo.checkPermission())
          .thenAnswer((_) async => LocationPermission.whileInUse);
      when(() => geo.getCurrentPosition()).thenThrow(Exception('gps off'));

      expect(await service.getCurrentPosition(), isNull);
    });
  });

  group('LocationService construction', () {
    test('constructible with no arguments (DI default)', () {
      expect(LocationService(), isA<LocationService>());
    });
  });
}
