// icebreaker.js - Ice Breaker Game Module
const { v4: uuidv4 } = require('uuid');

// In-memory storage (consider moving to Redis for production)
const icebreakerQueue = [];
const activeIcebreakerGames = new Map();

const ICEBREAKER_QUESTIONS = [
  // Lifestyle & Hobbies
  {
    id: 'q1',
    question: 'What would be your ideal way to spend a Saturday morning?',
    options: ['Cozy coffee and a good book', 'A long run or workout', 'Exploring a new neighborhood', 'Sleeping in and relaxing']
  },
  {
    id: 'q2',
    question: 'What is your favorite way to unwind after a long day?',
    options: ['Watching a series or movie', 'Listening to music or a podcast', 'Cooking a nice meal', 'Talking to a friend or family member']
  },
  {
    id: 'q3',
    question: 'Your go-to comfort food?',
    options: ['Pizza or pasta', 'Traditional home-cooked meal', 'A decadent dessert', 'Something healthy and refreshing']
  },
  {
    id: 'q4',
    question: 'How would you describe your sense of humor?',
    options: ['Sarcastic and witty', 'Silly and goofy', 'Dark and dry', 'Straightforward and classic']
  },
  {
    id: 'q5',
    question: 'What is one skill you are currently learning or want to learn?',
    options: ['A new language', 'Playing an instrument', 'Coding or a technical skill', 'Cooking a new cuisine']
  },
  {
    id: 'q6',
    question: 'Your ideal vacation destination?',
    options: ['A relaxing beach resort', 'An adventurous mountain trek', 'A bustling city with culture', 'A quiet countryside retreat']
  },
  {
    id: 'q7',
    question: 'Are you a morning person or a night owl?',
    options: ['Morning person, up with the sun', 'Night owl, productive after dark', 'I adapt to what’s needed', 'I am more of an afternoon person']
  },
  {
    id: 'q8',
    question: 'How do you stay active?',
    options: ['Going to the gym', 'Yoga or meditation', 'Sports with friends', 'Outdoor activities like hiking']
  },
  {
    id: 'q9',
    question: 'What is a book you would recommend to everyone?',
    options: ['A classic novel', 'A self-help book', 'A sci-fi or fantasy novel', 'A gripping non-fiction book']
  },
  {
    id: 'q10',
    question: 'Your favorite type of music?',
    options: ['Bollywood/Indian Classical', 'Pop or hip-hop', 'Instrumental or folk', 'Classic rock or jazz']
  },
  
  // Values & Personality
  {
    id: 'q11',
    question: 'How do you handle conflict in a relationship?',
    options: ['Address it directly and calmly', 'Talk it through with humor', 'Take some time to cool off', 'Prefer to avoid it and move on']
  },
  {
    id: 'q12',
    question: 'What is most important to you in a partnership?',
    options: ['Mutual respect and trust', 'Shared goals and ambition', 'Constant communication', 'Adventure and fun']
  },
  {
    id: 'q13',
    question: 'Your thoughts on a family-first vs. career-first mindset?',
    options: ['Family is always the priority', 'Career is my main focus right now', 'A healthy balance of both', 'It depends on the situation']
  },
  {
    id: 'q14',
    question: 'What is a value you live by?',
    options: ['Honesty and integrity', 'Kindness and empathy', 'Ambition and drive', 'Simplicity and mindfulness']
  },
  {
    id: 'q15',
    question: 'Your preferred way of showing affection?',
    options: ['Physical touch', 'Words of affirmation', 'Acts of service', 'Giving gifts']
  },
  {
    id: 'q16',
    question: 'What do you consider a successful life?',
    options: ['Achieving career milestones', 'Having a happy family', 'Making a positive impact on others', 'Traveling the world']
  },
  {
    id: 'q17',
    question: 'Your love language?',
    options: ['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch']
  },
  {
    id: 'q18',
    question: 'How important is it to you to share financial responsibilities equally?',
    options: ['Very important, it’s about partnership', 'Somewhat important, we can be flexible', 'Not a big concern, we can work it out', 'I prefer to manage my own finances']
  },
  {
    id: 'q19',
    question: 'What role does spirituality or religion play in your life?',
    options: ['It is a central part of my life', 'I am spiritual but not religious', 'I am still exploring my beliefs', 'It is not a big part of my life']
  },
  {
    id: 'q20',
    question: 'What do you think is a red flag in a relationship?',
    options: ['Lack of communication', 'Disrespectful behavior', 'Financial irresponsibility', 'Not willing to compromise']
  },

  // Future & Ambition
  {
    id: 'q21',
    question: 'Where do you see yourself in five years?',
    options: ['Focused on my career goals', 'Starting a family', 'Exploring a new city or country', 'Learning new skills and growing']
  },
  {
    id: 'q22',
    question: 'How do you approach long-term goals?',
    options: ['With a detailed plan', 'By taking things one step at a time', 'By focusing on the big picture', 'I am flexible and open to change']
  },
  {
    id: 'q23',
    question: 'What is your biggest aspiration in life?',
    options: ['To become a leader in my field', 'To be a successful entrepreneur', 'To raise a happy family', 'To live a life filled with purpose']
  },
  {
    id: 'q24',
    question: 'How important is it to you to have a partner who is also career-driven?',
    options: ['Very important', 'Somewhat important', 'Not a big concern', 'I prefer a partner who is a homemaker']
  },
  {
    id: 'q25',
    question: 'What kind of family environment did you grow up in?',
    options: ['Strict and disciplined', 'Relaxed and easy-going', 'Supportive and encouraging', 'A mix of all three']
  },
  {
    id: 'q26',
    question: 'How do you feel about living in a joint family?',
    options: ['I prefer a joint family', 'I prefer a nuclear family', 'I am open to both', 'It depends on the circumstances']
  },
  {
    id: 'q27',
    question: 'Your view on having children?',
    options: ['I definitely want to have kids', 'I am not sure if I want to have kids', 'I am open to the idea of adoption', 'I do not want to have kids']
  },
  {
    id: 'q28',
    question: 'What are your thoughts on a stay-at-home parent vs. both parents working?',
    options: ['I prefer both parents to work', 'I prefer a stay-at-home parent', 'It depends on the situation', 'We will figure it out together']
  },
  {
    id: 'q29',
    question: 'What is one quality you look for in a life partner?',
    options: ['Kindness', 'Ambition', 'Sense of humor', 'Honesty']
  },
  {
    id: 'q30',
    question: 'What kind of conversations do you enjoy most?',
    options: ['Deep, meaningful conversations', 'Lighthearted, funny conversations', 'Discussions about current events', 'Debates about different ideas']
  },
  
  // Communication & Social
  {
    id: 'q31',
    question: 'How do you prefer to communicate with a partner?',
    options: ['In-person conversations', 'Texting and messaging', 'Video calls', 'A mix of all three']
  },
  {
    id: 'q32',
    question: 'Are you an introvert or an extrovert?',
    options: ['Introvert, I recharge alone', 'Extrovert, I get energy from people', 'Ambivert, a mix of both', 'I am not sure']
  },
  {
    id: 'q33',
    question: 'Your take on social media and privacy?',
    options: ['I am very active on social media', 'I am active but private', 'I have a minimal presence', 'I am not on social media']
  },
  {
    id: 'q34',
    question: 'How important is it to have separate friend circles?',
    options: ['Very important', 'Not a big concern', 'I prefer to have mutual friends', 'A mix of both is ideal']
  },
  {
    id: 'q35',
    question: 'What is a cause you are passionate about?',
    options: ['Environmental protection', 'Animal welfare', 'Education for all', 'Mental health awareness']
  },
  {
    id: 'q36',
    question: 'How do you handle disagreements with friends?',
    options: ['I address it directly', 'I take some time to reflect', 'I am quick to forgive and forget', 'I prefer to let it go']
  },
  {
    id: 'q37',
    question: 'Your preferred way of celebrating a special occasion?',
    options: ['A big party with all friends', 'A quiet dinner for two', 'A weekend getaway', 'A simple get-together at home']
  },
  {
    id: 'q38',
    question: 'How do you feel about making new friends?',
    options: ['I love meeting new people', 'I am shy but open to it', 'I prefer to stick to my close friends', 'I am selective about who I connect with']
  },
  {
    id: 'q39',
    question: 'What is your idea of a perfect date night?',
    options: ['Trying a new restaurant', 'Going for a long walk or drive', 'A movie and popcorn at home', 'An adventurous activity like hiking']
  },
  {
    id: 'q40',
    question: 'How do you show gratitude to others?',
    options: ['With words of thanks', 'By giving gifts', 'By doing something nice for them', 'With a heartfelt gesture']
  },

  // Miscellaneous & Fun
  {
    id: 'q41',
    question: 'What is the most adventurous thing you have ever done?',
    options: ['Skydiving or bungee jumping', 'Hiking a challenging trail', 'Traveled to an unfamiliar place alone', 'Tried a very spicy dish']
  },
  {
    id: 'q42',
    question: 'What is your favorite season and why?',
    options: ['Summer, because of the warm weather', 'Winter, because of the cozy atmosphere', 'Monsoon, because of the rain', 'Spring, because of the flowers']
  },
  {
    id: 'q43',
    question: 'Are you a cat person or a dog person?',
    options: ['Definitely a cat person', 'Definitely a dog person', 'Both!', 'Neither, I am more of a plant person']
  },
  {
    id: 'q44',
    question: 'What is one thing you are most proud of?',
    options: ['My career achievements', 'My personal growth', 'My relationships with family and friends', 'My ability to handle challenges']
  },
  {
    id: 'q45',
    question: 'What is a movie that always makes you laugh?',
    options: ['A classic comedy', 'A slapstick comedy', 'A romantic comedy', 'A dark comedy']
  },
  {
    id: 'q46',
    question: 'What is a skill you would like your partner to have?',
    options: ['Cooking', 'Playing an instrument', 'Being good with kids', 'Being a good listener']
  },
  {
    id: 'q47',
    question: 'What is a pet peeve of yours?',
    options: ['Being late', 'Chewing with an open mouth', 'Leaving a mess behind', 'People who are rude to others']
  },
  {
    id: 'q48',
    question: 'What is your favorite way to spend time alone?',
    options: ['Reading a book', 'Watching a movie', 'Listening to music', 'Just being with my thoughts']
  },
  {
    id: 'q49',
    question: 'How do you feel about long-distance relationships?',
    options: ['I am open to it', 'I am not a fan of it', 'It depends on the situation', 'I would prefer a partner who lives close by']
  },
  {
    id: 'q50',
    question: 'What is the most important lesson you have learned in life?',
    options: ['To be kind to others', 'To never give up on my dreams', 'To be grateful for what I have', 'To always be true to myself']
  },
];

