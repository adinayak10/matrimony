// icebreaker.js - Ice Breaker Game Module
//
// A5.5: identity comes from socket.userId (never data.userId); the queue
// only pairs opposite genders that are not blocked either way and not
// banned; the partner is shown as an alias until identities are revealed.
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const blocks = require('./services/blocks');
const { oppositeGender } = require('./services/matchQuery');
const icebreakerQuestions = require('./services/icebreakerQuestions');

const ALIAS_ADJECTIVES = ['Curious', 'Gentle', 'Bright', 'Calm', 'Witty', 'Kind', 'Brave', 'Cheerful', 'Quiet', 'Sunny'];
const ALIAS_NOUNS = ['Peacock', 'Lotus', 'Falcon', 'Banyan', 'River', 'Comet', 'Marigold', 'Tiger', 'Sparrow', 'Monsoon'];
function makeAlias() {
  const a = ALIAS_ADJECTIVES[crypto.randomInt(ALIAS_ADJECTIVES.length)];
  const n = ALIAS_NOUNS[crypto.randomInt(ALIAS_NOUNS.length)];
  return `${a} ${n} ${crypto.randomInt(10, 99)}`;
}

// In-memory storage (consider moving to Redis for production)
const icebreakerQueue = [];
const activeIcebreakerGames = new Map();

// Questions come from the DB bank (services/icebreakerQuestions.js): 5-min cache,
// falls back to the built-in defaults when fewer than 5 are active.

// Ice Breaker Game class
class IceBreakerGame {
  constructor(player1, player2, questionPool = []) {
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
    this.questions = this.shuffleQuestions(questionPool);
    this.currentQuestionIndex = 0;
    this.state = 'waiting'; // waiting, playing, completed
    this.startTime = null;
    this.questionTimer = null;
  }

  shuffleQuestions(pool) {
    const shuffled = (Array.isArray(pool) && pool.length ? pool : icebreakerQuestions.DEFAULT_QUESTIONS).map((q) => ({
      id: q.id,
      question: q.question,
      options: [...q.options],
    }));
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

    if (!includePrivate) {
      // Alias only (A5.5): nothing that identifies the member before reveal
      return { alias: player.alias, revealed: false };
    }

    return {
      id: playerId,
      alias: player.alias,
      revealed: true,
      name: player.name || player.full_name || 'Anonymous User',
      age: player.age || null,
      city: player.city || player.location?.city?.name || 'Unknown',
      profile: player.profile || null
    };
  }
}

// Matchmaking (A5.5): opposite gender, not blocked either way, not banned.
// Resolves to { player, questions } so the caller builds the game from the
// current question bank (loaded before scanning, so the splice below is never
// separated from game creation by an await).
async function findIcebreakerMatch(newPlayer) {
  const wanted = oppositeGender(newPlayer.gender);
  if (!wanted) return null;
  const questions = await icebreakerQuestions.getQuestions();
  for (let i = 0; i < icebreakerQueue.length; i++) {
    const waitingPlayer = icebreakerQueue[i];

    if (waitingPlayer.userId === newPlayer.userId) continue;
    if (waitingPlayer.gender !== wanted) continue;
    if (waitingPlayer.is_block === 1) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await blocks.isBlockedEither(newPlayer.userId, waitingPlayer.userId)) continue;

    // the queue may have changed while awaiting: re-locate before splicing
    const idx = icebreakerQueue.indexOf(waitingPlayer);
    if (idx === -1) continue;
    icebreakerQueue.splice(idx, 1);
    return { player: waitingPlayer, questions };
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
      
      // Identity only when the partner chose to reveal; otherwise the alias
      if (canReveal && game.players[otherPlayerId].hasRevealed) {
        partnerInfo = game.getPlayerInfo(otherPlayerId, true);
      } else {
        partnerInfo = game.getPlayerInfo(otherPlayerId, false);
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
      const userId = socket.userId; // identity from the handshake / legacy join only
      if (!userId) {
        socket.emit('error', { message: 'Please sign in to play' });
        return;
      }

      const user = await User.findById(userId).select('full_name dob gender is_block profile location').populate('location.city', 'name').lean();
      if (!user || user.is_block === 1) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      if (!oppositeGender(user.gender)) {
        socket.emit('error', { message: 'Set your gender to play the ice breaker game' });
        return;
      }
      // one queue entry per user
      const already = icebreakerQueue.findIndex((p) => p.userId === userId);
      if (already !== -1) icebreakerQueue.splice(already, 1);

      const player = {
        userId,
        socketId: socket.id,
        preferences: (data && data.preferences) || {},
        name: user.full_name,
        age: user.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
        gender: user.gender,
        is_block: user.is_block,
        city: user.location?.city?.name,
        profile: user.profile,
        alias: makeAlias(),
        joinedAt: new Date()
      };

      // Try to find a match
      const match = await findIcebreakerMatch(player);
      const matchedPlayer = match ? match.player : null;

      if (matchedPlayer) {
        // Create new game
        const game = new IceBreakerGame(player, matchedPlayer, match.questions);
        activeIcebreakerGames.set(game.id, game);

        // Get socket references
        const player1SocketId = onlineUsers.get(player.userId);
        const player2SocketId = onlineUsers.get(matchedPlayer.userId);

        if (player1SocketId && player2SocketId) {
          // Send game found event — alias instead of partnerId until reveal (A5.5)
          io.to(player1SocketId).emit('game_found', {
            gameId: game.id,
            partner: { alias: matchedPlayer.alias },
            questions: game.questions
          });

          io.to(player2SocketId).emit('game_found', {
            gameId: game.id,
            partner: { alias: player.alias },
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
          alias: player.alias,
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
      // Reveal only after the game ended with a qualifying score
      if (game.state !== 'completed' || !game.canRevealIdentity(game.calculateMatchScore())) {
        socket.emit('error', { message: 'Identity can be revealed only after a 60%+ match' });
        return;
      }

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