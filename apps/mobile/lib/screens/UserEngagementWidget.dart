import 'package:flutter/material.dart';
import 'package:banjaramatch/models/marrige_intent_model.dart';
import 'package:banjaramatch/models/model_match_momemtum.dart';
import 'package:banjaramatch/models/model_user_online_pattern.dart';

class UserEngagementWidget extends StatelessWidget {
  final MatchMomentum matchMomentum;
  final OnlinePattern onlinePattern;
  final MarrigeIntent marriageIntent;

  const UserEngagementWidget({
    super.key,
    required this.matchMomentum,
    required this.onlinePattern,
    required this.marriageIntent,
  });

  @override
  Widget build(BuildContext context) {
    print('alkdjsalkjsdalsdjl;asd../.');

    return Column(
      children: [
        _buildCard(
          title: "⚡ Match Momentum",
          subtitle: matchMomentum.label ?? "No momentum data",
          stats: matchMomentum.chart != null
              ? {
                  "Views": matchMomentum.chart!.views!.toString(),
                  "Interests": matchMomentum!.chart!.interests.toString(),
                  "Replies": matchMomentum!.chart!.replies!.toString(),
                  "Shortlists": matchMomentum.chart!.shortlists!.toString(),
                }
              : null,
        ),
        const SizedBox(height: 16),
        _buildCard(
          title: "📊 Online Pattern",
          subtitle: onlinePattern.pattern ?? "No pattern",
        ),
        const SizedBox(height: 16),
        _buildCard(
          title: "💍 Marriage Intent",
          subtitle: marriageIntent.status ?? "No status",
          stats: {
            "Views Made": marriageIntent.viewsMade.toString(),
            "Views Received": marriageIntent.viewsReceived.toString(),
            "Shortlisted": marriageIntent.shortlistCount.toString(),
            "Rejection Rate": marriageIntent.rejectionRate ?? '0%',
            "Score": marriageIntent.score.toString(),
          },
        ),
      ],
    );
  }

  Widget _buildCard({
    required String title,
    required String subtitle,
    Map<String, String>? stats,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x22000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              )),
          const SizedBox(height: 8),
          Text(subtitle,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black54,
              )),
          if (stats != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: stats.entries.map((entry) {
                return _statChip(entry.key, entry.value);
              }).toList(),
            )
          ]
        ],
      ),
    );
  }

  Widget _statChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: RichText(
        text: TextSpan(
          children: [
            TextSpan(
              text: "$label: ",
              style: const TextStyle(color: Colors.black87),
            ),
            TextSpan(
              text: value,
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.bold,
              ),
            )
          ],
        ),
      ),
    );
  }
}