// Ice Breaker Game class
class IceBreakerGame {
  constructor(player1, player2) {
    this.id = uuidv4();
    this.players = {
      [player1.userId]: {
        ...player1,
        answers: {},
        hasRevealed: false
      },
      [player2.userId]: {
        ...player2,
        answers: {},
        hasRevealed: false
      }
    };
    this.questions = this.shuffleQuestions();
    this.currentQuestionIndex = 0;
    this.state = 'waiting'; // waiting, playing, completed
    this.startTime = null;
    this.questionTimer = null;
  }

  shuffleQuestions() {
    const shuffled = [...ICEBREAKER_QUESTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5); // Take 5 questions
  }

  getPlayerIds() {
    return Object.keys(this.players);
  }

  getOtherPlayerId(playerId) {
    return this.getPlayerIds().find(id => id !== playerId);
  }

  submitAnswer(playerId, questionId, answer) {
    if (this.players[playerId]) {
      this.players[playerId].answers[questionId] = answer;
      return true;
    }
    return false;
  }

  bothPlayersAnswered(questionId) {
    const playerIds = this.getPlayerIds();
    return playerIds.every(id => this.players[id].answers[questionId]);
  }

  calculateMatchScore() {
    const playerIds = this.getPlayerIds();
    const [player1Id, player2Id] = playerIds;
    const player1Answers = this.players[player1Id].answers;
    const player2Answers = this.players[player2Id].answers;

    let matches = 0;
    let totalQuestions = this.questions.length;

    this.questions.forEach(question => {
      if (player1Answers[question.id] === player2Answers[question.id]) {
        matches++;
      }
    });

    return Math.round((matches / totalQuestions) * 100);
  }

