import 'package:banjaramatch/common/api_service/api_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/faq_categories_model.dart';
import 'package:banjaramatch/utilities/web_service.dart';

class FAQsController extends BaseController {
  List<FAQsCategory> categories = [];
  FAQsCategory? selectedCat;

  @override
  void onReady() {
    fetchData();
    super.onReady();
  }

  void onTapCategory(FAQsCategory category) {
    selectedCat = category;
    update();
  }

  /// `POST /api/fetchFAQs`. Always stops the loader; with no categories an
  /// empty placeholder is selected so the screen shows its "no data" text
  /// (FAQs ship empty until the admin adds them).
  void fetchData() {
    startLoading();
    ApiService.shared.call(
      url: WebService.fetchFAQs,
      completion: (response) {
        var loaded = <FAQsCategory>[];
        try {
          if (response is Map && response['data'] is List) {
            loaded = FaqCategoriesModel.fromJson(response).data ?? <FAQsCategory>[];
          }
        } catch (e) {
          print('fetchFAQs parse failed: $e');
        }
        stopLoading();
        categories = loaded;
        selectedCat = loaded.isNotEmpty ? loaded.first : FAQsCategory(faqs: []);
        update();
      },
    );
  }
}
