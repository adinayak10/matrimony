import 'package:pull_to_refresh/pull_to_refresh.dart';
import 'package:banjaramatch/common/api_service/room_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/room_model.dart';

class RoomsByInterestController extends BaseController {
  RefreshController refreshController = RefreshController();
  List<Room> rooms = [];
  String? interestId;

  RoomsByInterestController({this.interestId});

  @override
  void onReady() {
    if (interestId != null) {
      fetchRooms((interestId ?? "0"));
    }
    super.onReady();
  }

  void fetchRandomRooms() {
    isLoading.value = true;
    RoomService.shared.fetchRooms((rooms) {
      isLoading.value = false;
      this.rooms.addAll(rooms);
      update();
    });
  }

  void fetchRooms(String interestId) {
    if (rooms.isEmpty) {
      startLoading();
    }

    RoomService.shared.fetchRoomByInterest(interestId, rooms.length, (rooms) {
      stopLoading();
      refreshController.loadComplete();
      if (rooms.isEmpty) {
        refreshController.loadNoData();
      }
      this.rooms.addAll(rooms);
      update();
    });
  }
}
