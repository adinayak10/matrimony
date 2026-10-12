    // WhatsApp-style Messaging with Offline Delivery Handling and Unique Room Fix
    const ChatRoom = require('./models/ChatRoom');
    const Message = require('./models/Message');
    const User = require('./models/User');
    const Notification = require('./models/Notification')
    const ActivityLog = require('./models/ActivityLog')
    const lazyIO = new Proxy({}, {
  get(_, prop) {
    if (!ioInstance) throw new Error('Socket.io not initialized');
    const v = ioInstance[prop];
    return typeof v === 'function' ? v.bind(ioInstance) : v;
  },
});
let ioInstance = null;
    const onlineUsers = new Map();

// Import Ice Breaker Game Module
const { setupIcebreakerSocket, getIcebreakerStats, cleanupAbandonedGames } = require('./gamesocket');



  const FriendShipRequest = require('./models/FriendShipRequest');
  const CallLog = require('./models/CallLog');






    module.exports = {
      setupSocket: (io) => {



    // Set up cleanup interval for abandoned ice breaker games
    setInterval(() => {
      cleanupAbandonedGames();
    }, 300000); // Clean up every 5 minutes



        ioInstance = io;

        // your full socket.on('connection', ...) logic
        io.on('connection', (socket) => {


          
        
        
              console.log('✅ Socket connected:', socket.id);

        socket.on('join', async (userId) => {
          try {
            console.log(`User ${userId} joined with socket ID: ${socket.id}`);

            // Save socket mapping
            onlineUsers.set(userId, socket.id);
            socket.userId = userId;

            // Mark user online
            await User.findByIdAndUpdate(userId, {
              isOnline: true,
              lastSeen: null,
            });

            // Emit unread notification count
            const totalUnread = await Notification.countDocuments({
              toUser: userId,
              isRead: false,
            });
            io.to(socket.id).emit('notification_count', { total: totalUnread });


            // Log activity
            await ActivityLog.create({
              userId,
              timestamp: new Date(),
            });

            // Notify other users
            socket.broadcast.emit('user_online', { userId });

            // 🚀 Deliver undelivered messages
            const undeliveredMessages = await Message.find({
              receiver: userId,
              status: 'sent',
            });

            for (const msg of undeliveredMessages) {
              io.to(socket.id).emit('receive_message', msg);
              await Message.findByIdAndUpdate(msg._id, { status: 'delivered' });

              const senderSocketId = onlineUsers.get(msg.sender.toString());
              if (senderSocketId) {
                io.to(senderSocketId).emit('message_delivered', { messageId: msg._id });
              }
            }

            // 🔍 AI Match Radar: high_match_online
            const currentUser = await User.findById(userId)
              .populate('location.city')
              .populate('location.state')
              .populate('location.country');

            if (!currentUser?.coordinates) return;

            for (let [otherUserId, otherSocketId] of onlineUsers.entries()) {
              if (otherUserId === userId) continue;

              const otherUser = await User.findById(otherUserId)
                .populate('location.city')
                .populate('location.state')
                .populate('location.country');

              if (!otherUser?.coordinates) continue;

              const score = calculateCompatibility(currentUser, otherUser);
              const distance = calculateDistance(currentUser.coordinates, otherUser.coordinates); // km

              if (score >= 85 && distance <= 50) {
                // Notify other user
                io.to(otherSocketId).emit('high_match_online', {
                  userId: currentUser._id,
                  name: currentUser.full_name,
                  score,
                  distance,
                  profile: currentUser.profile,
                });

                // Notify current user
                io.to(socket.id).emit('high_match_online', {
                  userId: otherUser._id,
                  name: otherUser.full_name,
                  score,
                  distance,
                  profile: otherUser.profile,
                });
              }
            }

          } catch (error) {
            console.error(`❌ Error in socket join for user ${userId}:`, error);
          }
        });


             // 🎮 Setup Ice Breaker Game Socket Events
      setupIcebreakerSocket(socket, io, onlineUsers, User);


        // Send message
  socket.on('send_message', async (data) => {
    const { senderId, receiverId, content, type = 'text' } = data;
    if (!content && type === 'text') return;


if(detectSensitiveContentAdvanced(content)){
  return
}


    const sortedParticipants = [senderId, receiverId].sort();

    // 🔍 Find or create chat room
    let room = await ChatRoom.findOne({
      participants: { $all: sortedParticipants, $size: 2 },
      isGroup: false,
    });

    if (!room) {
      room = await ChatRoom.create({
        participants: sortedParticipants,
        isGroup: false,
        status: 'pending',
      });
    }

    // ✅ Save message to MongoDB
    const message = await Message.create({
      room: room._id,
      sender: senderId,
      receiver: receiverId,
      content,
      type,
      status: 'sent',
      timestamp: new Date(),
    });

    await message.populate('sender', 'full_name profile');

    // ✅ ACK to sender
    const senderSocket = onlineUsers.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit('message_sent', message);
    }

    // 📤 Deliver to receiver if online
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive_message', message);

      // Mark as delivered
      await Message.findByIdAndUpdate(message._id, { status: 'delivered' });

      // Notify sender it's delivered
      if (senderSocket) {
        io.to(senderSocket).emit('message_delivered', { messageId: message._id });
      }

      // 🔁 🔔 Send updated unread chatroom count to receiver
      const rooms = await ChatRoom.find({
        participants: receiverId,
        status: 'accepted',
      }).select('_id');

      let unreadRoomCount = 0;

      for (let r of rooms) {
        const hasUnread = await Message.exists({
          room: r._id,
          receiver: receiverId,
          status: { $in: ['sent', 'delivered'] },
        });
        if (hasUnread) unreadRoomCount++;
      }

      io.to(receiverSocket).emit('unread_chatroom_count_update', {
        total: unreadRoomCount,
      });
    }
  });


  socket.on('mark_seen', async ({ roomId, receiverId }) => {
    console.log("🔵 Marking messages as seen...");

    const updated = await Message.updateMany(
      { room: roomId, receiver: receiverId, status: { $ne: 'seen' } },
      { status: 'seen' }
    );

    if (updated.modifiedCount > 0) {
      const seenMessages = await Message.find({
        room: roomId,
        receiver: receiverId,
        status: 'seen',
      });

      seenMessages.forEach((msg) => {
        const senderSocket = onlineUsers.get(msg.sender.toString());
        if (senderSocket) {
          io.to(senderSocket).emit('message_seen', {
            messageId: msg._id,
            roomId: roomId,
          });
        }
      });
    }

    // 🔁 🔔 Emit updated unread chatroom count
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      const rooms = await ChatRoom.find({
        participants: receiverId,
        status: 'accepted',
      }).select('_id');

      let unreadRoomCount = 0;

      for (let r of rooms) {
        const hasUnread = await Message.exists({
          room: r._id,
          receiver: receiverId,
          status: { $in: ['sent', 'delivered'] },
        });
        if (hasUnread) unreadRoomCount++;
      }

      io.to(receiverSocket).emit('unread_chatroom_count_update', {
        total: unreadRoomCount,
      });
    }
  });



        socket.on('typing', ({ toUserId, fromUserId }) => {
          const toSocket = onlineUsers.get(toUserId);
          if (toSocket) io.to(toSocket).emit('user_typing', { fromUserId });
        });

        socket.on('stop_typing', ({ toUserId, fromUserId }) => {
          const toSocket = onlineUsers.get(toUserId);
          if (toSocket) io.to(toSocket).emit('user_stop_typing', { fromUserId });
        });

    // Accept chat
    socket.on('accept_chat', async ({ roomId }) => {
      const room = await ChatRoom.findByIdAndUpdate(roomId, { status: 'accepted' }, { new: true });
      if (!room) return;

      // Identify accepting user and other participant
      const acceptedBy = socket.userId;
      const toNotifyUsers = room.participants.filter(u => u.toString() !== acceptedBy);

      // Notify other participants
      for (const userId of toNotifyUsers) {
        const userSocket = onlineUsers.get(userId.toString());

        if (userSocket) {
          io.to(userSocket).emit('chat_accepted', { roomId });
        }

        // Save Notification in DB
      var x= await Notification.create({
          type: 'chat_accepted',
          fromUser: acceptedBy,
          toUser: userId,
          content: `Your chat request has been accepted.`,
          data: { roomId },
        });
        
      }
    });

    // Decline chat
    socket.on('decline_chat', async ({ roomId }) => {
      const room = await ChatRoom.findByIdAndUpdate(roomId, { status: 'declined' }, { new: true });
      if (!room) return;

      const declinedBy = socket.userId;
      const toNotifyUsers = room.participants.filter(u => u.toString() !== declinedBy);

      for (const userId of toNotifyUsers) {
        const userSocket = onlineUsers.get(userId.toString());

        if (userSocket) {
          io.to(userSocket).emit('chat_declined', { roomId });
        }

        // Save Notification in DB
        await Notification.create({
          type: 'chat_declined',
          fromUser: declinedBy,
          toUser: userId,
          content: `Your chat request has been declined.`,
          data: { roomId },
        });
      }
    });



    // 🔔 Notification Count
    socket.on('get_notification_count', async (userId) => {
      try {
        const total = await Notification.countDocuments({
          toUser: userId,
          isRead: false,
        });

        io.to(socket.id).emit('notification_count', { total });
      } catch (err) {
        console.error('❌ Error in get_notification_count:', err);
      }
    });

    // ❤️ Match Request Count
    socket.on('get_match_request_count', async (userId) => {
      try {
        const total = await FriendShipRequest.countDocuments({
          recipient: userId,
          status: 'pending',
        });

        io.to(socket.id).emit('new_match_request', { total });
      } catch (err) {
        console.error('❌ Error in get_match_request_count:', err);
      }
    });

    // 💬 Unread Chat Count (by unique rooms)
    socket.on('get_unread_chat_count', async (userId) => {
      try {
        const rooms = await Message.aggregate([
          { $match: { receiver: userId, status: 'sent' } },
          { $group: { _id: "$roomId" } }
        ]);

        io.to(socket.id).emit('chat_update', { total: rooms.length });
      } catch (err) {
        console.error('❌ Error in get_unread_chat_count:', err);
      }
    });



    

  socket.on('get_unread_chatroom_count', async (userId) => {
    try {
      // Step 1: Get rooms user is part of and accepted
      const rooms = await ChatRoom.find({
        participants: userId,
        status: 'accepted',
      }).select('_id');

      let unreadRoomCount = 0;

      // Step 2: For each room, check if there's any unread message
      for (let room of rooms) {
        const hasUnread = await Message.exists({
          room: room._id,
          receiver: userId,
          status: { $in: ['sent', 'delivered'] }, // Not yet seen
        });

        if (hasUnread) unreadRoomCount++;
      }

      // Step 3: Emit count
      io.to(socket.id).emit('unread_chatroom_count_update', {
        total: unreadRoomCount,
      });
    } catch (err) {
      console.error('❌ Error in get_unread_chatroom_count:', err);
      io.to(socket.id).emit('unread_chatroom_count_update', { total: 0 });
    }
  });



        // 🎮 Get Ice Breaker Game Statistics
      socket.on('get_icebreaker_stats', () => {
        try {
          const stats = getIcebreakerStats();
          io.to(socket.id).emit('icebreaker_stats', stats);
        } catch (err) {
          console.error('❌ Error in get_icebreaker_stats:', err);
          io.to(socket.id).emit('icebreaker_stats', { activeGames: 0, playersInQueue: 0 });
        }
      });

      // ── Voice/video call signaling (Agora) ──────────────────────
      // Non-negotiable gate: only initiable between users with an accepted
      // ChatRoom (same mutual-connection check the token-minting HTTP
      // endpoint enforces server-side) — never between strangers.
      socket.on('call_invite', async ({ toUserId, roomId, callType }) => {
        try {
          const fromUserId = socket.userId;
          if (!fromUserId || !toUserId || !roomId) return;

          const room = await ChatRoom.findOne({ _id: roomId, status: 'accepted', participants: { $all: [fromUserId, toUserId] } });
          if (!room) {
            io.to(socket.id).emit('call_failed', { reason: 'Calls are only available between mutually accepted connections' });
            return;
          }

          const channelName = `call_${[fromUserId, toUserId].sort().join('_')}_${Date.now()}`;
          const call = await CallLog.create({
            caller: fromUserId,
            callee: toUserId,
            chatRoom: roomId,
            channelName,
            callType: callType === 'video' ? 'video' : 'audio',
            status: 'ringing',
          });

          const fromUser = await User.findById(fromUserId).select('full_name profile');
          const calleeSocket = onlineUsers.get(toUserId.toString());

          if (calleeSocket) {
            io.to(calleeSocket).emit('call_incoming', {
              callId: call._id,
              roomId,
              channelName,
              callType: call.callType,
              fromUserId,
              fromUserName: fromUser?.full_name || 'Someone',
              fromUserProfile: fromUser?.profile || null,
            });
          } else {
            call.status = 'missed';
            call.endedAt = new Date();
            await call.save();
            io.to(socket.id).emit('call_failed', { reason: 'User is not online right now' });
          }
        } catch (err) {
          console.error('❌ Error in call_invite:', err);
          io.to(socket.id).emit('call_failed', { reason: 'Server error starting the call' });
        }
      });

      socket.on('call_accept', async ({ callId }) => {
        try {
          const call = await CallLog.findByIdAndUpdate(callId, { status: 'accepted' }, { new: true });
          if (!call) return;
          const callerSocket = onlineUsers.get(call.caller.toString());
          if (callerSocket) {
            io.to(callerSocket).emit('call_accepted', { callId: call._id, channelName: call.channelName });
          }
        } catch (err) {
          console.error('❌ Error in call_accept:', err);
        }
      });

      socket.on('call_reject', async ({ callId }) => {
        try {
          const call = await CallLog.findByIdAndUpdate(callId, { status: 'rejected', endedAt: new Date() }, { new: true });
          if (!call) return;
          const callerSocket = onlineUsers.get(call.caller.toString());
          if (callerSocket) {
            io.to(callerSocket).emit('call_rejected', { callId: call._id });
          }
        } catch (err) {
          console.error('❌ Error in call_reject:', err);
        }
      });

      socket.on('call_end', async ({ callId }) => {
        try {
          const call = await CallLog.findById(callId);
          if (!call) return;
          if (call.status !== 'rejected' && call.status !== 'missed') {
            call.status = 'ended';
          }
          call.endedAt = new Date();
          await call.save();

          const enderId = socket.userId;
          const otherUserId = call.caller.toString() === enderId ? call.callee.toString() : call.caller.toString();
          const otherSocket = onlineUsers.get(otherUserId);
          if (otherSocket) {
            io.to(otherSocket).emit('call_end', { callId: call._id });
          }
        } catch (err) {
          console.error('❌ Error in call_end:', err);
        }
      });


        socket.on('disconnect', async () => {
          const userId = socket.userId;
          if (userId) {
            onlineUsers.delete(userId);
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
            });
            socket.broadcast.emit('user_offline', {
              userId,
              lastSeen: new Date(),
            });
          }
        });



          
        });
      },
      // Controllers capture `io` at require time, before setupSocket() has run
      // (and tests never run it): hand out a lazy proxy that resolves the real
      // instance on first use instead of throwing at module load.
      getIO: () => ioInstance || lazyIO,
      onlineUsers, // optional: export this too
    };




    function detectSensitiveContentAdvanced(message) {
      if (!message || typeof message !== 'string') return false;

      const original = message.toLowerCase();
      const normalized = original
        .replace(/[\s\-_.]/g, '')                      // remove symbols/space
        .replace(/zero/g, '0').replace(/one/g, '1')    // convert spelled numbers
        .replace(/two/g, '2').replace(/three/g, '3')
        .replace(/four/g, '4').replace(/five/g, '5')
        .replace(/six/g, '6').replace(/seven/g, '7')
        .replace(/eight/g, '8').replace(/nine/g, '9');

      let score = 0;

      // 1. Phone number detection
      const phonePattern = /(?:\+91)?\d{10,12}/g;
      if (phonePattern.test(normalized)) score += 3;

      // 2. Email
      if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(original)) score += 3;

      // 3. Handle detection
      if (/[@#][a-z0-9_.]{3,}/.test(original)) score += 2;

      // 4. Link detection (even obfuscated)
      const obfuscatedLink = /(insta|fb|tme|wa|dotme|linkdin|snap)(dot|\.|\s)?(com)?/.test(original);
      if (obfuscatedLink) score += 3;

      // 5. Keywords and app hints
      const behaviorHints = [
        "text me", "ping me", "call me", "connect on", "whatsapp",
        "my number", "my insta", "my handle", "reach me", "you know where",
        "blue app", "green app", "chat me", "find me", "message me"
      ];
      behaviorHints.forEach(hint => {
        if (original.includes(hint)) score += 2;
      });

      // 6. Social platform codewords or URLs
      const keywords = [
        "instagram", "facebook", "telegram", "snapchat", "linkedin", "twitter",
        "ig", "fb", "t.me", "wa.me", "wame", "linkdin", "discord", "skype"
      ];
      keywords.forEach(kw => {
        if (original.includes(kw)) score += 3;
      });

      // 7. Emojis (📞, 📲, 📧, 💬)
      const emojiHints = ["📞", "📲", "📧", "💬", "🟦", "🟢", "📱"];
      emojiHints.forEach(e => {
        if (original.includes(e)) score += 2;
      });

      // 8. Suspicious digit sequences even without +91
      const digits = normalized.replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 12) score += 2;

      // 9. Spelling tricks ("watsapp", "t dot me")
      if (/t\s?dot\s?me|watsapp|link\s?din|ig\s?dot\s?com/.test(original)) score += 2;

      // 🚨 Final cutoff
      return score >= 5;
    }



    function calculateCompatibility(userA, userB) {
      let score = 0;

      if (userA.gender !== userB.gender) score += 20;
      if (userA.age && userB.age && Math.abs(userA.age - userB.age) <= 5) score += 15;
      if (userA.height === userB.height) score += 10;
      if (userA.maritalStatus === userB.maritalStatus) score += 10;
      if (userA.profession === userB.profession) score += 10;
      if (userA.income && userB.income && Math.abs(userA.income - userB.income) < 50000) score += 5;
      if (userA.location.city?.toString() === userB.location.city?.toString()) score += 15;

      return Math.min(score, 100); // Max 100
    }


    function calculateDistance(coord1, coord2) {
      if (!coord1 || !coord2) return 999;
      const [lat1, lon1] = coord1.coordinates;
      const [lat2, lon2] = coord2.coordinates;

      const R = 6371; // Radius of Earth in km
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }
