import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/ModelCommonEducationQualificationListResponse.dart';
import 'package:banjaramatch/models/model_cast_gotra_list.dart';
import 'package:banjaramatch/models/model_chat_room_list.dart';
import 'package:banjaramatch/models/setting_model.dart';

class Registration {
  Registration({
    bool? status,
    String? message,
    String? token,
    User? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
    _token = token;
  }

  Registration.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _token = json['token'];
    _data = json['data'] != null ? User.fromJson(json['data']) : null;
  }

  bool? _status;
  String? _message;
  String? _token;
  User? _data;

  Registration copyWith({
    bool? status,
    String? message,
    User? data,
  }) =>
      Registration(
        status: status ?? _status,
        message: message ?? _message,
        token: token ?? _token,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  String? get token => _token;

  User? get data => _data;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = _status;
    map['token'] = _token;
    map['message'] = _message;
    if (_data != null) {
      map['data'] = _data?.toJson();
    }
    return map;
  }
}

class User {
  User(
      {this.id,
      this.identity,
      this.fullName,
      this.phone,
      this.profileViewRequestStatus,
      this.bio,
      this.profile,
      this.backgroundImage,
      this.isPushNotifications,
      this.isInvitedToRoom,
      this.isVerified,
      this.isBlock,
      this.blocked,
      this.following,
      this.followers,
      this.loginType,
      this.deviceType,
      this.deviceToken,
      this.createdAt,
      this.updatedAt,
      this.followingStatus,
      this.interest,
      this.name,
      this.dob,
      this.workingSector,
      this.age,
      this.area,
      this.distanceKm,
      this.height,
      this.isOnline,
      this.lastSeen,
      this.imageUrl,
      this.country,
      this.code,
      this.packageExpire,
      this.shortlistStateLoading,
      this.myInterestStateLoading,
      this.profileCompletion,
      this.interestStatus,
      this.isShortListed,
      this.incomeRange,
      this.profession,
      this.qualification,
      this.isCanceled,
      this.isFriend,
      this.isRejected,
      this.isRejectedByOtherUser,
      this.location,
      this.personalityMap,
      this.isRequestReceived,
      this.gender,
      this.family,
      this.isRequestSent,
      this.preferences,
      this.caste,
      this.email,
      this.spiritualBelief,
      this.livingWithFamily,
      this.gotra,
      this.profilematch,
      this.reportStatus,
      this.profilePicRequest,
      this.remainingProfileImageView,
      this.religionId,
      this.maritalStatus,
      this.visitCount,
      this.lastVisitedAt,
      this.diet,
      this.chatRoom,
      this.smoke,
      this.drink,
      this.settings,
      this.membershipPlan,
      this.bloodGroup,
      this.motherTongue,
      this.knownLanguages,
      this.profileCreatedBy,
      this.manglikStatus,
      this.horoscopeRequired,
      this.horoscope,
      this.matchPercent,
      this.matchScore,
      this.matchedOn});

