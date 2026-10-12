/**
 * User Deletion Script
 * 
 * This script deletes users and all their associated data from the database.
 * It handles:
 * - User profile and photos
 * - Friend requests (sent and received)
 * - Messages (sent and received)
 * - Chat rooms
 * - Shortlists
 * - Blocks
 * - Notifications
 * - Activity logs
 * - Reports
 * - Visitor logs
 * - Search logs
 * - Profile view logs
 * - And all other related data
 * 
 * Usage: node deleteUsers.js
 */

const mongoose = require('mongoose');
const { connectDB } = require('./db');

// Import all models
const User = require('./models/User');
const FriendshipRequest = require('./models/FriendShipRequest');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');
const ShortList = require('./models/ShortList');
const Block = require('./models/Block');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');
const UserReport = require('./models/UserReport');
const RecentVisitor = require('./models/RecentVisitor');
const SearchLog = require('./models/SearchLog');
const RemainingProfileImageView = require('./models/RemainingProfileImageView');
const UserPhoto = require('./models/UserPhoto');
const ProfilePicRequest = require('./models/ProfilePicRequest');
const SavedNotification = require('./models/SavedNotification');
const ChatIntentLog = require('./models/ChatIntentLog');
const Room = require('./models/Room');
const RoomUser = require('./models/RoomUser');
const SecondChanceQueue = require('./models/SecondChanceQueue');
const Follow = require('./models/Follow');
// IceBreakerGame model is accessed via mongoose.model('IceBreakerGame') because the file exports managers

// ⚠️ ADD USER IDs TO DELETE HERE ⚠️
const USER_IDS_TO_DELETE = [
 '692c2a259b2a6d4724f3affe',  // Example user ID

  '692c4c62fad58281cc88bbca'
  // '507f191e810c19729de860ea',  // Example user ID
  // Add actual MongoDB ObjectId strings here
];

/**
 * Delete a single user and all associated data
 */
