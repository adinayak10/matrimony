import 'package:flutter/material.dart';
import 'package:banjaramatch/common/extensions/image_extension.dart';
import 'package:banjaramatch/models/registration.dart';

import 'device_info.dart';

class HighlightedUserCard extends StatelessWidget {
  final bool? isFetching;
  final List<User>? userLIst;

  const HighlightedUserCard({
    this.isFetching,
    this.userLIst,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: isFetching!
          ? CircularProgressIndicator()
          : userLIst!.isNotEmpty
              ? ListView.separated(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: userLIst!.length,
                  separatorBuilder: (BuildContext context, int index) => const SizedBox(
                    width: 15,
                  ),
                  itemBuilder: (BuildContext context, int index) {
                    return InkWell(
                      onTap: () {
                        // NavigatorPush.push(
                        //   context,
                        //   BlogDetails(
                        //     blog: userLIst![index],
                        //   ),
                        // );
                      },
                      child: Stack(
                        children: [
                          SizedBox(
                            height: 200,
                            width: 140,
                            child: ClipRRect(
                              borderRadius: const BorderRadius.all(Radius.circular(16.0)),
                              child: FadeInImage.assetNetwork(
                                placeholder: MyImages.placeHolderImage,
                                image: userLIst![index].profile!,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          //  Shades.transparent_dark(),
                          Positioned(
                            bottom: 20,
                            child: Padding(
                              padding: const EdgeInsets.only(left: 14.0, right: 14.0),
                              child: SizedBox(
                                width: DeviceInfo(context).width! * .5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      userLIst![index].fullName ?? "Demo Name",
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      // style: Styles.bold_white_12,
                                    ),
                                    const SizedBox(
                                      height: 3,
                                    ),
                                    Text(
                                      userLIst![index].dob ?? "DOB",
                                      //   style: Styles.italic_light_grey_12,
                                    ),
                                    const SizedBox(
                                      height: 10,
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        // Navigator.push(
                                        //   context,
                                        //   MaterialPageRoute(
                                        //     builder: (context) => BlogDetails(
                                        //       blog: userLIst![index],
                                        //     ),
                                        //   ),
                                        // );
                                      },
                                      style: ButtonStyle(
                                        backgroundColor: MaterialStateProperty.all(Colors.cyanAccent),
                                        fixedSize: MaterialStateProperty.all(const Size(90.0, 30.0)),
                                        overlayColor: MaterialStateProperty.all(Colors.cyanAccent),
                                        shape: MaterialStateProperty.all(
                                          const RoundedRectangleBorder(
                                              borderRadius: BorderRadius.all(Radius.circular(8.0)),
                                              side: BorderSide(color: Colors.black)),
                                        ),
                                      ),
                                      child: Text(
                                        'view more',
                                        // style: Styles.medium_white_12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                )
              : Text('data'),
    );
  }
}