  User.fromJson(dynamic json) {
    id = json['_id'];
    identity = json['identity'];
    fullName = json['full_name'];
    bio = json['bio'];

    profile = json['profile'];
    backgroundImage = json['background_image'];
    isPushNotifications = json['is_push_notifications'];
    isInvitedToRoom = json['is_invited_to_room'];
    isVerified = json['is_verified'];
    isBlock = json['is_block'];
    phone = json['phone'];

    if (json['blocked'] != null) {
      blocked = [];
      json['blocked'].forEach((v) {
        blocked?.add(User.fromJson(v));
      });
    }

    profileViewRequestStatus = json['profileViewRequestStatus'];
    distanceKm = json['distanceKm'];

    visitCount = json['visitCount'];
    dob = json['dob'];
    following = json['followings'];
    followers = json['followers'];
    loginType = json['login_type'];
    deviceType = json['device_type'];
    deviceToken = json['device_token'];
    createdAt = json['created_at'] ?? json['createdAt'];
    updatedAt = json['updated_at'] ?? json['updatedAt'];
    followingStatus = json['followingStatus'];

    if (json['interests'] != null) {
      interest = [];
      json['interests'].forEach((v) {
        interest?.add(Interest.fromJson(v));
      });
    }

    name = json['name'];
    lastVisitedAt = json['lastVisitedAt'];
    workingSector = json['workingSector'];
    age = json['age'];
    area = json['area'];
    height = json['height'];
    imageUrl = json['imageUrl'];
    country = json['country'];
    code = json['code'];

    isOnline = json['isOnline'];

    smoke = json['smoke'];
    drink = json['drink'];
    diet = json['diet'];

    lastSeen = json['lastSeen'];
    personalityMap = json['personalityMap'] != null ? new PersonalityMap.fromJson(json['personalityMap']) : null;

    packageExpire = json['packageExpire'];
    shortlistStateLoading = json['shortlistStateLoading'];
    myInterestStateLoading = json['myInterestStateLoading'];
    interestStatus = json['interestStatus'];

    isShortListed = json['isShortListed'];

    isFriend = json['isFriend'];

    gender = json['gender'];
    isRequestSent = json['isRequestSent'];
    isRequestReceived = json['isRequestReceived'];
    isRejected = json['isRejected'];
    isRejectedByOtherUser = json['isRejectedByOtherUser'];
    isCanceled = json['isCanceled'];
    family = json['family'] != null ? new Family.fromJson(json['family']) : null;

    profilematch = json['profilematch'];
    reportStatus = json['reportStatus'];
    profilePicRequest = json['profilePicRequest'];
    livingWithFamily = json['livingWithFamily'];
    spiritualBelief = json['spiritualBelief'];

    profileCompletion =
        json['profileCompletion'] != null ? ProfileCompletion.fromJson(json['profileCompletion']) : null;
    chatRoom = json['chatRoom'] != null ? ChatRoom.fromJson(json['chatRoom']) : null;

    location = json['location'] != null ? new Location.fromJson(json['location']) : null;

    preferences = json['preferences'] != null ? new Preferences.fromJson(json['preferences']) : null;
    caste = json['caste'] != null ? new CasteGotra.fromJson(json['caste']) : null;
    gotra = json['gotra'] != null ? new CasteGotra.fromJson(json['gotra']) : null;
    
    // Parse email field
    email = json['email'];

    profession = json['profession'] != null ? new CommonItem.fromJson(json['profession']) : null;

    qualification = json['qualification'] != null ? new CommonItem.fromJson(json['qualification']) : null;

    religionId = json['religionId'];
    incomeRange = json['incomeRange'] != null ? new IncomeRange.fromJson(json['incomeRange']) : null;

    maritalStatus = json['maritalStatus'];

    settings = json['settings'] != null ? UserSettings.fromJson(json['settings']) : null;

    membershipPlan = json['membershipPlan'] != null ? new MembershipPlan.fromJson(json['membershipPlan']) : null;

    // Feature expansion 1.1.0 (all optional; older API builds simply omit them)
    bloodGroup = _asString(json['bloodGroup']);
    motherTongue = _asString(json['motherTongue']);
    knownLanguages = _asStringList(json['knownLanguages']);
    profileCreatedBy = _asString(json['profileCreatedBy']);
    manglikStatus = _asString(json['manglikStatus']);
    horoscopeRequired = _asBool(json['horoscopeRequired']);
    horoscope = json['horoscope'] is Map ? Horoscope.fromJson(json['horoscope']) : null;
    matchPercent = _asInt(json['matchPercent']);
    matchScore = _asInt(json['matchScore']);
    matchedOn = _asStringList(json['matchedOn']);
  }

  String? id;
  String? identity;
  String? fullName;
  String? gender;
  bool? profileViewRequestStatus;
  String? bio;
  String? profile;
  String? backgroundImage;
  num? isPushNotifications;
  num? isInvitedToRoom;
  num? isVerified;
  num? isBlock;
  double? distanceKm;
  List<User>? blocked;
  num? following;
  String? phone;
  num? followers;
  Family? family;
  Location? location;
  int? visitCount;
  num? loginType;
  num? deviceType;
  String? deviceToken;
  String? createdAt;
  ChatRoom? chatRoom;
  String? updatedAt;
  num? followingStatus;
  Preferences? preferences;
  CasteGotra? caste;
  PersonalityMap? personalityMap;
  CasteGotra? gotra;
  List<Interest>? interest;
  String? name;
  String? diet;
  String? smoke;
  String? drink;
  bool? livingWithFamily;
  String? spiritualBelief;
  String? workingSector;
  int? age;
  String? dob;
  String? area;
  int? height;
  String? imageUrl;
  String? country;
  String? code;
  String? lastVisitedAt;
  CommonItem? qualification;
  CommonItem? profession;

