  const User = require('../models/User');
  const ChatRoom = require('../models/ChatRoom');
  const Message = require('../models/Message');
  const Shortlist = require('../models/ShortList'); // Import the Shortlist model
  const ActivityLog = require('../models/ActivityLog'); // Import the Shortlist model


  const Qualification = require('../models/Qualification'); // Import the Shortlist model

  const Profession = require('../models/Profession'); // Import the Shortlist model

  const SearchLog = require('../models/SearchLog');
  const { getIO, onlineUsers } = require('../socket');

  const io = getIO();

  const sendNotification = require('../util/sendNotification');
  const { sendInterestRequestEmail, sendInterestAcceptedEmail, sendProfileViewEmail, sendShortlistEmail } = require('../services/emailService');

  // Accept Friend Request
  const Notification = require('../models/Notification');



  const fs = require("fs");
  const path = require("path");

  // Helper function to apply privacy settings to user profiles
  const applyPrivacySettings = (profile, viewerId) => {
    // Don't hide data if viewing own profile
    if (profile._id && viewerId && profile._id.toString() === viewerId.toString()) {
      return profile;
    }
    
    // Apply privacy settings if they exist
    if (profile.settings) {
      // Hide email if emailVisibility is 'private'
      if (profile.settings.emailVisibility === 'private') {
        profile.email = null;
      }
      
      // Hide phone if mobileVisibility is 'private'
      if (profile.settings.mobileVisibility === 'private') {
        profile.phone = null;
      }
    }
    
    return profile;
  };

