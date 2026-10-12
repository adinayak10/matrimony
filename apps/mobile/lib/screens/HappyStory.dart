class HappyStory {
  final String id;
  final String title;
  final String content;
  final String imageUrl;
  final String thumbImg;
  final String details;

  HappyStory({
    required this.id,
    required this.title,
    required this.content,
    required this.imageUrl,
    required this.thumbImg,
    required this.details,
  });

  factory HappyStory.fromJson(Map<String, dynamic> json) {
    return HappyStory(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      imageUrl: json['image_url'] ?? '',
      thumbImg: json['thumbImg'] ?? '',
      details: json['details'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'image_url': imageUrl,
      'thumbImg': thumbImg,
      'details': details
    };
  }
}