  String? packageExpire;
  bool? shortlistStateLoading;
  bool? myInterestStateLoading;
  String? interestStatus;

  bool? isShortListed;
  IncomeRange? incomeRange;
  ProfileCompletion? profileCompletion;
  bool? isFriend;
  String? email;
  bool? isRequestSent;
  bool? isRequestReceived;
  bool? isRejected;
  bool? isRejectedByOtherUser;
  bool? isCanceled;
  bool? isOnline;
  String? lastSeen;

  int? profilematch;
  bool? reportStatus;
  bool? profilePicRequest;
  bool? remainingProfileImageView;
  String? religionId;

  String? maritalStatus;
  UserSettings? settings;
  MembershipPlan? membershipPlan;

  String? bloodGroup;
  String? motherTongue;
  List<String>? knownLanguages;

  /// self | parent | sibling | relative | friend (lowercase, as the API stores it)
  String? profileCreatedBy;

  /// Yes | No | Partial | Not specified
  String? manglikStatus;
  bool? horoscopeRequired;
  Horoscope? horoscope;

  /// 0-100 preference match computed by the API for cards; null when unknown.
  int? matchPercent;

  /// Daily-match score (getTopDailyMatches only).
  int? matchScore;

  /// Daily-match reasons (getTopDailyMatches only).
  List<String>? matchedOn;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['_id'] = id;
    map['identity'] = identity;
    map['full_name'] = fullName;
    map['bio'] = bio;
    map['gender'] = gender;
    map['profile'] = profile;
    map['background_image'] = backgroundImage;
    map['is_push_notifications'] = isPushNotifications;
    map['is_invited_to_room'] = isInvitedToRoom;
    map['is_verified'] = isVerified;
    map['is_block'] = isBlock;
    map['blocked'] = blocked;
    map['followings'] = following;
    map['followers'] = followers;
    map['livingWithFamily'] = livingWithFamily;
    map['spiritualBelief'] = spiritualBelief;

    map['login_type'] = loginType;
    map['device_type'] = deviceType;
    map['device_token'] = deviceToken;
    map['created_at'] = createdAt;
    map['visitCount'] = visitCount;
    map['distanceKm'] = distanceKm;
    map['phone'] = phone;
    map['email'] = email;
    map['smoke'] = smoke;
    map['diet'] = diet;
    map['drink'] = drink;
    if (this.personalityMap != null) {
      map['personalityMap'] = this.personalityMap!.toJson();
    }

    if (this.location != null) {
      map['location'] = this.location!.toJson();
    }

    if (this.family != null) {
      map['family'] = this.family!.toJson();
    }

    if (this.preferences != null) {
      map['preferences'] = this.preferences!.toJson();
    }

    if (this.caste != null) {
      map['caste'] = this.caste!.toJson();
    }

    if (this.profession != null) {
      map['profession'] = this.profession!.toJson();
    }

    if (this.qualification != null) {
      map['qualification'] = this.qualification!.toJson();
    }

    if (this.profileCompletion != null) {
      map['profileCompletion'] = this.profileCompletion!.toJson();
    }

    if (this.chatRoom != null) {
      map['chatRoom'] = this.chatRoom!.toJson();
    }

    if (this.incomeRange != null) {
      map['incomeRange'] = this.incomeRange!.toJson();
    }

    if (this.gotra != null) {
      map['gotra'] = this.gotra!.toJson();
    }

    map['updated_at'] = updatedAt;
    map['followingStatus'] = followingStatus;
    map['isOnline'] = isOnline;
    map['lastSeen'] = lastSeen;
    if (interest != null) {
      map['interests'] = interest?.map((v) => v.toJson()).toList();
    }
    if (blocked != null) {
      map['blocked'] = blocked?.map((v) => v.toJson()).toList();
    }

    map['name'] = name;
    map['workingSector'] = workingSector;
    map['age'] = age;
    map['area'] = area;
    map['height'] = height;
    map['imageUrl'] = imageUrl;
    map['country'] = country;
    map['code'] = code;

