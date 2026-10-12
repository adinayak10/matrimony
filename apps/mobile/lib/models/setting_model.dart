class SettingModel {
  SettingModel({
    bool? status,
    String? message,
    Settings? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  SettingModel.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    
    // Handle both direct data and nested settings structure
    var dataJson = json['data'];
    if (dataJson != null) {
      // Check if data has a nested 'settings' key (new API structure)
      if (dataJson['settings'] != null) {
        // New API structure: settings are nested, but interests/reportReasons are at data level
        var settingsJson = Map<String, dynamic>.from(dataJson['settings']);
        
        // Merge data-level arrays into settings
        if (dataJson['interests'] != null) {
          settingsJson['interests'] = dataJson['interests'];
        }
        if (dataJson['reportReasons'] != null) {
          settingsJson['reportReasons'] = dataJson['reportReasons'];
        }
        if (dataJson['documentTypes'] != null) {
          settingsJson['documentType'] = dataJson['documentTypes'];
        }
        if (dataJson['incomeRanges'] != null) {
          settingsJson['incomeRanges'] = dataJson['incomeRanges'];
        }
        if (dataJson['familyTypes'] != null) {
          settingsJson['familyTypes'] = dataJson['familyTypes'];
        }
        if (dataJson['familyStatus'] != null) {
          settingsJson['familyStatus'] = dataJson['familyStatus'];
        }
        if (dataJson['occupations'] != null) {
          settingsJson['occupations'] = dataJson['occupations'];
        }
        if (dataJson['dietOptions'] != null) {
          settingsJson['dietOptions'] = dataJson['dietOptions'];
        }
        if (dataJson['smokingOptions'] != null) {
          settingsJson['smokingOptions'] = dataJson['smokingOptions'];
        }
        if (dataJson['drinkingOptions'] != null) {
          settingsJson['drinkingOptions'] = dataJson['drinkingOptions'];
        }
        if (dataJson['spiritualOptions'] != null) {
          settingsJson['spiritualOptions'] = dataJson['spiritualOptions'];
        }
        if (dataJson['termsUrl'] != null) {
          settingsJson['termsUrl'] = dataJson['termsUrl'];
        }
        if (dataJson['privacyPolicyUrl'] != null) {
          settingsJson['privacyPolicyUrl'] = dataJson['privacyPolicyUrl'];
        }
        if (dataJson['helpUrl'] != null) {
          settingsJson['helpUrl'] = dataJson['helpUrl'];
        }
        if (dataJson['apkVersion'] != null) {
          settingsJson['apk'] = dataJson['apkVersion'];
        }
        
        _data = Settings.fromJson(settingsJson);
      } else {
        // Direct settings in data (old structure)
        _data = Settings.fromJson(dataJson);
      }
    }
  }

  bool? _status;
  String? _message;
  Settings? _data;

  SettingModel copyWith({
    bool? status,
    String? message,
    Settings? data,
  }) =>
      SettingModel(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  Settings? get data => _data;
}

class Settings {
  Settings({
    String? id,
    List<String>? familyTypes,
    List<String>? familyStatuses,
    List<String>? occupations,
    List<IncomeRange>? incomeRanges,
    String? currency,
    num? isAdmobOn,
    num? minuteLimitInCreatingStory,
    num? minuteLimitInChoosingVideoForStory,
    num? minuteLimitInChoosingVideoForPost,
    num? maxImagesCanBeUploadedInOnePost,
    num? maximumMinUsersLive,
    num? messagePrice,
    num? reverseSwipePrice,
    num? liveWatchingPrice,
    num? forDatingApp,
    String? adBannerAndroid,
    String? adInterstitialAndroid,
    String? adBannerIOS,
    String? adInterstitialIOS,
    String? createdAt,
    String? updatedAt,
    List<Interest>? interests,
    List<Interest>? reportReasons,
    List<Interest>? documentType,
    String? termsUrl,
    String? privacyPolicyUrl,
    String? helpUrl,
    ApkInfo? apk,
  }) {
    _id = id;
    _familyTypes = familyTypes;
    _familyStatuses = familyStatuses;
    _occupations = occupations;
    _incomeRanges = incomeRanges;
    _minuteLimitInCreatingStory = minuteLimitInCreatingStory;
    _minuteLimitInChoosingVideoForStory = minuteLimitInChoosingVideoForStory;
    _minuteLimitInChoosingVideoForPost = minuteLimitInChoosingVideoForPost;
    _maxImagesCanBeUploadedInOnePost = maxImagesCanBeUploadedInOnePost;
    _adBannerAndroid = adBannerAndroid;
    _adInterstitialAndroid = adInterstitialAndroid;
    _adBannerIOS = adBannerIOS;
    _adInterstitialIOS = adInterstitialIOS;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
    _interests = interests;
    _termsUrl = termsUrl;
    _privacyPolicyUrl = privacyPolicyUrl;
    _helpUrl = helpUrl;
    _apk = apk;
  }

  Settings.fromJson(dynamic json) {
    _id = json['id'];
    _isAdmobOn = json['is_admob_on'];
    _minuteLimitInCreatingStory = json['minute_limit_in_creating_story'];
    _minuteLimitInChoosingVideoForStory = json['minute_limit_in_choosing_video_for_story'];
    _minuteLimitInChoosingVideoForPost = json['minute_limit_in_choosing_video_for_post'];
    _maxImagesCanBeUploadedInOnePost = json['max_images_can_be_uploaded_in_one_post'];
    _adBannerAndroid = json['ad_banner_android'];
    _adInterstitialAndroid = json['ad_interstitial_android'];
    _adBannerIOS = json['ad_banner_iOS'];
    _adInterstitialIOS = json['ad_interstitial_iOS'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];

    // Legal & Support URLs
    _termsUrl = json['termsUrl'];
    _privacyPolicyUrl = json['privacyPolicyUrl'];
    _helpUrl = json['helpUrl'];

    // APK Info
    _apk = json['apk'] != null ? ApkInfo.fromJson(json['apk']) : null;

    _familyTypes = List<String>.from(json['familyTypes'] ?? []);
    _familyStatuses = List<String>.from(json['familyStatus'] ?? []);
    _occupations = List<String>.from(json['occupations'] ?? []);

    _dietOptions = List<String>.from(json['dietOptions'] ?? []);
    _smokingOptions = List<String>.from(json['smokingOptions'] ?? []);
    _drinkingOptions = List<String>.from(json['drinkingOptions'] ?? []);
    _livingOptions = List<String>.from(json['livingOptions'] ?? []);
    _spiritualOptions = List<String>.from(json['spiritualOptions'] ?? []);

    if (json['incomeRanges'] != null) {
      _incomeRanges = [];
      json['incomeRanges'].forEach((v) {
        _incomeRanges?.add(IncomeRange.fromJson(v));
      });
    }

    if (json['interests'] != null) {
      _interests = [];
      json['interests'].forEach((v) {
        _interests?.add(Interest.fromJson(v));
      });
    }
    if (json['documentType'] != null) {
      _documentType = [];
      json['documentType'].forEach((v) {
        _documentType?.add(Interest.fromJson(v));
      });
    }
    if (json['reportReasons'] != null) {
      _reportReasons = [];
      json['reportReasons'].forEach((v) {
        _reportReasons?.add(Interest.fromJson(v));
      });
    }
  }

  String? _id;

  List<String>? _familyTypes;
  List<String>? _familyStatuses;
  List<String>? _occupations;
  List<IncomeRange>? _incomeRanges;
  num? _isAdmobOn;
  num? _minuteLimitInCreatingStory;
  num? _minuteLimitInChoosingVideoForStory;
  num? _minuteLimitInChoosingVideoForPost;
  num? _maxImagesCanBeUploadedInOnePost;
  String? _adBannerAndroid;
  String? _adInterstitialAndroid;
  String? _adBannerIOS;
  String? _adInterstitialIOS;
  String? _createdAt;
  String? _updatedAt;

  List<String>? _dietOptions;

  List<String>? _smokingOptions;
  List<String>? _drinkingOptions;
  List<String>? _livingOptions;
  List<String>? _spiritualOptions;
  List<Interest>? _interests;
  List<Interest>? _documentType;
  List<Interest>? _reportReasons;
  
  // Legal & Support URLs
  String? _termsUrl;
  String? _privacyPolicyUrl;
  String? _helpUrl;
  
  // APK Info
  ApkInfo? _apk;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;

    map['familyTypes'] = _familyTypes;
    map['familyStatus'] = _familyStatuses;
    map['occupations'] = _occupations;
    if (_incomeRanges != null) {
      map['incomeRanges'] = _incomeRanges?.map((v) => v.toJson()).toList();
    }

    map['dietOptions'] = _dietOptions;
    map['smokingOptions'] = _smokingOptions;
    map['drinkingOptions'] = _drinkingOptions;
    map['livingOptions'] = _livingOptions;
    map['spiritualOptions'] = _spiritualOptions;

    map['is_admob_on'] = _isAdmobOn;
    map['minute_limit_in_creating_story'] = _minuteLimitInCreatingStory;
    map['minute_limit_in_choosing_video_for_story'] = _minuteLimitInChoosingVideoForStory;

    map['minute_limit_in_choosing_video_for_post'] = _minuteLimitInChoosingVideoForPost;

    map['max_images_can_be_uploaded_in_one_post'] = _maxImagesCanBeUploadedInOnePost;
    map['ad_banner_android'] = _adBannerAndroid;
    map['ad_interstitial_android'] = _adInterstitialAndroid;
    map['ad_banner_iOS'] = _adBannerIOS;
    map['ad_interstitial_iOS'] = _adInterstitialIOS;
    map['created_at'] = _createdAt;
    _updatedAt = map['updated_at'];
    if (_interests != null) {
      map['interests'] = _interests?.map((v) => v.toJson()).toList();
    }
    if (_documentType != null) {
      map['documentType'] = _documentType?.map((v) => v.toJson()).toList();
    }
    if (_reportReasons != null) {
      map['reportReasons'] = _reportReasons?.map((v) => v.toJson()).toList();
    }

    // Legal & Support URLs
    map['termsUrl'] = _termsUrl;
    map['privacyPolicyUrl'] = _privacyPolicyUrl;
    map['helpUrl'] = _helpUrl;

    // APK Info
    if (_apk != null) {
      map['apk'] = _apk?.toJson();
    }

    return map;
  }

  String? get id => _id;

  num? get minuteLimitInCreatingStory => _minuteLimitInCreatingStory;

  num? get minuteLimitInChoosingVideoForStory => _minuteLimitInChoosingVideoForStory;

  num? get minuteLimitInChoosingVideoForPost => _minuteLimitInChoosingVideoForPost;

  num? get maxImagesCanBeUploadedInOnePost => _maxImagesCanBeUploadedInOnePost;

  String? get adBannerAndroid => _adBannerAndroid;

  num? get isAdmobOn => _isAdmobOn;

  String? get adInterstitialAndroid => _adInterstitialAndroid;

  String? get adBannerIOS => _adBannerIOS;

  String? get adInterstitialIOS => _adInterstitialIOS;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  List<Interest>? get interests => _interests;

  List<String>? get familyTypes => _familyTypes;

  List<String>? get familyStatuses => _familyStatuses;

  List<String>? get occupations => _occupations;

  List<Interest>? get documentType => _documentType;

  List<IncomeRange>? get incomeRanges => _incomeRanges;

  List<Interest>? get reportReasons => _reportReasons;

  List<String>? get dietOptions => _dietOptions;

  List<String>? get smokingOptions => _smokingOptions;

  List<String>? get drinkingOptions => _drinkingOptions;

  List<String>? get livingOptions => _livingOptions;

  List<String>? get spiritualOptions => _spiritualOptions;
  
  // Legal & Support URL getters - returns dynamic values from API
  String? get termsUrl => _termsUrl;
  
  String? get privacyPolicyUrl => _privacyPolicyUrl;
  
  String? get helpUrl => _helpUrl;
  
  // APK Info getter
  ApkInfo? get apk => _apk;
}

class Interest {
  Interest({String? id, String? title, String? createdAt, String? updatedAt, num? totalRoomOfInterest}) {
    _id = id;
    _title = title;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
    _totalRoomOfInterest = totalRoomOfInterest;
  }

  Interest.fromJson(dynamic json) {
    _id = json['_id'];
    _title = json['title'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
    _totalRoomOfInterest = json['totalRoomOfInterest'];
  }

  String? _id;
  String? _title;
  String? _createdAt;
  String? _updatedAt;
  num? _totalRoomOfInterest;

  Interest copyWith({
    String? id,
    String? title,
    String? createdAt,
    String? updatedAt,
  }) =>
      Interest(
        id: id ?? _id,
        title: title ?? _title,
        createdAt: createdAt ?? _createdAt,
        updatedAt: updatedAt ?? _updatedAt,
      );

  String? get id => _id;

  String? get title => _title;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  num? get totalRoomOfInterest => _totalRoomOfInterest;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['_id'] = _id;
    map['title'] = _title;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    map['totalRoomOfInterest'] = _totalRoomOfInterest;
    return map;
  }
}

class IncomeRange {
  String? id;
  String? name;

  IncomeRange({this.id, this.name});

  IncomeRange.fromJson(dynamic json) {
    id = json['_id'];
    name = json['name'];
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
    };
  }
}

