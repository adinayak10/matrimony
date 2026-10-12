// Admin User Management Controller
const User = require('../../models/User');
const UserPhoto = require('../../models/UserPhoto');
const FriendshipRequest = require('../../models/FriendShipRequest');
const Message = require('../../models/Message');
const Notification = require('../../models/Notification');
const bcrypt = require('bcryptjs');
const admin = require('../../firebase'); // Firebase Admin SDK
const sendNotification = require('../../util/sendNotification');
const { sendProfileVerifiedEmail } = require('../../services/emailService');

/**
 * Get all users with filtering and pagination
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      gender,
      status,
      verified,
      registration_platform,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (gender) query.gender = gender;
    if (registration_platform) query.last_login_platform = registration_platform;
    if (status === 'blocked') query.is_block = 1;
    if (status === 'active') query.is_block = 0;
    if (verified === 'true') query.is_verified = 1;
    if (verified === 'false') query.is_verified = 0;

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -device_token')
      .populate('qualification profession caste gotra incomeRange interests membershipPlan')
      .populate('location.country location.state location.city')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Add platform label for better readability
    const usersWithPlatform = users.map(user => ({
      ...user,
      platform_label: user.last_login_platform === 'mobile' ? '📱 Mobile' : '🌐 Web'
    }));

    res.json({
      status: true,
      data: usersWithPlatform,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get single user by ID with full details
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('qualification profession caste gotra incomeRange interests membershipPlan')
      .populate('location.country location.state location.city')
      .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
      .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession')
      .lean();

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Get user photos
    const photos = await UserPhoto.find({ user: id });

    // Get user stats
    const [sentRequests, receivedRequests, sentMessages, receivedMessages] = await Promise.all([
      FriendshipRequest.countDocuments({ from: id }),
      FriendshipRequest.countDocuments({ to: id }),
      Message.countDocuments({ sender: id }),
      Message.countDocuments({ receiver: id })
    ]);

    res.json({
      status: true,
      data: {
        ...user,
        platform_label: user.registration_platform === 'mobile' ? '📱 Mobile' : '🌐 Web',
        photos,
        stats: {
          sentRequests,
          receivedRequests,
          sentMessages,
          receivedMessages
        }
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Update user details
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Update User Request:', { id, updates });

    // Don't allow password update through this endpoint
    delete updates.password;
    delete updates.role; // Protect role changes

    // ✅ Fix: Remove empty phone/email to avoid duplicate key error on sparse unique index
    // Setting to null causes duplicate key error when multiple users have null phone/email
    if (updates.phone === '' || updates.phone === null || updates.phone === undefined) {
      delete updates.phone;
    }
    if (updates.email === '' || updates.email === null || updates.email === undefined) {
      delete updates.email;
    }

    console.log('🔧 Cleaned Update Data:', { id, updates });

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('qualification profession caste gotra incomeRange interests membershipPlan')
    .populate('location.country location.state location.city')
    .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
    .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession');

    console.log('✅ Updated User:', user ? { id: user._id, gender: user.gender, full_name: user.full_name } : 'NOT FOUND');

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    res.json({
      status: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Block/Unblock user
 */
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { block, reason } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    user.is_block = block ? 1 : 0;
    if (block && reason) {
      user.block_reason = reason;
    }
    
    await user.save();

    res.json({
      status: true,
      message: block ? 'User blocked successfully' : 'User unblocked successfully',
      data: { is_block: user.is_block }
    });
  } catch (error) {
    console.error('Toggle block user error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Verify/Unverify user
 */
exports.toggleVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { verify } = req.body;

    console.log('🔔 [VERIFY USER] Request received:', { 
      userId: id, 
      action: verify ? 'VERIFY' : 'UNVERIFY' 
    });

    const user = await User.findById(id);
    
    if (!user) {
      console.log('❌ [VERIFY USER] User not found:', id);
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    console.log('👤 [VERIFY USER] User details:', {
      id: user._id,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      currentStatus: user.is_verified ? 'VERIFIED' : 'UNVERIFIED',
      hasDeviceToken: !!user.device_token,
      deviceToken: user.device_token ? `${user.device_token.substring(0, 20)}...` : 'NONE'
    });

    user.is_verified = verify ? 1 : 0;
    await user.save();
    
    console.log('✅ [VERIFY USER] User status updated to:', user.is_verified ? 'VERIFIED' : 'UNVERIFIED');

    // ✅ Send push notification when user is verified
    if (verify) {
      console.log('📲 [NOTIFICATION] Attempting to send verification notification...');
      
      if (user.device_token) {
        const title = '✅ Profile Verified';
        const body = 'Congratulations! Your profile has been verified by our team.';
        const notificationData = {
          type: 'profile_verified',
          userId: user._id.toString()
        };
        
        console.log('📤 [NOTIFICATION] Notification payload:', {
          to: user.full_name,
          deviceToken: `${user.device_token.substring(0, 20)}...`,
          title,
          body,
          data: notificationData
        });
        
        try {
          console.log('⏳ [NOTIFICATION] Sending push notification via Firebase...');
          await sendNotification(user.device_token, title, body, notificationData);
          console.log('✅ [NOTIFICATION] Push notification sent successfully!');
          
          // Save notification in database
          console.log('💾 [NOTIFICATION] Saving notification to database...');
          const savedNotification = await Notification.create({
            type: 'profile_updated',
            toUser: user._id,
            content: body,
            data: {
              verified: true,
              timestamp: new Date()
            }
          });
          console.log('✅ [NOTIFICATION] Database notification saved:', savedNotification._id);
          
          console.log(`🎉 [VERIFY USER] Verification complete with notification for ${user.full_name}`);
        } catch (notifError) {
          console.error('❌ [NOTIFICATION] Error sending verification notification:', {
            error: notifError.message,
            code: notifError.code,
            stack: notifError.stack,
            userId: user._id,
            userName: user.full_name
          });
          // Don't fail the request if notification fails
        }
      } else {
        console.log('⚠️ [NOTIFICATION] Skipped - User has no device token:', {
          userId: user._id,
          userName: user.full_name,
          email: user.email
        });
      }

      // ✅ Send verification email (runs regardless of device token)
      if (user.email) {
        try {
          await sendProfileVerifiedEmail({ full_name: user.full_name, email: user.email });
          console.log(`📧 [EMAIL] Verification email sent to ${user.email}`);
        } catch (emailErr) {
          console.error('❌ [EMAIL] Failed to send verification email:', emailErr.message);
        }
      }
    } else {
      console.log('ℹ️ [VERIFY USER] User unverified - no notification sent');
    }

    res.json({
      status: true,
      message: verify ? 'User verified successfully' : 'User unverified',
      data: { is_verified: user.is_verified }
    });
  } catch (error) {
    console.error('❌ [VERIFY USER] Error:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.id
    });
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Delete user permanently
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting user:', id);

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Import all models that reference User
    const mongoose = require('mongoose');
    const Block = require('../../models/Block');
    const Follow = require('../../models/Follow');
    const ShortList = require('../../models/ShortList');
    const ActivityLog = require('../../models/ActivityLog');
    const Notification = require('../../models/Notification');
    const SavedNotification = require('../../models/SavedNotification');
    const UserReport = require('../../models/UserReport');
    const ReportStatus = require('../../models/ReportStatus');
    const ProfilePicRequest = require('../../models/ProfilePicRequest');
    const RecentVisitor = require('../../models/RecentVisitor');
    const SecondChanceQueue = require('../../models/SecondChanceQueue');
    const ChatIntentLog = require('../../models/ChatIntentLog');
    const RoomUser = require('../../models/RoomUser');
    const ChatRoom = require('../../models/ChatRoom');
    const RemainingProfileImageView = require('../../models/RemainingProfileImageView');
    

    console.log('🧹 Cleaning up related data for user:', user.full_name);

    // Delete all related data in parallel with error handling
    const deletions = [
      { name: 'UserPhoto', fn: () => UserPhoto.deleteMany({ userId: id }) },
      { name: 'FriendshipRequest', fn: () => FriendshipRequest.deleteMany({ $or: [{ requester: id }, { recipient: id }] }) },
      { name: 'Message', fn: () => Message.deleteMany({ $or: [{ sender: id }, { receiver: id }] }) },
      { name: 'Block', fn: () => Block.deleteMany({ $or: [{ blocker: id }, { blocked: id }] }) },
      { name: 'Follow', fn: () => Follow.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] }) },
      { name: 'ShortList', fn: () => ShortList.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] }) },
      { name: 'ActivityLog', fn: () => ActivityLog.deleteMany({ userId: id }) },
      { name: 'Notification', fn: () => Notification.deleteMany({ $or: [{ sender_id: id }, { receiver_id: id }] }) },
      { name: 'SavedNotification', fn: () => SavedNotification.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] }) },
      { name: 'UserReport', fn: () => UserReport.deleteMany({ $or: [{ reportedBy: id }, { reportedUser: id }] }) },
      { name: 'ReportStatus', fn: () => ReportStatus.deleteMany({ $or: [{ reportedBy: id }, { reportedUser: id }] }) },
      { name: 'ProfilePicRequest', fn: () => ProfilePicRequest.deleteMany({ $or: [{ requester: id }, { requestedUser: id }] }) },
      { name: 'RecentVisitor', fn: () => RecentVisitor.deleteMany({ $or: [{ visitor: id }, { visited: id }] }) },
      { name: 'SecondChanceQueue', fn: () => SecondChanceQueue.deleteMany({ $or: [{ userId: id }, { profileId: id }] }) },
 
      { name: 'ChatIntentLog', fn: () => ChatIntentLog.deleteMany({ $or: [{ userId: id }, { targetUser: id }] }) },
      { name: 'RoomUser', fn: () => RoomUser.deleteMany({ $or: [{ user_id: id }, { invited_by: id }] }) },
      { name: 'ChatRoom', fn: () => ChatRoom.deleteMany({ participants: id }) },
      { name: 'RemainingProfileImageView', fn: () => RemainingProfileImageView.deleteMany({ userId: id }) }
    ];

    const deleteResults = await Promise.allSettled(deletions.map(d => d.fn()));

    // Log results
    let successCount = 0;
    let failCount = 0;
    deleteResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        failCount++;
        console.error(`❌ Failed to delete ${deletions[index].name}:`, result.reason.message);
      } else {
        successCount++;
        console.log(`✅ Deleted ${deletions[index].name}: ${result.value.deletedCount} records`);
      }
    });

    console.log(`📊 Deletion summary: ${successCount} successful, ${failCount} failed`);

    // Delete user from Firebase Authentication if they have a firebase_uid
    if (user.firebase_uid) {
      try {
        console.log('🔥 Attempting to delete user from Firebase Auth:', user.firebase_uid);
        await admin.auth().deleteUser(user.firebase_uid);
        console.log('✅ User deleted from Firebase Authentication');
      } catch (firebaseError) {
        // If user doesn't exist in Firebase, log but continue
        if (firebaseError.code === 'auth/user-not-found') {
          console.log('ℹ️ User not found in Firebase (already deleted or never existed)');
        } else {
          console.error('⚠️ Firebase deletion failed:', firebaseError.message);
        }
        // Don't fail the entire operation if Firebase deletion fails
      }
    } else {
      console.log('ℹ️ User has no firebase_uid, skipping Firebase deletion');
    }

    // Finally delete the user from MongoDB
    await User.findByIdAndDelete(id);

    console.log('✅ User and all related data deleted successfully');

    res.json({
      status: true,
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Reset user password
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        status: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      status: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get user activity logs
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const ActivityLog = require('../../models/ActivityLog');

    const activities = await ActivityLog.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      status: true,
      data: activities
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Read-only: list of users this user has blocked (admin visibility only —
 * blocking itself is user-initiated via the app, admins can't create blocks).
 */
exports.getUserBlocks = async (req, res) => {
  try {
    const { id } = req.params;
    const Block = require('../../models/Block');

    const blocks = await Block.find({ blocker: id })
      .populate('blocked', 'full_name email profile is_block')
      .sort('-createdAt')
      .lean();

    res.json({
      status: true,
      data: blocks
    });
  } catch (error) {
    console.error('Get user blocks error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};