    map['packageExpire'] = packageExpire;
    map['shortlistStateLoading'] = shortlistStateLoading;
    map['myInterestStateLoading'] = myInterestStateLoading;
    map['interestStatus'] = interestStatus;
    map['dob'] = dob;
    map['isShortListed'] = isShortListed;
    map['lastVisitedAt'] = lastVisitedAt;

    map['isFriend'] = isFriend;
    map['isRequestSent'] = isRequestSent;
    map['isRequestReceived'] = isRequestReceived;
    map['isRejected'] = isRejected;
    map['isRejectedByOtherUser'] = isRejectedByOtherUser;
    map['isCanceled'] = isCanceled;
    map['profilematch'] = profilematch;
    map['reportStatus'] = reportStatus;
    map['profilePicRequest'] = profilePicRequest;
    map['remainingProfileImageView'] = remainingProfileImageView;
    map['religionId'] = religionId;
    map['maritalStatus'] = maritalStatus;
    if (this.settings != null) {
      map['settings'] = this.settings!.toJson();
    }
    if (this.membershipPlan != null) {
      map['membershipPlan'] = this.membershipPlan!.toJson();
    }
    map['bloodGroup'] = bloodGroup;
    map['motherTongue'] = motherTongue;
    map['knownLanguages'] = knownLanguages;
    map['profileCreatedBy'] = profileCreatedBy;
    map['manglikStatus'] = manglikStatus;
    map['horoscopeRequired'] = horoscopeRequired;
    if (horoscope != null) {
      map['horoscope'] = horoscope!.toJson();
    }
    map['matchPercent'] = matchPercent;
    map['matchScore'] = matchScore;
    map['matchedOn'] = matchedOn;

    return map;
  }

  String firebaseId() {
    return "${id ?? 0}";
  }

  bool isBlockedByMe() {
    return SessionManager.shared.getUser()?.blocked?.contains(id) ?? false;
  }
}

/// Birth details used for Guna Milan. Values for rashi / nakshatra equal the
/// API's RASHIS / NAKSHATRA_LIST strings; empty string means not set.
class Horoscope {
  Horoscope({this.birthTime, this.birthPlace, this.rashi, this.nakshatra});

  Horoscope.fromJson(dynamic json) {
    if (json is! Map) return;
    birthTime = _asString(json['birthTime']);
    birthPlace = _asString(json['birthPlace']);
    rashi = _asString(json['rashi']);
    nakshatra = _asString(json['nakshatra']);
  }

  String? birthTime;
  String? birthPlace;
  String? rashi;
  String? nakshatra;

  /// True when neither rashi nor nakshatra is set (Guna Milan unavailable).
  bool get isEmpty => (rashi ?? '').isEmpty && (nakshatra ?? '').isEmpty;

  Map<String, dynamic> toJson() {
    return {
      'birthTime': birthTime ?? '',
      'birthPlace': birthPlace ?? '',
      'rashi': rashi ?? '',
      'nakshatra': nakshatra ?? '',
    };
  }
}

String? _asString(dynamic v) {
  if (v == null) return null;
  if (v is String) return v;
  return v.toString();
}

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return num.tryParse(v)?.round();
  return null;
}

bool? _asBool(dynamic v) {
  if (v == null) return null;
  if (v is bool) return v;
  if (v is num) return v != 0;
  if (v is String) return v == 'true' || v == '1';
  return null;
}

List<String>? _asStringList(dynamic v) {
  if (v == null) return null;
  if (v is List) {
    return v
        .where((e) => e != null)
        .map((e) => e is Map ? (e['label'] ?? e['name'] ?? e['title'] ?? e.toString()).toString() : e.toString())
        .toList();
  }
  if (v is String) return v.isEmpty ? <String>[] : [v];
  return null;
}

extension O on User {
  List<String> getInterestsStringList() {
    List<Interest> arr;
    if (interest != null) {
      arr = interest!;
    } else {
      arr = [];
    }

    List<Interest> interests = SessionManager.shared.getSettings()?.interests?.where((element) {
          return arr.contains("${element.id}");
        }).toList() ??
        [];

    return interests.map((e) => e.title ?? "").toList();
  }

