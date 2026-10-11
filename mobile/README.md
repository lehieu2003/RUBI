# iceflow_mobile

Flutter app for the delivery drivers of Nhà máy đá tinh khiết Rubi. Drivers sign in with their driver account, see today's delivery list, confirm deliveries and browse the last 30 days of history. The app talks to the IceFlow web API with a Bearer JWT; it does not use the device location.

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

Two things are generated and committed: the `fromJson` of the DTOs in `lib/features/*/data/dto` (json_serializable, `*.g.dart`) and the dependency registrations in `lib/injector.config.dart` (injectable, from the `@injectable` / `@lazySingleton` / `@module` annotations). After editing a DTO or an annotation, regenerate them:

```bash
dart run build_runner build
```
