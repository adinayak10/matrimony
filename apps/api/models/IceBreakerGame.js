// models/IceBreakerGame.js
const mongoose = require('mongoose');

const iceBreakerGameSchema = new mongoose.Schema({
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    id: String,
    question: String,
    options: [String]
  }],
  answers: {
    type: Map,
    of: Map // userId -> questionId -> answer
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  identitiesRevealed: {
    type: Map,
    of: Boolean,
    default: {}
  },
  status: {
    type: String,
    enum: ['playing', 'completed', 'abandoned'],
    default: 'playing'
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding user's games
iceBreakerGameSchema.index({ player1: 1, createdAt: -1 });
iceBreakerGameSchema.index({ player2: 1, createdAt: -1 });
iceBreakerGameSchema.index({ createdAt: -1 });

module.exports = mongoose.model('IceBreakerGame', iceBreakerGameSchema);


// The question bank lives in models/IceBreakerQuestion.js (registered there once).
require('./IceBreakerQuestion');


const iceBreakerStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesCompleted: {
    type: Number,
    default: 0
  },
  averageMatchScore: {
    type: Number,
    default: 0
  },
  bestMatchScore: {
    type: Number,
    default: 0
  },
  identitiesRevealed: {
    type: Number,
    default: 0
  },
  identitiesReceived: {
    type: Number,
    default: 0
  },
  profileViewsFromGame: {
    type: Number,
    default: 0
  },
  connectionsFromGame: {
    type: Number,
    default: 0
  },
  lastPlayedAt: {
    type: Date
  },
  favoriteCategory: {
    type: String,
    enum: ['personality', 'lifestyle', 'values', 'interests', 'relationships', 'goals']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
iceBreakerStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('IceBreakerStats', iceBreakerStatsSchema);

// Utility functions for managing questions
class IceBreakerQuestionManager {
  
  // Get random questions for a game
  static async getRandomQuestions(count = 5, difficulty = null, categories = null) {
    try {
      let query = { isActive: true };
      
      if (difficulty) {
        query.difficulty = difficulty;
      }
      
      if (categories && categories.length > 0) {
        query.category = { $in: categories };
      }
      
      const questions = await mongoose.model('IceBreakerQuestion').aggregate([
        { $match: query },
        { $sample: { size: count } },
        { $project: { 
          _id: 1,
          question: 1, 
          options: 1, 
          category: 1,
          difficulty: 1 
        }}
      ]);
      
      // Increment usage count for selected questions
      const questionIds = questions.map(q => q._id);
      await mongoose.model('IceBreakerQuestion').updateMany(
        { _id: { $in: questionIds } },
        { $inc: { usageCount: 1 } }
      );
      
      // Format for game use
      return questions.map((q, index) => ({
        id: q._id.toString(),
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty
      }));
      
    } catch (error) {
      console.error('Error getting random questions:', error);
      return [];
    }
  }
  
  // Add new question to database
  static async addQuestion(questionData) {
    try {
      const question = new (mongoose.model('IceBreakerQuestion'))(questionData);
      await question.save();
      return question;
    } catch (error) {
      console.error('Error adding question:', error);
      throw error;
    }
  }
  
  // Get question statistics
  static async getQuestionStats() {
    try {
      const stats = await mongoose.model('IceBreakerQuestion').aggregate([
        { $match: { isActive: true } },
        { $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          avgUsage: { $avg: '$usageCount' },
          categories: { $addToSet: '$category' },
          difficulties: { $addToSet: '$difficulty' }
        }}
      ]);
      
      return stats[0] || {
        totalQuestions: 0,
        avgUsage: 0,
        categories: [],
        difficulties: []
      };
    } catch (error) {
      console.error('Error getting question stats:', error);
      return null;
    }
  }
}

// Utility functions for managing game stats
class IceBreakerStatsManager {
  
  // Update user stats after game completion
  static async updateUserStats(userId, gameResult) {
    try {
      const { matchScore, identityRevealed, identityReceived, gameCompleted } = gameResult;
      
      let stats = await mongoose.model('IceBreakerStats').findOne({ userId });
      
      if (!stats) {
        stats = new (mongoose.model('IceBreakerStats'))({ userId });
      }
      
      // Update stats
      stats.gamesPlayed += 1;
      if (gameCompleted) {
        stats.gamesCompleted += 1;
      }
      
      // Update match scores
      const totalScorePoints = (stats.averageMatchScore * (stats.gamesCompleted - 1)) + matchScore;
      stats.averageMatchScore = Math.round(totalScorePoints / stats.gamesCompleted);
      
      if (matchScore > stats.bestMatchScore) {
        stats.bestMatchScore = matchScore;
      }
      
      // Update identity stats
      if (identityRevealed) {
        stats.identitiesRevealed += 1;
      }
      if (identityReceived) {
        stats.identitiesReceived += 1;
      }
      
      stats.lastPlayedAt = new Date();
      
      await stats.save();
      return stats;
      
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }
  
  // Get user's game statistics
  static async getUserStats(userId) {
    try {
      const stats = await mongoose.model('IceBreakerStats').findOne({ userId });
      return stats || {
        gamesPlayed: 0,
        gamesCompleted: 0,
        averageMatchScore: 0,
        bestMatchScore: 0,
        identitiesRevealed: 0,
        identitiesReceived: 0,
        profileViewsFromGame: 0,
        connectionsFromGame: 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }
  
  // Get leaderboard data
  static async getLeaderboard(limit = 10, type = 'bestMatch') {
    try {
      let sortField;
      switch (type) {
        case 'mostGames':
          sortField = { gamesPlayed: -1 };
          break;
        case 'avgMatch':
          sortField = { averageMatchScore: -1 };
          break;
        case 'mostConnections':
          sortField = { connectionsFromGame: -1 };
          break;
        default:
          sortField = { bestMatchScore: -1 };
      }
      
      const leaderboard = await mongoose.model('IceBreakerStats')
        .find({ gamesPlayed: { $gte: 3 } }) // Minimum 3 games to qualify
        .sort(sortField)
        .limit(limit)
        .populate('userId', 'full_name profile age location.city')
        .lean();
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

module.exports = {
  IceBreakerQuestionManager,
  IceBreakerStatsManager
};