  List<Interest> getInterests() {
    List<Interest> arr;
    if (interest != null) {
      arr = interest!;
    } else {
      arr = [];
    }

    List<Interest> interests = SessionManager.shared.getSettings()?.interests?.where((element) {
          return arr.contains("${element.id}");
        }).toList() ??
        [];

    return interests;
  }
}

class UserSettings {
  bool? showLocation;
  bool? showIncome;
  String? profilePicVisibility; // 'everyone', 'onlyAccepted', 'none'
  bool? profilePicRequestRequired;
  String? allowConnections; // 'everyone', 'verified', 'premium'
  String? allowMessages; // 'everyone', 'onlyAccepted'
  String? emailVisibility; // 'public', 'private'
  String? mobileVisibility; // 'public', 'private'
  bool? allowNotifications;
  bool? notifyOnInterest;
  bool? notifyOnMessage;
  bool? notifyOnProfileVisit;

  UserSettings({
    this.showLocation,
    this.showIncome,
    this.profilePicVisibility,
    this.profilePicRequestRequired,
    this.allowConnections,
    this.allowMessages,
    this.emailVisibility,
    this.mobileVisibility,
    this.allowNotifications,
    this.notifyOnInterest,
    this.notifyOnMessage,
    this.notifyOnProfileVisit,
  });

  UserSettings.fromJson(Map<String, dynamic> json) {
    showLocation = json['showLocation'];
    showIncome = json['showIncome'];
    profilePicVisibility = json['profilePicVisibility'];
    profilePicRequestRequired = json['profilePicRequestRequired'];
    allowConnections = json['allowConnections'];
    allowMessages = json['allowMessages'];
    emailVisibility = json['emailVisibility'];
    mobileVisibility = json['mobileVisibility'];
    allowNotifications = json['allowNotifications'];
    notifyOnInterest = json['notifyOnInterest'];
    notifyOnMessage = json['notifyOnMessage'];
    notifyOnProfileVisit = json['notifyOnProfileVisit'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    data['showLocation'] = showLocation;
    data['showIncome'] = showIncome;
    data['profilePicVisibility'] = profilePicVisibility;
    data['profilePicRequestRequired'] = profilePicRequestRequired;
    data['allowConnections'] = allowConnections;
    data['allowMessages'] = allowMessages;
    data['emailVisibility'] = emailVisibility;
    data['mobileVisibility'] = mobileVisibility;
    data['allowNotifications'] = allowNotifications;
    data['notifyOnInterest'] = notifyOnInterest;
    data['notifyOnMessage'] = notifyOnMessage;
    data['notifyOnProfileVisit'] = notifyOnProfileVisit;
    return data;
  }
}

class MembershipPlan {
  String? sId;
  String? name;
  int? price;
  int? durationDays;
  String? description;
  List<String>? features;
  int? iV;
  String? createdAt;
  String? updatedAt;

  MembershipPlan(
      {this.sId,
      this.name,
      this.price,
      this.durationDays,
      this.description,
      this.features,
      this.iV,
      this.createdAt,
      this.updatedAt});

  MembershipPlan.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    price = json['price'];
    durationDays = json['duration_days'];
    description = json['description'];
    features = json['features'].cast<String>();
    iV = json['__v'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['name'] = this.name;
    data['price'] = this.price;
    data['duration_days'] = this.durationDays;
    data['description'] = this.description;
    data['features'] = this.features;
    data['__v'] = this.iV;
    data['createdAt'] = this.createdAt;
    data['updatedAt'] = this.updatedAt;
    return data;
  }
}

class Location {
  LocationData? city;
  LocationData? country;
  LocationData? state;

  Location({this.city, this.country, this.state});

  Location.fromJson(dynamic json) {
    city = json['city'] != null ? new LocationData.fromJson(json['city']) : null;
    country = json['country'] != null ? new LocationData.fromJson(json['country']) : null;
    state = json['state'] != null ? new LocationData.fromJson(json['state']) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.city != null) {
      data['city'] = this.city!.toJson();
    }
    if (this.country != null) {
      data['country'] = this.country!.toJson();
    }
    if (this.state != null) {
      data['state'] = this.state!.toJson();
    }
    return data;
  }
}

