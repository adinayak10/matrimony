const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const upload = require('../middleware/upload');

const { authenticate, selfOnly } = require('../middleware/identity');
const { adminAuth } = require('../middleware/adminAuth');
const rl = require('../middleware/rateLimits');
const validateImages = require('../middleware/validateImages');

// Every route below needs a logged-in user (A1.2). Public lookups live in
// routes/publicLookupRoutes.js, which app.js mounts BEFORE this router.
// The guard only fires for paths this router defines, so an unknown /api/*
// path (e.g. the deleted /user/fake-batch) still falls through to the 404.
let ownPaths = null;
router.use(function authenticateOwnRoutes(req, res, next) {
  if (!ownPaths) {
    ownPaths = new Set(router.stack.filter((l) => l.route).map((l) => l.route.path));
  }
  return ownPaths.has(req.path) ? authenticate(req, res, next) : next();
});

// Profile management
router.post('/editProfile', upload.uploadProfileImages, validateImages, selfOnly('user_id'), UserController.editProfile);
router.post('/checkUsername', UserController.checkUsername);
router.post('/fetchProfile', UserController.fetchProfile);
router.post('/deleteUser', selfOnly('user_id'), UserController.deleteUser);


// Block/unblock
router.post('/UserBlockedByUser', UserController.blockUser);
router.post('/UserUnblockedByUser', UserController.unblockUser);
router.post('/fetchBlockedUserList', UserController.fetchBlockedUserList);

// Random/filtered profiles
router.post('/fetchRandomProfile', UserController.fetchRandomProfile);
router.post('/fetchUsersList', UserController.fetchUsersListWithFilters);

// Shortlist
router.post('/toggleShortlist', UserController.toggleShortlist);
router.post('/getShortListedUsers', UserController.fetchShortlistedUsers);

// Membership — admin-only (assigns a plan directly, no payment involved)
router.post('/assignMembership', adminAuth, UserController.assignMembership);

// Connections (was "friend" before)
router.post('/sendInterestRequest', rl.interestLimiter, UserController.sendInterestRequest);
router.post('/acceptInterestRequest', UserController.acceptInterestRequest);
router.post('/rejectInterestRequest', UserController.rejectInterestRequest);
router.post('/cancelInterestRequest', UserController.cancelInterestRequest);
router.post('/removeConnection', UserController.removeConnection);

// Reporting & privacy
router.post('/reportUser', rl.reportLimiter, UserController.reportUser);
router.post('/updateContactPrivacy', UserController.updateContactPrivacy);

router.post('/profilePicRequest', UserController.profilePicRequest);

// Rooms/Chat
router.post('/fetchUserRooms', UserController.fetchUserRooms);
router.post('/fetchPendingRooms', UserController.fetchPendingRooms);
router.post('/fetchMessages', UserController.fetchMessages);
router.post('/fetchOrGenerateRoom', UserController.fetchOrGenerateRoom);

// Notifications & Visitors
router.post('/fetchUserNotification', UserController.fetchUserNotification);
router.post('/getProfileVisitorSummary', UserController.getProfileVisitorSummary);

// Followers
router.post('/fetchFollowersList', UserController.fetchFollowersList);
router.post('/fetchFollowingList', UserController.fetchFollowingList);

router.post('/getInterestList', UserController.getInterestList);

router.post('/fetchTrendingProfiles', UserController.fetchTrendingProfiles);
router.post('/fetchNearbyMatches', UserController.fetchNearbyMatches);
router.post('/getTopDailyMatches', UserController.getTopDailyMatches);

router.post('/fetchHighlightedUsers', UserController.fetchHighlightedUsers);
router.post('/getMarriageIntent', UserController.getMarriageIntent);
router.post('/getUserOnlinePattern', UserController.getUserOnlinePattern);
router.post('/getMatchMomentum', UserController.getMatchMomentum);

// Photos
router.post('/uploadUserPhotos', upload.uploadUserPhotos, validateImages, UserController.uploadUserPhotos);
router.post('/getUserPhotos', UserController.getUserPhotos);
router.post('/markNotificationsRead', UserController.markNotificationsRead);

router.post('/reorderUserPhotos', UserController.reorderUserPhotos);
router.post('/deleteUserPhoto', UserController.deleteUserPhoto);

router.post('/comparePreferencesFit', UserController.comparePreferencesFit);
router.post('/deleteRoom', UserController.deleteRoom);
router.post('/searchProfiles', UserController.searchProfiles);

router.post('/fetchLiveActivity', UserController.fetchLiveActivity);

router.post('/setMainProfileImage', UserController.setMainProfileImage);

module.exports = router;
