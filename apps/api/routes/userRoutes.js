const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const upload = require('../middleware/upload');

const { authenticate } = require('../middleware/authMiddleware');
const { adminAuth } = require('../middleware/adminAuth');


// Profile management
router.post('/editProfile',  upload.uploadProfileImages, UserController.editProfile);
router.post('/checkUsername', UserController.checkUsername);
router.post('/fetchProfile',authenticate, UserController.fetchProfile);
router.post('/deleteUser',  UserController.deleteUser);


// Block/unblock
router.post('/UserBlockedByUser', UserController.blockUser);
router.post('/UserUnblockedByUser', UserController.unblockUser);
router.post('/fetchBlockedUserList', UserController.fetchBlockedUserList);

// Random/filtered profiles
router.post('/fetchRandomProfile',  UserController.fetchRandomProfile);
router.post('/fetchUsersList',  UserController.fetchUsersListWithFilters);

// Shortlist
router.post('/toggleShortlist',  UserController.toggleShortlist);
router.post('/getShortListedUsers',  UserController.fetchShortlistedUsers);

// Membership — admin-only (assigns a plan directly, no payment involved)
router.post('/assignMembership', adminAuth, UserController.assignMembership);

// Connections (was "friend" before)
router.post('/sendInterestRequest',  UserController.sendInterestRequest);          // renamed
router.post('/acceptInterestRequest', UserController.acceptInterestRequest);              // renamedd
router.post('/rejectInterestRequest', UserController.rejectInterestRequest);              // renamed
router.post('/cancelInterestRequest', UserController.cancelInterestRequest);              // renamed
router.post('/removeConnection', UserController.removeConnection);                            // renamed

// Reporting & privacy
router.post('/reportUser', UserController.reportUser);
router.post('/fetchReportReasons', UserController.fetchReportReasons);
router.post('/updateContactPrivacy', UserController.updateContactPrivacy);



router.post('/profilePicRequest', UserController.profilePicRequest);

// Gotra/Caste/Clan
router.post('/fetchGotraList', UserController.fetchGotraList);
router.post('/fetchCasteList', UserController.fetchCasteList);
router.get('/fetchClanList', UserController.fetchClanList);
router.post('/fetchClanList', UserController.fetchClanList);
router.get('/fetchSurnameTitleList', UserController.fetchSurnameTitleList);
router.post('/fetchSurnameTitleList', UserController.fetchSurnameTitleList);

// Rooms/Chat
router.post('/fetchUserRooms',  UserController.fetchUserRooms);
router.post('/fetchPendingRooms',  UserController.fetchPendingRooms);
router.post('/fetchMessages',  UserController.fetchMessages);
router.post('/fetchOrGenerateRoom',  UserController.fetchOrGenerateRoom);

// Notifications & Visitors
router.post('/fetchUserNotification',  UserController.fetchUserNotification);
router.post('/getProfileVisitorSummary',  UserController.getProfileVisitorSummary);

// Followers
router.post('/fetchFollowersList',  UserController.fetchFollowersList);
router.post('/fetchFollowingList',  UserController.fetchFollowingList);

// Location APIs
router.post('/countries',  UserController.countries);
router.post('/states',  UserController.states);
router.post('/cities',  UserController.cities);

router.post('/getInterestList',  UserController.getInterestList);


router.post('/fetchTrendingProfiles',  UserController.fetchTrendingProfiles);
router.post('/fetchNearbyMatches',  UserController.fetchNearbyMatches);
router.post('/getTopDailyMatches',  UserController.getTopDailyMatches);



// Admin APIs
router.post('/banner/add',  UserController.addBanner);
router.post('/user/fake-batch', UserController.createFakeBatch);
router.post('/user/mark-top', UserController.maekusertop);
router.post('/user/unmark-top', UserController.unmarkTopUser);

router.post('/fetchBanner', UserController.fetchBanner);
router.post('/fetchHighlightedUsers', UserController.fetchHighlightedUsers);
router.post('/getMarriageIntent', UserController.getMarriageIntent);
router.post('/getUserOnlinePattern', UserController.getUserOnlinePattern);
router.post('/getMatchMomentum', UserController.getMatchMomentum);


router.post('/uploadUserPhotos', upload.uploadUserPhotos, UserController.uploadUserPhotos);
router.post('/getUserPhotos', UserController.getUserPhotos);
router.post('/markNotificationsRead', UserController.markNotificationsRead);


router.post('/reorderUserPhotos', UserController.reorderUserPhotos);
router.post('/deleteUserPhoto', UserController.deleteUserPhoto);

router.post('/fetchProfessionList', UserController.fetchProfessionList);

router.post('/fetchQualificationList', UserController.fetchQualificationList);
router.post('/fetchIncomeRange', UserController.fetchIncomeRange);
router.post('/comparePreferencesFit', UserController.comparePreferencesFit);
router.post('/deleteRoom', UserController.deleteRoom);
router.post('/searchProfiles', UserController.searchProfiles);

router.post('/fetchLiveActivity', UserController.fetchLiveActivity);


router.post('/setMainProfileImage', UserController.setMainProfileImage);

// Ice Breaker Game Stats
router.get('/getIcebreakerStats', (req, res) => {
  try {
    const { getIcebreakerStats } = require('../gamesocket');
    const stats = getIcebreakerStats();
    res.json({ 
      status: true, 
      data: {
        activeGames: stats.activeGames,
        queuedPlayers: stats.playersInQueue
      }
    });
  } catch (error) {
    console.error('Error getting ice breaker stats:', error);
    res.json({ status: false, message: 'Error getting stats', data: { activeGames: 0, queuedPlayers: 0 } });
  }
});




module.exports = router;