class LocationData {
  String? sId;
  String? name;
  String? country;
  int? iV;

  LocationData({this.sId, this.name, this.country, this.iV});

  LocationData.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    country = json['country'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['name'] = this.name;
    data['country'] = this.country;
    data['__v'] = this.iV;
    return data;
  }
}

class Preferences {
  List<CasteGotra>? caste;
  List<CasteGotra>? gotra;
  List<CommonItem>? profession;
  List<CommonItem>? qualification;

  String? subCasteId;
  HeightRange? heightRange;
  AgeRange? ageRange;
  String? location;
  String? residenceCountryId;
  String? preferredCountryId;
  String? preferredStateId;
  List<String>? maritalStatus;
  Null? children;

  int? income;

  String? language;
  String? smoke;
  String? drink;
  String? diet;
  String? bodyType;
  String? complexion;
  String? manglik;
  String? general;

  Preferences(
      {this.caste,
      this.gotra,
      this.subCasteId,
      this.heightRange,
      this.ageRange,
      this.location,
      this.residenceCountryId,
      this.preferredCountryId,
      this.preferredStateId,
      this.maritalStatus,
      this.children,
      this.qualification,
      this.income,
      this.profession,
      this.language,
      this.smoke,
      this.drink,
      this.diet,
      this.bodyType,
      this.complexion,
      this.manglik,
      this.general});

  Preferences.fromJson(Map<String, dynamic> json) {
    if (json['caste'] != null) {
      caste = <CasteGotra>[];
      json['caste'].forEach((v) {
        caste!.add(new CasteGotra.fromJson(v));
      });
    }
    if (json['gotra'] != null) {
      gotra = <CasteGotra>[];
      json['gotra'].forEach((v) {
        gotra!.add(new CasteGotra.fromJson(v));
      });
    }
    if (json['profession'] != null) {
      profession = <CommonItem>[];
      json['profession'].forEach((v) {
        profession!.add(new CommonItem.fromJson(v));
      });
    }
    if (json['qualification'] != null) {
      qualification = <CommonItem>[];
      json['qualification'].forEach((v) {
        qualification!.add(new CommonItem.fromJson(v));
      });
    }

    subCasteId = json['subCasteId'];
    heightRange = json['height_range'] != null ? new HeightRange.fromJson(json['height_range']) : null;
    ageRange = json['age_range'] != null ? new AgeRange.fromJson(json['age_range']) : null;
    location = json['location'];
    residenceCountryId = json['residenceCountryId'];
    preferredCountryId = json['preferredCountryId'];
    preferredStateId = json['preferredStateId'];
    if (json['marital_status'] is List) {
      maritalStatus = List<String>.from(json['marital_status']);
    }
    children = json['children'];

    income = json['income'];

    language = json['language'];
    smoke = json['smoke'];
    drink = json['drink'];
    diet = json['diet'];
    bodyType = json['bodyType'];
    complexion = json['complexion'];
    manglik = json['manglik'];

    general = json['general'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.caste != null) {
      data['caste'] = this.caste!.map((v) => v.toJson()).toList();
    }
    if (this.gotra != null) {
      data['gotra'] = this.gotra!.map((v) => v.toJson()).toList();
    }
    if (this.profession != null) {
      data['profession'] = this.profession!.map((v) => v.toJson()).toList();
    }
    if (this.qualification != null) {
      data['qualification'] = this.qualification!.map((v) => v.toJson()).toList();
    }

    data['subCasteId'] = this.subCasteId;
    if (this.heightRange != null) {
      data['height_range'] = this.heightRange!.toJson();
    }
    if (this.ageRange != null) {
      data['age_range'] = this.ageRange!.toJson();
    }
    data['location'] = this.location;
    data['residenceCountryId'] = this.residenceCountryId;
    data['preferredCountryId'] = this.preferredCountryId;
    data['preferredStateId'] = this.preferredStateId;
    if (this.maritalStatus is List<String>) {
      data['marital_status'] = this.maritalStatus;
    }
    data['children'] = this.children;

    data['income'] = this.income;

    data['language'] = this.language;
    data['smoke'] = this.smoke;
    data['drink'] = this.drink;
    data['diet'] = this.diet;
    data['bodyType'] = this.bodyType;
    data['complexion'] = this.complexion;
    data['manglik'] = this.manglik;

    data['general'] = this.general;
    return data;
  }
}

