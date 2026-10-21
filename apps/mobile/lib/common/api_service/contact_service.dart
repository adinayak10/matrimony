import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/models/json_parse.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class ContactService {
  static var shared = ContactService();

  /// `POST /api/contact/submit {name, email, phone, message, source:'app'}`.
  /// The API requires all four fields and a 10-digit phone; it answers with
  /// `success` (not `status`). [completion] gets the server's thank-you message.
  void submit({
    required String name,
    required String email,
    required String phone,
    required String message,
    required Function(String message) completion,
    Function(String message)? onError,
  }) {
    ApiService.shared.call(
      url: WebService.contactSubmit,
      param: {'name': name, 'email': email, 'phone': phone, 'message': message, 'source': 'app'},
      completion: (response) {
        if (jsonOk(response)) {
          completion(jsonMessage(response, ''));
        } else {
          onError?.call(jsonMessage(response));
        }
      },
    );
  }
}
