import 'package:equatable/equatable.dart';
import 'package:geolocator/geolocator.dart';

/// A geographic coordinate captured from the device GPS.
class GeoPoint extends Equatable {
  const GeoPoint({required this.lat, required this.lng});

  final double lat;
  final double lng;

  @override
  List<Object?> get props => [lat, lng];
}

/// Wraps geolocator's static calls so tests can mock them with mocktail.
class GeolocatorFacade {
  Future<LocationPermission> checkPermission() =>
      Geolocator.checkPermission();

  Future<LocationPermission> requestPermission() =>
      Geolocator.requestPermission();

  Future<Position> getCurrentPosition() => Geolocator.getCurrentPosition();
}

/// Captures the device position for delivery confirmation.
///
/// Never throws: permission refusal, missing platform config, GPS failure —
/// any of them yields `null` so the confirm-delivery flow can proceed
/// without coordinates.
class LocationService {
  LocationService({GeolocatorFacade? geo}) : _geo = geo ?? GeolocatorFacade();

  final GeolocatorFacade _geo;

  /// Returns the current position, or `null` when it cannot be captured.
  Future<GeoPoint?> getCurrentPosition() async {
    try {
      var permission = await _geo.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await _geo.requestPermission();
      }
      final granted = permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always;
      if (!granted) {
        return null;
      }
      final position = await _geo.getCurrentPosition();
      return GeoPoint(lat: position.latitude, lng: position.longitude);
    } catch (_) {
      return null;
    }
  }
}
