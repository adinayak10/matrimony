import 'package:get/get.dart';
import 'package:banjaramatch/common/api_service/user_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/common/controller/paged_user_list_controller.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/localization/features/app_strings.dart';
import 'package:banjaramatch/models/registration.dart';
import 'package:banjaramatch/screens/visitors_screen/user_list_support.dart';
import 'package:banjaramatch/utilities/params.dart';
import 'package:banjaramatch/utilities/web_service.dart';

/// Segments: 0 my shortlist (`getShortListedUsers`, not paged),
/// 1 members who shortlisted me (`fetchUsersList {isShortListedByThey:true}`, paged).
class ShortlistController extends PagedUserListController {
  ShortlistController({int initialSegment = 0}) : segment = initialSegment.clamp(0, 1).toInt();

  int segment;

  bool get isMine => segment == 0;

  void changeSegment(int index) {
    if (index == segment || index < 0 || index > 1) return;
    segment = index;
    loadFirst();
  }

  @override
  void fetchPage(int page, void Function(List<User> users) done) {
    if (isMine) {
      UserService.shared.fetchShortlistedUsers(page: page, completion: done);
      return;
    }
    requestUserRows(
      WebService.fetchUsersList,
      {
        Param.myUserId: SessionManager.shared.getUserID(),
        'page': page,
        Param.start: page,
        Param.limit: pageSize,
        'isShortListedByThey': true,
      },
      done,
    );
  }

  /// Removes [user] from my shortlist (toggleShortlist) and from the list.
  void removeFromShortlist(User user) {
    final id = user.id;
    if (id == null) return;
    UserService.shared.shortlist(id, () {
      removeUser(id);
      showSnackBar(AppKeys.shortlistRemoved.tr, type: SnackBarType.success);
    });
  }
}
