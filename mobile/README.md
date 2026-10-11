# iceflow_mobile

Flutter app for the delivery drivers of Nhà máy đá tinh khiết Rubi. Drivers sign in with their driver account, see today's delivery list, confirm deliveries and browse the last 30 days of history. The app talks to the IceFlow web API with a Bearer JWT; it does not use the device location.

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

The DTOs in `lib/features/*/data/dto` get their `fromJson` from json_serializable. The generated `*.g.dart` files are committed; after editing a DTO, regenerate them:

```bash
dart run build_runner build
```