class HeightRange {
  int? min;
  int? max;

  HeightRange({this.min, this.max});

  HeightRange.fromJson(Map<String, dynamic> json) {
    min = json['min'];
    max = json['max'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['min'] = this.min;
    data['max'] = this.max;
    return data;
  }
}

class AgeRange {
  int? min;
  int? max;

  AgeRange({this.min, this.max});

  AgeRange.fromJson(Map<String, dynamic> json) {
    min = json['min'];
    max = json['max'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['min'] = this.min;
    data['max'] = this.max;
    return data;
  }
}

class PersonalityMap {
  String? tone;
  List<String>? traits;
  List<String>? hobbies;
  List<String>? goals;
  String? about;

  PersonalityMap({this.tone, this.traits, this.hobbies, this.goals, this.about});

  PersonalityMap.fromJson(Map<String, dynamic> json) {
    tone = json['tone'];
    traits = json['traits'].cast<String>();
    hobbies = json['hobbies'].cast<String>();
    about = json['about'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['tone'] = this.tone;
    data['traits'] = this.traits;
    data['hobbies'] = this.hobbies;
    data['goals'] = this.goals;
    data['about'] = this.about;
    return data;
  }
}

class Family {
  Father? father;
  Father? mother;
  Brothers? brothers;
  Location? basedOut;
  Brothers? sisters;
  String? familyType;
  String? familyStatus;

  Family({this.father, this.mother, this.brothers, this.sisters, this.familyType, this.familyStatus, this.basedOut});

  Family.fromJson(Map<String, dynamic> json) {
    father = json['father'] != null ? new Father.fromJson(json['father']) : null;
    mother = json['mother'] != null ? new Father.fromJson(json['mother']) : null;
    brothers = json['brothers'] != null ? new Brothers.fromJson(json['brothers']) : null;
    sisters = json['sisters'] != null ? new Brothers.fromJson(json['sisters']) : null;

    basedOut = json['basedOut'] != null ? new Location.fromJson(json['basedOut']) : null;

    familyType = json['familyType'];
    familyStatus = json['familyStatus'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.father != null) {
      data['father'] = this.father!.toJson();
    }
    if (this.mother != null) {
      data['mother'] = this.mother!.toJson();
    }
    if (this.brothers != null) {
      data['brothers'] = this.brothers!.toJson();
    }
    if (this.sisters != null) {
      data['sisters'] = this.sisters!.toJson();
    }
    if (this.basedOut != null) {
      data['basedOut'] = this.basedOut!.toJson();
    }

    data['familyType'] = this.familyType;
    data['familyStatus'] = this.familyStatus;
    return data;
  }
}

class Father {
  bool? isAlive;
  String? profession; // Added field

  Father({this.isAlive, this.profession});

  Father.fromJson(Map<String, dynamic> json) {
    isAlive = json['isAlive'];
    profession = json['profession'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    data['isAlive'] = isAlive;
    data['profession'] = profession;
    return data;
  }
}

class Brothers {
  int? total;
  int? married;
  int? elder;
  int? younger;
  int? passedAway;

  Brothers({this.total, this.married, this.elder, this.younger, this.passedAway});

  Brothers.fromJson(Map<String, dynamic> json) {
    total = json['total'];
    married = json['married'];
    elder = json['elder'];
    younger = json['younger'];
    passedAway = json['passedAway'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['total'] = this.total;
    data['married'] = this.married;
    data['elder'] = this.elder;
    data['younger'] = this.younger;
    data['passedAway'] = this.passedAway;
    return data;
  }
}

class ProfileCompletion {
  int? percentage;
  List<String>? missingFields;
  String? suggestion;

  ProfileCompletion({this.percentage, this.missingFields, this.suggestion});

  ProfileCompletion.fromJson(Map<String, dynamic> json) {
    percentage = json['percentage'];
    missingFields = json['missingFields'] != null ? List<String>.from(json['missingFields']) : [];
    suggestion = json['suggestion'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    data['percentage'] = percentage;
    data['missingFields'] = missingFields;
    data['suggestion'] = suggestion;
    return data;
  }
}
