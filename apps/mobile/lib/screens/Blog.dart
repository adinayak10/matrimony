class Blog {
  final String id;
  final String title;
  final String content;
  final String imageUrl;
  final String author;
  final String banner;
  final String categoryName;

  Blog({
    required this.id,
    required this.title,
    required this.content,
    required this.imageUrl,
    required this.author,
    required this.banner,
    required this.categoryName,
  });

  factory Blog.fromJson(Map<String, dynamic> json) {
    return Blog(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        content: json['content'] ?? '',
        imageUrl: json['image_url'] ?? '',
        author: json['author'] ?? '',
        banner: json['banner'] ?? '',
        categoryName: json['categoryName'] ?? '');
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'image_url': imageUrl,
      'author': author,
      'banner': banner,
      'categoryName': categoryName
    };
  }
}