async function deleteUserCompletely(userId) {
  console.log(`\n🗑️  Starting deletion process for user: ${userId}`);
  
  try {
    const objectId = new mongoose.Types.ObjectId(userId);
    
    // Check if user exists
    const user = await User.findById(objectId);
    if (!user) {
      console.log(`⚠️  User ${userId} not found. Skipping...`);
      return { success: false, reason: 'User not found' };
    }
    
    console.log(`📋 Found user: ${user.full_name || user.username || user.email || user.phone}`);
    
    const deletionResults = {};
    
    // 1. Delete User Photos
    console.log('📸 Deleting user photos...');
    const userPhotosResult = await UserPhoto.deleteMany({ user: objectId });
    deletionResults.userPhotos = userPhotosResult.deletedCount;
    
    // 2. Delete Friendship Requests (both sent and received)
    console.log('🤝 Deleting friendship requests...');
    const friendshipResult = await FriendshipRequest.deleteMany({
      $or: [
        { requester: objectId },
        { recipient: objectId }
      ]
    });
    deletionResults.friendshipRequests = friendshipResult.deletedCount;
    
    // 3. Delete Messages (both sent and received)
    console.log('💬 Deleting messages...');
    const messagesResult = await Message.deleteMany({
      $or: [
        { sender: objectId },
        { receiver: objectId }
      ]
    });
    deletionResults.messages = messagesResult.deletedCount;
    
    // 4. Delete Chat Rooms and RoomUsers
    console.log('🏠 Deleting chat rooms...');
    const chatRoomsResult = await ChatRoom.deleteMany({
      participants: objectId
    });
    deletionResults.chatRooms = chatRoomsResult.deletedCount;
    
    const roomUsersResult = await RoomUser.deleteMany({ userId: objectId });
    deletionResults.roomUsers = roomUsersResult.deletedCount;
    
    const roomsResult = await Room.deleteMany({
      participants: objectId
    });
    deletionResults.rooms = roomsResult.deletedCount;
    
    // 5. Delete Shortlists (both created and received)
    console.log('⭐ Deleting shortlists...');
    const shortlistResult = await ShortList.deleteMany({
      $or: [
        { userId: objectId },
        { shortlistedUserId: objectId }
      ]
    });
    deletionResults.shortlists = shortlistResult.deletedCount;
    
    // 6. Delete Blocks (both created and received)
    console.log('🚫 Deleting blocks...');
    const blockResult = await Block.deleteMany({
      $or: [
        { blocker: objectId },
        { blocked: objectId }
      ]
    });
    deletionResults.blocks = blockResult.deletedCount;
    
    // 7. Delete Notifications (both sent and received)
    console.log('🔔 Deleting notifications...');
    const notificationsResult = await Notification.deleteMany({
      $or: [
        { sender: objectId },
        { receiver: objectId }
      ]
    });
    deletionResults.notifications = notificationsResult.deletedCount;
    
    const savedNotificationsResult = await SavedNotification.deleteMany({
      userId: objectId
    });
    deletionResults.savedNotifications = savedNotificationsResult.deletedCount;
    
    // 8. Delete Activity Logs
    console.log('📊 Deleting activity logs...');
    const activityLogsResult = await ActivityLog.deleteMany({ userId: objectId });
    deletionResults.activityLogs = activityLogsResult.deletedCount;
    
    // 9. Delete Reports (both created and received)
    console.log('🚩 Deleting reports...');
    const reportsResult = await UserReport.deleteMany({
      $or: [
        { reportedBy: objectId },
        { reportedUser: objectId }
      ]
    });
    deletionResults.reports = reportsResult.deletedCount;
    
    // 10. Delete Recent Visitors (both as visitor and visited)
    console.log('👀 Deleting visitor logs...');
    const visitorsResult = await RecentVisitor.deleteMany({
      $or: [
        { visitor: objectId },
        { visited: objectId }
      ]
    });
    deletionResults.visitors = visitorsResult.deletedCount;
    
    // 11. Delete Search Logs
    console.log('🔍 Deleting search logs...');
    const searchLogsResult = await SearchLog.deleteMany({ userId: objectId });
    deletionResults.searchLogs = searchLogsResult.deletedCount;
    
    // 12. Delete Profile Image View Logs
    console.log('🖼️  Deleting profile view logs...');
    const profileViewsResult = await RemainingProfileImageView.deleteMany({
      $or: [
        { viewer: objectId },
        { profileOwner: objectId }
      ]
    });
    deletionResults.profileViews = profileViewsResult.deletedCount;
    
    // 13. Delete Profile Picture Requests
    console.log('🖼️  Deleting profile pic requests...');
    const profilePicRequestsResult = await ProfilePicRequest.deleteMany({
      $or: [
        { requester: objectId },
        { requestedUser: objectId }
      ]
    });
    deletionResults.profilePicRequests = profilePicRequestsResult.deletedCount;
    
    // 14. Delete Chat Intent Logs
    console.log('💭 Deleting chat intent logs...');
    const chatIntentLogsResult = await ChatIntentLog.deleteMany({
      $or: [
        { userId: objectId },
        { targetUser: objectId }
      ]
    });
    deletionResults.chatIntentLogs = chatIntentLogsResult.deletedCount;
    
    // 15. Delete Second Chance Queue entries
    console.log('🔄 Deleting second chance queue entries...');
    const secondChanceResult = await SecondChanceQueue.deleteMany({
      $or: [
        { userId: objectId },
        { profileId: objectId }
      ]
    });
    deletionResults.secondChanceQueue = secondChanceResult.deletedCount;
    
    // 16. Delete Follow/Following relationships
    console.log('👥 Deleting follow relationships...');
    const followResult = await Follow.deleteMany({
      $or: [
        { my_user_id: objectId },
        { user_id: objectId }
      ]
    });
    deletionResults.follows = followResult.deletedCount;
    
    // 17. Delete Ice Breaker Games
    console.log('🎮 Deleting ice breaker games...');
    // Access the model directly since IceBreakerGame.js exports managers, not the model
    require('./models/IceBreakerGame'); // Ensure model is registered
    const IceBreakerGameModel = mongoose.model('IceBreakerGame');
    const iceBreakerResult = await IceBreakerGameModel.deleteMany({
      $or: [
        { player1: objectId },
        { player2: objectId }
      ]
    });
    deletionResults.iceBreakerGames = iceBreakerResult.deletedCount;
    
    // 18. Remove user from other users' blocked arrays
    console.log('🔒 Removing from blocked arrays...');
    const blockedArrayResult = await User.updateMany(
      { blocked: objectId },
      { $pull: { blocked: objectId } }
    );
    deletionResults.blockedArraysUpdated = blockedArrayResult.modifiedCount;
    
    // 19. Finally, delete the user
    console.log('👤 Deleting user account...');
    const userResult = await User.findByIdAndDelete(objectId);
    deletionResults.user = userResult ? 1 : 0;
    
    // Summary
    console.log('\n✅ Deletion Summary:');
    console.log('═══════════════════════════════════════');
    Object.entries(deletionResults).forEach(([key, count]) => {
      console.log(`   ${key.padEnd(25)}: ${count}`);
    });
    console.log('═══════════════════════════════════════');
    
    const totalRecords = Object.values(deletionResults).reduce((sum, count) => sum + count, 0);
    console.log(`\n🎯 Total records deleted: ${totalRecords}`);
    
    return { success: true, deletionResults, totalRecords };
    
  } catch (error) {
    console.error(`❌ Error deleting user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     USER DELETION SCRIPT - BANJARA MATCH      ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  if (USER_IDS_TO_DELETE.length === 0) {
    console.log('⚠️  WARNING: No user IDs specified!');
    console.log('📝 Please add user IDs to the USER_IDS_TO_DELETE array.');
    console.log('\nExample:');
    console.log('const USER_IDS_TO_DELETE = [');
    console.log('  "507f1f77bcf86cd799439011",');
    console.log('  "507f191e810c19729de860ea"');
    console.log('];\n');
    process.exit(0);
  }
  
  console.log(`📋 Users to delete: ${USER_IDS_TO_DELETE.length}`);
  console.log('⚠️  This action is IRREVERSIBLE!\n');
  
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');
    
    const results = [];
    
    // Process each user
    for (let i = 0; i < USER_IDS_TO_DELETE.length; i++) {
      const userId = USER_IDS_TO_DELETE[i];
      console.log(`\n[${i + 1}/${USER_IDS_TO_DELETE.length}] Processing user: ${userId}`);
      console.log('─'.repeat(50));
      
      const result = await deleteUserCompletely(userId);
      results.push({ userId, ...result });
      
      // Wait a bit between deletions to avoid overwhelming the DB
      if (i < USER_IDS_TO_DELETE.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Final summary
    console.log('\n\n╔═══════════════════════════════════════════════╗');
    console.log('║            FINAL DELETION SUMMARY             ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successfully deleted: ${successful} user(s)`);
    console.log(`❌ Failed: ${failed} user(s)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed deletions:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.userId}: ${r.reason || r.error}`);
      });
    }
    
    const totalRecordsDeleted = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.totalRecords || 0), 0);
    
    console.log(`\n🎯 Total database records deleted: ${totalRecordsDeleted}`);
    console.log('\n✅ Deletion process completed!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Connection closed');
    process.exit(0);
  }
}

// Run the script
main();
