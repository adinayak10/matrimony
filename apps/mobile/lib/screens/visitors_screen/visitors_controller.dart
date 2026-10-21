import 'package:banjaramatch/common/controller/paged_user_list_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

/// Profile visitors (`getProfileVisitorSummary`, paged by page/limit).
/// Segments: 0 they viewed me, 1 I viewed, 2 mutual.
class VisitorsController extends PagedUserListController {
  VisitorsController({int initialSegment = 0}) : segment = initialSegment.clamp(0, 2).toInt();

  static const List<String> types = ['they_viewed_me', 'i_viewed', 'mutual'];

  int segment;

  String get type => types[segment];

  void changeSegment(int index) {
    if (index == segment || index < 0 || index >= types.length) return;
    segment = index;
    loadFirst();
  }

  @override
  void fetchPage(int page, void Function(List<User> users) done) {
    requestUserRows(
      WebService.profileVisitorSummary,
      {
        Param.myUserId: SessionManager.shared.getUserID(),
        'type': type,
        'page': page,
        Param.limit: pageSize,
      },
      done,
    );
  }
}
