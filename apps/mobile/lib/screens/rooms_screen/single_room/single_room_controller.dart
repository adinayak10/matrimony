import 'package:banjaramatch/common/api_service/room_service.dart';
import 'package:banjaramatch/common/controller/base_controller.dart';
import 'package:banjaramatch/models/room_model.dart';

class SingleRoomController extends BaseController {
  Room? room;
  String roomId;

  SingleRoomController(this.roomId);

  @override
  void onReady() {
    fetchRoom();
    super.onReady();
  }

  void fetchRoom() {
    startLoading();
    RoomService.shared.fetchRoom(roomId, (room) {
      stopLoading();
      this.room = room;
      update();
    });
  }
}
