/// Horoscope option lists. VALUES MUST EQUAL THE API LISTS exactly (editProfile
/// rejects anything else):
///  - [rashis]        == `RASHIS`              in apps/api/utils/gunaMilanTable.js
///  - [nakshatras]    == `NAKSHATRA_LIST`      in apps/api/utils/gunaMilanTable.js
///  - [manglikStatuses] == `MANGLIK_STATUS_ENUM` in apps/api/enum/enum.js
/// Display labels may add context (e.g. the Western sign) but the stored value
/// is always the plain API string.
class HoroscopeConstants {
  HoroscopeConstants._();

  static const List<String> rashis = [
    'Mesha',
    'Vrishabha',
    'Mithuna',
    'Karka',
    'Simha',
    'Kanya',
    'Tula',
    'Vrishchika',
    'Dhanu',
    'Makara',
    'Kumbha',
    'Meena',
  ];

  /// Western zodiac equivalent, shown next to the rashi name only.
  static const Map<String, String> rashiWestern = {
    'Mesha': 'Aries',
    'Vrishabha': 'Taurus',
    'Mithuna': 'Gemini',
    'Karka': 'Cancer',
    'Simha': 'Leo',
    'Kanya': 'Virgo',
    'Tula': 'Libra',
    'Vrishchika': 'Scorpio',
    'Dhanu': 'Sagittarius',
    'Makara': 'Capricorn',
    'Kumbha': 'Aquarius',
    'Meena': 'Pisces',
  };

  static const List<String> nakshatras = [
    'Ashwini',
    'Bharani',
    'Krittika',
    'Rohini',
    'Mrigashira',
    'Ardra',
    'Punarvasu',
    'Pushya',
    'Ashlesha',
    'Magha',
    'Purva Phalguni',
    'Uttara Phalguni',
    'Hasta',
    'Chitra',
    'Swati',
    'Vishakha',
    'Anuradha',
    'Jyeshtha',
    'Mula',
    'Purva Ashadha',
    'Uttara Ashadha',
    'Shravana',
    'Dhanishta',
    'Shatabhisha',
    'Purva Bhadrapada',
    'Uttara Bhadrapada',
    'Revati',
  ];

  static const List<String> manglikStatuses = ['Yes', 'No', 'Partial', 'Not specified'];

  /// API `MANGLIK_STATUS_ENUM` default when nothing is chosen.
  static const String manglikNotSpecified = 'Not specified';

  /// "Mesha (Aries)"; unknown values are returned unchanged.
  static String rashiLabel(String? rashi) {
    final value = (rashi ?? '').trim();
    final western = rashiWestern[value];
    return western == null ? value : '$value ($western)';
  }

  /// [value] when it is one of [options], otherwise null (DropdownButton
  /// asserts when its value is not among the items).
  static String? validOrNull(String? value, List<String> options) {
    if (value == null) return null;
    return options.contains(value) ? value : null;
  }
}
