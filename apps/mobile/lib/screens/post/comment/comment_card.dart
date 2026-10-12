import 'package:flutter/cupertino.dart';
import 'package:banjaramatch/common/managers/session_manager.dart';
import 'package:banjaramatch/common/extensions/date_time_extension.dart';
import 'package:banjaramatch/common/extensions/font_extension.dart';
import 'package:banjaramatch/common/widgets/my_cached_image.dart';
import 'package:banjaramatch/models/comments_model.dart';
import 'package:banjaramatch/utilities/const.dart';

class CommentCard extends StatelessWidget {
  final Comment comment;
  final Function() onDeleteTap;

  const CommentCard({Key? key, required this.comment, required this.onDeleteTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipOval(
                  child: SizedBox(
                    width: 45,
                    height: 45,
                    child: MyCachedImage(imageUrl: comment.user?.profile),
                  ),
                ),
                const SizedBox(
                  width: 10,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '@${comment.user?.fullName ?? ''}',
                                style: MyTextStyle.gilroySemiBold(color: cPrimary, size: 16),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                comment.date.timeAgo(),
                                style: MyTextStyle.gilroyLight(color: cLightText, size: 14),
                              ),
                            ],
                          ),
                          const Spacer(),
                          (SessionManager.shared.getUserID() == comment.userId)
                              ? GestureDetector(
                                  onTap: onDeleteTap,
                                  child: Icon(
                                    CupertinoIcons.trash,
                                    color: cLightText.withOpacity(0.5),
                                  ),
                                )
                              : Container()
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        comment.desc ?? '',
                        style: MyTextStyle.gilroyMedium(color: cLightIcon, size: 16),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