  canRevealIdentity(matchScore) {
    return matchScore >= 60; // 60% match threshold
  }

  getPlayerInfo(playerId, includePrivate = false) {
    const player = this.players[playerId];
    if (!player) return null;

    return {
      id: playerId,
      name: player.name || player.full_name || 'Anonymous User',
      age: player.age || 25,
      city: player.city || player.location?.city?.name || 'Unknown',
      profile: player.profile || 'https://via.placeholder.com/150'
    };
  }
}

// Matchmaking function
function findIcebreakerMatch(newPlayer) {
  for (let i = 0; i < icebreakerQueue.length; i++) {
    const waitingPlayer = icebreakerQueue[i];
    
    // Check if players are not the same person
    if (waitingPlayer.userId === newPlayer.userId) continue;

    // // Basic matching criteria
    // const cityMatch = !newPlayer.preferences?.city || 
    //                  !waitingPlayer.preferences?.city || 
    //                  newPlayer.preferences.city === waitingPlayer.preferences.city;

    { // every queued player is a candidate (preference matching was never implemented)
      // Remove matched player from queue
      icebreakerQueue.splice(i, 1);
      return waitingPlayer;
    }
  }
  return null;
}

// Helper functions for game flow
function startQuestionTimer(game, io, onlineUsers) {
  game.questionTimer = setTimeout(() => {
    // Auto-advance if time runs out
    if (game.currentQuestionIndex < game.questions.length - 1) {
      game.currentQuestionIndex++;
      handleNextQuestion(game, io, onlineUsers);
    } else {
      endIcebreakerGame(game, io, onlineUsers);
    }
  }, 30000); // 30 seconds per question
}