class ApkInfo {
  String? versionName;
  int? versionCode;
  String? fileName;
  String? filePath;
  int? fileSize;
  String? releaseNotes;
  bool? isMandatoryUpdate;
  int? downloadCount;
  String? lastUpdated;

  ApkInfo({
    this.versionName,
    this.versionCode,
    this.fileName,
    this.filePath,
    this.fileSize,
    this.releaseNotes,
    this.isMandatoryUpdate,
    this.downloadCount,
    this.lastUpdated,
  });

  ApkInfo.fromJson(dynamic json) {
    versionName = json['versionName'];
    versionCode = json['versionCode'];
    fileName = json['fileName'];
    // Handle both filePath and downloadUrl
    filePath = json['filePath'] ?? json['downloadUrl'];
    fileSize = json['fileSize'];
    releaseNotes = json['releaseNotes'];
    isMandatoryUpdate = json['isMandatoryUpdate'];
    downloadCount = json['downloadCount'];
    lastUpdated = json['lastUpdated'];
  }

  Map<String, dynamic> toJson() {
    return {
      'versionName': versionName,
      'versionCode': versionCode,
      'fileName': fileName,
      'filePath': filePath,
      'fileSize': fileSize,
      'releaseNotes': releaseNotes,
      'isMandatoryUpdate': isMandatoryUpdate,
      'downloadCount': downloadCount,
      'lastUpdated': lastUpdated,
    };
  }
}
