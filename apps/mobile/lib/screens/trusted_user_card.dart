import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

class TrustedUserCard extends StatelessWidget {
  final bool isFetching;
  final List cardList;

  const TrustedUserCard({
    super.key,
    required this.isFetching,
    required this.cardList,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 130,
      child: isFetching
          ? CircularProgressIndicator()
          : cardList.isNotEmpty
              ? ListView.separated(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: cardList.length,
                  separatorBuilder: (BuildContext context, int index) => const SizedBox(
                    width: 20,
                  ),
                  itemBuilder: (BuildContext context, int index) {
                    return Container(
                      height: 130,
                      decoration: BoxDecoration(
                        borderRadius: const BorderRadius.all(
                          Radius.circular(16),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(25),
                        child: Column(
                          children: [
                            SizedBox(
                              width: 44,
                              height: 38,
                              child: cardList[index].icon != null
                                  ? CachedNetworkImage(
                                      imageUrl: cardList[index].icon,
                                      fit: BoxFit.contain,
                                      placeholder: (context, url) => const Center(
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                      errorWidget: (context, url, error) => const Icon(
                                        Icons.error,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.error,
                                      color: Colors.white,
                                    ),
                            ),
                            const SizedBox(
                              height: 8,
                            ),
                            Text(
                              cardList[index].title,
                              //  style: Styles.medium_zircon_14,
                            )
                          ],
                        ),
                      ),
                    );
                  },
                )
              : Text("Nodata"),
    );
  }
}