function handleNextQuestion(game, io, onlineUsers) {
  // Clear existing timer
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
  }

  // Check if this was the last question
  if (game.currentQuestionIndex >= game.questions.length - 1) {
    endIcebreakerGame(game, io, onlineUsers);
    return;
  }

  // Move to next question
  setTimeout(() => {
    game.currentQuestionIndex++;
    
    const playerIds = game.getPlayerIds();
    playerIds.forEach(playerId => {
      const playerSocketId = onlineUsers.get(playerId);
      if (playerSocketId) {
        io.to(playerSocketId).emit('next_question', {
          questionIndex: game.currentQuestionIndex,
          question: game.questions[game.currentQuestionIndex]
        });
      }
    });

    // Start timer for new question
    startQuestionTimer(game, io, onlineUsers);
  }, 2000); // 2 second delay between questions
}

function endIcebreakerGame(game, io, onlineUsers) {
  game.state = 'completed';
  
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
  }

  const matchScore = game.calculateMatchScore();
  const canReveal = game.canRevealIdentity(matchScore);

  const playerIds = game.getPlayerIds();
  playerIds.forEach(playerId => {
    const playerSocketId = onlineUsers.get(playerId);
    if (playerSocketId) {
      const otherPlayerId = game.getOtherPlayerId(playerId);
      let partnerInfo = null;
      
      // If both players revealed or match score is very high, show partner info
      if (canReveal && (game.players[otherPlayerId].hasRevealed || matchScore >= 80)) {
        partnerInfo = game.getPlayerInfo(otherPlayerId, true);
      }

      io.to(playerSocketId).emit('game_results', {
        gameId: game.id,
        matchScore,
        canRevealIdentity: canReveal,
        partnerInfo,
        answers: {
          mine: game.players[playerId].answers,
          partner: game.players[otherPlayerId].answers
        }
      });
    }
  });

  // Clean up game after some time
  setTimeout(() => {
    activeIcebreakerGames.delete(game.id);
  }, 300000); // 5 minutes
}

