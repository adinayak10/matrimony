'use strict';
/**
 * services/icebreakerQuestions.js — Ice Breaker question bank (feature expansion A3).
 *
 *   getQuestions()   active DB questions as [{id, question, options}] with a 5-min
 *                    cache; falls back to DEFAULT_QUESTIONS when fewer than
 *                    MIN_ACTIVE are active (or the DB read fails)
 *   invalidate()     drop the cache (admin CRUD calls this)
 *   seedDefaults()   upsert DEFAULT_QUESTIONS by `key`; idempotent, never
 *                    overwrites an admin edit; returns { inserted, total }
 *
 * DEFAULT_QUESTIONS moved verbatim from gamesocket.js (generic config, not
 * member content). Nothing touches Mongo at require time (boot test).
 */
const IceBreakerQuestion = require('../models/IceBreakerQuestion');

const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_ACTIVE = 5;
// Sections of the original list, ten questions each, in order.
const SECTION_CATEGORIES = ['lifestyle', 'values', 'goals', 'relationships', 'interests'];

const RAW_DEFAULT_QUESTIONS = [
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

const DEFAULT_QUESTIONS = Object.freeze(
  RAW_DEFAULT_QUESTIONS.map((q, i) =>
    Object.freeze({
      id: q.id,
      key: q.id,
      question: q.question,
      options: Object.freeze([...q.options]),
      category: SECTION_CATEGORIES[Math.floor(i / 10)] || 'personality',
      order: i + 1,
    })
  )
);

let cache = null; // { at, questions }
let inflight = null;

function toGameQuestion(doc) {
  return { id: doc.key || String(doc._id), question: doc.question, options: [...doc.options] };
}

function defaultsForGame() {
  return DEFAULT_QUESTIONS.map((q) => ({ id: q.id, question: q.question, options: [...q.options] }));
}

async function load() {
  try {
    const rows = await IceBreakerQuestion.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).select('key question options').lean();
    const valid = rows.filter((r) => r.question && Array.isArray(r.options) && r.options.length >= 2);
    const questions = valid.length >= MIN_ACTIVE ? valid.map(toGameQuestion) : defaultsForGame();
    cache = { at: Date.now(), questions, source: valid.length >= MIN_ACTIVE ? 'db' : 'defaults' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[icebreakerQuestions] load failed, using defaults:', err.message);
    cache = { at: Date.now(), questions: defaultsForGame(), source: 'defaults' };
  }
  return cache.questions;
}

/** Active questions for a game (callers shuffle/slice their own copy). */
async function getQuestions() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.questions;
  if (!inflight) {
    inflight = load().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** 'db' | 'defaults' | null (not loaded yet) — for the admin stats tile. */
function currentSource() {
  return cache ? cache.source : null;
}

function invalidate() {
  cache = null;
}

async function seedDefaults() {
  const ops = DEFAULT_QUESTIONS.map((q) => ({
    updateOne: {
      filter: { key: q.key },
      update: {
        $setOnInsert: {
          key: q.key,
          question: q.question,
          options: [...q.options],
          category: q.category,
          difficulty: 'medium',
          order: q.order,
          isActive: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const res = await IceBreakerQuestion.bulkWrite(ops, { ordered: false });
  invalidate();
  return { inserted: res.upsertedCount || 0, total: DEFAULT_QUESTIONS.length };
}

module.exports = { DEFAULT_QUESTIONS, MIN_ACTIVE, CACHE_TTL_MS, getQuestions, invalidate, seedDefaults, currentSource };