// Update Contact Privacy Settings
exports.updateContactPrivacy = async (req, res) => {
  try {
    const { user_id, field, value } = req.body;

    if (!user_id || !field || !value) {
      return res.status(400).json({
        status: false,
        message: 'user_id, field, and value are required'
      });
    }

    // Validate field
    const validFields = ['emailVisibility', 'mobileVisibility'];
    if (!validFields.includes(field)) {
      return res.status(400).json({
        status: false,
        message: `Invalid field. Must be one of: ${validFields.join(', ')}`
      });
    }

    // Validate value
    const validValues = ['public', 'private'];
    if (!validValues.includes(value)) {
      return res.status(400).json({
        status: false,
        message: `Invalid value. Must be one of: ${validValues.join(', ')}`
      });
    }

    // Update the specific privacy field
    const updateField = `settings.${field}`;
    const user = await User.findByIdAndUpdate(
      user_id,
      { $set: { [updateField]: value } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: true,
      message: 'Privacy setting updated successfully',
      data: {
        emailVisibility: user.settings.emailVisibility,
        mobileVisibility: user.settings.mobileVisibility
      }
    });
  } catch (error) {
    console.error('Error in updateContactPrivacy:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};










  // Edit Profile

  exports.editProfile = async (req, res) => {
    try {
      const {
        user_id,
        username,
        bio,
        full_name,
        interest_ids,
        block_user_ids,
        marital_status,
        is_push_notifications,
        is_invited_to_room,
        is_verified,
        device_token,
        age,
        height,
        dob,
        family,
        gender,
        membership,
        city_id,
          casteId,
            gotraId,
        coordinates,
  qualification,
  profession,
  income_range,
  smoke,drink,diet,
  spiritualBelief,
  livingWithFamily,

        preferences,
        location,
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ status: false, message: 'User ID is required' });
      }

      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User Not Found' });
      }


      if (req.body.coordinates && typeof req.body.coordinates === 'object') {


    const { lat, lng } = req.body.coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      user.coordinates = {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
    }
  }



























  



  // Handle settings - can be object or JSON string from Flutter
  if (req.body.settings) {
    let settings = req.body.settings;
    
    // If it's a string, parse it
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
        console.log('✅ Parsed settings from string:', settings);
      } catch (e) {
        console.error('❌ Error parsing settings JSON:', e);
        return res.status(400).json({ 
          status: false, 
          message: 'Invalid settings JSON format' 
        });
      }
    }
    
    // Merge settings
    if (typeof settings === 'object' && settings !== null) {
      user.settings = {
        ...user.settings,
        ...settings
      };
      console.log('✅ Settings merged:', user.settings);
    }
  }

      // Horoscope fields (Guna Milan compatibility inputs) — all optional.
      // Sent as a JSON string from the multipart form (same pattern as
      // `settings` below, since multer doesn't parse bracket-notation keys).
      if (req.body.horoscope) {
        let horoscopeInput = req.body.horoscope;
        if (typeof horoscopeInput === 'string') {
          try {
            horoscopeInput = JSON.parse(horoscopeInput);
          } catch (e) {
            horoscopeInput = null;
          }
        }
        if (horoscopeInput && typeof horoscopeInput === 'object') {
          user.horoscope = {
            ...(user.horoscope?.toObject ? user.horoscope.toObject() : (user.horoscope || {})),
            ...horoscopeInput
          };
        }
      }
      if (req.body.manglikStatus) user.manglikStatus = req.body.manglikStatus;

      // ✅ Fix: Convert empty phone to null to avoid duplicate key error
      if (req.body.phone !== undefined) {
        user.phone = req.body.phone === '' ? null : req.body.phone;
      }
      if (req.body.email !== undefined) {
        user.email = req.body.email === '' ? null : req.body.email;
      }

      if (username) user.username = username;
      if (bio) user.bio = bio;
      if (full_name) user.full_name = full_name;
      if (age !== undefined) user.age = Number(age);
      if (gender) user.gender = gender;
      if (dob) user.dob = dob;
      if (city_id) user.city_id = city_id;
      if (membership) user.membershipPlan = membership;
          if (spiritualBelief) user.spiritualBelief = spiritualBelief;
              if (livingWithFamily) user.livingWithFamily = livingWithFamily;
  if (qualification) user.qualification = qualification;
  if (profession) user.profession = profession;
    if (smoke) user.smoke = smoke;

    if (drink) user.drink = drink;
      if (diet) user.diet = diet;
  if (income_range) user.incomeRange = income_range;

         // Correct height update with type checking
        if (height !== undefined) {
            // Assumes height is sent as a number (cm) from the client
            const heightValue = Number(height);
            if (!isNaN(heightValue)) {
                user.height = heightValue;
            } else {
                return res.status(400).json({ status: false, message: 'Height must be a valid number' });
            }
        }
        if (casteId) user.caste = casteId;
          if (gotraId) user.gotra = gotraId;
  if (marital_status) user.maritalStatus = marital_status;
      // ✅ Auto-populate location
      if (location) {
        if (location.city) {
          const city = await City.findById(location.city).populate({
            path: 'state',
            populate: { path: 'country' }
          });

          if (!city) {
            return res.status(400).json({ status: false, message: 'Invalid city ID' });
          }

          user.location.city = city._id;
          if (city.state) {
            user.location.state = city.state._id;
            if (city.state.country) {
              user.location.country = city.state.country._id;
            }
          }
        } else {
          if (location.state) user.location.state = location.state;
          if (location.country) user.location.country = location.country;
        }
      }

      if (interest_ids) {
        user.interests = Array.isArray(interest_ids)
          ? interest_ids
          : interest_ids.split(',');
      }

      if (is_push_notifications !== undefined)
        user.is_push_notifications = Boolean(is_push_notifications);
      if (is_invited_to_room !== undefined)
        user.is_invited_to_room = Boolean(is_invited_to_room);
      if (is_verified !== undefined) user.is_verified = Boolean(is_verified);
      if (device_token) user.device_token = device_token;

      if (block_user_ids && Array.isArray(block_user_ids)) {
        user.blocked = block_user_ids;
      }






      if (family) {



        user.family = {
          father: {
            profession: family?.father?.profession || null,
            isAlive: family?.father?.isAlive ?? true
          },
          mother: {
            profession: family?.mother?.profession || null,
            isAlive: family?.mother?.isAlive ?? true
          },
          familyType: family.familyType || null,
          familyStatus: family.familyStatus || null,
          incomeRange: family.incomeRange || null,
          basedOut: {
            country: family.basedOut?.country || null,
            state: family.basedOut?.state || null,
            city: family.basedOut?.city || null
          },
          brothers: {
            total: family.brothers?.total ?? 0,
            married: family.brothers?.married ?? 0,
            elder: family.brothers?.elder ?? 0,
            younger: family.brothers?.younger ?? 0,
            passedAway: family.brothers?.passedAway ?? 0,
          },
          sisters: {
            total: family.sisters?.total ?? 0,
            married: family.sisters?.married ?? 0,
            elder: family.sisters?.elder ?? 0,
            younger: family.sisters?.younger ?? 0,
            passedAway: family.sisters?.passedAway ?? 0,
          }
        };
      }




      // ✅ Save preference info
  if (preferences) {
    const {
      caste, gotra, subCasteId,
      height_range, age_range,
      religion, location,
      marital_status, qualification, income, profession,
      smoking, drinking, children,
      diet, bodyType, complexion, manglik, personalValue,
      familyValueId,
      residenceCountryId, preferredCountryId, preferredStateId,
      language, general
    } = preferences;


    user.preferences = user.preferences || {};
    console.log('Preferences:', preferences);

  
    // 🔢 Age Range
    if (age_range !== undefined) {
      if (!age_range.min || !age_range.max) {
        return res.status(400).json({ status: false, message: 'Both min and max required in age_range' });
      }
      user.preferences.age_range = {
        min: Number(age_range.min),
        max: Number(age_range.max),
      };
    }

    // 📏 Height Range
    if (height_range !== undefined) {
      if (!height_range.min || !height_range.max) {
        return res.status(400).json({ status: false, message: 'Both min and max required in height_range' });
      }
      user.preferences.height_range = {
        min: height_range.min,
        max: height_range.max,
      };
    }

    // 🔗 Castes
    if (caste !== undefined) {
      if (!Array.isArray(caste)) {
        return res.status(400).json({ status: false, message: 'Caste must be array' });
      }
      user.preferences.caste = caste;
    }

    if (gotra !== undefined) {
      if (!Array.isArray(gotra)) {
        return res.status(400).json({ status: false, message: 'Gotra must be array' });
      }
      user.preferences.gotra = gotra;
    }




      // 🔗 Qualification
    if (qualification !== undefined) {
      if (!Array.isArray(qualification)) {
        return res.status(400).json({ status: false, message: 'Caste must be array' });
      }
      user.preferences.qualification = qualification;
    }



      // 🔗 Profession
    if (profession !== undefined) {
      if (!Array.isArray(profession)) {
        return res.status(400).json({ status: false, message: 'Caste must be array' });
      }
      user.preferences.profession = profession;
    }


    if (subCasteId !== undefined) user.preferences.subCasteId = subCasteId;

    // 🌍 Location & Residence
    if (religion !== undefined) user.preferences.religion = religion;
    if (location !== undefined) user.preferences.location = location;
    if (residenceCountryId !== undefined) user.preferences.residenceCountryId = residenceCountryId;
    if (preferredCountryId !== undefined) user.preferences.preferredCountryId = preferredCountryId;
    if (preferredStateId !== undefined) user.preferences.preferredStateId = preferredStateId;

    // 👤 Personal
    if (marital_status !== undefined) user.preferences.marital_status = marital_status;
    if (children !== undefined) user.preferences.children = Boolean(children);

    if (income !== undefined && income !== '') user.preferences.income = Number(income);

    // 💬 Language
    if (language !== undefined) user.preferences.language = language;

    // 🧘 Lifestyle
    if (smoking !== undefined) user.preferences.smoking = Boolean(smoking);
    if (drinking !== undefined) user.preferences.drinking = Boolean(drinking);
    if (diet !== undefined) user.preferences.diet = diet;

    // 🧬 Culture & Values
    if (bodyType !== undefined) user.preferences.bodyType = bodyType;
    if (complexion !== undefined) user.preferences.complexion = complexion;
    if (manglik !== undefined) user.preferences.manglik = manglik;
    if (personalValue !== undefined) user.preferences.personalValue = personalValue;
    if (familyValueId !== undefined) user.preferences.familyValueId = familyValueId;

    // 🗣️ Notes
    if (general !== undefined) user.preferences.general = general;

  }



      if (req.files) {
        if (req.files.profile?.length) {
          user.profile = req.files.profile[0].path;
        }
        if (req.files.background_image?.length) {
          user.background_image = req.files.background_image[0].path;
        }

        // ✅ After image updates, notify recent visitors
        const recentVisitors = await RecentVisitor.find({ visited: user._id })
          .populate('visitor', 'device_token full_name');

        const notificationText = `${user.full_name} has updated their profile. Check out what's new!`;

        for (const visit of recentVisitors) {
          const visitor = visit.visitor;

          // Skip if visitor was deleted or doesn't exist
          if (!visitor) continue;

          // Send Push Notification if token exists
          if (visitor.device_token) {
            await sendNotification(
              visitor.device_token,
              'Profile Updated',
              notificationText
            );
          }

          // Save Notification in DB
          await Notification.create({
            type: 'profile_updated',
            fromUser: user._id,
            toUser: visitor._id,
            content: notificationText,
            data: {
              userId: user._id,
              full_name: user.full_name,
              profile: user.profile,
            }
          });
        }
      }


      await user.save();


      let updatedUser = await User.findById(user_id)
        .populate('interests')
        .populate('caste')
        .populate('gotra')
        .populate('location.country')
        .populate('location.state')
        .populate('location.city')
        .populate('location')
        .populate('family.basedOut.city')
        .populate('family.basedOut.state')
        .populate('family.basedOut.country')
        .populate('incomeRange')
        .populate('profession')
        .populate('qualification')
        .populate('preferences.qualification')
        .populate('preferences.profession')
        .populate('preferences.gotra')
        .populate('preferences.caste')
        .lean(); // So we can modify the object directly

      // --- Profile Completion Logic (from fetchProfile) ---
      function getValueByPath(obj, path) {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
      }
      const requiredFields = [
        { key: 'full_name', label: 'your full name' },
        { key: 'dob', label: 'your date of birth' },
        { key: 'gender', label: 'your gender' },
        { key: 'height', label: 'your height' },
        { key: 'maritalStatus', label: 'your marital status' },
        { key: 'location.country', label: 'your country' },
        { key: 'location.state', label: 'your state' },
        { key: 'location.city', label: 'your city' },
        { key: 'profession', label: 'your profession' },
        { key: 'qualification', label: 'your qualification' },
        { key: 'profile', label: 'your profile photo' },
      ];
      const missingFields = requiredFields.filter(field => {
        const val = getValueByPath(updatedUser, field.key);
        if (field.key === 'height') {
          return typeof val !== 'number' || val <= 0;
        }
        if (Array.isArray(val)) {
          return val.length === 0;
        }
        return !val || val === '' || val === 'Not specified';
      }).map(f => f.label);
      const completionPercentage = Math.round(
        ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
      );
      const profileSuggestions = [
        field => `Hey! Just adding ${field} can make your profile stand out more.`,
        field => `Profiles with ${field} tend to get more attention. Just saying 😉`,
        field => `Let others know more about you by filling in ${field}.`,
      ];
      const profileCompletionSuggestion = missingFields.length > 0
        ? profileSuggestions[Math.floor(Math.random() * profileSuggestions.length)](missingFields[0])
        : `Your profile is complete! You're ready to shine 🌟`;
      updatedUser.profileCompletion = {
        percentage: completionPercentage,
        missingFields,
        suggestion: profileCompletionSuggestion,
      };

      return res.status(200).json({
        status: true,
        message: 'User Updated Successfully',
        data: updatedUser,
      });

    } catch (error) {
      console.error('Error in editProfile:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal Server Error',
        error: error.message,
      });
    }
  };


  // Route to check username availability
  exports.checkUsername = async (req, res) => {
    try {
      const { username } = req.body;

      // Find user by username
      const user = await User.findOne({ username });

      if (!user) {
        return res.json({
          status: true,
          message: 'Username is available',
        });
      } else {
        return res.json({
          status: false,
          message: 'Username is not available',
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: 'Internal Server Error',
      });
    }
  };







  const ReportStatus = require('../models/ReportStatus'); // Import ReportStatus model


  // API to handle Report Status
  exports.reportStatus = async (req, res) => {
    try {
      const { user_id, reported_user_id, status } = req.body;

      // Validate required fields
      if (!user_id || !reported_user_id || status === undefined) {
        return res.status(400).json({ status: false, message: 'user_id, reported_user_id, and status are required' });
      }

      // Check if the user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User Not Found' });
      }

      // Check if the reported user exists
      const reportedUser = await User.findById(reported_user_id);
      if (!reportedUser) {
        return res.status(404).json({ status: false, message: 'Reported User Not Found' });
      }

      // Check if a report already exists between these users
      const existingReport = await ReportStatus.findOne({ reporter: user_id, reportedUser: reported_user_id });

      if (existingReport) {
        // If report already exists, update the status
        existingReport.status = status;
        await existingReport.save();
        return res.status(200).json({
          status: true,
          message: 'Report status updated successfully',
          data: existingReport,
        });
      }

      // Create a new report entry
      const newReport = new ReportStatus({
        reporter: user_id,
        reportedUser: reported_user_id,
        status: status,
      });

      await newReport.save();
      return res.status(200).json({
        status: true,
        message: 'Report status created successfully',
        data: newReport,
      });
    } catch (error) {
      console.error('Error in reportStatus:', error);
      return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
  };






  const ProfilePicRequest = require('../models/ProfilePicRequest'); // Import ProfilePicRequest model


  // API to handle Profile Picture Request
  exports.profilePicRequest = async (req, res) => {
    try {
      const { user_id, requested_user_id, status } = req.body;

      // Validate required fields
      if (!user_id || !requested_user_id || status === undefined) {
        return res.status(400).json({ status: false, message: 'user_id, requested_user_id, and status are required' });
      }

      // Check if the user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User Not Found' });
      }

      // Check if the requested user exists
      const requestedUser = await User.findById(requested_user_id);
      if (!requestedUser) {
        return res.status(404).json({ status: false, message: 'Requested User Not Found' });
      }

      // Check if a request already exists between these users
      const existingRequest = await ProfilePicRequest.findOne({ requester: user_id, requestedUser: requested_user_id });

      if (existingRequest) {
        // If request already exists, update the status
        existingRequest.status = status;
        await existingRequest.save();
        return res.status(200).json({
          status: true,
          message: 'Profile picture request status updated successfully',
          data: existingRequest,
        });
      }

      // Create a new profile picture request entry
      const newRequest = new ProfilePicRequest({
        requester: user_id,
        requestedUser: requested_user_id,
        status: status,
      });

      await newRequest.save();
      return res.status(200).json({
        status: true,
        message: 'Profile picture request created successfully',
        data: newRequest,
      });
    } catch (error) {
      console.error('Error in profilePicRequest:', error);
      return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
  };






  const RemainingProfileImageView = require('../models/RemainingProfileImageView'); // Import RemainingProfileImageView model









  exports.fetchRandomProfile =  async (req, res) => {
    try {
      // Validate incoming request
      const { my_user_id, user_id } = req.body;

      



    
    
        // Validation logic
        if (!my_user_id) {
          return res.status(400).json({ status: false, message: 'my_user_id is required' });
      }
    

      

      const myUserId = req.body.my_user_id;

      // Fetch the current user
      const user = await User.findById(myUserId).populate('membershipPlan');



      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      const blockUserIds = user.blocked || [];
    

        // Extract the interest titles
        const interestTitles = user.interests.map((interest) => interest._id);

        // Convert the array of titles to a comma-separated string
        const interests = interestTitles.join(", ");
    
        
      
  
      if (interests && interests.length > 0) {
        const interestIds = interests.split(",");
    
        
        
        shuffleArray(interestIds); // Shuffle interest IDs
    

      

        let randomUser = null;

        for (const interestId of interestIds) {
        
          
          
          randomUser = await User.findOne({
            _id: { $nin: blockUserIds, $ne: myUserId }, // Exclude blocked and self IDs
            is_block: false,
        //   interest_ids: { $regex: new RegExp(`\\b${interestId}\\b`) }, // Find interest in `interest_ids` (comma-separated string)
          }).populate('interests').populate('location.country').populate('location.state').populate('location.city').populate('caste').populate('gotra')        .populate('preferences.gotra')
          .populate('family.basedOut.city')
          .populate('family.basedOut.state')
            .populate('family.basedOut.country')        .populate('preferences.qualification')
        .populate('preferences.profession')
                  .populate('incomeRange')
                .populate('profession')
                    .populate('qualification').exec();

          if (randomUser) break;
        }

        // If no user matches the interests, fetch any unblocked user
        if (!randomUser) {
      
          randomUser = await User.findOne({
            _id: { $nin: blockUserIds, $ne: myUserId },
            is_block: false,
          }).exec();
        }

  
    

        if (randomUser) {
        
          
          return res.json({
            status: true,
            message: "Random profile found",
            data: randomUser,
          });
        } else {
          return res.status(404).json({
            status: false,
            message: "No random profile found",
          });
        }
      } else {
        return res.status(400).json({
          status: false,
          message: "Interests not found",
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  };

  // Utility function to shuffle an array
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };




















  const FollowingList = require("../models/Follow"); // Assuming this contains user following relationships
  const Block = require("../models/Block"); // Assuming this is your Block model


  const FriendShipRequest = require('../models/FriendShipRequest');





  const RecentVisitor = require('../models/RecentVisitor');


// Example: imports assumed to be on top
// const User = require('...');
// const RecentVisitor = require('...');
// const FriendShipRequest = require('...');
// ...other models
// const { getIO } = require('...');
// const { sendNotification } = require('...');
// const onlineUsers = new Map(); // example online users map

exports.fetchProfile = async (req, res) => {
  console.log('Fetch Profile Request Body:', req.body);
  const viewerId = req.user._id;
  const { user_id: profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ status: false, message: 'user_id is required' });
  }

  try {
    // --- 1. Fetch viewer and profile data concurrently ---
    const [viewerUser, profileDoc] = await Promise.all([
      User.findById(viewerId).select('full_name profile'),
      User.findOne({ _id: profileId })
        .populate('membershipPlan interests caste profession qualification gotra incomeRange')
        .populate('location.country location.state location.city')
        .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
        .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession'),
    ]);

    if (!profileDoc) {
      return res.json({ status: false, message: 'Profile not found' });
    }

    const profile = profileDoc.toObject();

    // --- Helper: check missing fields by path ---
    function getValueByPath(obj, path) {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    // --- 2. Profile Completion Logic ---
    const requiredFields = [
      { key: 'full_name', label: 'your full name' },
      { key: 'dob', label: 'your date of birth' },
      { key: 'gender', label: 'your gender' },
      { key: 'height', label: 'your height' },
      { key: 'maritalStatus', label: 'your marital status' },
      { key: 'location.country', label: 'your country' },
      { key: 'location.state', label: 'your state' },
      { key: 'location.city', label: 'your city' },
      { key: 'profession', label: 'your profession' },
      { key: 'qualification', label: 'your qualification' },
      { key: 'profile', label: 'your profile photo' },
    ];

    const missingFields = requiredFields.filter(field => {
      const val = getValueByPath(profile, field.key);
      // Handle empty string, empty array, null/undefined, or height check (must be number)
      if (field.key === 'height') {
        return typeof val !== 'number' || val <= 0;
      }
      if (Array.isArray(val)) {
        return val.length === 0;
      }
      return !val || val === '' || val === 'Not specified';
    }).map(f => f.label);

    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );

    // Dynamic suggestions for profile completion
    const profileSuggestions = [
      field => `Hey! Just adding ${field} can make your profile stand out more.`,
      field => `Profiles with ${field} tend to get more attention. Just saying 😉`,
      field => `Let others know more about you by filling in ${field}.`,
    ];

    const profileCompletionSuggestion = missingFields.length > 0
      ? profileSuggestions[Math.floor(Math.random() * profileSuggestions.length)](missingFields[0])
      : `Your profile is complete! You're ready to shine 🌟`;

    profile.profileCompletion = {
      percentage: completionPercentage,
      missingFields,
      suggestion: profileCompletionSuggestion,
    };


    console.log('Profile Completion:', profile.profileCompletion);  

    // --- 3. Modular AI-style Suggestions (Future Proof) ---
    const suggestions = {};

    // Family suggestion logic
    const familyFields = [
      { key: 'family.fatherOccupation', label: '👨‍👧‍👦 father’s occupation' },
      { key: 'family.motherOccupation', label: '👩‍👧‍👦 mother’s occupation' },
      { key: 'family.familyType', label: '🏡 type of your family (e.g., joint or nuclear)' },
      { key: 'family.siblingsCount', label: '👨‍👩‍👧‍👦 number of siblings' },
      { key: 'family.familyValues', label: '🧠 your family values' },
      { key: 'family.familyStatus', label: '💼 your family status' },
    ];

    // Helper to find missing fields for any category
    function findMissingFields(fields) {
      return fields.filter(field => {
        const val = getValueByPath(profile, field.key);
        if (!val || val === '' || val === 'Not specified') return true;
        if (typeof val === 'number' && val === 0) return true;
        return false;
      }).map(f => f.label);
    }

    const missingFamilyFields = findMissingFields(familyFields);

    if (missingFamilyFields.length > 0) {
      const familySuggestionTemplates = [
        field => `✨ Profiles that mention ${field} feel more relatable and complete — consider updating it.`,
        field => `📌 People often like to know about ${field} while browsing profiles. Just a friendly tip 😊`,
        field => `🌟 Adding details like ${field} makes your profile stand out to families looking for serious connections.`,
        field => `💬 Including your ${field} can help others understand your background better — worth sharing!`,
        field => `🧭 Let your personality shine through! Try adding info about your ${field}.`,
        field => `📈 Many users connect faster with profiles that include ${field}. It’s a small detail with a big impact.`,
      ];

      const firstMissing = missingFamilyFields[0];
      const randomTemplate = familySuggestionTemplates[Math.floor(Math.random() * familySuggestionTemplates.length)];

      suggestions.family = {
        missingFields: missingFamilyFields,
        suggestion: randomTemplate(firstMissing),
      };
    }

    // Attach suggestions object
    profile.suggestions = suggestions;

    // --- 4. Return early if viewing own profile ---
    if (viewerId.toString() === profileId.toString()) {
      return res.json({ status: true, message: 'Self-profile fetch', data: profile });
    }

    // --- 5. Update recent visits & fetch relationship statuses concurrently ---
    const [
      recentVisit,
      friendship,
      shortlist,
      report,
      picRequest,
      followingStatus,
    ] = await Promise.all([
      RecentVisitor.findOneAndUpdate(
        { visitor: viewerId, visited: profileId },
        { $inc: { count: 1 }, lastVisitedAt: new Date() },
        { upsert: true, new: false, setDefaultsOnInsert: true }
      ),
      FriendShipRequest.findOne({
        $or: [
          { requester: viewerId, recipient: profileId },
          { requester: profileId, recipient: viewerId },
        ],
      }).select('requester recipient status updatedAt').lean(),
      Shortlist.findOne({ userId: viewerId, shortlistedUserId: profileId }).select('status').lean(),
      ReportStatus.findOne({ reporter: viewerId, reportedUser: profileId }).select('status').lean(),
      ProfilePicRequest.findOne({ requester: viewerId, requestedUser: profileId }).select('status').lean(),
      FollowingList.findOne({
        $or: [
          { my_user_id: viewerId, user_id: profileId },
          { my_user_id: profileId, user_id: viewerId },
        ],
      }).lean(),
    ]);

    // --- 6. Real-time Notifications ---
    const io = getIO();
    const viewerSocket = onlineUsers.get(viewerId.toString());
    const viewedUserSocket = onlineUsers.get(profileId.toString());

    // Notify on 3rd visit - Intent fluctuation message
    // recentVisit is the PRE-update doc (new:false); null means first-ever visit
    const newVisitCount = (recentVisit?.count ?? 0) + 1;
    if (newVisitCount === 3) {
      const hasSentInterest = await FriendShipRequest.findOne({ requester: viewerId, recipient: profileId });
      if (!hasSentInterest && viewerSocket) {
        io.to(viewerSocket).emit('intent_fluctuation', {
          message: "Looks like you’re curious. Want help breaking the ice?",
          viewedUser: { _id: profileId, name: profile.full_name, profile: profile.profile },
        });
      }
    }

    // Notify viewed user: always on first visit, or if 2-hour cooldown has passed
    const cooldownMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const prevLastVisit = recentVisit?.lastVisitedAt?.getTime() || 0;
    const shouldNotify = recentVisit === null || (now - prevLastVisit > cooldownMs);
    if (shouldNotify) {
      const notificationMessage = `${viewerUser?.full_name || 'Someone'} just visited your profile.`;
      if (viewedUserSocket) {
        io.to(viewedUserSocket).emit('profile_visited', {
          message: notificationMessage,
          fromUser: { _id: viewerId, name: viewerUser?.full_name || '', profile: viewerUser?.profile || null },
        });
      } else if (profile.device_token) {
        await sendNotification(profile.device_token, '👀 Someone Viewed Your Profile', notificationMessage);
      }
      // Send email notification (fire-and-forget, same rate-limit as push)
      sendProfileViewEmail(profile, viewerUser).catch(err =>
        console.error('[UserController] Profile view email error:', err.message)
      );
    }

    // --- 7. Prepare additional profile data ---

    profile.visitInfo = {
      visitCount: newVisitCount,
      lastVisitedAt: new Date(),
    };

    // Friendship relationship status
    const isRequester = friendship?.requester.toString() === viewerId.toString();
    profile.isFriend = friendship?.status === 'accepted';
    profile.isRequestSent = friendship?.status === 'pending' && isRequester;
    profile.isRequestReceived = friendship?.status === 'pending' && !isRequester;
    profile.requestStatus = friendship?.status || 'none';

    profile.relationshipType = friendship ? (isRequester ? 'sent' : 'received') : null;

    profile.isShortListed = shortlist?.status === true;
    profile.reportStatus = report?.status || false;
    profile.profilePicRequest = picRequest?.status || false;

    // Following status: 0 = not following, 1 = I follow them, 2 = they follow me
    if (!followingStatus) {
      profile.followingStatus = 0;
    } else if (followingStatus.my_user_id.toString() === viewerId.toString()) {
      profile.followingStatus = 1;
    } else {
      profile.followingStatus = 2;
    }

    // Remaining profile image views
    const remainingViews = await RemainingProfileImageView.findOne({ viewer: viewerId, profileOwner: profileId })
      .select('remainingViews restrictionStatus')
      .lean();

    profile.remainingProfileImageView = remainingViews || { remainingViews: 0, restrictionStatus: false };




// Find a room where BOTH users are participants
const room = await ChatRoom.findOne({
  participants: { $all: [viewerId, profileId] },
  status: "accepted",
}).populate({
  path: "participants",
  select: "_id full_name email profile isOnline lastSeen",
});

let roomObj = null;

if (room) {
  // Find the other user (not the current viewer)
  const otherUser = room.participants.find(
    (u) => u._id.toString() !== viewerId
  );

  // Build room object
  roomObj = {
    roomId: room._id,
    participants: room.participants.map((p) => p._id.toString()),
    status: room.status,
    isGroup: false,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    iV: room.__v,

    // User info (other participant)
    userId: otherUser?._id,
    fullName: otherUser?.full_name,
    email: otherUser?.email,
    profile: otherUser?.profile,
    isOnline: otherUser?.isOnline,
    lastSeen: otherUser?.lastSeen,
  };
} else {
  // Optionally, provide a fallback empty object instead of null
  roomObj = null;
}

console.log('Chat Room Object:', roomObj);

// Attach to profile safely
profile.chatRoom = roomObj;

    // --- 8. Apply Privacy Settings ---
    applyPrivacySettings(profile, viewerId);

    return res.json({ status: true, message: 'Profile fetched successfully', data: profile });

  } catch (error) {
    console.error('Error in fetchProfile:', error);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};




  exports.fetchFriendsList = async (req, res) => {
    try {
      const { my_user_id, start = 0, limit = 10 } = req.body;

      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      const blockUserIds = user.block_user_ids;

      const friends = await FriendShipRequest.find({
        $or: [{ user1: my_user_id }, { user2: my_user_id }],
        status: 'accepted',
      })
        .skip(start)
        .limit(limit)
        .populate('user1 user2', 'full_name email is_block');

      const filteredFriends = friends.filter(friend => {
        const isUser1 = friend.user1._id.toString() === my_user_id;
        return isUser1 ? !friend.user2.is_block : !friend.user1.is_block;
      });

      const friendDetails = filteredFriends.map(friend => {
        const isUser1 = friend.user1._id.toString() === my_user_id;
        return isUser1 ? friend.user2 : friend.user1;
      });

      return res.json({
        status: true,
        message: "Fetch Friends List",
        data: friendDetails,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };





exports.fetchLiveActivity = async (req, res) => {
  try {
    const { my_user_id } = req.body;

    console.log('[LiveActivity] Request received for user:', my_user_id);

    if (!my_user_id) {
      console.warn('[LiveActivity] my_user_id is missing in request');
      return res.status(400).json({ status: false, message: "my_user_id is required" });
    }

    // 🧑‍💼 Fetch current user info
    const currentUser = await User.findById(my_user_id).select('block_user_ids gender');
    const blockedIds = currentUser?.block_user_ids || [];
    const myGender = currentUser?.gender;

    console.log('[LiveActivity] Blocked user IDs:', blockedIds);
    console.log('[LiveActivity] Current user gender:', myGender);

    // 👤 Determine opposite gender (basic logic)
    const oppositeGender = myGender === 'Male' ? 'Female' : myGender === 'Female' ? 'Male' : null;
    if (!oppositeGender) {
      return res.status(400).json({ status: false, message: 'Invalid gender in user profile' });
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('[LiveActivity] Fetching activities since:', last24h);

    // 🟢 Users who just joined (opposite gender)
    const joinedUsers = await User.find({
      _id: { $nin: blockedIds.concat([my_user_id]) },
      createdAt: { $gte: last24h },
      gender: oppositeGender,
    })
      .select('full_name profile createdAt')
      .limit(5)
      .sort({ createdAt: -1 });
    console.log('[LiveActivity] Joined users:', joinedUsers.map(u => u.full_name));

    // ❤️ New matches received
    const newMatches = await FriendShipRequest.find({
      recipient: my_user_id,
      status: 'accepted',
    })
      .populate({
        path: 'requester',
        select: 'full_name profile gender',
        match: { gender: oppositeGender },
      })
      .limit(5)
      .sort({ updatedAt: -1 });
    console.log('[LiveActivity] New matches before filtering:', newMatches.length);

    const filteredMatches = newMatches.filter(f =>
      f.requester && !blockedIds.includes(f.requester._id.toString())
    );
    console.log('[LiveActivity] New matches after filtering:', filteredMatches.map(f => f.requester.full_name));

    // 👀 Profiles viewed you
    const profileViews = await RecentVisitor.find({
      visited: my_user_id,
      lastVisitedAt: { $gte: last24h },
    })
      .populate({
        path: 'visitor',
        select: 'full_name profile gender',
        match: { gender: oppositeGender },
      })
      .limit(5)
      .sort({ lastVisitedAt: -1 });
    console.log('[LiveActivity] Profile views before filtering:', profileViews.length);

    const filteredViews = profileViews.filter(v =>
      v.visitor && !blockedIds.includes(v.visitor._id.toString())
    );
    console.log('[LiveActivity] Profile views after filtering:', filteredViews.map(v => v.visitor.full_name));

    // 💬 New messages
    const newMessages = await Message.find({
      recipientId: my_user_id,
      createdAt: { $gte: last24h },
    })
      .populate({
        path: 'senderId',
        select: 'full_name profile gender',
        match: { gender: oppositeGender },
      })
      .limit(5)
      .sort({ createdAt: -1 });
    console.log('[LiveActivity] New messages before filtering:', newMessages.length);

    const filteredMessages = newMessages.filter(m =>
      m.senderId && !blockedIds.includes(m.senderId._id.toString())
    );
    console.log('[LiveActivity] New messages after filtering:', filteredMessages.map(m => m.senderId.full_name));

// 🧾 Format for UI
// 🧾 Format for UI
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24 && isToday) return `${diffHr} hr ago`;
  if (isToday) return `Today, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (isYesterday) return `Yesterday, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  
  // Older dates
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// 🧾 Format for UI
const activities = [
  ...joinedUsers.map(u => ({
    userId: u._id,
    title: `${u.full_name} just joined`,
    timeAgo: formatTimeAgo(u.createdAt),
    icon: 'https://img.icons8.com/color/48/000000/add-user-male.png',
    createdAt: u.createdAt,
  })),
  ...filteredMatches.map(f => ({
    userId: f.requester._id,
    title: `New Match: ${f.requester.full_name}`,
    timeAgo: formatTimeAgo(f.updatedAt),
    icon: 'https://img.icons8.com/color/48/000000/like--v1.png',
    createdAt: f.updatedAt,
  })),
  ...filteredViews.map(v => ({
    userId: v.visitor._id,
    title: `${v.visitor.full_name} viewed you`,
    timeAgo: formatTimeAgo(v.lastVisitedAt),
    icon: 'https://img.icons8.com/color/48/000000/visible.png',
    createdAt: v.lastVisitedAt,
  })),
  ...filteredMessages.map(m => ({
    userId: m.senderId._id,
    title: `New message from ${m.senderId.full_name}`,
    timeAgo: formatTimeAgo(m.createdAt),
    icon: 'https://img.icons8.com/color/48/000000/sms.png',
    createdAt: m.createdAt,
  })),
];




// ✅ Sort latest first
activities.sort((a, b) => b.createdAt - a.createdAt);


    console.log('[LiveActivity] Total activities to return:', activities.length);

    return res.json({
      status: true,
      message: 'Live activity fetched successfully',
      data: activities,
    });

  } catch (err) {
    console.error('[LiveActivity] Error:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};



  exports.fetchFollowingList = async (req, res) => {
    try {
      const { my_user_id, start = 0, limit = 10 } = req.body;

      // Ensure the user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Fetch the following list using FollowingList
      const following = await FollowingList.find({ my_user_id: my_user_id })
        .skip(start)
        .limit(limit)
        .populate('user_id', 'full_name email profile_picture is_block');

      // Filter out blocked users
    // const filteredFollowing = following.filter(f => !f.followed.is_block);

      return res.json({
        status: true,
        message: "Fetch Following List",
        data: following.map(f => f.user_id),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };


  exports.fetchFollowersList = async (req, res) => {
    try {
      const { user_id, start = 0, limit = 10 } = req.body;

      // Ensure the user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Fetch the followers list
      const followers = await FollowingList.find({ user_id: user_id })
        .skip(start)
        .limit(limit)
        .populate('my_user_id', 'full_name email profile_picture is_block');

      // Filter out blocked users
    // const filteredFollowers = followers.filter(f => !f.follower.is_block);

      return res.json({
        status: true,
        message: "Fetch Followers List",
        data: followers.map(f => f.my_user_id),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };

  exports.fetchBlockedUserList = async (req, res) => {
    try {
      const { my_user_id, start = 0, limit = 10 } = req.body;

      // Validate input
      if (!my_user_id) {
        return res.status(400).json({ status: false, message: "my_user_id is required" });
      }

      // Check if the user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Fetch blocked users
      const blocks = await Block.find({ blocker: my_user_id })
        .skip(start)
        .limit(limit)
        .populate("blocked", "full_name email profile");

      // Prepare the response
      const responseBlockedUsers = blocks.map((b) => ({
        _id: b.blocked._id,
        full_name: b.blocked.full_name,
        email: b.blocked.email,
        profile: b.blocked.profile,
      }));

      return res.json({
        status: true,
        message: "Fetched Blocked User List",
        data: responseBlockedUsers,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };








  exports.blockUser = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // Ensure the current user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Ensure the user to block exists
      const blockUser = await User.findById(user_id);
      if (!blockUser) {
        return res.status(404).json({ status: false, message: "Block user not found" });
      }

      // Check if the user is already blocked
      const existingBlock = await Block.findOne({ blocker: my_user_id, blocked: user_id });
      if (existingBlock) {
        return res.status(400).json({ status: false, message: "User is already blocked" });
      }

      // Add to the block list of the current user
      const block = new Block({
        blocker: my_user_id,
        blocked: user_id,
      });
      await block.save();

      // Add to the blocked list of the blocked user
      const reverseBlock = new Block({
        blocker: user_id,
        blocked: my_user_id,
      });
      await reverseBlock.save();

      return res.json({
        status: true,
        message: "User blocked successfully",
        data: blockUser,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };


  exports.unblockUser = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // Ensure the current user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Ensure the user to unblock exists
      const unblockUser = await User.findById(user_id).populate('interests');
      if (!unblockUser) {
        return res.status(404).json({ status: false, message: "User to unblock not found" });
      }

      // Find the block relation to remove
      const block = await Block.findOneAndDelete({ blocker: my_user_id, blocked: user_id });
      if (!block) {
        return res.status(404).json({ status: false, message: "User is not blocked" });
      }

      // Remove from the blocked list of the unblocked user
      const reverseBlock = await Block.findOneAndDelete({ blocker: user_id, blocked: my_user_id });
      if (!reverseBlock) {
        return res.status(404).json({ status: false, message: "You were not blocked by this user" });
      }

      return res.json({
        status: true,
        message: "User unblocked successfully",
        data: unblockUser,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };

      const SecondChanceQueue = require('../models/SecondChanceQueue');

  // Reject Friend Request
  exports.rejectFriendRequest = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // Ensure the friend request exists
      const friendRequest = await FriendShipRequest.findById(user_id);
      if (!friendRequest) {
        return res.status(404).json({ status: false, message: "Friend request not found" });
      }

      // Ensure the current user is the recipient of the request
      if (friendRequest.recipient.toString() !== my_user_id) {
        return res.status(400).json({ status: false, message: "You are not the recipient of this request" });
      }

      // // Delete the friend request
      await FriendShipRequest.deleteOne({ _id: user_id });




  await SecondChanceQueue.create({
    userId: my_user_id,
    profileId: user_id,
    rejectedAt: new Date(),
  });


      return res.json({
        status: true,
        message: "Friend request rejected successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred",
      });
    }
  };


  exports.deleteUser = async (req, res) => {
    try {
      const { user_id } = req.body;

    

      // Ensure the user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }


      
    
      

      

      // Delete following and followers relationships
      const userFollowings = await FollowingList.find({ my_user_id: user_id });
      for (let userFollowing of userFollowings) {
        const followedUser = await User.findById(userFollowing.user_id);
        if (followedUser) {
          followedUser.followers -= 1;
          await followedUser.save();
        }
        await userFollowing.deleteOne();
      }

      const userFollowers = await FollowingList.find({ user_id });
      for (let userFollower of userFollowers) {
        const followingUser = await User.findById(userFollower.my_user_id);
        if (followingUser) {
          followingUser.following -= 1;
          await followingUser.save();
        }
        await userFollower.deleteOne();
      }

      // Delete reports, profile verifications, and rooms
      //await Report.deleteMany({ user_id });
    // await ProfileVerification.deleteMany({ user_id });

      // const deleteRooms = await Room.find({ admin_id: user_id });
      // for (let room of deleteRooms) {
      //   if (room.photo) {
      //     GlobalFunction.deleteFile(room.photo);
      //   }

      //   const roomUsers = await RoomUser.find({ room_id: room._id });
      //   for (let roomUser of roomUsers) {
      //     await roomUser.delete();
      //   }

      //   await room.delete();
      // }

      // const roomUsersForRemoval = await RoomUser.find({ user_id });
      // for (let roomUser of roomUsersForRemoval) {
      //   await roomUser.delete();
      // }

      // Delete user's profile and background image
    // GlobalFunction.deleteFile(user.profile);
      //GlobalFunction.deleteFile(user.background_image);

      // Finally, delete the user
      await user.deleteOne();



  

      return res.json({
        status: true,
        message: "User deleted successfully",
        data: user,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred while deleting the user",
      });
    }
  };


  // ✅ Full Advanced Listing API: Now includes
  // - 🔒 Privacy-Locked Profiles (privacyLockedOnly)
  // - ⏳ Recently Active Profiles (recentlyActive)
  // - 📍 Nearby Matches (nearby + lat/lng)



// Helper function to calculate age from DOB
const getAge = (dob) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const ageDiff = Date.now() - birth.getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
};

exports.fetchUsersListWithFilters = async (req, res) => {
    try {
        const {
            my_user_id: userId,
            limit = 10,
            page = 1,
            filters = {},
            matchMyPreference = false,
            matchTheirPreference = false,
            onlyProWithPlan = false,
            sortByNewUsers = false,
            isVerify = false,
            isShortListedByMe = false,
            isShortListedByThey = false,
            recentlyActive = false,
            nearby = false,
            lat,
            lng,
            maxDistanceKm = 50,
            privacyLockedOnly = false
        } = req.body;

        if (!userId) {
            return res.status(400).json({ status: false, message: 'my_user_id is required' });
        }

        const currentUser = await User.findById(userId)
            .populate('membershipPlan preferences')
            .lean();

        if (!currentUser) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        const myUserGender = currentUser.gender;
        const blockedIds = currentUser.blocked || [];

        // --- 1. Build the base query based on server-side filters ---
        let baseQuery = {
            _id: { $ne: userId, $nin: blockedIds },
            is_block: 0,
            gender: { $nin: [myUserGender, null, '', 'Not specified'] }
        };

        if (privacyLockedOnly) {
            const connections = await FriendShipRequest.find({
                $or: [{ requester: userId }, { recipient: userId }]
            }).select(['requester', 'recipient']);
            const connectedIds = connections.map(req =>
                req.requester.toString() === userId ? req.recipient : req.requester
            );
            baseQuery._id.$nin = [...baseQuery._id.$nin, ...connectedIds];
        }

        if (recentlyActive) {
            baseQuery.lastSeen = { $gte: new Date(Date.now() - 48 * 3600 * 1000) };
        }

        if (nearby && lat && lng) {
            baseQuery.coordinates = {
                $nearSphere: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: maxDistanceKm * 1000
                }
            };
        }

        if (isVerify) {
            baseQuery.is_verified = 1;
        }

        // --- 2. Build the shortlist filter if requested ---
        let shortlistIds = null;
        if (isShortListedByMe) {
            const sentShortlists = await Shortlist.find({ userId, status: true }).lean();
            shortlistIds = sentShortlists.map(e => e.shortlistedUserId);
            baseQuery._id.$in = shortlistIds;
        } else if (isShortListedByThey) {
            const receivedShortlists = await Shortlist.find({ shortlistedUserId: userId, status: true }).lean();
            shortlistIds = receivedShortlists.map(e => e.userId);
            baseQuery._id.$in = shortlistIds;
        }

        // --- 3. Execute the initial database query ---
 let query = User.find(baseQuery).select('-preferences');
        console.log('Base Query:', JSON.stringify(baseQuery));
        
        // Add sorting only for new users
        if (sortByNewUsers) {
            query = query.sort({ createdAt: -1 });
        } else {
            // Apply a default sort to ensure consistent pagination
            query = query.sort({ createdAt: -1 }); 
        }

        // Fetch all users first for in-memory filtering
        let users = await query
            .populate('membershipPlan interests location.country location.state location.city caste gotra profession qualification incomeRange')
              .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
            .lean();
            console.log(`Fetched ${users.length} users from DB before in-memory filtering`);    

                    
                
        // --- 4. Apply in-memory filters and preference matching ---
        users = users.filter(user => {
            const userAge = getAge(user.dob);

            
            // Apply standard filters
            if (filters.age_range?.min != null && filters.age_range?.max != null) {
                if (userAge < filters.age_range.min || userAge > filters.age_range.max) return false;
            }

            if (filters.height_range?.min != null && filters.height_range?.max != null) {
                if (user.height !== null && (user.height < filters.height_range.min || user.height > filters.height_range.max)) return false;
            }

            if (filters.marital_status && user.maritalStatus !== filters.marital_status) return false;
            if (filters.income && user.income !== filters.income) return false;

            if (filters.caste?.length && (!user.caste || !filters.caste.includes(user.caste._id?.toString()))) return false;
            if (filters.gotra?.length && (!user.gotra || !filters.gotra.includes(user.gotra._id?.toString()))) return false;
            if (filters.qualification?.length && (!user.qualification || !filters.qualification.includes(user.qualification._id?.toString()))) return false;
            if (filters.profession?.length && (!user.profession || !filters.profession.includes(user.profession._id?.toString()))) return false;

            // My Preferences vs Their Profile
            if (matchMyPreference) {



                const myPrefs = currentUser.preferences || {};
                const otherUser = user;

                if (Array.isArray(myPrefs.caste) && myPrefs.caste.length > 0) {
                    if (!myPrefs.caste.includes(otherUser.caste?.toString())) return false;
                }

                if (Array.isArray(myPrefs.gotra) && myPrefs.gotra.length > 0) {
                    if (!myPrefs.gotra.includes(otherUser.gotra?.toString())) return false;
                }

                if (myPrefs.age_range?.min != null && myPrefs.age_range?.max != null) {
                    if (userAge < myPrefs.age_range.min || userAge > myPrefs.age_range.max) return false;
                }

      if (myPrefs.marital_status && myPrefs.marital_status.length > 0) {
    // If the other user's status is null or undefined, or is not in my list of preferred statuses, return false.
    // The `.includes` method is more flexible for checking against a list of preferences.
    if (otherUser.maritalStatus === null || !myPrefs.marital_status.includes(otherUser.maritalStatus)) {
        return false;
    }
}
                if (Array.isArray(myPrefs.qualification) && myPrefs.qualification.length > 0) {
                    if (!myPrefs.qualification.includes(otherUser.qualification?.toString())) return false;
                }

                if (Array.isArray(myPrefs.profession) && myPrefs.profession.length > 0) {
                    if (!myPrefs.profession.includes(otherUser.profession?.toString())) return false;
                }

                if (myPrefs.income && otherUser.income !== myPrefs.income) {
                    return false;
                }

                if (myPrefs.height_range?.min != null && myPrefs.height_range?.max != null) {
                    if (otherUser.height !== null && (otherUser.height < myPrefs.height_range.min || otherUser.height > myPrefs.height_range.max)) {
                        return false;
                    }
                }
            }

            // Their Preferences vs My Profile
            if (matchTheirPreference) {
                const theirPrefs = user.preferences || {};
                const currentUserAge = getAge(currentUser.dob);

                if (Array.isArray(theirPrefs.caste) && theirPrefs.caste.length > 0) {
                    if (!theirPrefs.caste.includes(currentUser.caste?.toString())) return false;
                }

                if (Array.isArray(theirPrefs.gotra) && theirPrefs.gotra.length > 0) {
                    if (!theirPrefs.gotra.includes(currentUser.gotra?.toString())) return false;
                }

                if (theirPrefs.age_range?.min != null && theirPrefs.age_range?.max != null) {
                    if (currentUserAge < theirPrefs.age_range.min || currentUserAge > theirPrefs.age_range.max) return false;
                }

                if (Array.isArray(theirPrefs.marital_status) && theirPrefs.marital_status.length > 0) {
                    if (!theirPrefs.marital_status.includes(currentUser.maritalStatus)) return false;
                }

                if (Array.isArray(theirPrefs.qualification) && theirPrefs.qualification.length > 0) {
                    if (!theirPrefs.qualification.includes(currentUser.qualification?.toString())) return false;
                }

                if (Array.isArray(theirPrefs.profession) && theirPrefs.profession.length > 0) {
                    if (!theirPrefs.profession.includes(currentUser.profession?.toString())) return false;
                }

                if (theirPrefs.incomeRange && currentUser.income !== theirPrefs.incomeRange.toString()) {
                    return false;
                }

                if (theirPrefs.height_range?.min != null && theirPrefs.height_range?.max != null) {
                    if (currentUser.height !== null && (currentUser.height < theirPrefs.height_range.min || currentUser.height > theirPrefs.height_range.max)) {
                        return false;
                    }
                }

                // Optional: add diet/smoke/drink/etc if needed
                if (theirPrefs.diet && theirPrefs.diet !== "Any" && currentUser.diet && currentUser.diet !== theirPrefs.diet) {
                    return false;
                }

                if (theirPrefs.smoke && theirPrefs.smoke !== "Any" && currentUser.smoke && currentUser.smoke !== theirPrefs.smoke) {
                    return false;
                }

                if (theirPrefs.drink && theirPrefs.drink !== "Any" && currentUser.drink && currentUser.drink !== theirPrefs.drink) {
                    return false;
                }
            }

            // Only allow users with a premium plan if requested
            if (onlyProWithPlan) {
                const hasPaidPlan = user.membershipPlan && ['Silver', 'Gold', 'Platinum'].includes(user.membershipPlan.name);
                if (!hasPaidPlan) return false;
            }

            return true;
        });


        // --- 5. Apply sorting and pagination ---
        if (!sortByNewUsers) { // If not already sorted by `createdAt`
            users = users.sort((a, b) => {
                const now = Date.now();
                const aScore = (a.isOnline ? 30 : 0) + (a.membershipPlan?.name ? 25 : 0) + (a.profile ? 20 : 0) + ((now - new Date(a.createdAt)) < (3 * 24 * 3600 * 1000) ? 35 : 0);
                const bScore = (b.isOnline ? 30 : 0) + (b.membershipPlan?.name ? 25 : 0) + (b.profile ? 20 : 0) + ((now - new Date(b.createdAt)) < (3 * 24 * 3600 * 1000) ? 35 : 0);
                return bScore - aScore;
            });
        }
        
        const start = (page - 1) * limit;
        const result = users.slice(start, start + limit);
        const userIds = result.map(u => u._id.toString());
        
        // --- 6. Fetch all relationships in a single batch ---
        const [friendRequests, shortlists, reports, picRequests, views, follows] = await Promise.all([
            FriendShipRequest.find({
                $or: [{ requester: userId, recipient: { $in: userIds } }, { requester: { $in: userIds }, recipient: userId }]
            }).lean(),
            Shortlist.find({ userId, shortlistedUserId: { $in: userIds } }).lean(),
            ReportStatus.find({ reporter: userId, reportedUser: { $in: userIds } }).select('reportedUser status').lean(),
            ProfilePicRequest.find({ requester: userId, requestedUser: { $in: userIds } }).select('requestedUser status').lean(),
            RemainingProfileImageView.find({ viewer: userId, profileOwner: { $in: userIds } }).select('profileOwner remainingViews restrictionStatus').lean(),
            FollowingList.find({
                $or: [{ my_user_id: userId, user_id: { $in: userIds } }, { my_user_id: { $in: userIds }, user_id: userId }]
            }).lean()
        ]);
        
        // --- 7. Map relationships to the final results ---
        const friendMap = friendRequests.reduce((acc, r) => {
            const otherId = r.requester.toString() === userId ? r.recipient.toString() : r.requester.toString();
            acc[otherId] = r;
            return acc;
        }, {});
        
        const shortlistMap = shortlists.reduce((acc, e) => {
            acc[e.shortlistedUserId.toString()] = e.status;
            return acc;
        }, {});
        
        const reportMap = reports.reduce((acc, e) => {
            acc[e.reportedUser.toString()] = e.status;
            return acc;
        }, {});
        
        const picMap = picRequests.reduce((acc, e) => {
            acc[e.requestedUser.toString()] = e.status;
            return acc;
        }, {});

        const viewMap = views.reduce((acc, e) => {
            acc[e.profileOwner.toString()] = {
                remainingViews: e.remainingViews,
                restrictionStatus: e.restrictionStatus
            };
            return acc;
        }, {});

        const followMap = follows.reduce((acc, f) => {
            const key = f.my_user_id.toString() === userId ? f.user_id.toString() : f.my_user_id.toString();
            acc[key] = f.status;
            return acc;
        }, {});
        
        // --- 8. Final transformation and response ---
        const hasPremium = currentUser.membershipPlan && ['Silver', 'Gold', 'Platinum'].includes(currentUser.membershipPlan.name);
        const final = result.map(u => {
            const id = u._id.toString();
            const friendshipRequest = friendMap[id];
            const isCurrentUserRequester = friendshipRequest?.requester.toString() === userId;
            const isLocked = privacyLockedOnly && !hasPremium;

            const userProfile = {
                ...u,
                profile: isLocked ? null : u.profile,
                full_name: isLocked ? "Locked Profile" : u.full_name,
                isLocked,
                isFriend: friendshipRequest?.status === 'accepted',
                isRequestSent: friendshipRequest?.status === 'pending' && isCurrentUserRequester,
                isRequestReceived: friendshipRequest?.status === 'pending' && !isCurrentUserRequester,
                requestStatus: friendshipRequest?.status || 'none',
                relationshipType: friendshipRequest ? (isCurrentUserRequester ? 'sent' : 'received') : null,
                isShortListed: !!shortlistMap[id],
                shortlistStatus: shortlistMap[id] || 'none',
                reportStatus: reportMap[id] || false,
                profilePicRequest: picMap[id] || false,
                remainingProfileImageView: viewMap[id] || { remainingViews: 0, restrictionStatus: false },
                followingStatus: followMap[id] || 0
            };
            
            // Apply privacy settings
            return applyPrivacySettings(userProfile, userId);
        });

        return res.json({
            status: true,
            message: 'Advanced filtered user list fetched',
            data: final
        });

    } catch (err) {
        console.error('Error in fetchUsersListWithFilters:', err);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
};



















  // Utility to calculate age
  function calculateAge(dob) {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }





























  const Caste = require('../models/Caste'); // Import Caste model

  // API to fetch all caste entries
  exports.fetchCasteList = async (req, res) => {
    try {
      const castes = await Caste.find();  // Fetch all caste documents from the database
      if (castes.length === 0) {
        return res.status(404).json({ status: false, message: 'No castes found' });
      }

      return res.json({
        status: true,
        message: 'Caste list fetched successfully',
        data: castes,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };




  const Gotra = require('../models/Gotra');
  const Clan = require('../models/Clan');

  exports.fetchGotraList = async (req, res) => {
    try {
      const gotras = await Gotra.find({ isActive: { $ne: false } })
        .populate('clan', 'name displayName description origin alternateNames')
        .sort({ name: 1 })
        .lean();

      if (gotras.length === 0) {
        return res.status(404).json({ status: false, message: 'No gotras found' });
      }

      return res.json({
        status: true,
        message: 'Gotra list fetched successfully',
        data: gotras,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };

  exports.fetchClanList = async (req, res) => {
    try {
      const clans = await Clan.find({ isActive: { $ne: false } })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      return res.json({
        status: true,
        message: 'Clan list fetched successfully',
        data: clans,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };

  const SurnameTitle = require('../models/SurnameTitle');

  exports.fetchSurnameTitleList = async (req, res) => {
    try {
      const surnameTitles = await SurnameTitle.find({ isActive: { $ne: false } })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      return res.json({
        status: true,
        message: 'Surname title list fetched successfully',
        data: surnameTitles,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };






  exports.toggleShortlist = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      if (!my_user_id || !user_id) {
        return res.status(400).json({ status: false, message: 'Both user IDs are required' });
      }

      if (my_user_id === user_id) {
        return res.status(400).json({ status: false, message: 'You cannot shortlist yourself' });
      }

      const user = await User.findById(my_user_id);
      const targetUser = await User.findById(user_id);

      if (!user || !targetUser) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      let shortlist = await Shortlist.findOne({ userId: my_user_id, shortlistedUserId: user_id });

      if (shortlist) {
        shortlist.status = !shortlist.status; // Toggle
        await shortlist.save();

        // Notify only when adding (not removing)
        if (shortlist.status) {
          sendShortlistEmail(targetUser, user).catch(err =>
            console.error('[emailService] sendShortlistEmail error:', err.message)
          );
        }

        return res.json({
          status: true,
          message: `Shortlist ${shortlist.status ? 'added' : 'removed'} successfully`,
          data: shortlist,
        });
      }

      // If not exists, create new with status true
      shortlist = new Shortlist({
        userId: my_user_id,
        shortlistedUserId: user_id,
        status: true,
      });

      await shortlist.save();

      // Notify the shortlisted user
      sendShortlistEmail(targetUser, user).catch(err =>
        console.error('[emailService] sendShortlistEmail error:', err.message)
      );

      return res.status(201).json({
        status: true,
        message: 'User added to shortlist successfully',
        data: shortlist,
      });
    } catch (err) {
      console.error('❌ toggleShortlist error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  };



exports.sendInterestRequest = async (req, res) => {
  try {
    const { my_user_id, user_id } = req.body;

    const user = await User.findById(my_user_id);
    const matchUser = await User.findById(user_id);

    if (!user || !matchUser) {
      return res.status(404).json({
        status: false,
        message: "One or both users not found",
      });
    }

    // Find any existing request between the two users
    const existingRequest = await FriendShipRequest.findOne({
      $or: [
        { requester: my_user_id, recipient: user_id },
        { requester: user_id, recipient: my_user_id },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === 'rejected') {
        // Determine who rejected by looking at who was the recipient of the rejected request
        const rejectedByUserId = existingRequest.recipient.toString();

        if (rejectedByUserId === my_user_id) {
          // ✅ I rejected the previous request — I can send a new one
          await FriendShipRequest.deleteOne({ _id: existingRequest._id });
        } else {
          // ❌ I was rejected — I cannot send again
          return res.status(400).json({
            status: false,
            message: "You cannot send a request. The other user rejected your previous request.",
          });
        }
      } else {
        // Request is still pending or accepted
        if (existingRequest.requester.toString() === my_user_id) {
          return res.status(400).json({
            status: false,
            message: "You have already sent a request to this user.",
          });
        } else {
          return res.status(400).json({
            status: false,
            message: "This user has already sent a request to you.",
          });
        }
      }
    }

    // ✅ Create a new request
    const interestRequest = new FriendShipRequest({
      requester: my_user_id,
      recipient: user_id,
      status: 'pending',
    });

    await interestRequest.save();



    // ✅ Push notification
    const title = 'New Interest Received';
    const description = `${user.full_name} has shown interest in your profile`;

    if (matchUser?.device_token) {
      await sendNotification(matchUser.device_token, title, description);
    }

    // ✅ Email notification to recipient
    sendInterestRequestEmail(
      { full_name: matchUser.full_name, email: matchUser.email },
      { full_name: user.full_name }
    ).catch(err => console.error('[sendInterestRequest] email error:', err.message));

    // ✅ Save Notification in DB
    await Notification.create({
      type: 'interest_request',
      fromUser: my_user_id,
      toUser: user_id,
      content: description,
      data: {
        userId: my_user_id,
        full_name: user.full_name,
        profile: user.profile,
      }
    });

    // ✅ Emit notifications
    const totalUnread = await Notification.countDocuments({
      toUser: user_id,
      isRead: false,
    });

    const socketId = onlineUsers.get(user_id?.toString());
    if (socketId) {
      io.to(socketId).emit('notification_count', { total: totalUnread });

      const pendingRequests = await FriendShipRequest.countDocuments({
        recipient: user_id,
        status: 'pending',
      });

      io.to(socketId).emit('new_match_request', { total: pendingRequests });
    }

    return res.json({
      status: true,
      message: "Interest sent successfully",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};




  exports.getInterestList = async (req, res) => {




    try {
      const userId = req.body.my_user_id;
      const limit = parseInt(req.body.limit) || 10;
      const start = parseInt(req.body.start || 1) - 1;
      const statusFilter = req.body.status;
      const typeFilter = req.body.type;

      if (!userId) {
        return res.status(400).json({
          status: false,
          message: 'my_user_id is required',
        });
      }

      const query = {};
      if (typeFilter === 'sent') {
        query.requester = userId;
      } else if (typeFilter === 'received') {
        query.recipient = userId;
      } else {
        query.$or = [{ requester: userId }, { recipient: userId }];
      }

      if (statusFilter) {
        query.status = statusFilter;
      }

      const total = await FriendShipRequest.countDocuments(query);

      const requests = await FriendShipRequest.find(query)
        .sort({ updatedAt: -1 })
        .skip(start)
        .limit(limit)
        .populate({
          path: 'requester',
        // select: 'full_name username profile location',
          populate: [
            { path: 'location.country', model: 'Country' },
            { path: 'location.state', model: 'State' },
            { path: 'location.city', model: 'City' },
            { path: 'interests', model: 'Interest' },
            { path: 'caste', model: 'Caste' },
            { path: 'gotra', model: 'Gotra' },
            { path: 'preferences.caste', model: 'Caste' },
              { path: 'preferences.gotra', model: 'Gotra' },
                  { path: 'preferences.qualification', model: 'Qualification' },
                      { path: 'preferences.profession', model: 'Profession' },
                { path: 'profession', model: 'Profession' },
                  { path: 'qualification', model: 'Qualification' },
                      { path: 'incomeRange', model: 'IncomeRange' },
                          { path: 'preferences.incomeRange', model: 'IncomeRange' },
          ]
        })
        

        
        .populate({
          path: 'recipient',
        //  select: 'full_name username profile location',
          populate: [
            { path: 'location.country', model: 'Country' },
            { path: 'location.state', model: 'State' },
            { path: 'location.city', model: 'City' },
            { path: 'interests', model: 'Interest' },
            { path: 'caste', model: 'Caste' },
            { path: 'gotra', model: 'Gotra' },
              { path: 'incomeRange', model: 'IncomeRange' },
                { path: 'preferences.incomeRange', model: 'IncomeRange' },
                { path: 'preferences.caste', model: 'Caste' },
              { path: 'preferences.gotra', model: 'Gotra' },

                            { path: 'profession', model: 'Profession' },
                  { path: 'qualification', model: 'Qualification' },


                                { path: 'preferences.qualification', model: 'Qualification' },
                      { path: 'preferences.profession', model: 'Profession' },
          ]
        })
        .lean();

  const result = requests.map(r => {
    // Skip if requester or recipient was deleted
    if (!r.requester || !r.recipient) return null;
    
    const isSender = r.requester._id.toString() === userId;
    const otherUser = isSender ? r.recipient : r.requester;

    // Skip if other user was deleted
    if (!otherUser) return null;

    return {
      _id: r._id,
      user: {
        _id: otherUser._id,
        full_name: otherUser.full_name,
        username: otherUser.username,
        gender: otherUser.gender,
        dob: otherUser.dob,
        profile: otherUser.profile,
        age: otherUser.age,
        location: {
          country: otherUser.location?.country || null,
          state: otherUser.location?.state || null,
          city: otherUser.location?.city || null
        },
        qualification: otherUser.qualification || null,
        profession: otherUser.profession || null,
        incomeRange: otherUser.incomeRange || null,
        caste: otherUser.caste || null,
        gotra: otherUser.gotra || null
      },
      status: r.status,
      type: isSender ? 'sent' : 'received',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }).filter(item => item !== null); // Filter out null results from deleted users


      return res.json({
        status: true,
        message: 'Interest list fetched successfully',
        data: result,
        total
      });

    } catch (err) {
      console.error('Error in getInterestList:', err);
      return res.status(500).json({
        status: false,
        message: 'Something went wrong. Please try again later.',
      });
    }
  };





  // Accept Friend Request
  exports.acceptInterestRequest = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      const interestRequest = await FriendShipRequest.findOne({
        requester: user_id,
        recipient: my_user_id,
        status: 'pending',
      });

      if (!interestRequest) {
        return res.status(404).json({
          status: false,
          message: "Interest not found or already accepted",
        });
      }

      interestRequest.status = 'accepted';
      await interestRequest.save();

      const recipient = await User.findById(user_id);
      const sender = await User.findById(my_user_id);

      const notificationText = `${sender.full_name} accepted your interest request`;




      
    // ✅ Optional: Create chat room if not exists
    let room = await ChatRoom.findOne({
      participants: { $all: [my_user_id, user_id], $size: 2 },
      isGroup: false,
    });

    if (!room) {
      room = await ChatRoom.create({
        participants: [my_user_id, user_id],
        isGroup: false,
        status: "accepted",
        createdAt: new Date(),
      });

      await Message.create({
        room: room._id,
        sender: my_user_id,
        receiver: user_id,
        content: 'Hi, I found your profile really nice. Let’s connect.',
        msgType: 'TEXT',
        status: 'sent',
        isRead: false,
      });
    }



      // ✅ Send Notification
      if (recipient?.device_token) {
        await sendNotification(
          recipient.device_token,
          'Interest Accepted',
          notificationText
        );
      }

      // ✅ Email notification to original sender (recipient of the accept action)
      sendInterestAcceptedEmail(
        { full_name: recipient.full_name, email: recipient.email },
        { full_name: sender.full_name }
      ).catch(err => console.error('[acceptInterestRequest] email error:', err.message));

      // ✅ Save Notification in DB
      await Notification.create({
        type: 'interest_accept',
        fromUser: my_user_id,
        toUser: user_id,
        content: notificationText,
        data: {
          userId: my_user_id,
          full_name: sender.full_name,
          profile: sender.profile,
        }
      });


      // ✅ Emit updated notification count via socket
  const totalUnread = await Notification.countDocuments({
    toUser: user_id,
    isRead: false,
  });

  const socketId = onlineUsers.get(user_id?.toString());
  if (socketId) {
    io.to(socketId).emit('notification_count', { total: totalUnread });
  }

      return res.json({
        status: true,
        message: "Interest accepted successfully",
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Something went wrong while accepting interest",
      });
    }
  };





  exports.cancelInterestRequest = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // ✅ Ensure current user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      // ✅ Ensure target user exists
      const targetUser = await User.findById(user_id);
      if (!targetUser) {
        return res.status(404).json({ status: false, message: "Requested user not found" });
      }

      // ✅ Check if a pending interest request exists
      const existingRequest = await FriendShipRequest.findOne({
        requester: my_user_id,
        recipient: user_id,
        status: 'pending'
      });

      if (!existingRequest) {
        return res.status(400).json({
          status: false,
          message: "No pending interest request found to cancel"
        });
      }

      // ✅ Delete the request
      await FriendShipRequest.deleteOne({
        requester: my_user_id,
        recipient: user_id,
        status: 'pending'
      });

      // ✅ Recalculate and emit match request count
      const pendingRequests = await FriendShipRequest.countDocuments({
        recipient: user_id,
        status: 'pending'
      });

      const socketId = onlineUsers.get(user_id?.toString());
      if (socketId) {
        io.to(socketId).emit('new_match_request', { total: pendingRequests });
      }

      return res.json({
        status: true,
        message: "Interest request cancelled successfully",
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Something went wrong while cancelling interest request",
      });
    }
  };


  exports.rejectInterestRequest = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // ✅ Validate current user
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      // ✅ Validate sender of interest
      const interestSender = await User.findById(user_id);
      if (!interestSender) {
        return res.status(404).json({ status: false, message: "Sender not found" });
      }

      // ✅ Find the pending interest request directed to current user
      const interestRequest = await FriendShipRequest.findOne({
        requester: user_id,
        recipient: my_user_id,
        status: 'pending',
      });

      if (!interestRequest) {
        return res.status(400).json({ status: false, message: "No pending interest request found to reject" });
      }

      // ✅ Update status to 'rejected'
      interestRequest.status = 'rejected';
      await interestRequest.save();

      return res.json({
        status: true,
        message: "Interest request rejected successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred while rejecting the interest request",
      });
    }
  };



  exports.removeConnection = async (req, res) => {
    try {
      const { my_user_id, user_id } = req.body;

      // ✅ Validate users
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "Your profile was not found" });
      }

      const matchedUser = await User.findById(user_id);
      if (!matchedUser) {
        return res.status(404).json({ status: false, message: "Selected profile was not found" });
      }

      // ✅ Check if a mutual connection exists
      const existingConnection = await FriendShipRequest.findOne({
        $or: [
          { requester: my_user_id, recipient: user_id, status: 'accepted' },
          { requester: user_id, recipient: my_user_id, status: 'accepted' }
        ]
      });

      if (!existingConnection) {
        return res.status(400).json({ status: false, message: "No connection found to remove" });
      }

      // // ✅ Remove the connection
      await FriendShipRequest.deleteOne({
        _id: existingConnection._id
      });

      // ✅ Optionally remove from shortlist
      await Shortlist.deleteMany({
        $or: [
          { userId: my_user_id, shortlistedUserId: user_id },
          { userId: user_id, shortlistedUserId: my_user_id }
        ]
      });

      return res.json({
        status: true,
        message: "Connection removed successfully",
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Something went wrong while removing the connection",
      });
    }
  };



  // Get all users shortlisted by a specific user
  exports.fetchShortlistedUsers = async (req, res) => {
    try {
      const { my_user_id } = req.body; // Get my_user_id from the request body


      
            // Fetch shortlisted users who have been added by the current user
      const shortlisted = await Shortlist.find({ userId: my_user_id, status: true })
      .populate({
        path: 'shortlistedUserId',
        select: 'full_name email profile dob location is_verified',
        populate: { path: 'location.city', select: 'name' }
      });

    
      return res.json({
        status: true,
        message: 'Fetched shortlisted users',
        data: shortlisted.map(entry => entry.shortlistedUserId),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };






  // POST /api/membership/assign

  const MembershipPlan = require('../models/MemebrshipPlan');

  exports.assignMembership = async (req, res) => {
    try {
      const { user_id, plan_id } = req.body;

      const user = await User.findById(user_id);
      if (!user) return res.status(404).json({ status: false, message: 'User not found' });

      const plan = await MembershipPlan.findById(plan_id);
      if (!plan) return res.status(404).json({ status: false, message: 'Plan not found' });

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(startDate.getDate() + plan.duration_days);

      user.membershipPlan = plan._id;


      await user.save();

      res.json({
        status: true,
        message: `Membership '${plan.name}' assigned successfully`,
        data: {
          user_id: user._id,
          plan: plan.name,
          start: startDate,
          expires: expiryDate,
        },
      });
    } catch (error) {
      console.error('Assign Membership Error:', error);
      res.status(500).json({ status: false, message: 'Server error', error: error.message });
    }
  };





  exports.seedMembershipPlans = async (req, res) => {
    try {
      const existingPlans = await MembershipPlan.find();
      if (existingPlans.length > 0) {
        return res.status(200).json({
          status: true,
          message: 'Membership plans already exist',
          data: existingPlans,
        });
      }

      const plans = [
        {
          name: 'Free',
          price: 0,
          duration_days: 0,
          description: 'Basic free access with limited features',
          features: ['Limited profile views', 'Cannot send interest', 'Cannot view contact'],
        },
        {
          name: 'Silver',
          price: 499,
          duration_days: 30,
          description: 'Silver membership with essential features',
          features: ['View profiles', 'Send interest', 'Limited contact access'],
        },
        {
          name: 'Gold',
          price: 999,
          duration_days: 90,
          description: 'Gold membership with extended features',
          features: ['Send unlimited interests', 'View contact details', 'Priority search listing'],
        },
        {
          name: 'Platinum',
          price: 1999,
          duration_days: 180,
          description: 'Top tier with all features unlocked',
          features: ['All Gold features', 'Profile boost', 'Dedicated support'],
        },
      ];

      const createdPlans = await MembershipPlan.insertMany(plans);

      res.status(201).json({
        status: true,
        message: 'Membership plans seeded successfully',
        data: createdPlans,
      });
    } catch (error) {
      console.error('Seed Error:', error);
      res.status(500).json({
        status: false,
        message: 'Failed to seed membership plans',
        error: error.message,
      });
    }
  };







  exports.fetchUserRooms = async (req, res) => {
    try {
      const { my_user_id } = req.body;

      const rooms = await ChatRoom.find({
        participants: my_user_id,
        status: 'accepted',
      }).populate('participants');

      const result = [];

      for (let room of rooms) {
        const otherUser = room.participants.find(
          (u) => u._id.toString() !== my_user_id
        );

        // Skip if other user was deleted
        if (!otherUser) continue;

        const lastMessage = await Message.findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'full_name profile')
          .lean();

  const unreadMessagesCount = await Message.countDocuments({
    room: room._id,
    receiver: my_user_id,
    status: { $in: ['sent', 'delivered'] },
  });


        const roomObj = {
          _id: room._id,
          participants: room.participants.map(p => p._id.toString()),
          status: room.status,
          isGroup: false,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          __v: room.__v,

          // 🆕 Additions for UI
          user: {
            id: otherUser._id,
            full_name: otherUser.full_name,
            email: otherUser.email,
            profile: otherUser.profile,
            isOnline: otherUser.isOnline,
            lastSeen: otherUser.lastSeen,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage._id,
                content: lastMessage.content,
                type: lastMessage.type,
                status: lastMessage.status,
                timestamp: lastMessage.createdAt,
                sender: lastMessage.sender
                  ? {
                      id: lastMessage.sender._id,
                      full_name: lastMessage.sender.full_name,
                      profile: lastMessage.sender.profile,
                    }
                  : null,
              }
            : null,
          unreadMessagesCount,
        };

        result.push(roomObj);
      }


// Sort the rooms by the timestamp of the last message (descending)
result.sort((a, b) => {
  const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
  const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
  return timeB - timeA;
});


      return res.json({
        status: true,
        message: 'Fetched user rooms',
        data: result,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };



  exports.fetchPendingRooms = async (req, res) => {
    try {
      const { my_user_id } = req.body;

      const rooms = await ChatRoom.find({
        participants: my_user_id,
        status: 'pending',
      }).populate('participants');

      const result = [];

      for (let room of rooms) {
        const otherUser = room.participants.find(
          (u) => u._id.toString() !== my_user_id
        );

        const lastMessage = await Message.findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'full_name profile')
          .lean();

  const allMessages = await Message.find({
    room: room._id,
    receiver: my_user_id,
  }).select('status');

  let sentCount = 0;
  let deliveredCount = 0;
  let seenCount = 0;

  allMessages.forEach(msg => {
    if (msg.status === 'sent') sentCount++;
    else if (msg.status === 'delivered') deliveredCount++;
    else if (msg.status === 'seen') seenCount++;
  });

  const unreadMessagesCount = sentCount + deliveredCount; // messages not yet marked as 'seen'


        const roomObj = {
          _id: room._id,
          participants: room.participants.map(p => p._id.toString()),
          status: room.status,
          isGroup: false,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          __v: room.__v,

          // 🆕 Additions for UI
          user: {
            id: otherUser._id,
            full_name: otherUser.full_name,
            email: otherUser.email,
            profile: otherUser.profile,
            isOnline: otherUser.isOnline,
            lastSeen: otherUser.lastSeen,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage._id,
                content: lastMessage.content,
                type: lastMessage.type,
                status: lastMessage.status,
                timestamp: lastMessage.createdAt,
                sender: lastMessage.sender
                  ? {
                      id: lastMessage.sender._id,
                      full_name: lastMessage.sender.full_name,
                      profile: lastMessage.sender.profile,
                    }
                  : null,
              }
            : null,
          unreadMessagesCount,
        };

        result.push(roomObj);
      }

      return res.json({
        status: true,
        message: 'Fetched pending rooms',
        data: result,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'An error occurred' });
    }
  };



  exports.fetchMessages = async (req, res) => {
    try {
      const { roomId, page = 1, limit = 20 } = req.body;

      if (!roomId) {
        return res.status(400).json({ status: false, message: 'roomId is required' });
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({ room: roomId })
        .sort({ createdAt: -1 }) // Send newest first (latest at top)
        .skip(skip)
        .limit(Number(limit))
        .populate('sender', 'full_name profile')
        .lean();

      const totalCount = await Message.countDocuments({ room: roomId });

      return res.json({
        status: true,
        message: 'Messages fetched successfully',
        data: {
          messages, // No reverse here
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
      });
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };



  exports.fetchOrGenerateRoom = async (req, res) => {
    try {
      const { userA_id, userB_id } = req.body;

      // Validate input
      if (!userA_id || !userB_id) {
        return res.status(400).json({
          status: false,
          message: 'Both userA_id and userB_id are required',
          room: null,
        });
      }

      // Check for invalid userB_id (zero, null, empty string)
      if (
        userB_id == "0" ||
        userB_id == 0 ||
        userB_id === 0 ||
        userB_id === '0' ||
        userB_id === null ||
        userB_id === '' ||
        typeof userB_id === 'undefined'
      ) {
        console.warn('Invalid userB_id:', userB_id);
        return res.status(400).json({
          status: false,
          message: 'Invalid userB_id. Room cannot be created.',
          room: null,
        });
      }

      // Try to find existing room
      let room = await ChatRoom.findOne({
        participants: { $all: [userA_id, userB_id], $size: 2 },
        isGroup: false,
      });

      // // If not found, create new
      // if (!room) {
      //   room = await ChatRoom.create({
      //     participants: [userA_id, userB_id],
      //     isGroup: false,
      //     status: 'accepted',
      //     createdAt: new Date(),
      //   });
      // }

      return res.json({
        status: true,
        message: 'Room ID fetched successfully',
        room,
      });
    } catch (err) {
      console.error('❌ Error in fetchRoomId:', err);
      return res.status(500).json({
        status: false,
        message: 'Server error while fetching or creating room',
        room: null,
      });
    }
  };




  exports.fetchUserNotification = async (req, res) => {
    try {
      const { my_user_id, page = 1, limit = 20 } = req.body;

      if (!my_user_id) {
        return res.status(400).json({
          status: false,
          message: "Missing my_user_id",
        });
      }

      const notifications = await Notification.find({ toUser: my_user_id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('fromUser', 'full_name profile')
        .lean();

      const total = await Notification.countDocuments({ toUser: my_user_id });

      return res.json({
        status: true,
        message: "Notifications fetched successfully",
        data: notifications,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Fetch Notifications Error:", error);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
      });
    }
  };



  exports.getProfileVisitorSummary = async (req, res) => {
    const { my_user_id, type, page = 1, limit = 20 } = req.body;

    if (!my_user_id) {
      return res.status(400).json({
        status: false,
        message: 'my_user_id is required',
      });
    }

    if (!type || !['i_viewed', 'they_viewed_me', 'mutual'].includes(type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid or missing type. Use "i_viewed", "they_viewed_me", or "mutual".',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    try {
      let result = [];
      let iViewedRaw = [];
      let theyViewedRaw = [];

      // Populate config
  const populateUser = {
  //  select: '_id fullName profile location caste gotra family',
    populate: [
      { path: 'location.country', model: 'Country' },  // returns full country object
      { path: 'location.state', model: 'State' },      // full state object
      { path: 'location.city', model: 'City' },        // ✅ full city object
      { path: 'caste', model: 'Caste' },
      { path: 'gotra', model: 'Gotra' },
      { path: 'family.basedOut.country', model: 'Country' },
      { path: 'family.basedOut.state', model: 'State' },
      { path: 'family.basedOut.city', model: 'City' }
    ]
  };


      // Fetch visitors
      if (type === 'i_viewed' || type === 'mutual') {
        iViewedRaw = await RecentVisitor.find({ visitor: my_user_id })
          .sort({ lastVisitedAt: -1 })
          .populate({ path: 'visited', model: 'User', ...populateUser });
      }

      if (type === 'they_viewed_me' || type === 'mutual') {
        theyViewedRaw = await RecentVisitor.find({ visited: my_user_id })
          .sort({ lastVisitedAt: -1 })
          .populate({ path: 'visitor', model: 'User', ...populateUser });
      }

  const extractUserData = (user, visit) => {
    return {
      _id: user._id,
      full_name: user.full_name,         // e.g. "John Doe"
      username: user.username,         // e.g. "johndoe123"
      height: user.height || null,     // e.g. "5'8\""
      dob: user.dob || null,           // e.g. "1990-01-01"
      profile: user.profile,
      caste: user.caste,
      gotra: user.gotra,
      location: {
        country: user.location?.country || null,
        state: user.location?.state || null,
        city: user.location?.city || null,
      },
      basedOut: {
        country: user.family?.basedOut?.country || null,
        state: user.family?.basedOut?.state || null,
        city: user.family?.basedOut?.city || null,
      },
      lastVisitedAt: visit.lastVisitedAt,
      visitCount: visit.count || 1,
    };
  };


      if (type === 'i_viewed') {
        const paginated = iViewedRaw
          .filter(item => item.visited && item.visited._id.toString() !== my_user_id)
          .slice(skip, skip + parsedLimit);

        result = paginated.map(item => extractUserData(item.visited, item));
      }

      if (type === 'they_viewed_me') {
        const paginated = theyViewedRaw
          .filter(item => item.visitor && item.visitor._id.toString() !== my_user_id)
          .slice(skip, skip + parsedLimit);

        result = paginated.map(item => extractUserData(item.visitor, item));
      }

      if (type === 'mutual') {
        const iViewedMap = new Map(iViewedRaw.map(v => [v.visited?._id?.toString(), v]));
        const theyViewedMap = new Map(theyViewedRaw.map(v => [v.visitor?._id?.toString(), v]));

        const mutualIds = [...iViewedMap.keys()].filter(id => theyViewedMap.has(id) && id !== my_user_id);

        const mutualUsers = mutualIds.map(id => {
          const item = iViewedMap.get(id);
          return extractUserData(item.visited, item);
        });

        mutualUsers.sort((a, b) => new Date(b.lastVisitedAt) - new Date(a.lastVisitedAt));
        result = mutualUsers.slice(skip, skip + parsedLimit);
      }

      return res.json({
        status: true,
        message: 'Visitor data fetched successfully',
        type,
        page: parseInt(page),
        limit: parsedLimit,
        total: result.length,
        data: result,
      });

    } catch (error) {
      console.error('Error fetching visitor summary:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal Server Error',
      });
    }
  };



  // =======================
  // LocationController.js
  // =======================

  const Country = require('../models/Country');
  const State = require('../models/State');
  const City = require('../models/City');
  const Interest = require('../models/Interest');

  // ---------- Country Listing ----------
  exports.countries = async (req, res) => {
    try {
      const { search = '', page = 1, limit = 20 } = req.body;

      const query = {
        name: { $regex: search, $options: 'i' },
      };

      const [data, total] = await Promise.all([
        Country.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(Number(limit)),
        Country.countDocuments(query),
      ]);

      res.json({ status: true, data, total });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  };

  // ---------- State Listing ----------
  exports.states = async (req, res) => {
    try {
      const { search = '', countryId, page = 1, limit = 200 } = req.body;

      const query = {
        name: { $regex: search, $options: 'i' },
        ...(countryId && { country: countryId }),
      };

      const [data, total] = await Promise.all([
        State.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(Number(limit)),
        State.countDocuments(query),
      ]);

      res.json({ status: true, data, total });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  };

  // ---------- City Listing ----------
  exports.cities = async (req, res) => {
    try {
      const { search = '', stateId, state, page = 1, limit = 200, cityId, radius = 50 } = req.body;

      // Accept both 'stateId' and 'state' parameters
      const stateFilter = stateId || state;

      // If cityId and radius provided, find nearby cities
      if (cityId && radius) {
        const sourceCity = await City.findById(cityId);
        
        if (!sourceCity || !sourceCity.latitude || !sourceCity.longitude) {
          return res.json({ 
            status: false, 
            message: 'City not found or coordinates not available',
            data: [],
            total: 0 
          });
        }

        // Find cities with coordinates
        const allCities = await City.find({
          latitude: { $ne: null },
          longitude: { $ne: null },
          _id: { $ne: cityId } // Exclude source city
        });

        // Calculate distance and filter
        const nearbyCities = allCities
          .map(city => {
            // Haversine formula for distance calculation
            const R = 6371; // Earth's radius in km
            const dLat = (city.latitude - sourceCity.latitude) * Math.PI / 180;
            const dLon = (city.longitude - sourceCity.longitude) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(sourceCity.latitude * Math.PI / 180) * Math.cos(city.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;

            return { ...city.toObject(), distance };
          })
          .filter(city => city.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit);

        return res.json({ 
          status: true, 
          data: nearbyCities, 
          total: nearbyCities.length,
          sourceCity: {
            _id: sourceCity._id,
            name: sourceCity.name,
            latitude: sourceCity.latitude,
            longitude: sourceCity.longitude
          }
        });
      }

      // Standard search without nearby filter
      const query = {
        name: { $regex: search, $options: 'i' },
        ...(stateFilter && { state: stateFilter }),
      };

      const [data, total] = await Promise.all([
        City.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(Number(limit)),
        City.countDocuments(query),
      ]);

      res.json({ status: true, data, total });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  };







// This file likely contains the exports.fetchTrendingProfiles function

const FriendshipRequest = require('../models/FriendShipRequest');
const mongoose = require('mongoose');
exports.fetchTrendingProfiles = async (req, res) => {
  try {
    console.log('API Call: Fetching trending profiles...');
    const { my_user_id, limit = 10, days = 7 } = req.body;
    console.log('Parameters:', { my_user_id, limit, days });

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const myUser = await User.findById(my_user_id).lean();
    const blocked = myUser?.blocked?.map(id => id.toString()) || [];

    // Helper: fetch users by IDs
    const fetchUsersByIds = async (ids) => {
      const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
      return User.find({
        _id: { $in: objectIds },
        gender: { $ne: myUser?.gender } // exclude same gender
      })
      .populate('membershipPlan interests location.country location.state location.city caste gotra profession')
      .lean();
    };

    // ---------------------- Precompute all view counts ----------------------
    const allViewsAgg = await RecentVisitor.aggregate([
      { $match: { lastVisitedAt: { $gte: sinceDate } } },
      { $group: { _id: "$visited", views: { $sum: "$count" } } }
    ]);
    const viewsMap = {};
    allViewsAgg.forEach(entry => {
      viewsMap[entry._id.toString()] = entry.views;
    });

    // ---------------------- Helper: simplify user ----------------------
    const simplifyUser = (user) => {
      if (!user) return null;
      return {
        id: user._id,
        name: user.full_name || '',
        dob: user.dob || null,
          profile: user.profile || null,
        profession: user.profession?.name || '',
        location: user.location?.city?.name || '',
        views: viewsMap[user._id.toString()] || 0, // attach precomputed views
        verified: !!user.is_verified,
      };
    };

    // ---------------------- Category 1: Most Viewed -----------------------
    const mostViewedAgg = await RecentVisitor.aggregate([
      { $match: { lastVisitedAt: { $gte: sinceDate } } },
      { $group: { _id: "$visited", views: { $sum: "$count" } } },
      { $sort: { views: -1 } },
      { $limit: limit }
    ]);

    let mostViewedUser = null;
    for (const entry of mostViewedAgg) {
      const users = await fetchUsersByIds([entry._id]);
      const user = users[0];
      if (user && !blocked.includes(user._id.toString())) {
        mostViewedUser = user;
        break;
      }
    }

    // ---------------------- Category 2: Most Liked -----------------------
    const mostLikedAgg = await FriendshipRequest.aggregate([
      { $match: { status: 'pending', createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$recipient", interests: { $sum: 1 } } },
      { $sort: { interests: -1 } },
      { $limit: limit }
    ]);

    let mostLikedUser = null;
    for (const entry of mostLikedAgg) {
      const users = await fetchUsersByIds([entry._id]);
      const user = users[0];
      if (user && !blocked.includes(user._id.toString())) {
        user.interests = entry.interests;
        mostLikedUser = user;
        break;
      }
    }

    // ---------------------- Category 3: Most Shortlisted -----------------------
    const mostShortlistedAgg = await Shortlist.aggregate([
      { $match: { status: true, createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$shortlistedUserId", shortlists: { $sum: 1 } } },
      { $sort: { shortlists: -1 } },
      { $limit: limit }
    ]);

    let mostShortlistedUser = null;
    for (const entry of mostShortlistedAgg) {
      const users = await fetchUsersByIds([entry._id]);
      const user = users[0];
      if (user && !blocked.includes(user._id.toString())) {
        user.shortlists = entry.shortlists;
        mostShortlistedUser = user;
        break;
      }
    }

    // ---------------------- Category 4: New Members -----------------------
    const newMemberAgg = await User.aggregate([
      { $match: {
          createdAt: { $gte: sinceDate },
          is_block: 0,
          is_active: true,
          _id: { $nin: blocked.map(id => new mongoose.Types.ObjectId(id)) }
      }},
      { $sort: { createdAt: -1 } },
      { $limit: limit }
    ]);

    let newMemberUser = null;
    if (newMemberAgg.length > 0) {
      const users = await fetchUsersByIds([newMemberAgg[0]._id]);
      newMemberUser = users[0] || null;
    }

    // ---------------------- Category 5: Active Users -----------------------
    const activeUserAgg = await User.aggregate([
      { $match: {
          lastLoginAt: { $gte: sinceDate },
          is_block: 0,
          is_active: true,
          _id: { $nin: blocked.map(id => new mongoose.Types.ObjectId(id)) }
      }},
      { $sort: { lastLoginAt: -1 } },
      { $limit: limit }
    ]);

    let activeUser = null;
    if (activeUserAgg.length > 0) {
      const users = await fetchUsersByIds([activeUserAgg[0]._id]);
      activeUser = users[0] || null;
    }

    // ---------------------- Category 6: Featured -----------------------
    const featuredAgg = await User.aggregate([
      { $match: {
          is_featured: true,
          is_block: 0,
          is_active: true,
          _id: { $nin: blocked.map(id => new mongoose.Types.ObjectId(id)) }
      }},
      { $sort: { updatedAt: -1 } },
      { $limit: limit }
    ]);

    let featuredUser = null;
    if (featuredAgg.length > 0) {
      const users = await fetchUsersByIds([featuredAgg[0]._id]);
      featuredUser = users[0] || null;
    }

    // ---------------------- Construct Final Response -----------------------
    const trendingProfilesRaw = [
      { label: "Most Viewed", user: simplifyUser(mostViewedUser), gradient: ["#FF6B6B", "#FF8E53"], bgGradient: ["#FFF5F5", "#FFF8F6"] },
      { label: "Most Liked", user: simplifyUser(mostLikedUser), gradient: ["#E91E63", "#FF6B9D"], bgGradient: ["#FFF0F6", "#FFF5F9"] },
      { label: "Most Shortlisted", user: simplifyUser(mostShortlistedUser), gradient: ["#3F51B5", "#5C6BC0"], bgGradient: ["#E8EAF6", "#E3E7F9"] },
      { label: "New Members", user: simplifyUser(newMemberUser), gradient: ["#4CAF50", "#81C784"], bgGradient: ["#F1F8E9", "#F8FFF4"] },
      { label: "Active Users", user: simplifyUser(activeUser), gradient: ["#FF9800", "#FFC107"], bgGradient: ["#FFF8E1", "#FFFDE7"] },
      { label: "Featured", user: simplifyUser(featuredUser), gradient: ["#9C27B0", "#BA68C8"], bgGradient: ["#F3E5F5", "#FCE4EC"] },
    ];

    const trendingProfiles = trendingProfilesRaw.filter(item => item.user !== null);

    res.json({
      status: true,
      message: "Trending profiles fetched successfully",
      result: trendingProfiles
    });

  } catch (error) {
    console.error("Error fetching trending profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
};


  // ✅ Nearby Matches API (auto-detect user coordinates)



  exports.fetchNearbyMatches = async (req, res) => {
    try {
      const { my_user_id, radiusKm = 50, limit = 10, page = 1 } = req.body;
      const start = (page - 1) * limit;

      const myUser = await User.findById(my_user_id);
      if (!myUser) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      const coords = myUser.coordinates?.coordinates;
      if (!coords || coords.length !== 2 || coords[0] === 0 || coords[1] === 0) {
        return res.status(400).json({ status: false, message: 'User does not have valid coordinates' });
      }

      const [lng, lat] = coords;
      const blockedIds = myUser.blocked?.map(id => id.toString()) || [];

      const users = await User.aggregate([
        {
      $geoNear: {
    near: { type: "Point", coordinates: [lng, lat] },
    distanceField: "distanceInMeters",
    spherical: true,
    maxDistance: radiusKm * 1000,
    key: "coordinates", // 👈 explicitly tell MongoDB to use this index
    query: {
      _id: { $ne: myUser._id, $nin: blockedIds },
      is_block: 0,
      'coordinates.coordinates': { $ne: [0, 0] }
    }
  }

        },
        { $skip: start },
        { $limit: limit },
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ["$distanceInMeters", 1000] }, 2] }
          }
        }
      ]);

      // If you need to populate manually after aggregation:
      const populated = await User.populate(users, [
        { path: 'location.country' },
        { path: 'location.state' },
        { path: 'location.city' },
        { path: 'interests' },
      ]);

      return res.json({
        status: true,
        message: `Users near ${radiusKm} km`,
        data: populated,
      });
    } catch (err) {
      console.error('fetchNearbyMatches error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  };



  // ✅ Daily Top Matches API with Deep AI Logic


  exports.getTopDailyMatches = async (req, res) => {
    try {
      const userId = req.body.my_user_id;
      const limit = parseInt(req.body.limit) || 10;

      if (!userId) return res.status(400).json({ status: false, message: 'my_user_id is required' });

      const currentUser = await User.findById(userId)
        .populate('caste gotra membershipPlan interests')
        .lean();

      if (!currentUser) return res.status(404).json({ status: false, message: 'User not found' });

      const allUsers = await User.find({
        _id: { $ne: userId },
        is_block: 0,
        gender: { $ne: currentUser.gender },
      })
        .populate('caste gotra membershipPlan interests')
        .lean();

      const matchScores = allUsers.map(user => {
        let score = 0;
        const reasons = [];

        // Age matching
        if (currentUser.age && user.preferences?.age_range) {
          if (
            currentUser.age >= (user.preferences.age_range.min || 0) &&
            currentUser.age <= (user.preferences.age_range.max || 99)
          ) {
            score += 10;
            reasons.push("age match");
          }
        }

        // Caste
        if (
          user.preferences?.caste?.length &&
          user.preferences.caste.includes(currentUser.caste?._id?.toString())
        ) {
          score += 15;
          reasons.push("caste match");
        }

        // Gotra
        if (
          user.preferences?.gotra?.length &&
          user.preferences.gotra.includes(currentUser.gotra?._id?.toString())
        ) {
          score += 10;
          reasons.push("gotra match");
        }

        // Religion, qualification, income, occupation
        if (user.preferences?.religion && user.preferences.religion === currentUser.religion) {
          score += 5;
          reasons.push("religion");
        }
        if (
          user.preferences?.qualification &&
          user.preferences.qualification === currentUser.qualification
        ) {
          score += 5;
          reasons.push("qualification");
        }
        if (
          user.preferences?.occupation &&
          user.preferences.occupation === currentUser.profession
        ) {
          score += 5;
          reasons.push("profession");
        }
        if (
          user.preferences?.income &&
          currentUser.income >= user.preferences.income
        ) {
          score += 5;
          reasons.push("income");
        }

        // Location bonus if same city
        if (user.location?.city?.toString() === currentUser.location?.city?.toString()) {
          score += 5;
          reasons.push("same city");
        }

        // AI weight: match % boost for users with similar interest overlap
        const sharedInterests = (currentUser.interests || []).filter(i1 =>
          (user.interests || []).some(i2 => i1._id?.toString() === i2._id?.toString())
        );
        score += sharedInterests.length * 3;
        if (sharedInterests.length) reasons.push("shared interests");

        return {
          user,
          score,
          matchedOn: reasons,
        };
      });

      const sorted = matchScores.sort((a, b) => b.score - a.score).slice(0, limit);

      return res.json({
        status: true,
        message: 'Top daily matches generated',
        data: sorted.map(match => ({
          ...match.user,
          matchScore: match.score,
          matchedOn: match.matchedOn
        }))
      });
    } catch (err) {
      console.error('Error in getTopDailyMatches:', err);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };




  // GET /api/users/highlighted
  exports.fetchHighlightedUsers = async (req, res) => {
    try {
      const users = await User.find({ is_highlighted: true })
        .select('full_name email gender location membershipPlan profile is_top_user') // adjust fields as needed
        .populate('location.country')
        .populate('location.state')
        .populate('location.city')
        .populate('membershipPlan')
        .lean();

      res.json({
        status: true,
        message: 'Highlighted users fetched successfully',
        data: users,
      });
    } catch (error) {
      console.error('Error fetching highlighted users:', error);
      res.status(500).json({
        status: false,
        message: 'Failed to fetch highlighted users',
        error: error.message,
      });
    }
  };





  // API: Get Most Active Members
  exports.mostactive = async (req, res) => {
    try {
      const limit = parseInt(req.body.limit) || 10;
      const includeTimeSpent = req.body.includeTimeSpent || false;

      const users = await User.find({ is_block: 0 })
        .populate("membershipPlan")
        .lean();

      const userIds = users.map((u) => u._id);

      const [sentRequests, receivedRequests, shortlists, visitors] = await Promise.all([
        FriendShipRequest.aggregate([
          { $match: { requester: { $in: userIds } } },
          { $group: { _id: "$requester", count: { $sum: 1 } } },
        ]),
        FriendShipRequest.aggregate([
          { $match: { recipient: { $in: userIds } } },
          { $group: { _id: "$recipient", count: { $sum: 1 } } },
        ]),
        Shortlist.aggregate([
          { $match: { userId: { $in: userIds }, status: true } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]),
  RecentVisitor.aggregate([
    { $match: { visited: { $in: userIds } } },
    { $group: { _id: "$visited", count: { $sum: 1 } } },
  ]),

      ]);

      const scoreMap = {};
      const boost = (id, score) => {
        scoreMap[id] = (scoreMap[id] || 0) + score;
      };

      sentRequests.forEach((r) => boost(r._id.toString(), r.count * 1.5));
      receivedRequests.forEach((r) => boost(r._id.toString(), r.count * 2));
      shortlists.forEach((s) => boost(s._id.toString(), s.count * 2.5));
      visitors.forEach((v) => boost(v._id.toString(), v.count * 1));

      const scored = users.map((u) => {
        const id = u._id.toString();
        const activityScore = scoreMap[id] || 0;
        const timeSpentScore = includeTimeSpent ? (u.totalTimeSpent || 0) * 0.1 : 0;

        return {
          ...u,
          activityScore,
          timeSpentScore,
          totalScore: activityScore + timeSpentScore,
        };
      });

      const sorted = scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);

      return res.json({
        status: true,
        message: "Most active members ranked by AI-like score and time spent",
        data: sorted,
      });
    } catch (err) {
      console.error("Error in getMostActiveMembers:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };

  const Banner = require('../models/Banner');

  // API: Create Banner
  exports.addBanner = async (req, res) => {
    try {
      console.log("Adding banner:", req.body);
      const banner = new Banner(req.body);
      await banner.save();
      return res.json({ status: true, message: "Banner added" });
    } catch (e) {
      console.error("Add banner error:", e);
      return res.status(500).json({ status: false, message: "Error adding banner" });
    }
  };

  // API: Create 30 Fake Users
  const { v4: uuidv4 } = require('uuid');

  exports.createFakeBatch = async (req, res) => {
    try {
      const { v4: uuidv4 } = require("uuid");

      const users = [];
      for (let i = 0; i < 30; i++) {
        users.push({
          full_name: `Test User ${i + 1}`,
          username: `testuser${i + 1}`,
          email: `testuser${i + 1}@example.com`,
          gender: i % 2 === 0 ? "Male" : "Female",
          city: "CityName",
          profile: "https://via.placeholder.com/150",
          is_premium: i % 3 === 0,
          is_highlighted: i % 5 === 0,
          is_fake: true,
          createdAt: new Date(),

          // ✅ Replace string values with numeric equivalents
          device_token: uuidv4(),
          device_type: 1, // 1 = android, 2 = ios (example mapping)
          login_type: 1  // 1 = manual, 2 = google, 3 = facebook (example mapping)
    
        });
      }

      await User.insertMany(users);
      return res.json({ status: true, message: "30 fake users created" });
    } catch (e) {
      console.error("Fake user batch error:", e);
      return res.status(500).json({ status: false, message: "Error creating fake users" });
    }
  };


  // API: Mark User as Top Listed
  exports.maekusertop = async (req, res) => {
    try {
      const { userId } = req.body;
      await User.findByIdAndUpdate(userId, { is_highlighted: true });
      return res.json({ status: true, message: "User marked as top listed" });
    } catch (e) {
      console.error("Mark top error:", e);
      return res.status(500).json({ status: false, message: "Failed to mark user top" });
    }
  };


  exports.unmarkTopUser = async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findByIdAndUpdate(userId, { is_top_user: false, is_highlighted: false });
      if (!user) return res.status(404).json({ status: false, message: "User not found" });

      return res.json({ status: true, message: "User demoted from top/highlighted status" });
    } catch (err) {
      console.error('unmarkTopUser error:', err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  };




  // Inside UserController.js or a new BannerController.js

  exports.fetchBanner = async (req, res) => {
    try {
      const banners = await Banner.find().sort({ createdAt: -1 }); // latest first
      res.json({
        status: true,
        message: 'Banner list fetched successfully',
        data: banners,
      });
    } catch (err) {
      console.error('Error in fetchBanner:', err);
      res.status(500).json({
        status: false,
        message: 'Failed to fetch banners',
        error: err.message,
      });
    }
  };



  exports.getMarriageIntent = async (req, res) => {
    try {
      const userId = req.body.user_id

      console.log("Calculating marriage intent for user:", userId);
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ status: false, message: "User not foundd" });

      // Core Metrics
      const [
        sentCount,
        acceptedCount,
        shortlistCount,
        viewsMade,
        viewsReceived,
        rejectedCount,
        totalRequestsSent
      ] = await Promise.all([
        FriendShipRequest.countDocuments({ requester: userId }),
        FriendShipRequest.countDocuments({ requester: userId, status: 'accepted' }),
        Shortlist.countDocuments({ userId, status: true }),
        RecentVisitor.countDocuments({ visitor: userId }),
        RecentVisitor.countDocuments({ visited: userId }),
        FriendShipRequest.countDocuments({ requester: userId, status: 'rejected' }),
        FriendShipRequest.countDocuments({ requester: userId }),
      ]);

      // ⏱️ Activity Timing
      const now = new Date();
      const lastActive = new Date(user.lastActive || now);
      const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      const daysRecentlyActive = daysAgo <= 30 ? 30 - daysAgo : 0;

      // 💬 Engagement Consistency Score (based on streak)
      const consistentActivityScore = daysRecentlyActive >= 20 ? 10 : daysRecentlyActive * 0.5;

      // ⌛ Time Spent
      const timeSpentScore = (user.totalTimeSpent || 0) * 0.015;

      // 📄 Profile Richness Boost
      let profileScore = user.profileStrength || 0;
      if (user.preferences?.age_range?.min && user.caste && user.gotra && user.bio && user.dob) {
        profileScore += 20;
      }

      // 😐 Rejection Ratio Penalty
      const rejectionRate = totalRequestsSent ? (rejectedCount / totalRequestsSent) : 0;
      const rejectionPenalty = rejectionRate > 0.4 ? -15 : rejectionRate > 0.25 ? -5 : 0;

      // 🧠 Final Scoring
      const score = (
        (sentCount * 3) +
        (acceptedCount * 5) +
        (shortlistCount * 3) +
        (viewsMade * 0.7) +
        (viewsReceived * 0.6) +
        (profileScore * 0.4) +
        consistentActivityScore +
        timeSpentScore +
        rejectionPenalty
      );

      // 🔍 Final Status
      let intent = "Not Currently Serious";
      if (score >= 120) intent = "🟢 Highly Likely to Marry Soon";
      else if (score >= 65) intent = "🟡 Moderately Likely (in 6–12 months)";
      else if (score >= 30) intent = "🟠 Possibly Interested";

      return res.json({
        status: true,
        message: "Advanced marriage intent analysis",
        data: {
          userId,
          sentCount,
          acceptedCount,
          shortlistCount,
          viewsMade,
          viewsReceived,
          rejectedCount,
          rejectionRate: rejectionRate.toFixed(2),
          totalTimeSpent: user.totalTimeSpent || 0,
          profileStrength: profileScore,
          daysRecentlyActive,
          score: Math.round(score),
          status: intent,
        },
      });
    } catch (err) {
      console.error("Marriage Intent Error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };



  exports.getUserOnlinePattern = async (req, res) => {
    try {
      const userId = req.body.user_id

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const logs = await ActivityLog.find({
        userId,
        timestamp: { $gte: since }
      }).lean();

      if (!logs.length) {
        return res.json({ status: true, message: "No data", data: { pattern: "Unknown" } });
      }

      let dayCount = 0;
      let nightCount = 0;

      logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        if (hour >= 6 && hour < 18) dayCount++;
        else nightCount++;
      });

      let pattern = "Balanced";
      if (dayCount > nightCount * 1.5) pattern = "Mostly Daytime";
      else if (nightCount > dayCount * 1.5) pattern = "Mostly Nighttime";

      return res.json({
        status: true,
        message: "User activity pattern analyzed",
        data: {
          totalSessions: logs.length,
          daytimeSessions: dayCount,
          nighttimeSessions: nightCount,
          pattern,
        },
      });
    } catch (err) {
      console.error("getUserOnlinePattern error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };





  // controllers/UserController.js



  exports.getMatchMomentum = async (req, res) => {
    try {

      const userId = req.body.user_id
      const since = new Date();
      since.setDate(since.getDate() - 7); // last 7 days

      // 1. Get current user's weekly activity
      const [views, interests, replies, shortlists] = await Promise.all([
        RecentVisitor.countDocuments({ visited: userId, createdAt: { $gte: since } }),
        FriendShipRequest.countDocuments({ recipient: userId, createdAt: { $gte: since } }),
        FriendShipRequest.countDocuments({ requester: userId, status: 'accepted', createdAt: { $gte: since } }),
        Shortlist.countDocuments({ userId, status: true, createdAt: { $gte: since } })
      ]);

      const momentumScore = views * 1 + interests * 2 + replies * 3 + shortlists * 2;

      // 2. Compare with all users
      const userIds = await User.find({ is_block: 0 }).select('_id').lean();

      const scores = await Promise.all(userIds.map(async (u) => {
        const [v, i, r, s] = await Promise.all([
          RecentVisitor.countDocuments({ visited: u._id, createdAt: { $gte: since } }),
          FriendShipRequest.countDocuments({ recipient: u._id, createdAt: { $gte: since } }),
          FriendShipRequest.countDocuments({ requester: u._id, status: 'accepted', createdAt: { $gte: since } }),
          Shortlist.countDocuments({ userId: u._id, status: true, createdAt: { $gte: since } })
        ]);
        return v + i * 2 + r * 3 + s * 2;
      }));

      // 3. Calculate percentile
      const lowerScores = scores.filter(s => s < momentumScore).length;
      const percentile = Math.round((lowerScores / scores.length) * 100);

      // 4. Return response
      return res.json({
        status: true,
        message: "Match momentum calculated",
        data: {
          momentumScore,
          percentile,
          label: `🔥 You’re receiving more attention than ${percentile}% of users this week!`,
          chart: { views, interests, replies, shortlists }
        }
      });

    } catch (err) {
      console.error("getMatchMomentum error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };




  const UserPhoto = require('../models/UserPhoto'); // Import this

exports.uploadUserPhotos = async (req, res) => {
  try {
    const userId = req.body.user_id;
    if (!userId) return res.status(400).json({ status: false, message: 'user_id is required' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: false, message: 'No photos uploaded' });
    }

    const savedPhotos = [];

    for (let file of req.files) {
      const newPhoto = new UserPhoto({
        userId: userId,
        imageUrl: file.path.replace(/\\/g, '/'), // Normalize Windows path
      });
      await newPhoto.save();
      savedPhotos.push(newPhoto);
    }

    // ✅ Fetch user for name/profile (for notification)
    const user = await User.findById(userId).select('full_name profile');

    // ✅ Notify recent visitors
    const recentVisitors = await RecentVisitor.find({ visited: userId })
      .populate('visitor', 'device_token');

    const notificationText = `${user.full_name} has uploaded new photos. Take a look!`;

    for (const visit of recentVisitors) {
      const visitor = visit.visitor;

      // ✅ Send Push Notification
      if (visitor.device_token) {
        await sendNotification(
          visitor.device_token,
          'New Photos Uploaded',
          notificationText
        );
      }

      // ✅ Save Notification in DB
      await Notification.create({
        type: 'add_to_gallery',
        fromUser: userId,
        toUser: visitor._id,
        content: notificationText,
        data: {
          userId: userId,
          full_name: user.full_name,
          profile: user.profile,
        }
      });
    }

    res.status(200).json({
      status: true,
      message: 'Photos uploaded successfully',
      data: savedPhotos
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};



  exports.getUserPhotos = async (req, res) => {
    try {
      const userId = req.body.user_id;
      if (!userId) {
        return res.status(400).json({ status: false, message: 'user_id is required' });
      }

      // Rejected photos are excluded from the gallery; pending/approved (and
      // legacy photos with no moderationStatus set) remain visible.
      const photos = await UserPhoto.find({ userId, moderationStatus: { $ne: 'rejected' } })
        .sort({ order: 1, uploadedAt: -1 });

      return res.status(200).json({
        status: true,
        message: 'User photos fetched successfully',
        data: photos
      });
    } catch (error) {
      console.error('Fetch error:', error);
      return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
  };



  exports.setMainProfileImage = async (req, res) => {
    try {

      console.log("setMainProfileImage called with:", req.body);  
      const { user_id, image_id } = req.body;

      if (!user_id || !image_id) {
        return res.status(400).json({ status: false, message: 'user_id and image_id are required' });
      }

      const image = await UserPhoto.findOne({ _id: image_id, userId: user_id });
      if (!image) {
        return res.status(404).json({ status: false, message: 'Image not found for this user' });
      }

      console.log("Setting main profile image:", image);

      // Set all images of this user to isProfile: false
      await UserPhoto.updateMany({ userId: user_id }, { isProfile: false });

      // Set the selected image to isProfile: true
      image.isProfile = true;
      await image.save();

      // Update user's main profile image URL
      await User.findByIdAndUpdate(user_id, { profile: image.imageUrl });

      return res.json({
        status: true,
        message: 'Main profile image updated successfully',
        profile: image.imageUrl
      });
    } catch (error) {
      console.error('setMainProfileImage error:', error);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };





  exports.deleteUserPhoto = async (req, res) => {
    try {
      const { user_id, image_id } = req.body;

      if (!user_id || !image_id) {
        return res.status(400).json({ status: false, message: 'user_id and image_id are required' });
      }

      const image = await UserPhoto.findOne({ _id: image_id, userId: user_id });
      if (!image) {
        return res.status(404).json({ status: false, message: 'Image not found for this user' });
      }

      // If the image is the current profile image, remove it from User as well
      const user = await User.findById(user_id);
      if (user && user.profile === image.imageUrl) {
        user.profile = null;
        await user.save();
      }

      // Delete the image file from disk if stored locally
      const filePath = path.join(__dirname, '..', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove the image record from the database
      await image.deleteOne();

      return res.json({
        status: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      console.error('deleteUserPhoto error:', error);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };




  exports.reorderUserPhotos = async (req, res) => {
    try {
      const { user_id, ordered_ids } = req.body;

      if (!user_id || !Array.isArray(ordered_ids)) {
        return res.status(400).json({ status: false, message: 'Invalid request' });
      }

      const bulkOps = ordered_ids.map((photoId, index) => ({
        updateOne: {
          filter: { _id: photoId, userId: user_id },
          update: { $set: { order: index } }
        }
      }));

      await require('../models/UserPhoto').bulkWrite(bulkOps);

      return res.status(200).json({
        status: true,
        message: 'Photo order updated successfully'
      });
    } catch (error) {
      console.error('Reorder photo error:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal server error'
      });
    }
  };





  exports.detectHighInterestSignal = async (req, res) => {
    try {
      const { my_user_id } = req.body; // logged-in user

      if (!my_user_id) {
        return res.status(400).json({ status: false, message: 'my_user_id is required' });
      }

      // Find all people who viewed this user multiple times
      const recentViews = await RecentVisitor.find({ visited: my_user_id }).populate('visitor');

      const highlyInterested = [];

      for (const view of recentViews) {
        const timeDiff = (Date.now() - new Date(view.updatedAt)) / (1000 * 60 * 60 * 24); // days ago
        const lastNotified = await Notification.findOne({
          type: 'interest_detected',
          fromUser: view.visitor._id,
          toUser: my_user_id,
        }).sort({ createdAt: -1 });

        const lastNotifiedDays = lastNotified
          ? (Date.now() - new Date(lastNotified.createdAt)) / (1000 * 60 * 60 * 24)
          : Infinity;

        if (view.count >= 3 && timeDiff <= 2 && lastNotifiedDays > 7) {
          highlyInterested.push(view.visitor);

          // Send Notification
          const content = `${view.visitor.full_name} has visited your profile multiple times. They might be interested in you.`;

          await Notification.create({
            type: 'interest_detected',
            fromUser: view.visitor._id,
            toUser: my_user_id,
            content,
          });


          // ✅ Emit updated notification count via socket
  const totalUnread = await Notification.countDocuments({
    toUser: my_user_id,
    isRead: false,
  });

  const socketId = onlineUsers.get(my_user_id?.toString());
  if (socketId) {
    io.to(socketId).emit('notification_count', { total: totalUnread });
  }

          if (view.visitor.device_token) {
            await sendNotification(view.visitor.device_token, 'Someone is interested in you!', content);
          }
        }
      }

      return res.json({
        status: true,
        message: `${highlyInterested.length} interest signals detected.`,
        interestedUsers: highlyInterested.map(u => ({
          _id: u._id,
          full_name: u.full_name,
          profile: u.profile
        }))
      });
    } catch (error) {
      console.error('detectHighInterestSignal error:', error);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };



  // POST /api/notifications/mark-read
  exports.markNotificationsRead = async (req, res) => {
    const { my_user_id } = req.body;

    // Mark notifications as read in DB
    await Notification.updateMany({ toUser: my_user_id }, { isRead: true });

    // Emit new count (0)
    const io = getIO();
    io.to(my_user_id).emit('notification_count', { total: 0 });

    res.json({ status: true, message: 'Notifications marked as read' });
  };




















exports.searchProfiles = async (req, res) => {
  try {
    const userId = req.body.my_user_id;
    const limit = parseInt(req.body.limit) || 10;
    const page = parseInt(req.body.page) || 1;
    const start = (page - 1) * limit;
    const filters = req.body.filters || {};
    const onlyProWithPlan = req.body.onlyProWithPlan || false;
    const sortByNewUsers = req.body.sortByNewUsers || false;
    const isVerify = req.body.isVerify || false;
    const recentlyActive = req.body.recentlyActive || false;
    const nearby = req.body.nearby || false;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const maxDistanceKm = req.body.maxDistanceKm || 50;
    const privacyLockedOnly = req.body.privacyLockedOnly || false;

    if (!userId) return res.status(400).json({ status: false, message: 'my_user_id is required' });

    const currentUser = await User.findById(userId).populate('membershipPlan');
    if (!currentUser) return res.status(404).json({ status: false, message: 'User not found' });

    const now = Date.now();

    // ⛔ Exclude Blocked / Connected / Cancelled users
    const [blocked, connections, canceled] = await Promise.all([
      Block.find({ blocker: userId }).distinct("blocked"),
      FriendShipRequest.find({ 
        $or: [{ requester: userId }, { recipient: userId }],
        status: { $in: ["accepted", "pending", "rejected", "cancelled"] }
      }).then(reqs => reqs.flatMap(r => [r.requester.toString(), r.recipient.toString()])),
      FriendShipRequest.find({
        $or: [{ requester: userId, status: "cancelled" }, { recipient: userId, status: "cancelled" }]
      }).then(reqs => reqs.flatMap(r => [r.requester.toString(), r.recipient.toString()]))
    ]);

    const excludedIds = new Set([
      userId,
      ...blocked,
      ...connections,
      ...canceled
    ].map(id => id.toString()));

    const currentUserGender = currentUser.gender || '';

    // 🔍 Base query
    let baseQuery = {
      _id: { $nin: Array.from(excludedIds) },
      is_block: 0,
      gender: { $nin: [currentUserGender, null, '', 'Not specified'] }
    };

    if (recentlyActive) {
      baseQuery.lastSeen = { $gte: new Date(now - 48 * 3600 * 1000) };
    }

    if (nearby && lat && lng) {
      baseQuery.coordinates = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceKm * 1000
        }
      };
    }

    // 🌐 Projection
    const projection = {
      full_name: 1, username: 1, emailAddress: 1, profile: 1, dob: 1, height: 1,
      maritalStatus: 1, income: 1, caste: 1, gotra: 1, qualification: 1,
      profession: 1, is_verified: 1, lastSeen: 1, isOnline: 1,
      createdAt: 1, location: 1, gender: 1, 'family.basedOut': 1,
      membershipPlan: 1
    };

    const populatePaths = [
      'membershipPlan',
      'location.country', 'location.state', 'location.city',
      'caste', 'gotra', 'gender', 'profession', 'qualification',
      'incomeRange',
      'family.basedOut.city', 'family.basedOut.state', 'family.basedOut.country'
    ];

    // 🚀 Fetch users
    let users = await User.find(baseQuery, projection).populate(populatePaths).lean();

    const getAge = dob => {
      if (!dob) return 0;
      const birth = new Date(dob);
      return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    };

    // 🧠 AI-style scoring
    users = users
      .map(u => {
        const age = getAge(u.dob);
        const height = u.height;
        const lastSeen = u.lastSeen ? new Date(u.lastSeen) : null;
        const isOnlineRecently = lastSeen && (now - lastSeen.getTime()) < (2 * 3600 * 1000);
        const daysSinceSignup = (now - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const hasPremium = u.membershipPlan && ['Silver', 'Gold', 'Platinum'].includes(u.membershipPlan.name);
        const hasProfilePic = u.profile && u.profile.length > 0;

        const score =
          (u.isOnline ? 40 : 0) +
          (isOnlineRecently ? 30 : 0) +
          (hasPremium ? 20 : 0) +
          (hasProfilePic ? 10 : 0) +
          (daysSinceSignup < 7 ? 15 : 0);

        return {
          ...u,
          age,
          heightInInches: height,
          isJustJoined: daysSinceSignup < 7,
          _aiScore: score
        };
      })
      .filter(user => {
        if (filters.age_range) {
          const min = filters.age_range.min;
          const max = filters.age_range.max;
          if (user.age < min || user.age > max) return false;
        }
        if (filters.height_range) {
          const min = filters.height_range.min;
          const max = filters.height_range.max;
          if (user.heightInInches < min || user.heightInInches > max) return false;
        }
        if (filters.marital_status && user.maritalStatus !== filters.marital_status) return false;
        if (filters.income && user.income !== filters.income) return false;
        if (filters.caste?.length && (!user.caste || !filters.caste.includes(user.caste._id?.toString()))) return false;
        if (filters.gotra?.length && (!user.gotra || !filters.gotra.includes(user.gotra._id?.toString()))) return false;

        // Qualification filter
        if (filters.qualification?.length > 0) {
          if (!user.qualification) return false;
          const uq = user.qualification._id?.toString() || user.qualification.toString();
          if (!filters.qualification.includes(uq)) return false;
        }

        if (filters.profession?.length > 0) {
          if (!user.profession) return false;
          const up = user.profession._id?.toString() || user.profession.toString();
          if (!filters.profession.includes(up)) return false;
        }

        return true;
      });

    // 🔎 Filter post-score
    if (onlyProWithPlan) {
      users = users.filter(u => u.membershipPlan && ['Silver', 'Gold', 'Platinum'].includes(u.membershipPlan.name));
    }

    if (isVerify) {
      users = users.filter(u => u.is_verified === 1);
    }

    if (sortByNewUsers) {
      users = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      users = users.sort((a, b) => b._aiScore - a._aiScore);
    }

    // 📊 Log search
    const paginated = users.slice(start, start + limit);
    await Promise.all(
      paginated.map(u => SearchLog.create({ searcher: userId, target: u._id }))
    );

    // 🔔 Notify each searched user if they've been searched 3+ times in last 24 hours
    const io = getIO();
    const nowDate = new Date(now - 24 * 60 * 60 * 1000);

for (const u of paginated) {
  const recentUniqueSearchers = await SearchLog.aggregate([
    {
      $match: {
        target: u._id,
        searchedAt: { $gte: nowDate }
      }
    },
    {
      $group: {
        _id: "$searcher"  // Group by searcher to get unique users
      }
    },
    {
      $count: "uniqueSearchers"
    }
  ]);

  const count = recentUniqueSearchers[0]?.uniqueSearchers || 0;

  if (count >= 3) {
    const payload = {
      message: `${count} people searched for your profile in the last 24 hours.`,
      count: count
    };

    const socketId = onlineUsers.get(u._id.toString());

    if (socketId) {
      io.to(socketId).emit('profile_searched_ping', payload);
    } else {
      const user = await User.findById(u._id);
      if (user?.device_token) {
        await sendNotification(
          user.device_token,
          '📊 You’re getting noticed!',
          payload.message
        );
      }
    }

    // 🗂️ Save notification to DB
    await Notification.create({
      type: 'profile_search_alert',
      fromUser: null,
      toUser: u._id,
      content: payload.message,
      data: { count: count }
    });
  }
}

    return res.json({
      status: true,
      message: 'AI-based filtered profiles',
      data: paginated
    });

  } catch (err) {
    console.error('❌ Error in searchProfiles:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};





















































































  // controller/matchingController.js

  function buildSmartRegex(search) {
    const normalized = search.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');

    // Allow flexible matching like b.*t.*e.*c.*h
    const fuzzyPattern = normalized.split('').join('.*');
    return new RegExp(fuzzyPattern, 'i');
  }

  exports.fetchQualificationList = async (req, res) => {
    try {
      const { search = '' } = req.body;
      const regex = buildSmartRegex(search);

      const list = await Qualification.find({
        name: { $regex: regex },
      })
        .sort({ name: 1 })
        .limit(50);

      res.json({
        status: true,
        message: 'Qualification list fetched successfully',
        data: list,
      });
    } catch (error) {
      console.error('fetchQualificationList error:', error);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  };

  exports.fetchProfessionList = async (req, res) => {
    try {
      const { search = '' } = req.body;
      const regex = buildSmartRegex(search);

      const list = await Profession.find({
        name: { $regex: regex },
      })
        .sort({ name: 1 })
        .limit(50);

      res.json({
        status: true,
        message: 'Profession list fetched successfully',
        data: list,
      });
    } catch (error) {
      console.error('fetchProfessionList error:', error);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  };




  const IncomeRange = require('../models/IncomeRange');
  const reportReason = require('../models/ReportReason');
  const UserReport = require('../models/UserReport');
  const { model } = require('mongoose');

  // GET all income ranges (sorted by sortOrder)
  exports.fetchIncomeRange = async (req, res) => {
    try {
      const list = await IncomeRange.find().sort({ sortOrder: 1 });
      res.json({ status: true, data: list });
    } catch (err) {
      console.error("Fetch Income Ranges Error:", err);
      res.status(500).json({ status: false, message: "Failed to fetch income ranges" });
    }
  };



  // GET /api/report-reasons
  exports.fetchReportReasons = async (req, res) => {
    try {
      const reasons = await reportReason.find({ is_active: true });
      res.json({ status: true, message: 'Reasons fetched', data: reasons });
    } catch (err) {
      res.status(500).json({ status: false, message: 'Failed to fetch reasons' });
    }
  };





  exports.reportUser = async (req, res) => {

    const { my_user_id, user_id, reason, desc } = req.body;

    if (!my_user_id || !user_id || !reason) {
      return res.status(400).json({ status: false, message: 'Missing required fields' });
    }

    try {
      // Optional: Check if users exist
      const [reporter, reported] = await Promise.all([
        User.findById(my_user_id),
        User.findById(user_id)
      ]);
      if (!reporter || !reported) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      const report = new UserReport({
        reportedBy: my_user_id,
        reportedUser: user_id,
        reason,
        desc
      });

      await report.save();

      res.json({ status: true, message: 'User reported successfully' });
    } catch (err) {
      console.error('❌ Error reporting user:', err);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  };



  exports.comparePreferencesFit = async (req, res) => {
    const { my_user_id, user_id } = req.body;

    if (!my_user_id || !user_id) {
      return res.status(400).json({ status: false, message: 'Both my_user_id and user_id are required' });
    }

    try {
      const viewer = await User.findById(my_user_id)
        .populate(['qualification', 'profession', 'caste', 'gotra', 'incomeRange', 'interests']);

      const profileOwner = await User.findById(user_id)
        .populate([
          { path: 'preferences.qualification' },
          { path: 'preferences.profession' },
          { path: 'preferences.caste' },
          { path: 'preferences.gotra' },
          { path: 'preferences.incomeRange' },
          { path: 'interests' },
        ])
        .lean();

      if (!viewer || !profileOwner) {
        return res.status(404).json({ status: false, message: 'User(s) not found' });
      }

      const prefs = profileOwner.preferences || {};
      const results = [];
      const commons = [];

      const formatBool = (v) => v === true ? 'Yes' : v === false ? 'No' : '-';
      const formatVal = (v, suffix = '') => (v !== undefined && v !== null) ? `${v}${suffix}` : '-';
      const formatArrNames = (arr) => Array.isArray(arr) ? arr.map(x => x?.name || x).join(', ') : '-';

      const checkArrayMatch = (viewerVal, prefArr) => {
        return Array.isArray(prefArr) && viewerVal
          ? prefArr.some(p => (p._id?.toString() || p) === (viewerVal._id?.toString() || viewerVal))
          : false;
      };

      const addResult = (label, match, viewerVal, prefVal) => {
        results.push({
          label,
          viewerValue: viewerVal || '-',
          expectedValue: prefVal || '-',
          isFit: match,
        });
      };

      // 🔍 Comparison Logic
  // 🔍 Comparison Logic
if (prefs.age_range) {
  const viewerAge = calculateAge(viewer.dob);
  addResult(
    'Age',
    viewerAge !== null ? viewerAge >= prefs.age_range.min && viewerAge <= prefs.age_range.max : false,
    viewerAge !== null ? `${viewerAge} yrs` : '-',
    `${prefs.age_range.min}-${prefs.age_range.max} yrs`
  );
}

      if (prefs.height_range && viewer.height)
        addResult('Height',
          viewer.height >= prefs.height_range.min && viewer.height <= prefs.height_range.max,
          viewer.height,
          `${prefs.height_range.min} to ${prefs.height_range.max}`
        );

      addResult('Caste',
        checkArrayMatch(viewer.caste, prefs.caste),
        viewer.caste?.name,
        formatArrNames(prefs.caste)
      );

      addResult('Gotra',
        checkArrayMatch(viewer.gotra, prefs.gotra),
        viewer.gotra?.name,
        formatArrNames(prefs.gotra)
      );

      addResult('Qualification',
        checkArrayMatch(viewer.qualification, prefs.qualification),
        viewer.qualification?.name,
        formatArrNames(prefs.qualification)
      );

      addResult('Profession',
        checkArrayMatch(viewer.profession, prefs.profession),
        viewer.profession?.name,
        formatArrNames(prefs.profession)
      );

      addResult('Income',
        viewer.incomeRange && (viewer.incomeRange._id?.toString() === prefs.incomeRange?._id?.toString()),
        viewer.incomeRange?.name,
        prefs.incomeRange?.name
      );

      // addResult('Marital Status',
      //   viewer.maritalStatus === prefs.marital_status,
      //   viewer.maritalStatus,
      //   prefs.marital_status
      // );

      // addResult('Has Children',
      //   viewer.children === prefs.children,
      //   formatBool(viewer.children),
      //   formatBool(prefs.children)
      // );

      addResult('Language',
        viewer.language === prefs.language,
        viewer.language,
        prefs.language
      );

      addResult('Smoking',
        viewer.smoking === prefs.smoking,
        formatBool(viewer.smoking),
        formatBool(prefs.smoking)
      );

      addResult('Drinking',
        viewer.drinking === prefs.drinking,
        formatBool(viewer.drinking),
        formatBool(prefs.drinking)
      );

      addResult('Diet',
        viewer.diet === prefs.diet,
        viewer.diet,
        prefs.diet
      );

      // addResult('Body Type',
      //   viewer.bodyType === prefs.bodyType,
      //   viewer.bodyType,
      //   prefs.bodyType
      // );

      // addResult('Complexion',
      //   viewer.complexion === prefs.complexion,
      //   viewer.complexion,
      //   prefs.complexion
      // );

      // addResult('Manglik',
      //   viewer.manglik === prefs.manglik,
      //   viewer.manglik,
      //   prefs.manglik
      // );

      // addResult('Personal Value',
      //   viewer.personalValue === prefs.personalValue,
      //   viewer.personalValue,
      //   prefs.personalValue
      // );

      // addResult('Family Value',
      //   viewer.familyValueId === prefs.familyValueId,
      //   viewer.familyValueId,
      //   prefs.familyValueId
      // );

      // 👥 Common Interests
      const viewerInterestIds = viewer.interests?.map(i => i._id.toString()) || [];
      const profileInterestIds = profileOwner.interests?.map(i => i._id.toString()) || [];
      const commonInterestIds = viewerInterestIds.filter(id => profileInterestIds.includes(id));
      const commonInterestNames = viewer.interests
        ?.filter(i => commonInterestIds.includes(i._id.toString()))
        .map(i => i.title) || [];

      if (commonInterestNames.length > 0)
        commons.push({ label: 'Interests', value: commonInterestNames });

  // 🧠 Common Traits from personalityMap
  if (viewer.personalityMap?.traits && profileOwner.personalityMap?.traits) {
    const viewerTraits = viewer.personalityMap.traits;
    const profileTraits = profileOwner.personalityMap.traits;
    const commonTraits = viewerTraits.filter(t => profileTraits.includes(t));
    if (commonTraits.length > 0) {
      commons.push({ label: 'Traits', value: commonTraits });
    }
  }

  // 🎯 Common Hobbies
  if (viewer.personalityMap?.hobbies && profileOwner.personalityMap?.hobbies) {
    const viewerHobbies = viewer.personalityMap.hobbies;
    const profileHobbies = profileOwner.personalityMap.hobbies;
    const commonHobbies = viewerHobbies.filter(h => profileHobbies.includes(h));
    if (commonHobbies.length > 0) {
      commons.push({ label: 'Hobbies', value: commonHobbies });
    }
  }

  // 🎼 Tone Match
  if (viewer.personalityMap?.tone && profileOwner.personalityMap?.tone) {
    if (viewer.personalityMap.tone === profileOwner.personalityMap.tone) {
      commons.push({ label: 'Tone Match', value: [viewer.personalityMap.tone] });
    }
  }


      // 📊 Summary
      const totalPoints = results.length;
      const matchedPoints = results.filter(r => r.isFit).length;
      const matchPercentage = Math.round((matchedPoints / totalPoints) * 100);

      return res.json({
        status: true,
        message: 'Comparison successful',
        summary: {
          totalPoints,
          matchedPoints,
          matchPercentage,
        },
        matchList: results,
        common: commons,
      });

    } catch (error) {
      console.error('Error in comparePreferencesFit:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal Server Error',
        error: error.message,
      });
    }
  };




  // POST /api/chat/delete-room
  exports.deleteRoom = async (req, res) => {
    const { my_user_id, user_id } = req.body;

    if (!my_user_id || !user_id) {
      return res.status(400).json({
        status: false,
        message: 'Both my_user_id and user_id are required',
      });
    }

    try {
      // Find the chat room
      const room = await ChatRoom.findOne({
        participants: { $all: [my_user_id, user_id], $size: 2 },
        isGroup: false,
      });

      if (!room) {
        return res.status(404).json({
          status: false,
          message: 'Chat room not found',
        });
      }

      // Delete all messages in this room
      await Message.deleteMany({ room: room._id });

      // Optionally delete the room itself
      await ChatRoom.deleteOne({ _id: room._id });

      return res.json({
        status: true,
        message: 'Chat room and messages deleted successfully',
        roomId: room._id,
      });
    } catch (error) {
      console.error('Error deleting chat room:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal server error',
      });
    }
  };




  