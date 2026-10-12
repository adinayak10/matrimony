class Review {
  final String id;
  final String userId;
  final String content;
  final double rating;
  final String imageUrl; // Add image URL field
  final String comment; // Add comment field

  Review({
    required this.id,
    required this.userId,
    required this.content,
    required this.rating,
    this.imageUrl = '', // Optional field with default empty string
    this.comment = '', // Optional field with default empty string
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      content: json['content'] ?? '',
      rating: json['rating']?.toDouble() ?? 0.0,
      imageUrl: json['image_url'] ?? '',
      // Parse image URL from JSON
      comment: json['comment'] ?? '', // Parse comment from JSON
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'content': content,
      'rating': rating,
      'image_url': imageUrl, // Include image URL in JSON
      'comment': comment, // Include comment in JSON
    };
  }
}
