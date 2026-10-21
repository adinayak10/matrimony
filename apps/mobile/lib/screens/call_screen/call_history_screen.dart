import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/localization/features/call_strings.dart';
import 'package:banjaramatch/models/call_log_model.dart';
import 'package:banjaramatch/screens/call_screen/call_history_controller.dart';
import 'package:banjaramatch/screens/common/empty_state.dart';
import 'package:banjaramatch/screens/extra_views/top_bar.dart';
import 'package:banjaramatch/utilities/const.dart';

/// Call history: direction icon, missed calls in red, duration, time ago and
/// a call-back button (same call type).
class CallHistoryScreen extends StatelessWidget {
  const CallHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cBackground,
      body: Column(
        children: [
          TopBarForInView(title: CallKeys.callHistory.tr),
          Expanded(
            child: GetBuilder<CallHistoryController>(
              init: CallHistoryController(),
              builder: (controller) {
                if (controller.firstLoad && controller.calls.isEmpty) {
                  return const Center(child: CircularProgressIndicator(color: cPrimary));
                }
                if (controller.calls.isEmpty) {
                  return RefreshIndicator(
                    color: cPrimary,
                    onRefresh: controller.reload,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        controller.error != null
                            ? EmptyState(
                                icon: Icons.wifi_off_rounded,
                                title: CallKeys.callHistory.tr,
                                message: controller.error,
                                onAction: controller.reload,
                              )
                            : EmptyState(
                                icon: Icons.call_rounded,
                                title: CallKeys.noCallsTitle.tr,
                                message: CallKeys.noCallsMessage.tr,
                              ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  color: cPrimary,
                  onRefresh: controller.reload,
                  child: ListView.builder(
                    controller: controller.scrollController,
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: controller.calls.length + (controller.loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= controller.calls.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(child: CircularProgressIndicator(color: cPrimary, strokeWidth: 2.5)),
                        );
                      }
                      return _CallLogRow(log: controller.calls[index], controller: controller);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CallLogRow extends StatelessWidget {
  const _CallLogRow({required this.log, required this.controller});

  final CallLog log;
  final CallHistoryController controller;

  static String formatDuration(int totalSeconds) {
    final h = totalSeconds ~/ 3600;
    final m = (totalSeconds % 3600) ~/ 60;
    final s = totalSeconds % 60;
    if (h > 0) return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final myId = controller.myUserId;
    final outgoing = log.isOutgoing(myId);
    final other = log.otherParty(myId);
    final name = (other?.fullName ?? '').trim().isEmpty ? CallKeys.unknownMember.tr : other!.fullName!.trim();
    final missed = log.isMissed;
    final declined = log.status == 'rejected';
    // Missed / declined calls I did not answer are the ones to notice.
    final highlight = missed && !outgoing;

    IconData directionIcon;
    if (missed) {
      directionIcon = outgoing ? Icons.call_missed_outgoing_rounded : Icons.call_missed_rounded;
    } else {
      directionIcon = outgoing ? Icons.call_made_rounded : Icons.call_received_rounded;
    }
    final directionColor = (missed || declined) ? cRed : cGreen;

    String label;
    if (missed) {
      label = outgoing ? CallKeys.noAnswer.tr : CallKeys.missed.tr;
    } else if (declined) {
      label = CallKeys.declined.tr;
    } else {
      label = outgoing ? CallKeys.outgoing.tr : CallKeys.incoming.tr;
    }
    final details = <String>[label];
    if (log.durationSeconds > 0) details.add(formatDuration(log.durationSeconds));
    final when = log.createdAt ?? log.startedAt;
    if (when != null) details.add(timeago.format(when));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      decoration: BoxDecoration(
        color: cCard,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: MyCachedProfileImage(
              imageUrl: other?.profile,
              fullName: name,
              width: 48,
              height: 48,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: MyTextStyle.gilroyBold(size: 15, color: highlight ? cRed : cDarkText),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(directionIcon, size: 16, color: directionColor),
                    const SizedBox(width: 4),
                    Icon(log.isVideo ? Icons.videocam_rounded : Icons.call_rounded, size: 14, color: cLightText),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        details.join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: MyTextStyle.gilroyRegular(size: 12, color: highlight ? cRed : cLightText),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: CallKeys.callBack.tr,
            onPressed: () => controller.callBack(log),
            icon: Icon(log.isVideo ? Icons.videocam_rounded : Icons.call_rounded, color: cPrimary),
          ),
        ],
      ),
    );
  }
}
