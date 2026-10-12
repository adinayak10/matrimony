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

  // A1 identity + A1.3 response projection + A6.12 cascade
  const { resolveCaller, requireSelfOr403 } = require('../middleware/identity');
  const { PUBLIC_USER_SELECT, serializeProfileFor, serializeMany, resolveRelation, resolveRelations, serializeCard } = require('../services/profileSerializer');
  const { cascadeDeleteUser, resolveUploadPath } = require('../services/userCascade');
  const mq = require('../services/matchQuery');
  const { calculateAge: ageOf } = mq;
  const blocks = require('../services/blocks');
  const { getSettings } = require('../services/settingsCache');
  const env = require('../config/env');
  const { effectiveVisibility, unavailableCard } = require('../services/profileSerializer');
  const escapeRegex = require('../utils/escapeRegex');
  const SETTINGS_ENUMS = require('../enum/enum');

  const sendNotification = require('../util/sendNotification');
  const { sendInterestRequestEmail, sendInterestAcceptedEmail, sendProfileViewEmail, sendShortlistEmail } = require('../services/emailService');

  // Accept Friend Request
  const Notification = require('../models/Notification');



  const fs = require("fs");
  const path = require("path");

  // Settings keys a member may change through editProfile, with their validator (A1.4)
  const SETTINGS_RULES = {
    showLocation: 'boolean',
    showIncome: 'boolean',
    profilePicVisibility: SETTINGS_ENUMS.PROFILE_PIC_VISIBILITY_ENUM,
    profilePicRequestRequired: 'boolean',
    allowConnections: SETTINGS_ENUMS.ALLOW_CONNECTIONS_ENUM,
    allowMessages: SETTINGS_ENUMS.ALLOW_MESSAGES_ENUM,
    emailVisibility: SETTINGS_ENUMS.EMAIL_VISIBILITY_ENUM,
    mobileVisibility: SETTINGS_ENUMS.MOBILE_VISIBILITY_ENUM,
    allowNotifications: 'boolean',
    notifyOnInterest: 'boolean',
    notifyOnMessage: 'boolean',
    notifyOnProfileVisit: 'boolean',
  };
  const toBool = (v) => (v === true || v === 'true' || v === 1 || v === '1' ? true : v === false || v === 'false' || v === 0 || v === '0' ? false : undefined);
  // Returns { ok, settings } with unknown keys dropped and bad values reported
  const validateSettings = (input) => {
    const out = {};
    const bad = [];
    for (const [k, rule] of Object.entries(SETTINGS_RULES)) {
      if (!(k in input)) continue;
      const v = input[k];
      if (rule === 'boolean') {
        const b = toBool(v);
        if (b === undefined) bad.push(k); else out[k] = b;
      } else if (Array.isArray(rule)) {
        if (typeof v === 'string' && rule.includes(v)) out[k] = v; else bad.push(k);
      }
    }
    return { ok: bad.length === 0, bad, settings: out };
  };

