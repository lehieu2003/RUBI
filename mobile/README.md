# iceflow_mobile

Flutter app for the delivery drivers of Nhà máy đá tinh khiết Rubi. Drivers sign in with their driver account, see today's delivery list, confirm deliveries and browse the last 30 days of history. The app talks to the IceFlow web API with a Bearer JWT; it does not use the device location.

The Flutter version is pinned with [FVM](https://fvm.app) in `.fvmrc`. Install FVM once (`brew tap leoafarias/fvm && brew install fvm`), then run `fvm use` in this folder to download that version; from then on call Flutter and Dart through `fvm`:

```bash
fvm use
fvm flutter pub get
fvm flutter analyze
fvm flutter test
fvm flutter run
```

Two things are generated and committed: the `fromJson` of the DTOs in `lib/features/*/data/dto` (json_serializable, `*.g.dart`) and the dependency registrations in `lib/injector.config.dart` (injectable, from the `@injectable` / `@lazySingleton` / `@module` annotations). After editing a DTO or an annotation, regenerate them:

```bash
fvm dart run build_runner build
```
