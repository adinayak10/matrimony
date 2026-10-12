// controllers/AboutController.js
const AboutOption = require('../models/AboutOption');

exports.fetchOptions = async (req, res) => {
  try {
    const options = await AboutOption.find();
    const grouped = {
      tone: [],
      trait: [],
      hobby: [],
      goal: [],
    };

    options.forEach((item) => grouped[item.category].push(item.value));

    return res.json({ status: true, message: 'Options fetched', data: grouped });
  } catch (err) {
    console.error('Error fetching about options:', err);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

const axios = require('axios');
const User = require('../models/User');


exports.generateAbout = async (req, res) => {
  try {
    const { my_user_id, tone, traits = [], hobbies = [] } = req.body;

    if (!my_user_id || !tone || traits.length === 0 || hobbies.length === 0) {
      return res.status(400).json({ status: false, message: 'Missing required fields' });
    }

    const user = await User.findById(my_user_id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const gender = user.gender?.toLowerCase() || 'person';

    // 🧠 Culturally sensitive, short prompt
    const prompt = `Write a short and respectful matrimonial bio in 1-2 lines.
Gender: ${gender}.
Tone: ${tone}.
Traits: ${traits.join(', ')}.
Hobbies: ${hobbies.join(', ')}.
It should sound Indian, decent, and focused on long-term marriage.`

    // 🔁 Hit AI
    const aiRes = await axios.post('http://localhost:6000/ask', {
      prompt,
    });

    const generatedText = aiRes?.data?.response || aiRes?.data?.result || '';

    if (!generatedText) {
      return res.status(500).json({ status: false, message: 'AI did not return a valid response' });
    }

    // 💾 Save
    user.bio = generatedText;
    user.personalityMap = {
      tone,
      traits,
      hobbies,
      prompt,
      about: generatedText,
    };

    await user.save();

    return res.json({
      status: true,
      message: 'Matrimonial bio generated successfully',
      data: user.personalityMap,
    });

  } catch (err) {
    console.error('AI Error:', err?.response?.data || err.message || err);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};
