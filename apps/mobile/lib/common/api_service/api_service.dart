import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';

import '../managers/session_manager.dart';

class ApiService {
  http.Client? client = http.Client();

  String? _token;

  /// Call this once after app launch or after login
  Future<void> loadToken() async {
    _token = await SessionManager.shared.getToken();
  }

  /// Base headers with token
  Map<String, String> get header => {
        'apikey': '123',
        'Content-Type': 'application/json',
        if (_token != null && _token!.isNotEmpty) 'Authorization': 'Bearer $_token',
      };

  static var shared = ApiService();

  void call({
    required String url,
    Map<String, dynamic>? param,
    required Function(Object response) completion,
    Function(String error)? onError,
  }) async {
    try {
      await loadToken();
      final response = await http.post(
        Uri.parse(url),
        headers: header,
        body: json.encode(param ?? {}),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw TimeoutException('Connection timeout. Please check your internet connection.');
        },
      );

      if (kDebugMode) {
        print("URL: $url");
        print("parameters: ${const JsonEncoder.withIndent('  ').convert(param)}");
        debugPrint("🔍 Full API Response:\n${const JsonEncoder.withIndent('  ').convert(json.decode(response.body))}");
      }

      completion(json.decode(response.body));
    } on SocketException catch (e) {
      final errorMsg = 'No internet connection. Please check your network.';
      print('❌ Network Error: $errorMsg');
      if (onError != null) {
        onError(errorMsg);
      } else {
        // Return error response in expected format
        completion({
          'status': false,
          'message': errorMsg,
        });
      }
    } on TimeoutException catch (e) {
      final errorMsg = 'Connection timeout. Please try again.';
      print('❌ Timeout Error: $errorMsg');
      if (onError != null) {
        onError(errorMsg);
      } else {
        completion({
          'status': false,
          'message': errorMsg,
        });
      }
    } on FormatException catch (e) {
      final errorMsg = 'Invalid response from server.';
      print('❌ Format Error: $errorMsg - $e');
      if (onError != null) {
        onError(errorMsg);
      } else {
        completion({
          'status': false,
          'message': errorMsg,
        });
      }
    } catch (e) {
      final errorMsg = 'Something went wrong. Please try again.';
      print('❌ Unexpected Error: $e');
      if (onError != null) {
        onError(errorMsg);
      } else {
        completion({
          'status': false,
          'message': errorMsg,
        });
      }
    }
  }

  /// Asynchronous API call using Future for better error handling and await usage.
  Future<Map<String, dynamic>> callAsync({
    required String url,
    Map<String, dynamic>? param,
  }) async {
    try {
      await loadToken();
      final Uri uri = Uri.parse(url);
      final http.Response response = await http.post(
        uri,
        headers: header,
        body: json.encode(param ?? {}),
      );

      if (kDebugMode) {
        print("URL: $url");
        print("Parameters: ${const JsonEncoder.withIndent('  ').convert(param ?? {})}");
        debugPrint("🔍 Full API Response:\n${const JsonEncoder.withIndent('  ').convert(json.decode(response.body))}");
      }

      // Check for successful HTTP status codes (200-299)
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        // Handle non-2xx status codes (e.g., 400, 401, 500)
        final errorResponse = json.decode(response.body);
        print('API Error for $url: Status ${response.statusCode}, Body: $errorResponse');
        throw HttpException(
          errorResponse['message'] ?? 'API call failed with status: ${response.statusCode}',
          uri: uri,
        );
      }
    } on SocketException {
      throw const SocketException('No Internet connection 💡');
    } on FormatException {
      throw const FormatException('Bad response format 👎');
    } catch (e) {
      // Catch any other unexpected errors
      print('An unexpected error occurred during API call to $url: $e');
      rethrow; // Re-throw the exception for the caller to handle
    }
  }

  void multiPartCallApi(
      {required String url,
      Map<String, dynamic>? param,
      required Map<String, List<XFile?>> filesMap,
      required Function(Object response) completion,
      Function(double percentage)? onProgress}) async {
    await loadToken();
    var request = MultipartRequest(
      'POST',
      Uri.parse(url),
      onProgress: (bytes, totalBytes) {
        if (onProgress != null) {
          onProgress(bytes / totalBytes);
        }
      },
    );

    Map<String, String> params = {};
    param?.forEach((key, value) {
      params[key] = "$value";
    });

    request.fields.addAll(params);
    request.headers.addAll(header);

    filesMap.forEach((keyName, files) {
      for (var xFile in files) {
        if (xFile != null && xFile.path.isNotEmpty) {
          File file = File(xFile.path);

          // Get MIME type of the file
          String? mimeType = lookupMimeType(file.path);

          if (mimeType != null && mimeType.startsWith('image/')) {
            var multipartFile = http.MultipartFile(
              keyName,
              file.readAsBytes().asStream(),
              file.lengthSync(),
              filename: xFile.name,
              contentType: MediaType.parse(mimeType), // Explicitly set MIME type
            );

            request.files.add(multipartFile);
          } else {
            print('File is not an image: ${file.path}');
          }
        }
      }
    });

    print(param);
    request.send().then((value) {
      print('${value.statusCode}');
      value.stream.bytesToString().then((respStr) {
        print(respStr);
        var response = jsonDecode(respStr);
        if (kDebugMode) {
          print(respStr);
        }

        completion(response);
      });
    });
  }
}

class MultipartRequest extends http.MultipartRequest {
  /// Creates a new [MultipartRequest].
  MultipartRequest(
    super.method,
    super.url, {
    this.onProgress,
  });

  final void Function(int bytes, int totalBytes)? onProgress;

  /// Freezes all mutable fields and returns a single-subscription [ByteStream]
  /// that will emit the request body.
  @override
  http.ByteStream finalize() {
    final byteStream = super.finalize();
    // if (onProgress == null) return byteStream;

    final total = contentLength;
    int bytes = 0;

    final t = StreamTransformer.fromHandlers(
      handleData: (List<int> data, EventSink<List<int>> sink) {
        bytes += data.length;
        if (onProgress != null) {
          onProgress!(bytes, total);
        }
        if (total >= bytes) {
          sink.add(data);
        }
      },
    );
    final stream = byteStream.transform(t);
    return http.ByteStream(stream);
  }
}
