import '../../core/errors/app_exception.dart';

typedef JsonMap = Map<String, dynamic>;

/// Casts [value] to an object or throws a [ParseException] naming [where].
JsonMap asMap(Object? value, [String where = 'value']) {
  if (value is JsonMap) return value;
  throw ParseException('Expected an object at $where but got ${_describe(value)}');
}

List<JsonMap> asMapList(Object? value, [String where = 'value']) {
  if (value is! List) {
    throw ParseException('Expected a list at $where but got ${_describe(value)}');
  }
  return [for (var i = 0; i < value.length; i++) asMap(value[i], '$where[$i]')];
}

String _describe(Object? value) => value == null ? 'null' : '${value.runtimeType}';

/// Reads typed fields from a JSON object. A missing or wrong-typed field throws
/// a [ParseException] that names the field, so a contract break shows up as a
/// clear error instead of a crash somewhere in a widget.
extension JsonRead on JsonMap {
  T need<T>(String key) {
    final value = this[key];
    if (value is T) return value;
    throw ParseException('Expected $T at "$key" but got ${_describe(value)}');
  }

  String string(String key) => need<String>(key);
  double number(String key) => need<num>(key).toDouble();
  int integer(String key) => need<num>(key).toInt();
  bool flag(String key) => need<bool>(key);

  String? maybeString(String key) => this[key] == null ? null : string(key);
  double? maybeNumber(String key) => this[key] == null ? null : number(key);
  int? maybeInteger(String key) => this[key] == null ? null : integer(key);

  JsonMap object(String key) => asMap(this[key], '"$key"');

  List<T> listOf<T>(String key, T Function(JsonMap json) parse) {
    return [for (final item in asMapList(this[key], '"$key"')) parse(item)];
  }

  /// A list of numbers, or an empty list when the key is absent.
  List<double> numberList(String key) {
    final value = this[key];
    if (value == null) return const [];
    if (value is! List) {
      throw ParseException('Expected a list at "$key" but got ${_describe(value)}');
    }
    return [
      for (final item in value)
        if (item is num)
          item.toDouble()
        else
          throw ParseException('Expected numbers in "$key" but got ${_describe(item)}'),
    ];
  }
}

String _normalise(String value) => value.replaceAll('_', '').toLowerCase();

/// Reads an enum from its wire name (`in_progress` matches `inProgress`).
/// An unknown value returns [fallback], so a new value on the server does not
/// break the app.
T parseEnum<T extends Enum>(List<T> values, Object? raw, T fallback) {
  if (raw is! String) return fallback;
  final wanted = _normalise(raw);
  for (final value in values) {
    if (_normalise(value.name) == wanted) return value;
  }
  return fallback;
}

/// The name the server expects for [value]: `inProgress` becomes `in_progress`.
String wireName(Enum value) {
  return value.name.replaceAllMapped(
    RegExp('[A-Z]'),
    (match) => '_${match[0]!.toLowerCase()}',
  );
}
