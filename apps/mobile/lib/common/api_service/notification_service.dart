/// Push notifications are sent by the API (`services/push.js`); the app never
/// relays pushes itself (the old `pushNotificationToSingleUser` relay and the
/// legacy room-topic subscriptions were removed in 1.1.0).
class NotificationService {
  static var shared = NotificationService();
}
