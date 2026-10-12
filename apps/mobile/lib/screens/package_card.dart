import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'device_info.dart';

class PackageCard extends StatelessWidget {
  final bool? isFetching;
  final List? packageList;
  final bool? profilePicturePrivacy;
  final bool? galleryPicturePrivacy;
  final bool? isLogin;

  const PackageCard({
    Key? key,
    this.isFetching,
    this.packageList,
    this.profilePicturePrivacy,
    this.galleryPicturePrivacy,
    this.isLogin,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    double? packageCardHeight;
    if ((profilePicturePrivacy == true) && (galleryPicturePrivacy == true)) {
      packageCardHeight = 385.0;
    } else if ((profilePicturePrivacy == false) && (galleryPicturePrivacy == false)) {
      packageCardHeight = 325.0;
    } else {
      packageCardHeight = 355.0;
    }

    return Container(
      height: packageCardHeight,
      width: DeviceInfo(context).width,
      child: isFetching!
          ? CircularProgressIndicator()
          : packageList!.isNotEmpty
              ? ListView.separated(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: packageList!.length,
                  separatorBuilder: (BuildContext context, int index) => const SizedBox(
                    width: 20,
                  ),
                  itemBuilder: (BuildContext context, int index) {
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 200,
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.all(
                              Radius.circular(16),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                packageList![index].image == null
                                    ? const SizedBox(
                                        height: 40,
                                        width: 40,
                                      )
                                    : CachedNetworkImage(
                                        imageUrl: packageList![index].image,
                                        height: 40,
                                        width: 40,
                                        fit: BoxFit.cover,
                                        placeholder: (context, url) => const SizedBox(
                                          height: 40,
                                          width: 40,
                                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                        ),
                                        errorWidget: (context, url, error) => const Icon(Icons.error),
                                      ),
                                const SizedBox(
                                  height: 7.3,
                                ),
                                Text(
                                  packageList![index].price == 0
                                      ? packageList![index].priceText.toString()
                                      : "packageList![index].priceText.toString()",
                                ),
                                const SizedBox(
                                  height: 10.0,
                                ),
                                Text(
                                  packageList![index].name,
                                ),
                                const SizedBox(
                                  height: 15.0,
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '\u2022 ${packageList![index].expressInterest} Express Interests',
                                    ),
                                    const SizedBox(
                                      height: 14.0,
                                    ),
                                    Text(
                                      '\u2022 ${packageList![index].photoGallery} Gallery Photo Upload',
                                    ),
                                    const SizedBox(
                                      height: 14.0,
                                    ),
                                    Text(
                                      '\u2022 ${packageList![index].contact} Contact Info View',
                                    ),
                                    const SizedBox(
                                      height: 14.0,
                                    ),
                                    profilePicturePrivacy!
                                        ? Column(
                                            children: [
                                              Text(
                                                '\u2022 ${packageList![index].profileImageView} Profile Image View',
                                              ),
                                              const SizedBox(
                                                height: 14.0,
                                              ),
                                            ],
                                          )
                                        : Container(),
                                    galleryPicturePrivacy!
                                        ? Column(
                                            children: [
                                              Text(
                                                '\u2022 ${packageList![index].galleryImageView} Gallery Image View',
                                              ),
                                              const SizedBox(
                                                height: 14.0,
                                              ),
                                            ],
                                          )
                                        : Container(),
                                    Text(
                                      '\u2022 Show Auto Profile Match',
                                    ),
                                    const SizedBox(
                                      height: 14.0,
                                    ),
                                    Text(
                                      '\u2022 ${packageList![index].validity} Days',
                                    ),
                                    const SizedBox(
                                      height: 20.2,
                                    ),
                                  ],
                                ),
                                Container(
                                  height: 30,
                                  width: 100,
                                  decoration: packageList![index].packageId != 1
                                      ? BoxDecoration(
                                          borderRadius: const BorderRadius.all(
                                            Radius.circular(5),
                                          ),
                                        )
                                      : BoxDecoration(
                                          borderRadius: const BorderRadius.all(
                                            Radius.circular(5),
                                          ),
                                        ),
                                  child: InkWell(
                                    onTap: () {},
                                    child: Text('data'),
                                  ),
                                )
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                )
              : Text(""),
    );
  }
}
