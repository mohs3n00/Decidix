# Environments

One file per environment. Pass it when you run or build:

    flutter run --dart-define-from-file=env/dev.json
    flutter build appbundle --release --dart-define-from-file=env/prod.json

| Key | Meaning |
|---|---|
| `USE_MOCK` | `true`: the app answers from `assets/mock` (no server needed). `false`: it calls `API_BASE_URL` |
| `API_BASE_URL` | Address of the API, with `/v1`, no trailing slash |
| `MAP_TILE_URL` | Map tile server (`{z}/{x}/{y}` template). The default is the public OpenStreetMap server: fine for development, not for a launched app |
| `MAP_ATTRIBUTION` | The credit shown on the map; every tile provider requires one |

`staging.json` and `prod.json` still hold **placeholder addresses**: replace
them with the real ones from the backend team before building. Without an
address a non-mock build refuses to start and says so.

Do not put secrets here (these files are in git). A map key in `MAP_TILE_URL`
is visible inside the app anyway, so restrict it by app id in the provider's
dashboard.
