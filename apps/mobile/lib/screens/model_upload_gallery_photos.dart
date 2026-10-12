import 'package:banjaramatch/screens/model_gallery_photo.dart';

class ModelUploadPhotos {
  bool? status;
  String? message;
  List<GalleryPhoto>? data;

  ModelUploadPhotos({this.status, this.message, this.data});

  ModelUploadPhotos.fromJson(dynamic json) {
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
