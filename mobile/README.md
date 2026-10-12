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

Two things are generated and committed: the `fromJson` of the DTOs in `lib/features/*/data/dto` (json_serializable, `*.g.dart`) and the dependency registrations in `lib/core/di/injection_container.config.dart` (injectable, from the `@injectable` / `@lazySingleton` / `@module` annotations). After editing a DTO or an annotation, regenerate them:

```bash
fvm dart run build_runner build
```

## Layout of `lib/core`

What the features share.

| Folder | Holds |
|---|---|
| `bootstrap/` | `app_startup.dart`: everything that must be done before the first frame |
| `auth/` | empty for now: reserved for auth wiring shared across features |
| `constants/` | `api_constants.dart`: base URL and timeout of the API; `app_constants.dart`: the app's name |
| `di/` | `injection_container.dart` (+ generated `.config.dart`) and `injection_modules.dart` for classes that cannot carry an annotation |
| `extensions/` | `build_context_extensions.dart`: `context.colorScheme`, `context.textTheme` |
| `localization/` | Vietnamese strings |
| `network/` | Dio client, auth interceptor, `api_failure.dart`, `api_error_decoder.dart` (Dio error → failure), failure messages, `mapping_validator.dart` (field checks for DTO → entity) |
| `pagination/` | `PageParams`, `ListQueryParams` (`?page=&limit=&q=`), `PaginationDto` (the server's `meta`), `Paginated<T>`, `SearchDebouncer`. Not used by a screen yet |
| `patch/` | empty for now |
| `result/` | `Result<T>`: a value or a failure |
| `services/` | `app_logger.dart`: logging through `dart:developer`. Not called yet |
| `storage/` | secure token storage and preferences |
| `view_state/` | `view_status.dart`: the loading / loaded / error status every screen uses |

`core.dart` exports all of it.
