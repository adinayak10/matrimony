class ModelGalleryPhotos {
  bool? status;
  String? message;
  List<GalleryPhoto>? data;

  ModelGalleryPhotos({this.status, this.message, this.data});

  ModelGalleryPhotos.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    if (json['data'] != null) {
      data = <GalleryPhoto>[];
      json['data'].forEach((v) {
        data!.add(new GalleryPhoto.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['status'] = this.status;
    data['message'] = this.message;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class GalleryPhoto {
  String? sId;
  String? userId;
  String? imageUrl;
  bool? isProfile;
  String? uploadedAt;
  int? iV;

  GalleryPhoto({this.sId, this.userId, this.imageUrl, this.isProfile, this.uploadedAt, this.iV});

  GalleryPhoto.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    userId = json['userId'];
    imageUrl = json['imageUrl'];
    isProfile = json['isProfile'];
    uploadedAt = json['uploadedAt'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['_id'] = this.sId;
    data['userId'] = this.userId;
    data['imageUrl'] = this.imageUrl;
    data['isProfile'] = this.isProfile;
    data['uploadedAt'] = this.uploadedAt;
    data['__v'] = this.iV;
    return data;
  }
}