// Main function to setup Ice Breaker socket events
function setupIcebreakerSocket(socket, io, onlineUsers, User) {
  
  // Join ice breaker game queue
  socket.on('join_icebreaker_queue', async (data) => {
    try {
      console.log('🎮 Player joining ice breaker queue:', data);
      
      const user = await User.findById(data.userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const player = {
        userId: data.userId,
        socketId: socket.id,
        preferences: data.preferences || {},
        name: user.full_name,
        age: user.age,
        city: user.location?.city?.name,
        profile: user.profile,
        joinedAt: new Date()
      };

      // Try to find a match
      const matchedPlayer = findIcebreakerMatch(player);

      if (matchedPlayer) {
        // Create new game
        const game = new IceBreakerGame(player, matchedPlayer);
        activeIcebreakerGames.set(game.id, game);

        // Get socket references
        const player1SocketId = onlineUsers.get(player.userId);
        const player2SocketId = onlineUsers.get(matchedPlayer.userId);

        if (player1SocketId && player2SocketId) {
          // Send game found event
          io.to(player1SocketId).emit('game_found', {
            gameId: game.id,
            partnerId: matchedPlayer.userId,
            questions: game.questions
          });

          io.to(player2SocketId).emit('game_found', {
            gameId: game.id,
            partnerId: player.userId,
            questions: game.questions
          });

          // Start game after short delay
          setTimeout(() => {
            game.state = 'playing';
            game.startTime = new Date();

            io.to(player1SocketId).emit('game_started', {
              gameId: game.id,
              currentQuestion: game.questions[0]
            });

            io.to(player2SocketId).emit('game_started', {
              gameId: game.id,
              currentQuestion: game.questions[0]
            });

            // Start question timer
            startQuestionTimer(game, io, onlineUsers);
          }, 3000);
        }
      } else {
        // Add to queue
        icebreakerQueue.push(player);
        socket.emit('queue_joined', {
          position: icebreakerQueue.length,
          message: 'Looking for a match...'
        });
      }
    } catch (error) {
      console.error('❌ Error in join_icebreaker_queue:', error);
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

  // Submit answer
  socket.on('submit_answer', async (data) => {
    try {
      const { gameId, questionId, answer } = data;
      const game = activeIcebreakerGames.get(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Find player by socket
      const playerId = socket.userId;
      if (!playerId || !game.players[playerId]) {
        socket.emit('error', { message: 'Player not found in game' });
        return;
      }

      // Submit answer
      game.submitAnswer(playerId, questionId, answer);

      // Notify other player that this player answered
      const otherPlayerId = game.getOtherPlayerId(playerId);
      const otherPlayerSocketId = onlineUsers.get(otherPlayerId);
      
      if (otherPlayerSocketId) {
        io.to(otherPlayerSocketId).emit('partner_answered', {
          questionId,
          hasAnswered: true // Don't reveal actual answer
        });
      }

      // Check if both players answered current question
      if (game.bothPlayersAnswered(questionId)) {
        handleNextQuestion(game, io, onlineUsers);
      }
    } catch (error) {
      console.error('❌ Error in submit_answer:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  // Reveal identity
  socket.on('reveal_identity', async (data) => {
    try {
      const { gameId } = data;
      const game = activeIcebreakerGames.get(gameId);
      
      if (!game) return;

      const playerId = socket.userId;
      if (!playerId || !game.players[playerId]) return;

      // Mark player as revealed
      game.players[playerId].hasRevealed = true;

      // Get player info
      const playerInfo = game.getPlayerInfo(playerId, true);

      // Send to other player
      const otherPlayerId = game.getOtherPlayerId(playerId);
      const otherPlayerSocketId = onlineUsers.get(otherPlayerId);
      
      if (otherPlayerSocketId) {
        io.to(otherPlayerSocketId).emit('partner_revealed', {
          partnerInfo: playerInfo
        });
      }
    } catch (error) {
      console.error('❌ Error in reveal_identity:', error);
    }
  });

  // Leave ice breaker queue
  socket.on('leave_icebreaker_queue', () => {
    const userId = socket.userId;
    const queueIndex = icebreakerQueue.findIndex(player => player.userId === userId);
    if (queueIndex !== -1) {
      icebreakerQueue.splice(queueIndex, 1);
      socket.emit('queue_left', { message: 'Left the queue' });
    }
  });

  // Handle ice breaker game disconnection
  socket.on('disconnect', () => {
    const userId = socket.userId;
    
    // Remove from queue if waiting
    const queueIndex = icebreakerQueue.findIndex(player => player.userId === userId);
    if (queueIndex !== -1) {
      icebreakerQueue.splice(queueIndex, 1);
    }

    // Handle active game disconnection
    if (userId) {
      for (const [gameId, game] of activeIcebreakerGames) {
        if (game.players[userId]) {
          const otherPlayerId = game.getOtherPlayerId(userId);
          const otherPlayerSocketId = onlineUsers.get(otherPlayerId);
          
          if (otherPlayerSocketId) {
            io.to(otherPlayerSocketId).emit('partner_disconnected', {
              message: 'Your partner disconnected from the ice breaker game'
            });
          }
          
          // Clean up game
          if (game.questionTimer) {
            clearTimeout(game.questionTimer);
          }
          activeIcebreakerGames.delete(gameId);
          break;
        }
      }
    }
  });
}

// Export the setup function and utilities
module.exports = {
  setupIcebreakerSocket,
  activeIcebreakerGames,
  icebreakerQueue,
  
  // Utility functions for external access
  getIcebreakerStats: () => ({
    activeGames: activeIcebreakerGames.size,
    playersInQueue: icebreakerQueue.length
  }),
  
  // Clean up abandoned games (call this periodically)
  cleanupAbandonedGames: () => {
    const now = new Date();
    for (const [gameId, game] of activeIcebreakerGames) {
      // Remove games older than 1 hour
      if (game.startTime && (now - game.startTime) > 3600000) {
        if (game.questionTimer) {
          clearTimeout(game.questionTimer);
        }
        activeIcebreakerGames.delete(gameId);
        console.log(`🧹 Cleaned up abandoned ice breaker game: ${gameId}`);
      }
    }
  }
};