// Update Contact Privacy Settings
exports.updateContactPrivacy = async (req, res) => {
  try {
    const { field, value } = req.body;
    const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

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
      // A1.4 allowlist: membership / is_verified / block_user_ids / age /
      // city_id / phone / email are no longer read from the body. A body
      // user_id that is not the caller is a spoof -> 403.
      const self = requireSelfOr403(req, 'user_id');
      if (!self.ok) return res.status(self.status).json(self.body);
      const user_id = resolveCaller(req, ['user_id']);

      const {
        username,
        bio,
        full_name,
        interest_ids,
        marital_status,
        is_push_notifications,
        is_invited_to_room,
        device_token,
        height,
        dob,
        family,
        gender,
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
        return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User Not Found' });
      }

      // Gender is locked once set (same value is a no-op for the app's onboarding)
      if (gender !== undefined && gender !== null && gender !== '') {
        const current = user.gender;
        const locked = current && current !== 'Not specified';
        if (locked && gender !== current) {
          return res.status(400).json({ status: false, code: 'GENDER_LOCKED', message: 'Gender cannot be changed once set' });
        }
        if (!SETTINGS_ENUMS.GENDER_ENUM.includes(gender)) {
          return res.status(400).json({ status: false, message: 'Invalid gender' });
        }
      }

      // Members must be adults
      if (dob) {
        const d = new Date(dob);
        if (Number.isNaN(d.getTime()) || ageOf(d) < 18) {
          return res.status(400).json({ status: false, code: 'UNDERAGE', message: 'You must be at least 18 years old' });
        }
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
    
    // Merge settings: only known keys with valid enum/boolean values (A1.4)
    if (typeof settings === 'object' && settings !== null) {
      const checked = validateSettings(settings);
      if (!checked.ok) {
        return res.status(400).json({ status: false, message: `Invalid settings value for: ${checked.bad.join(', ')}` });
      }
      const current = user.settings && typeof user.settings.toObject === 'function' ? user.settings.toObject() : (user.settings || {});
      user.settings = { ...current, ...checked.settings };
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

      // phone / email are login identifiers: changing them needs a verified flow (not here)

      if (username) user.username = username;
      if (bio) user.bio = bio;
      if (full_name) user.full_name = full_name;
      if (gender && gender !== user.gender) user.gender = gender;
      if (dob) user.dob = dob;
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
      if (device_token) user.device_token = device_token;






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
          user.profile = req.files.profile[0].path.replace(/\\/g, '/');
          // A6.8: the main photo also gets a UserPhoto row so it enters the review queue
          await UserPhoto.updateMany({ userId: user._id, isProfile: true }, { $set: { isProfile: false } });
          await UserPhoto.create({ userId: user._id, imageUrl: user.profile, isProfile: true, order: -1 }).catch(() => {});
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







  // exports.reportStatus and the ReportStatus reads were deleted (A6.7):
  // the app's reportStatus flag now reflects real UserReport rows.


  const ProfilePicRequest = require('../models/ProfilePicRequest'); // Import ProfilePicRequest model


  // API to handle Profile Picture Request
  exports.profilePicRequest = async (req, res) => {
    try {
      const { requested_user_id, status } = req.body;
      const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

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
      if (!mongoose.isValidObjectId(requested_user_id) || String(requested_user_id) === user_id) {
        return res.status(400).json({ status: false, message: 'Invalid requested_user_id' });
      }
      const requestedUser = await User.findById(requested_user_id).select('_id is_block');
      if (!requestedUser || requestedUser.is_block === 1) {
        return res.status(404).json({ status: false, message: 'Requested User Not Found' });
      }
      if (await blocks.isBlockedEither(user_id, requested_user_id)) {
        return res.status(403).json({ status: false, code: 'BLOCKED', message: 'You cannot interact with this user' });
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






  // RemainingProfileImageView reads were removed (A6.14: the product is free).

  const RANDOM_POPULATE =
    'interests location.country location.state location.city caste gotra preferences.gotra preferences.caste ' +
    'preferences.qualification preferences.profession family.basedOut.city family.basedOut.state family.basedOut.country ' +
    'incomeRange profession qualification';

  // A6.1: one random candidate from the same match query every list uses
  // (opposite gender, not blocked either way, not banned, gotra exogamy).
  exports.fetchRandomProfile = async (req, res) => {
    try {
      const my_user_id = resolveCaller(req); // token identity (A1.2)
      if (!my_user_id) {
        return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const user = await User.findById(my_user_id).select('_id gender gotra family.motherGotra').lean();
      if (!user) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      const blockedIds = await blocks.getBlockedIds(my_user_id);
      const base = mq.buildMatchQuery(user, await getSettings(), { blockedIds });
      if (!base) {
        return res.json({ status: true, data: null, message: mq.NO_GENDER_MESSAGE });
      }

      const total = await User.countDocuments(base);
      if (!total) {
        return res.status(404).json({ status: false, message: 'No random profile found' });
      }
      const skip = Math.floor(Math.random() * total);
      const randomUser = await User.findOne(base)
        .select(PUBLIC_USER_SELECT)
        .skip(skip)
        .populate(RANDOM_POPULATE)
        .lean();

      if (!randomUser) {
        return res.status(404).json({ status: false, message: 'No random profile found' });
      }

      return res.json({
        status: true,
        message: 'Random profile found',
        data: serializeProfileFor(req.user, randomUser, { relation: await resolveRelation(my_user_id, randomUser._id) }),
      });
    } catch (err) {
      console.error('fetchRandomProfile error:', err.message);
      return res.status(500).json({ status: false, message: 'Internal server error' });
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
  const viewerId = req.user._id;
  const { user_id: profileId } = req.body;

  if (!profileId || !mongoose.isValidObjectId(profileId)) {
    return res.status(400).json({ status: false, message: 'user_id is required' });
  }

  try {
    const isSelf = viewerId.toString() === profileId.toString();

    // A6.2 / A6.6: a blocked pair or an admin-banned member reads as "not found"
    if (!isSelf) {
      if (await blocks.isBlockedEither(viewerId, profileId)) {
        return res.status(404).json({ status: false, message: 'Profile not found' });
      }
    }

    // --- 1. Fetch viewer and profile data concurrently ---
    const [viewerUser, profileDoc] = await Promise.all([
      User.findById(viewerId).select('full_name profile'),
      User.findOne({ _id: profileId })
        .populate('membershipPlan interests caste profession qualification gotra incomeRange')
        .populate('location.country location.state location.city')
        .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
        .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession'),
    ]);

    if (!profileDoc || (!isSelf && profileDoc.is_block === 1)) {
      return res.status(404).json({ status: false, message: 'Profile not found' });
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
      return res.json({ status: true, message: 'Self-profile fetch', data: serializeProfileFor(req.user, profile) });
    }

    // --- 5. Record the visit (A6.9: at most one bump per hour, never for admins)
    //        & fetch relationship statuses concurrently ---
    const nowDate = new Date();
    const visitWindow = new Date(nowDate.getTime() - 60 * 60 * 1000);
    const viewerIsAdmin = !!(req.isAdmin || (req.user && req.user.role === 'admin'));
    let recentVisit = null;      // row BEFORE this visit (null = first ever)
    let visitRecorded = false;
    if (!viewerIsAdmin) {
      recentVisit = await RecentVisitor.findOne({ visitor: viewerId, visited: profileId }).lean();
      if (!recentVisit) {
        try {
          await RecentVisitor.create({ visitor: viewerId, visited: profileId, count: 1, lastVisitedAt: nowDate });
          visitRecorded = true;
        } catch (e) {
          if (e.code !== 11000) throw e; // concurrent first visit: the other request won
        }
      } else if (!recentVisit.lastVisitedAt || recentVisit.lastVisitedAt < visitWindow) {
        await RecentVisitor.updateOne(
          { _id: recentVisit._id, lastVisitedAt: recentVisit.lastVisitedAt },
          { $inc: { count: 1 }, $set: { lastVisitedAt: nowDate } }
        );
        visitRecorded = true;
      }
    }

    const [
      friendship,
      shortlist,
      report,
      picRequest,
      followingStatus,
    ] = await Promise.all([
      FriendShipRequest.findOne({
        $or: [
          { requester: viewerId, recipient: profileId },
          { requester: profileId, recipient: viewerId },
        ],
      }).select('requester recipient status updatedAt').lean(),
      Shortlist.findOne({ userId: viewerId, shortlistedUserId: profileId }).select('status').lean(),
      UserReport.exists({ reportedBy: viewerId, reportedUser: profileId }),
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
    // recentVisit is the row BEFORE this visit; null means first-ever visit
    const newVisitCount = (recentVisit?.count ?? 0) + (visitRecorded ? 1 : 0);
    if (visitRecorded && newVisitCount === 3) {
      const hasSentInterest = await FriendShipRequest.findOne({ requester: viewerId, recipient: profileId });
      if (!hasSentInterest && viewerSocket) {
        io.to(viewerSocket).emit('intent_fluctuation', {
          message: "Looks like you’re curious. Want help breaking the ice?",
          viewedUser: { _id: profileId, name: profile.full_name, profile: profile.profile },
        });
      }
    }

    // Notify viewed user: first visit or after a 2-hour cooldown, only when the
    // visit was recorded (A6.9) and the member has not opted out.
    const cooldownMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const prevLastVisit = recentVisit?.lastVisitedAt ? new Date(recentVisit.lastVisitedAt).getTime() : 0;
    const optedOut = profile.settings && profile.settings.notifyOnProfileVisit === false;
    const shouldNotify = visitRecorded && !optedOut && (recentVisit === null || (now - prevLastVisit > cooldownMs));
    if (shouldNotify) {
      const notificationMessage = `${viewerUser?.full_name || 'Someone'} just visited your profile.`;
      if (viewedUserSocket) {
        io.to(viewedUserSocket).emit('profile_visited', {
          message: notificationMessage,
          fromUser: { _id: viewerId, name: viewerUser?.full_name || '', profile: viewerUser?.profile || null },
        });
      } else if (profileDoc.device_token) {
        await sendNotification(profileDoc.device_token, '👀 Someone Viewed Your Profile', notificationMessage);
      }
      // Send email notification (fire-and-forget, same rate-limit as push)
      sendProfileViewEmail(profile, viewerUser).catch(err =>
        console.error('[UserController] Profile view email error:', err.message)
      );
    }

    // --- 7. Prepare additional profile data ---

    profile.visitInfo = {
      visitCount: newVisitCount,
      lastVisitedAt: visitRecorded ? nowDate : (recentVisit?.lastVisitedAt || nowDate),
    };

    // Friendship relationship status
    const isRequester = friendship?.requester.toString() === viewerId.toString();
    profile.isFriend = friendship?.status === 'accepted';
    profile.isRequestSent = friendship?.status === 'pending' && isRequester;
    profile.isRequestReceived = friendship?.status === 'pending' && !isRequester;
    profile.requestStatus = friendship?.status || 'none';

    profile.relationshipType = friendship ? (isRequester ? 'sent' : 'received') : null;

    profile.isShortListed = shortlist?.status === true;
    profile.reportStatus = !!report; // real UserReport row (A6.7)
    profile.profilePicRequest = picRequest?.status || false;

    // Following status: 0 = not following, 1 = I follow them, 2 = they follow me
    if (!followingStatus) {
      profile.followingStatus = 0;
    } else if (followingStatus.my_user_id.toString() === viewerId.toString()) {
      profile.followingStatus = 1;
    } else {
      profile.followingStatus = 2;
    }

    // A6.14: no premium image-view quota (kept as a constant for the app's parser)
    profile.remainingProfileImageView = { remainingViews: 0, restrictionStatus: false };




// Find a room where BOTH users are participants
const room = await ChatRoom.findOne({
  participants: { $all: [viewerId, profileId] },
  status: "accepted",
}).populate({
  path: "participants",
  select: "_id full_name profile isOnline lastSeen",
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
    profile: otherUser?.profile,
    isOnline: otherUser?.isOnline,
    lastSeen: otherUser?.lastSeen,
  };
} else {
  // Optionally, provide a fallback empty object instead of null
  roomObj = null;
}

// Attach to profile safely
profile.chatRoom = roomObj;

    // --- 8. Apply Privacy Settings (A1.3 serializer) ---
    const safeProfile = serializeProfileFor(req.user, profile, { relation: friendship?.status || 'none' });

    return res.json({ status: true, message: 'Profile fetched successfully', data: safeProfile });

  } catch (error) {
    console.error('Error in fetchProfile:', error);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};




  exports.fetchFriendsList = async (req, res) => {
    try {
      const { start = 0, limit = 10 } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
    const my_user_id = resolveCaller(req); // token identity (A1.2)


    if (!my_user_id) {
      console.warn('[LiveActivity] my_user_id is missing in request');
      return res.status(400).json({ status: false, message: "my_user_id is required" });
    }

    // 🧑‍💼 Fetch current user info
    const currentUser = await User.findById(my_user_id).select('gender');
    const blockedIds = (await blocks.getBlockedIds(my_user_id)).map(String);
    const myGender = currentUser?.gender;


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
      is_block: 0,
    })
      .select('full_name profile createdAt')
      .limit(5)
      .sort({ createdAt: -1 });

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

    // 💬 New messages
    const newMessages = await Message.find({
      receiver: my_user_id,
      createdAt: { $gte: last24h },
    })
      .populate({
        path: 'sender',
        select: 'full_name profile gender',
        match: { gender: oppositeGender },
      })
      .limit(5)
      .sort({ createdAt: -1 });
    console.log('[LiveActivity] New messages before filtering:', newMessages.length);

    const filteredMessages = newMessages.filter(m =>
      m.sender && !blockedIds.includes(m.sender._id.toString())
    );

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
    userId: m.sender._id,
    title: `New message from ${m.sender.full_name}`,
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
      const { start = 0, limit = 10 } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      // Ensure the user exists
      const user = await User.findById(my_user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Fetch the following list using FollowingList
      const following = await FollowingList.find({ my_user_id: my_user_id })
        .skip(start)
        .limit(limit)
        .populate('user_id', 'full_name profile is_block');

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
      const { start = 0, limit = 10 } = req.body;
      const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

      // Ensure the user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ status: false, message: "User Not Found" });
      }

      // Fetch the followers list
      const followers = await FollowingList.find({ user_id: user_id })
        .skip(start)
        .limit(limit)
        .populate('my_user_id', 'full_name profile is_block');

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
      const { start = 0, limit = 10 } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
        .populate("blocked", "full_name profile");

      // Prepare the response (card only, no contact details)
      const responseBlockedUsers = blocks
        .filter((b) => b.blocked)
        .map((b) => serializeCard(b.blocked));

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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      if (!user_id || !mongoose.isValidObjectId(user_id)) {
        return res.status(400).json({ status: false, message: "user_id is required" });
      }
      if (String(user_id) === my_user_id) {
        return res.status(400).json({ status: false, message: "You cannot block yourself" });
      }

      const target = await User.findById(user_id).select('_id full_name profile');
      if (!target) {
        return res.status(404).json({ status: false, message: "Block user not found" });
      }

      // One row (blocker -> blocked); pending interests + shortlists both ways are removed
      const r = await blocks.blockUser(my_user_id, user_id);

      return res.json({
        status: true,
        message: r.created ? "User blocked successfully" : "User is already blocked",
        data: serializeCard(target),
      });
    } catch (err) {
      if (err instanceof blocks.BlockError) {
        return res.status(err.status).json({ status: false, code: err.code, message: err.message });
      }
      console.error('blockUser error:', err.message);
      return res.status(500).json({ status: false, message: "An error occurred" });
    }
  };


  exports.unblockUser = async (req, res) => {
    try {
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      if (!user_id || !mongoose.isValidObjectId(user_id)) {
        return res.status(400).json({ status: false, message: "user_id is required" });
      }

      // Only the blocker's own row can be lifted (the blocked side gets 404)
      const row = await blocks.unblockUser(my_user_id, user_id);
      if (!row) {
        return res.status(404).json({ status: false, message: "User is not blocked" });
      }

      const target = await User.findById(user_id).select('_id full_name profile');
      return res.json({
        status: true,
        message: "User unblocked successfully",
        data: target ? serializeCard(target) : { _id: user_id },
      });
    } catch (err) {
      if (err instanceof blocks.BlockError) {
        return res.status(err.status).json({ status: false, code: err.code, message: err.message });
      }
      console.error('unblockUser error:', err.message);
      return res.status(500).json({ status: false, message: "An error occurred" });
    }
  };

  // Self-delete only (A6.12): the body user_id must be the caller, and the
  // whole footprint is removed through services/userCascade.
  exports.deleteUser = async (req, res) => {
    try {
      const self = requireSelfOr403(req, 'user_id');
      if (!self.ok) return res.status(self.status).json(self.body);
      const callerId = resolveCaller(req, ['user_id']);

      const result = await cascadeDeleteUser(callerId);
      if (!result.found) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      return res.json({
        status: true,
        message: "User deleted successfully",
      });
    } catch (err) {
      console.error('deleteUser error:', err.message);
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



const LIST_POPULATE =
  'interests location.country location.state location.city caste gotra profession qualification incomeRange ' +
  'family.basedOut.country family.basedOut.state family.basedOut.city';

/**
 * Relationship flags for a page of candidates (one query per collection).
 */
async function relationshipFlags(userId, userIds) {
  const [friendRequests, shortlists, reports, picRequests, follows] = await Promise.all([
    FriendShipRequest.find({
      $or: [{ requester: userId, recipient: { $in: userIds } }, { requester: { $in: userIds }, recipient: userId }]
    }).select('requester recipient status').lean(),
    Shortlist.find({ userId, shortlistedUserId: { $in: userIds } }).select('shortlistedUserId status').lean(),
    UserReport.find({ reportedBy: userId, reportedUser: { $in: userIds } }).select('reportedUser').lean(),
    ProfilePicRequest.find({ requester: userId, requestedUser: { $in: userIds } }).select('requestedUser status').lean(),
    FollowingList.find({
      $or: [{ my_user_id: userId, user_id: { $in: userIds } }, { my_user_id: { $in: userIds }, user_id: userId }]
    }).lean()
  ]);

  const friendMap = {};
  for (const r of friendRequests) {
    const otherId = String(r.requester) === userId ? String(r.recipient) : String(r.requester);
    friendMap[otherId] = r;
  }
  const shortlistMap = {};
  for (const e of shortlists) shortlistMap[String(e.shortlistedUserId)] = e.status;
  const reportSet = new Set(reports.map((e) => String(e.reportedUser)));
  const picMap = {};
  for (const e of picRequests) picMap[String(e.requestedUser)] = e.status;
  const followMap = {};
  for (const f of follows) {
    const key = String(f.my_user_id) === userId ? String(f.user_id) : String(f.my_user_id);
    followMap[key] = f.status;
  }
  return { friendMap, shortlistMap, reportSet, picMap, followMap };
}

function decorateCandidate(viewer, userId, u, flags) {
  const id = String(u._id);
  const friendshipRequest = flags.friendMap[id];
  const isCurrentUserRequester = friendshipRequest && String(friendshipRequest.requester) === userId;
  const userProfile = {
    ...u,
    isLocked: false,
    isFriend: friendshipRequest?.status === 'accepted',
    isRequestSent: friendshipRequest?.status === 'pending' && !!isCurrentUserRequester,
    isRequestReceived: friendshipRequest?.status === 'pending' && !isCurrentUserRequester,
    requestStatus: friendshipRequest?.status || 'none',
    relationshipType: friendshipRequest ? (isCurrentUserRequester ? 'sent' : 'received') : null,
    isShortListed: !!flags.shortlistMap[id],
    shortlistStatus: flags.shortlistMap[id] || 'none',
    reportStatus: flags.reportSet.has(id),
    profilePicRequest: flags.picMap[id] || false,
    // A6.14: no premium image-view quota (constant shape for the app's parser)
    remainingProfileImageView: { remainingViews: 0, restrictionStatus: false },
    followingStatus: flags.followMap[id] || 0
  };
  return serializeProfileFor(viewer, userProfile, { relation: friendshipRequest?.status || 'none' });
}

/**
 * Build the Mongo clauses for the app's `filters` object (A6.4): every
 * filter runs in the database, ids are validated, `income` maps to the
 * incomeRange reference the schema really has.
 */
function filterClauses(filters) {
  const f = filters && typeof filters === 'object' ? filters : {};
  const out = [];
  if (f.age_range) out.push(mq.ageRangeToDobFilter(f.age_range.min, f.age_range.max));
  if (f.height_range) out.push(mq.heightFilter(f.height_range.min, f.height_range.max));
  if (f.marital_status) out.push(mq.enumInFilter('maritalStatus', f.marital_status, SETTINGS_ENUMS.MARITAL_STATUS_ENUM));
  out.push(mq.idInFilter('caste', f.caste));
  out.push(mq.idInFilter('gotra', f.gotra));
  out.push(mq.idInFilter('qualification', f.qualification));
  out.push(mq.idInFilter('profession', f.profession));
  out.push(mq.idInFilter('incomeRange', f.income || f.incomeRange));
  return out.filter(Boolean);
}

function toBoolFlag(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

// ✅ Advanced listing API (A6.4): one Mongo query built on buildMatchQuery
//    (opposite gender, blocks both ways, is_block:0, gotra exogamy) plus the
//    app's filters, preference matching, verified/recent/nearby/shortlist
//    switches, clamped pagination and a stable sort. The in-memory filter,
//    the premium score sort and privacyLockedOnly are gone (A6.14).
exports.fetchUsersListWithFilters = async (req, res) => {
    try {
        const userId = resolveCaller(req); // token identity (A1.2)
        const body = req.body || {};
        const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
        const matchMyPreference = toBoolFlag(body.matchMyPreference);
        const matchTheirPreference = toBoolFlag(body.matchTheirPreference);
        const sortByNewUsers = toBoolFlag(body.sortByNewUsers);
        const isVerify = toBoolFlag(body.isVerify);
        const isShortListedByMe = toBoolFlag(body.isShortListedByMe);
        const isShortListedByThey = toBoolFlag(body.isShortListedByThey);
        const recentlyActive = toBoolFlag(body.recentlyActive);
        const nearby = toBoolFlag(body.nearby);
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        const maxDistanceKm = Math.min(5000, Math.max(1, Number(body.maxDistanceKm) || 50));

        if (!userId) {
            return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
        }

        const currentUser = await User.findById(userId).lean();
        if (!currentUser) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        const { page, limit, skip } = mq.clampPage(body.page, body.limit);

        const blockedIds = await blocks.getBlockedIds(userId);
        const base = mq.buildMatchQuery(currentUser, await getSettings(), { blockedIds });
        if (!base) {
            return res.json({ status: true, message: mq.NO_GENDER_MESSAGE, data: [], page, limit, total: 0 });
        }

        const clauses = filterClauses(filters);
        if (matchMyPreference) clauses.push(...mq.preferenceMatchFilters(currentUser));
        if (matchTheirPreference) clauses.push(...mq.theirPreferenceFilters(currentUser));
        if (isVerify) clauses.push({ is_verified: 1 });
        if (recentlyActive) clauses.push({ lastSeen: { $gte: new Date(Date.now() - 48 * 3600 * 1000) } });

        // Shortlist switches narrow the candidate set
        if (isShortListedByMe) {
            const rows = await Shortlist.find({ userId, status: true }).select('shortlistedUserId').lean();
            clauses.push({ _id: { $in: rows.map((e) => e.shortlistedUserId) } });
        } else if (isShortListedByThey) {
            const rows = await Shortlist.find({ shortlistedUserId: userId, status: true }).select('userId').lean();
            clauses.push({ _id: { $in: rows.map((e) => e.userId) } });
        }

        const query = mq.mergeQuery(base, ...clauses);

        let rows;
        let total;
        if (nearby && Number.isFinite(lat) && Number.isFinite(lng)) {
            await User.init(); // 2dsphere index must exist before $geoNear (first call only)
            // $geoNear must be the first stage; it sorts by distance
            const pipeline = [
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lng, lat] },
                        distanceField: 'distanceInMeters',
                        spherical: true,
                        maxDistance: maxDistanceKm * 1000,
                        key: 'coordinates',
                        query,
                    },
                },
                { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceInMeters', 1000] }, 2] } } },
                {
                    $facet: {
                        rows: [{ $skip: skip }, { $limit: limit }],
                        total: [{ $count: 'n' }],
                    },
                },
            ];
            const [agg] = await User.aggregate(pipeline);
            total = (agg && agg.total[0] && agg.total[0].n) || 0;
            rows = await User.populate(agg ? agg.rows : [], LIST_POPULATE.split(' ').map((path) => ({ path })));
            rows = rows.map((r) => {
                const doc = { ...r };
                for (const f of ['password', 'device_token', 'firebase_uid', 'coordinates', 'blocked', 'role', 'login_type', 'device_type', 'personalityMap', 'is_block', 'tokenVersion']) delete doc[f];
                return doc;
            });
        } else {
            const sort = sortByNewUsers ? { createdAt: -1, _id: -1 } : { is_verified: -1, createdAt: -1, _id: -1 };
            [rows, total] = await Promise.all([
                User.find(query)
                    .select(PUBLIC_USER_SELECT)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .populate(LIST_POPULATE)
                    .lean(),
                User.countDocuments(query),
            ]);
        }

        const userIds = rows.map((u) => String(u._id));
        const flags = await relationshipFlags(userId, userIds);
        const final = rows.map((u) => decorateCandidate(req.user, userId, u, flags));

        return res.json({
            status: true,
            message: 'Advanced filtered user list fetched',
            data: final,
            page,
            limit,
            total,
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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      if (!my_user_id || !user_id) {
        return res.status(400).json({ status: false, message: 'Both user IDs are required' });
      }

      if (my_user_id === user_id) {
        return res.status(400).json({ status: false, message: 'You cannot shortlist yourself' });
      }

      if (!mongoose.isValidObjectId(user_id)) {
        return res.status(400).json({ status: false, message: 'Invalid user_id' });
      }
      const user = await User.findById(my_user_id);
      const targetUser = await User.findById(user_id);

      if (!user || !targetUser || targetUser.is_block === 1) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }
      if (await blocks.isBlockedEither(my_user_id, user_id)) {
        return res.status(403).json({ status: false, code: 'BLOCKED', message: 'You cannot interact with this user' });
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
    const { user_id } = req.body;
    const my_user_id = resolveCaller(req); // token identity (A1.2)

    // A6.3 rules, in order: self, valid id, blocked either way, banned target,
    // opposite gender, target's allowConnections, daily cap, one row per pair.
    if (!user_id || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ status: false, message: 'user_id is required' });
    }
    if (String(user_id) === my_user_id) {
      return res.status(400).json({ status: false, code: 'SELF', message: 'You cannot send interest to yourself' });
    }

    const [user, matchUser] = await Promise.all([User.findById(my_user_id), User.findById(user_id)]);
    if (!user || !matchUser) {
      return res.status(404).json({ status: false, message: "One or both users not found" });
    }
    if (await blocks.isBlockedEither(my_user_id, user_id)) {
      return res.status(403).json({ status: false, code: 'BLOCKED', message: 'You cannot send interest to this user' });
    }
    if (matchUser.is_block === 1) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    if (mq.oppositeGender(user.gender) !== matchUser.gender) {
      return res.status(400).json({ status: false, code: 'GENDER', message: 'Interest can only be sent to the opposite gender' });
    }
    const ac = effectiveVisibility(matchUser.settings?.allowConnections, SETTINGS_ENUMS.ALLOW_CONNECTIONS_ENUM, 'everyone');
    if (ac === 'nobody' || ac === 'onlyAccepted') {
      return res.status(403).json({ status: false, code: 'CONNECTIONS_CLOSED', message: 'This member is not accepting connection requests' });
    }
    const settings = await getSettings();
    const cap = (settings && settings.limits && settings.limits.interestDailyCap) || env.INTEREST_DAILY_CAP || 20;
    const sentToday = await FriendShipRequest.countDocuments({
      requester: my_user_id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (sentToday >= cap) {
      return res.status(429).json({ status: false, code: 'DAILY_CAP', message: `You can send ${cap} interests per day. Please try again tomorrow.` });
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
          return res.status(409).json({
            status: false,
            code: 'REJECTED',
            message: "You cannot send a request. The other user rejected your previous request.",
          });
        }
      } else {
        // Request is still pending or accepted
        if (existingRequest.requester.toString() === my_user_id) {
          return res.status(409).json({ status: false, code: 'DUPLICATE', message: "You have already sent a request to this user." });
        }
        return res.status(409).json({ status: false, code: 'DUPLICATE', message: "This user has already sent a request to you." });
      }
    }

    // ✅ Create a new request (pairKey unique index closes the race)
    try {
      await FriendShipRequest.create({
        requester: my_user_id,
        recipient: user_id,
        status: 'pending',
        pairKey: FriendShipRequest.pairKeyOf(my_user_id, user_id),
      });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'A request already exists between you two.' });
      }
      throw e;
    }

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
      const userId = resolveCaller(req); // token identity (A1.2)
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

    if (otherUser.is_block === 1) {
      return { _id: r._id, user: unavailableCard(otherUser._id), status: r.status, type: isSender ? 'sent' : 'received', createdAt: r.createdAt, updatedAt: r.updatedAt };
    }

    return {
      _id: r._id,
      user: serializeProfileFor(req.user, {
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
        gotra: otherUser.gotra || null,
        settings: otherUser.settings,
      }, { relation: r.status }),
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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
    if (room && (room.status !== 'accepted' || !room.pairKey || (room.hiddenFor && room.hiddenFor.length))) {
      room.status = 'accepted';
      room.pairKey = room.pairKey || ChatRoom.pairKeyOf(my_user_id, user_id);
      room.hiddenFor = [];
      await room.save();
    }

    if (!room) {
      room = await ChatRoom.create({
        participants: [my_user_id, user_id].sort(),
        isGroup: false,
        status: "accepted",
        pairKey: ChatRoom.pairKeyOf(my_user_id, user_id),
        initiatedBy: user_id,
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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
      const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
      const my_user_id = resolveCaller(req); // token identity (A1.2)


      
            // Fetch shortlisted users who have been added by the current user
      const shortlisted = await Shortlist.find({ userId: my_user_id, status: true })
      .populate({
        path: 'shortlistedUserId',
        select: 'full_name email profile dob location is_verified',
        populate: { path: 'location.city', select: 'name' }
      });

    
      const rows = shortlisted.map(entry => entry.shortlistedUserId).filter(Boolean);
      const relMap = await resolveRelations(my_user_id, rows.map(r => r._id));

      return res.json({
        status: true,
        message: 'Fetched shortlisted users',
        data: serializeMany(req.user, rows, relMap),
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
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      const rooms = await ChatRoom.find({
        participants: my_user_id,
        status: 'accepted',
        hiddenFor: { $ne: new mongoose.Types.ObjectId(my_user_id) },
      }).populate('participants', 'full_name profile isOnline lastSeen is_block');

      const result = [];

      for (let room of rooms) {
        const otherUser = room.participants.find(
          (u) => u._id.toString() !== my_user_id
        );

        // Skip if other user was deleted or banned (A6.6)
        if (!otherUser || otherUser.is_block === 1) continue;

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
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      const rooms = await ChatRoom.find({
        participants: my_user_id,
        status: 'pending',
        hiddenFor: { $ne: new mongoose.Types.ObjectId(my_user_id) },
      }).populate('participants', 'full_name profile isOnline lastSeen is_block');

      const result = [];

      for (let room of rooms) {
        const otherUser = room.participants.find(
          (u) => u._id.toString() !== my_user_id
        );
        if (!otherUser || otherUser.is_block === 1) continue;

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
      const { roomId } = req.body;
      const callerId = resolveCaller(req); // token identity (A1.2)
      const limit = Math.min(50, Math.max(1, parseInt(req.body.limit, 10) || 20));
      const page = Math.max(1, parseInt(req.body.page, 10) || 1);

      if (!roomId || !mongoose.isValidObjectId(roomId)) {
        return res.status(400).json({ status: false, message: 'roomId is required' });
      }

      // A6.10: only a participant may read a room
      const room = await ChatRoom.findById(roomId).select('participants').lean();
      if (!room) {
        return res.status(404).json({ status: false, message: 'Room not found' });
      }
      const isParticipant = (room.participants || []).some((p) => String(p) === callerId);
      if (!isParticipant) {
        return res.status(403).json({ status: false, code: 'FORBIDDEN', message: 'You are not a participant of this room' });
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({ room: roomId })
        .sort({ createdAt: -1 }) // Send newest first (latest at top)
        .skip(skip)
        .limit(limit)
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
      const { userB_id } = req.body;
      const userA_id = resolveCaller(req, ['userA_id']); // token identity (A1.2)

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

      if (!mongoose.isValidObjectId(userB_id) || String(userB_id) === userA_id) {
        return res.status(400).json({ status: false, message: 'Invalid userB_id. Room cannot be created.', room: null });
      }
      if (await blocks.isBlockedEither(userA_id, userB_id)) {
        return res.status(403).json({ status: false, code: 'BLOCKED', message: 'You cannot chat with this user', room: null });
      }

      // Try to find existing room
      let room = await ChatRoom.findOne({
        participants: { $all: [userA_id, userB_id], $size: 2 },
        isGroup: false,
      }).select('-hiddenFor');

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
      const { page = 1, limit = 20 } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
    const { type, page = 1, limit = 20 } = req.body;
    const my_user_id = resolveCaller(req); // token identity (A1.2)

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
      settings: user.settings,
    };
  };


      if (type === 'i_viewed') {
        const paginated = iViewedRaw
          .filter(item => item.visited && item.visited.is_block !== 1 && item.visited._id.toString() !== my_user_id)
          .slice(skip, skip + parsedLimit);

        result = paginated.map(item => extractUserData(item.visited, item));
      }

      if (type === 'they_viewed_me') {
        const paginated = theyViewedRaw
          .filter(item => item.visitor && item.visitor.is_block !== 1 && item.visitor._id.toString() !== my_user_id)
          .slice(skip, skip + parsedLimit);

        result = paginated.map(item => extractUserData(item.visitor, item));
      }

      if (type === 'mutual') {
        const iViewedMap = new Map(iViewedRaw.filter(v => v.visited && v.visited.is_block !== 1).map(v => [v.visited._id.toString(), v]));
        const theyViewedMap = new Map(theyViewedRaw.filter(v => v.visitor && v.visitor.is_block !== 1).map(v => [v.visitor._id.toString(), v]));

        const mutualIds = [...iViewedMap.keys()].filter(id => theyViewedMap.has(id) && id !== my_user_id);

        const mutualUsers = mutualIds.map(id => {
          const item = iViewedMap.get(id);
          return extractUserData(item.visited, item);
        });

        mutualUsers.sort((a, b) => new Date(b.lastVisitedAt) - new Date(a.lastVisitedAt));
        result = mutualUsers.slice(skip, skip + parsedLimit);
      }

      // A1.3 serializer (privacy flags of each visitor)
      const relMap = await resolveRelations(my_user_id, result.map(r => r._id));
      result = serializeMany(req.user, result, relMap);

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
        name: { $regex: escapeRegex(search), $options: 'i' },
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
        name: { $regex: escapeRegex(search), $options: 'i' },
        ...(countryId && mongoose.isValidObjectId(countryId) && { country: countryId }),
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
        name: { $regex: escapeRegex(search), $options: 'i' },
        ...(stateFilter && mongoose.isValidObjectId(stateFilter) && { state: stateFilter }),
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
    const limit = Math.min(50, Math.max(1, parseInt(req.body.limit, 10) || 10));
    const days = Math.min(90, Math.max(1, parseInt(req.body.days, 10) || 7));
    const my_user_id = resolveCaller(req); // token identity (A1.2)

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const myUser = await User.findById(my_user_id).select('_id gender gotra family.motherGotra').lean();
    if (!myUser) return res.status(404).json({ status: false, message: 'User not found' });

    // A6.1: every candidate goes through the same match query (opposite
    // gender, blocks both ways, is_block:0, gotra exogamy).
    const blockedIds = await blocks.getBlockedIds(my_user_id);
    const base = mq.buildMatchQuery(myUser, await getSettings(), { blockedIds });
    if (!base) {
      return res.json({ status: true, message: mq.NO_GENDER_MESSAGE, result: [] });
    }

    const TRENDING_POPULATE = 'interests location.country location.state location.city caste gotra profession';

    // First candidate (by the aggregation's order) that passes the match query
    const firstMatching = async (ids) => {
      for (const id of ids) {
        const user = await User.findOne(mq.mergeQuery(base, { _id: id }))
          .select(PUBLIC_USER_SELECT)
          .populate(TRENDING_POPULATE)
          .lean();
        if (user) return user;
      }
      return null;
    };
    const topBy = async (extra, sort) =>
      User.findOne(mq.mergeQuery(base, extra)).select(PUBLIC_USER_SELECT).sort(sort).populate(TRENDING_POPULATE).lean();

    // ---------------------- Precompute all view counts ----------------------
    const allViewsAgg = await RecentVisitor.aggregate([
      { $match: { lastVisitedAt: { $gte: sinceDate } } },
      { $group: { _id: "$visited", views: { $sum: "$count" } } }
    ]);
    const viewsMap = {};
    allViewsAgg.forEach(entry => { viewsMap[entry._id.toString()] = entry.views; });

    const simplifyUser = (user, relation) => {
      if (!user) return null;
      const safe = serializeProfileFor(req.user, user, { relation: relation || 'none' });
      return {
        id: user._id,
        name: user.full_name || '',
        dob: user.dob || null,
        profile: safe.profile || null,
        profession: user.profession?.name || '',
        location: user.location?.city?.name || '',
        views: viewsMap[user._id.toString()] || 0,
        verified: !!user.is_verified,
      };
    };

    // Category 1: Most Viewed
    const mostViewedAgg = await RecentVisitor.aggregate([
      { $match: { lastVisitedAt: { $gte: sinceDate } } },
      { $group: { _id: "$visited", views: { $sum: "$count" } } },
      { $sort: { views: -1 } },
      { $limit: limit }
    ]);
    const mostViewedUser = await firstMatching(mostViewedAgg.map(e => e._id));

    // Category 2: Most Liked (interest requests received)
    const mostLikedAgg = await FriendshipRequest.aggregate([
      { $match: { status: 'pending', createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$recipient", interests: { $sum: 1 } } },
      { $sort: { interests: -1 } },
      { $limit: limit }
    ]);
    const mostLikedUser = await firstMatching(mostLikedAgg.map(e => e._id));

    // Category 3: Most Shortlisted
    const mostShortlistedAgg = await Shortlist.aggregate([
      { $match: { status: true, createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$shortlistedUserId", shortlists: { $sum: 1 } } },
      { $sort: { shortlists: -1 } },
      { $limit: limit }
    ]);
    const mostShortlistedUser = await firstMatching(mostShortlistedAgg.map(e => e._id));

    // Category 4-6 use the real fields: is_block:0 (not is_active),
    // lastSeen (not lastLoginAt), is_highlighted (not is_featured). (A6.5)
    const newMemberUser = await topBy({ createdAt: { $gte: sinceDate } }, { createdAt: -1 });
    const activeUser = await topBy({ lastSeen: { $gte: sinceDate } }, { lastSeen: -1 });
    const featuredUser = await topBy({ is_highlighted: true }, { updatedAt: -1 });

    const picks = [mostViewedUser, mostLikedUser, mostShortlistedUser, newMemberUser, activeUser, featuredUser].filter(Boolean);
    const relMap = await resolveRelations(my_user_id, picks.map(u => u._id));
    const rel = (u) => (u ? relMap.get(String(u._id)) : undefined);

    const trendingProfilesRaw = [
      { label: "Most Viewed", user: simplifyUser(mostViewedUser, rel(mostViewedUser)), gradient: ["#FF6B6B", "#FF8E53"], bgGradient: ["#FFF5F5", "#FFF8F6"] },
      { label: "Most Liked", user: simplifyUser(mostLikedUser, rel(mostLikedUser)), gradient: ["#E91E63", "#FF6B9D"], bgGradient: ["#FFF0F6", "#FFF5F9"] },
      { label: "Most Shortlisted", user: simplifyUser(mostShortlistedUser, rel(mostShortlistedUser)), gradient: ["#3F51B5", "#5C6BC0"], bgGradient: ["#E8EAF6", "#E3E7F9"] },
      { label: "New Members", user: simplifyUser(newMemberUser, rel(newMemberUser)), gradient: ["#4CAF50", "#81C784"], bgGradient: ["#F1F8E9", "#F8FFF4"] },
      { label: "Active Users", user: simplifyUser(activeUser, rel(activeUser)), gradient: ["#FF9800", "#FFC107"], bgGradient: ["#FFF8E1", "#FFFDE7"] },
      { label: "Featured", user: simplifyUser(featuredUser, rel(featuredUser)), gradient: ["#9C27B0", "#BA68C8"], bgGradient: ["#F3E5F5", "#FCE4EC"] },
    ];

    const trendingProfiles = trendingProfilesRaw.filter(item => item.user !== null);

    res.json({
      status: true,
      message: "Trending profiles fetched successfully",
      result: trendingProfiles
    });

  } catch (error) {
    console.error("Error fetching trending profiles:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


  // ✅ Nearby Matches API (auto-detect user coordinates)



  exports.fetchNearbyMatches = async (req, res) => {
    try {
      const my_user_id = resolveCaller(req); // token identity (A1.2)
      const radiusKm = Math.min(5000, Math.max(1, Number(req.body.radiusKm) || 50));
      const limit = Math.min(50, Math.max(1, parseInt(req.body.limit, 10) || 10));
      const page = Math.max(1, parseInt(req.body.page, 10) || 1);
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
      const blockedIds = await blocks.getBlockedIds(my_user_id);
      const base = mq.buildMatchQuery(myUser, await getSettings(), { blockedIds });
      if (!base) {
        return res.json({ status: true, message: mq.NO_GENDER_MESSAGE, data: [] });
      }

      await User.init(); // 2dsphere index must exist before $geoNear (first call only)
      const users = await User.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceInMeters",
            spherical: true,
            maxDistance: radiusKm * 1000,
            key: "coordinates",
            query: mq.mergeQuery(base, { 'coordinates.coordinates': { $ne: [0, 0] } }),
          }
        },
        { $skip: start },
        { $limit: limit },
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ["$distanceInMeters", 1000] }, 2] }
          }
        },
        { $project: { password: 0, device_token: 0, firebase_uid: 0, coordinates: 0, blocked: 0, role: 0, login_type: 0, device_type: 0, personalityMap: 0, is_block: 0, tokenVersion: 0 } }
      ]);

      // Populate after aggregation
      const populated = await User.populate(users, [
        { path: 'location.country' },
        { path: 'location.state' },
        { path: 'location.city' },
        { path: 'interests' },
        { path: 'caste' },
        { path: 'gotra' },
        { path: 'profession' },
        { path: 'qualification' },
      ]);

      const relMap = await resolveRelations(my_user_id, populated.map(u => u._id));

      return res.json({
        status: true,
        message: `Users near ${radiusKm} km`,
        data: serializeMany(req.user, populated, relMap),
      });
    } catch (err) {
      console.error('fetchNearbyMatches error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  };



  // ✅ Daily Top Matches API with Deep AI Logic


  exports.getTopDailyMatches = async (req, res) => {
    try {
      const userId = resolveCaller(req); // token identity (A1.2)
      const limit = Math.min(50, Math.max(1, parseInt(req.body.limit, 10) || 10));

      if (!userId) return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });

      const currentUser = await User.findById(userId).lean();
      if (!currentUser) return res.status(404).json({ status: false, message: 'User not found' });

      // A6.1: candidates come from the shared match query (opposite gender,
      // blocks both ways, is_block:0, gotra exogamy -> no "gotra match" bonus).
      const blockedIds = await blocks.getBlockedIds(userId);
      const base = mq.buildMatchQuery(currentUser, await getSettings(), { blockedIds });
      if (!base) {
        return res.json({ status: true, message: mq.NO_GENDER_MESSAGE, data: [] });
      }

      const candidates = await User.find(base)
        .select(PUBLIC_USER_SELECT)
        .sort({ lastSeen: -1, createdAt: -1 })
        .limit(500)
        .populate('caste gotra interests profession qualification incomeRange location.city')
        .lean();

      const myAge = ageOf(currentUser.dob);
      const myCaste = mq.toId(currentUser.caste);
      const myGotra = mq.toId(currentUser.gotra);
      const myQualification = mq.toId(currentUser.qualification);
      const myProfession = mq.toId(currentUser.profession);
      const myIncome = mq.toId(currentUser.incomeRange);
      const myCity = mq.toId(currentUser.location && currentUser.location.city);
      const myInterests = new Set(mq.toIds(currentUser.interests).map(String));

      // populated-vs-raw id comparison (same helper comparePreferencesFit uses)
      const checkArrayMatch = (mine, prefArr) =>
        Array.isArray(prefArr) && mine ? prefArr.some(p => String(p && p._id !== undefined ? p._id : p) === String(mine)) : false;

      const matchScores = candidates.map(user => {
        let score = 0;
        const reasons = [];
        const prefs = user.preferences || {};

        if (myAge !== null && prefs.age_range && (prefs.age_range.min || prefs.age_range.max)) {
          if (myAge >= (prefs.age_range.min || 0) && myAge <= (prefs.age_range.max || 99)) {
            score += 10;
            reasons.push("age match");
          }
        }
        if (checkArrayMatch(myCaste, prefs.caste)) { score += 15; reasons.push("caste match"); }
        if (checkArrayMatch(myQualification, prefs.qualification)) { score += 5; reasons.push("qualification"); }
        if (checkArrayMatch(myProfession, prefs.profession)) { score += 5; reasons.push("profession"); }
        if (myIncome && prefs.incomeRange && String(mq.toId(prefs.incomeRange)) === String(myIncome)) { score += 5; reasons.push("income"); }
        if (myCity && user.location && user.location.city && String(mq.toId(user.location.city)) === String(myCity)) {
          score += 5;
          reasons.push("same city");
        }
        const shared = mq.toIds(user.interests).filter(i => myInterests.has(String(i)));
        score += shared.length * 3;
        if (shared.length) reasons.push("shared interests");
        if (user.is_verified) score += 2;

        return { user, score, matchedOn: reasons };
      });

      const sorted = matchScores.sort((a, b) => b.score - a.score || (new Date(b.user.createdAt) - new Date(a.user.createdAt))).slice(0, limit);
      const relMap = await resolveRelations(userId, sorted.map(m => m.user._id));

      return res.json({
        status: true,
        message: 'Top daily matches generated',
        data: sorted.map(match => ({
          ...serializeProfileFor(req.user, match.user, { relation: relMap.get(String(match.user._id)) || 'none' }),
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
      const users = await User.find({ is_highlighted: true, is_block: 0 })
        .select('full_name gender location membershipPlan profile is_top_user settings')
        .populate('location.country')
        .populate('location.state')
        .populate('location.city')
        .populate('membershipPlan')
        .lean();

      const relMap = await resolveRelations(req.userId, users.map(u => u._id));

      res.json({
        status: true,
        message: 'Highlighted users fetched successfully',
        data: serializeMany(req.user, users, relMap),
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

  // addBanner / createFakeBatch / maekusertop / unmarkTopUser were removed
  // (A4.2): banners are POST /api/admin/banners, highlight is
  // POST|DELETE /api/admin/users/:id/highlight, fake users are gone.

  // Inside UserController.js or a new BannerController.js

  exports.fetchBanner = async (req, res) => {
    try {
      const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean(); // C4.9
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
      const userId = resolveCaller(req, ['user_id']); // token identity (A1.2)

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
      const userId = resolveCaller(req, ['user_id']); // token identity (A1.2)

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

      const userId = resolveCaller(req, ['user_id']); // token identity (A1.2)
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
    const userId = resolveCaller(req, ['user_id']); // token identity (A1.2)
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
      const userId = resolveCaller(req, ['user_id']); // token identity (A1.2)
      if (!userId) {
        return res.status(400).json({ status: false, message: 'user_id is required' });
      }

      // Optional: view another member's gallery, subject to their
      // profilePicVisibility (A1.2 getUserPhotos target_user_id).
      let ownerId = userId;
      const target = req.body.target_user_id;
      if (target && String(target) !== userId) {
        if (!mongoose.isValidObjectId(target)) {
          return res.status(400).json({ status: false, message: 'Invalid target_user_id' });
        }
        const owner = await User.findById(target).select('_id settings profile is_block').lean();
        if (!owner || owner.is_block === 1) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const view = serializeProfileFor(req.user, { ...owner, profile: owner.profile || 'x' }, {
          relation: await resolveRelation(userId, target),
        });
        if (view.photosHidden) {
          return res.status(200).json({ status: true, message: 'Photos are private', data: [], photosHidden: true });
        }
        ownerId = String(target);
      }

      // Rejected photos are excluded from the gallery; pending/approved (and
      // legacy photos with no moderationStatus set) remain visible.
      const photos = await UserPhoto.find({ userId: ownerId, moderationStatus: { $ne: 'rejected' } })
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

      const { image_id } = req.body;
      const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

      if (!user_id || !image_id) {
        return res.status(400).json({ status: false, message: 'user_id and image_id are required' });
      }

      if (!mongoose.isValidObjectId(image_id)) {
        return res.status(404).json({ status: false, message: 'Image not found for this user' });
      }
      const image = await UserPhoto.findOne({ _id: image_id, userId: user_id, moderationStatus: { $ne: 'rejected' } });
      if (!image) {
        return res.status(404).json({ status: false, message: 'Image not found for this user' });
      }

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
      const { image_id } = req.body;
      const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

      if (!user_id || !image_id) {
        return res.status(400).json({ status: false, message: 'user_id and image_id are required' });
      }

      if (!mongoose.isValidObjectId(image_id)) {
        return res.status(404).json({ status: false, message: 'Image not found for this user' });
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

      // Delete the image file from disk only when it resolves inside uploads/
      const filePath = resolveUploadPath(image.imageUrl);
      if (filePath && fs.existsSync(filePath)) {
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
      const { ordered_ids } = req.body;
      const user_id = resolveCaller(req, ['user_id']); // token identity (A1.2)

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
      const my_user_id = resolveCaller(req); // token identity (A1.2)

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
    try {
      const my_user_id = resolveCaller(req); // token identity (A1.2)

      await Notification.updateMany({ toUser: my_user_id, isRead: false }, { $set: { isRead: true } });

      // sockets join(userId) at handshake (A5.1), so the room id is the user id
      try {
        getIO().to(my_user_id).emit('notification_count', { total: 0 });
      } catch (_) { /* no socket server in tests */ }

      return res.json({ status: true, message: 'Notifications marked as read' });
    } catch (err) {
      console.error('markNotificationsRead error:', err.message);
      return res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };




exports.searchProfiles = async (req, res) => {
  try {
    const userId = resolveCaller(req); // token identity (A1.2)
    const body = req.body || {};
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
    const sortByNewUsers = toBoolFlag(body.sortByNewUsers);
    const isVerify = toBoolFlag(body.isVerify);
    const recentlyActive = toBoolFlag(body.recentlyActive);
    const nearby = toBoolFlag(body.nearby);
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const maxDistanceKm = Math.min(5000, Math.max(1, Number(body.maxDistanceKm) || 50));

    if (!userId) return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });

    const currentUser = await User.findById(userId).lean();
    if (!currentUser) return res.status(404).json({ status: false, message: 'User not found' });

    const { page, limit, skip } = mq.clampPage(body.page, body.limit);

    // Exclude blocked (both ways) and anyone already connected / requested
    const blockedIds = await blocks.getBlockedIds(userId);
    const connections = await FriendShipRequest.find({ $or: [{ requester: userId }, { recipient: userId }] })
      .select('requester recipient')
      .lean();
    const excludeIds = connections.map(r => (String(r.requester) === userId ? r.recipient : r.requester));

    const base = mq.buildMatchQuery(currentUser, await getSettings(), { blockedIds, excludeIds });
    if (!base) {
      return res.json({ status: true, message: mq.NO_GENDER_MESSAGE, data: [], page, limit, total: 0 });
    }

    const clauses = filterClauses(filters);
    if (isVerify) clauses.push({ is_verified: 1 });
    if (recentlyActive) clauses.push({ lastSeen: { $gte: new Date(Date.now() - 48 * 3600 * 1000) } });
    const query = mq.mergeQuery(base, ...clauses);

    const SEARCH_POPULATE = 'location.country location.state location.city caste gotra profession qualification incomeRange family.basedOut.city family.basedOut.state family.basedOut.country';

    let rows;
    let total;
    if (nearby && Number.isFinite(lat) && Number.isFinite(lng)) {
      await User.init(); // 2dsphere index must exist before $geoNear (first call only)
      const [agg] = await User.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceInMeters',
            spherical: true,
            maxDistance: maxDistanceKm * 1000,
            key: 'coordinates',
            query,
          },
        },
        { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceInMeters', 1000] }, 2] } } },
        { $project: { password: 0, device_token: 0, firebase_uid: 0, coordinates: 0, blocked: 0, role: 0, login_type: 0, device_type: 0, personalityMap: 0, is_block: 0, tokenVersion: 0 } },
        { $facet: { rows: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'n' }] } },
      ]);
      total = (agg && agg.total[0] && agg.total[0].n) || 0;
      rows = await User.populate(agg ? agg.rows : [], SEARCH_POPULATE.split(' ').map((path) => ({ path })));
    } else {
      // Stable sort: online/recently active first, then verified, newest (no premium bonus, A6.14)
      const sort = sortByNewUsers ? { createdAt: -1, _id: -1 } : { isOnline: -1, is_verified: -1, lastSeen: -1, createdAt: -1, _id: -1 };
      [rows, total] = await Promise.all([
        User.find(query).select(PUBLIC_USER_SELECT).sort(sort).skip(skip).limit(limit).populate(SEARCH_POPULATE).lean(),
        User.countDocuments(query),
      ]);
    }

    const now = Date.now();
    const decorated = rows.map(u => {
      const daysSinceSignup = (now - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return { ...u, age: ageOf(u.dob), isJustJoined: daysSinceSignup < 7 };
    });

    // A6.9: one SearchLog row per search (not one per impression, no push)
    SearchLog.create({
      searcher: userId,
      target: null,
      query: { filters, isVerify, recentlyActive, nearby: !!nearby, sortByNewUsers, page, limit },
      resultCount: total,
    }).catch(() => {});

    const relMap = await resolveRelations(userId, decorated.map(u => u._id));

    return res.json({
      status: true,
      message: 'Filtered profiles',
      data: serializeMany(req.user, decorated, relMap),
      page,
      limit,
      total,
    });

  } catch (err) {
    console.error('❌ Error in searchProfiles:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};



  // controller/matchingController.js

  function buildSmartRegex(search) {
    const normalized = String(search || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '').slice(0, 40);
    if (!normalized) return /.*/i;

    // Allow flexible matching like b.*t.*e.*c.*h — each char escaped (A7.2)
    const fuzzyPattern = normalized.split('').map((c) => escapeRegex(c)).join('.*');
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
    const { user_id, reason, desc, block } = req.body;
    const my_user_id = resolveCaller(req); // token identity (A1.2)

    if (!my_user_id || !user_id || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ status: false, message: 'Missing required fields' });
    }
    if (!mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ status: false, message: 'Invalid user_id' });
    }
    if (String(user_id) === my_user_id) {
      return res.status(400).json({ status: false, code: 'SELF', message: 'You cannot report yourself' });
    }

    try {
      // reason must be one of the admin-configured report reasons
      const reasonRow = await reportReason.findOne({ title: reason.trim(), is_active: true }).select('_id title').lean();
      if (!reasonRow) {
        return res.status(400).json({ status: false, code: 'INVALID_REASON', message: 'Unknown report reason' });
      }

      const [reporter, reported] = await Promise.all([
        User.findById(my_user_id).select('_id'),
        User.findById(user_id).select('_id')
      ]);
      if (!reporter || !reported) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      // 10 per day per reporter (the route limiter covers bursts; this covers restarts)
      const today = await UserReport.countDocuments({ reportedBy: my_user_id, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (today >= 10) {
        return res.status(429).json({ status: false, code: 'DAILY_CAP', message: 'You have reached the daily report limit' });
      }

      try {
        await UserReport.create({
          reportedBy: my_user_id,
          reportedUser: user_id,
          reason: reasonRow.title,
          desc: typeof desc === 'string' ? desc.trim().slice(0, 1000) : undefined
        });
      } catch (e) {
        if (e && e.code === 11000) {
          return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'You have already reported this user' });
        }
        throw e;
      }

      let blocked = false;
      if (block === true || block === 'true') {
        await blocks.blockUser(my_user_id, user_id);
        blocked = true;
      }

      return res.json({ status: true, message: 'User reported successfully', blocked });
    } catch (err) {
      console.error('❌ Error reporting user:', err.message);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  };



  exports.comparePreferencesFit = async (req, res) => {
    const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

    if (!my_user_id || !user_id) {
      return res.status(400).json({ status: false, message: 'Both my_user_id and user_id are required' });
    }

    try {
      if (!mongoose.isValidObjectId(user_id)) {
        return res.status(400).json({ status: false, message: 'Invalid user_id' });
      }
      if (await blocks.isBlockedEither(my_user_id, user_id)) {
        return res.status(403).json({ status: false, code: 'BLOCKED', message: 'You cannot interact with this user' });
      }
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

      if (!viewer || !profileOwner || profileOwner.is_block === 1) {
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
    const { user_id } = req.body;
      const my_user_id = resolveCaller(req); // token identity (A1.2)

    if (!my_user_id || !user_id || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({
        status: false,
        message: 'Both my_user_id and user_id are required',
      });
    }

    try {
      // Find the chat room (participant check: the caller must be one of the two)
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

      // A6.10: hide the room for the caller only; the other member keeps
      // their history. send_message pulls the id out of hiddenFor again.
      await ChatRoom.updateOne({ _id: room._id }, { $addToSet: { hiddenFor: new mongoose.Types.ObjectId(my_user_id) } });

      return res.json({
        status: true,
        message: 'Chat room deleted successfully',
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




  