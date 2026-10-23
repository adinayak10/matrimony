/* global window */
// Biodata schema: field catalogue, empty data, the server-side cleaner, inline
// validation, builder step status and the design allowlist.
//
// K.schema.FIELDS entries:
//   { id, section, step, key, type, max?, options?, enumKey?, required?, core?,
//     multiline?, prose?, when?(data)->bool, placeholder?, hint?, privacy?,
//     itemFields?, maxItems?, itemMax?, free?, min?, maxValue?, unit? }
//   type: text|textarea|select|multiselect|date|time|height|number|income|phone|email|list
//   enumKey      labels group for select/multiselect values (defaults to key)
//   prose        long text rendered as paragraphs (split on blank lines)
//   free         multiselect also accepts free text items (options are suggestions)
//   min/maxValue numeric range for number/height
//   core         counts towards 'complete' in stepStatus
(function (K) {
  'use strict';

  var STEPS = ['personal', 'photo', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional', 'design'];
  var SECTIONS = ['personal', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional'];
  var DESIGN_KEYS = ['palette', 'font', 'scale', 'spacing', 'photoPlacement', 'photoShape', 'sectionOrder', 'hiddenSections', 'labelLanguage', 'footerText', 'shareContact'];
  var LIMITS = { customPerSection: 6, customTotal: 20, maxDataBytes: 65536, titleMax: 80, sectionTitleMax: 40, customLabelMax: 40, customValueMax: 200, invocationMax: 60, footerMax: 80, hiddenFieldsMax: 80 };
  var SPACINGS = ['compact', 'normal', 'relaxed'];
  var PHOTO_SHAPES = ['rounded', 'circle', 'square', 'arch'];
  var LABEL_LANGUAGES = ['en', 'hi', 'both'];
  var DHARMIC = ['hindu', 'jain', 'sikh', 'buddhist'];

  function rel(d) { return (d && d.religion && d.religion.religion) || ''; }
  // Gotra, raasi and similar apply to dharmic religions; they also show while
  // religion is still unset so families can fill them in any order.
  function dharmic(d) { var r = rel(d); return r === '' || DHARMIC.indexOf(r) >= 0; }

  var O = {
    gender: ['male', 'female'],
    maritalStatus: ['never_married', 'divorced', 'awaiting_divorce', 'widowed', 'annulled'],
    complexion: ['fair', 'wheatish', 'wheatish_brown', 'dusky'],
    bloodGroup: ['a_pos', 'a_neg', 'b_pos', 'b_neg', 'ab_pos', 'ab_neg', 'o_pos', 'o_neg'],
    language: ['hindi', 'english', 'gor_boli', 'telugu', 'kannada', 'marathi', 'tamil', 'gujarati', 'punjabi', 'urdu', 'bengali', 'rajasthani', 'odia', 'malayalam'],
    siblingRelation: ['elder_brother', 'younger_brother', 'brother', 'elder_sister', 'younger_sister', 'sister'],
    siblingStatus: ['married', 'unmarried'],
    familyType: ['joint', 'nuclear', 'extended'],
    familyStatus: ['lower_middle_class', 'middle_class', 'upper_middle_class', 'affluent'],
    familyValues: ['traditional', 'moderate', 'liberal'],
    incomePeriod: ['annual', 'monthly'],
    currency: ['inr', 'usd', 'gbp', 'eur', 'aed', 'cad', 'aud', 'sgd'],
    religion: ['hindu', 'muslim', 'sikh', 'christian', 'jain', 'buddhist', 'other'],
    raasi: ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrischika', 'dhanu', 'makara', 'kumbha', 'meena'],
    nakshatra: ['ashwini', 'bharani', 'krittika', 'rohini', 'mrigashira', 'ardra', 'punarvasu', 'pushya', 'ashlesha', 'magha', 'purva_phalguni', 'uttara_phalguni', 'hasta', 'chitra', 'swati', 'vishakha', 'anuradha', 'jyeshtha', 'mula', 'purva_ashadha', 'uttara_ashadha', 'shravana', 'dhanishta', 'shatabhisha', 'purva_bhadrapada', 'uttara_bhadrapada', 'revati'],
    manglik: ['no', 'yes', 'partial', 'unknown'],
    yesNo: ['yes', 'no'],
    diet: ['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan', 'jain_food'],
    habit: ['no', 'occasionally', 'yes'],
    hobby: ['reading', 'music', 'cooking', 'travelling', 'sports', 'dancing', 'photography', 'gardening', 'movies', 'yoga', 'painting', 'writing'],
    interest: ['technology', 'social_work', 'fitness', 'art_culture', 'spirituality', 'business', 'nature', 'education'],
    partnerMarital: ['never_married', 'divorced_or_widowed', 'any'],
    contactRelation: ['self', 'father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'guardian', 'other'],
  };

  var FIELDS = [];
  function f(section, key, type, opts) {
    var o = { id: section + '.' + key, section: section, step: section, key: key, type: type };
    for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    if ((type === 'select' || type === 'multiselect') && !o.options) o.options = O[o.enumKey || key];
    if (type === 'textarea') o.multiline = true;
    FIELDS.push(o);
    return o;
  }
  function sel(enumKey, extra) {
    var o = { enumKey: enumKey, options: O[enumKey] };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }

  // ---- personal
  f('personal', 'fullName', 'text', { max: 60, required: true, core: true, placeholder: 'e.g. Aarav Rathod', hint: 'Your name as you want it printed.' });
  f('personal', 'gender', 'select', { required: true, core: true });
  f('personal', 'dob', 'date', { required: true, core: true, privacy: true, hint: 'Age is calculated automatically. You can hide the date and still show the age.' });
  f('personal', 'ageOverride', 'number', { max: 3, min: 1, maxValue: 100, placeholder: 'Auto', hint: 'Optional. Leave blank to use the age from the date of birth.' });
  f('personal', 'birthTime', 'time', { privacy: true, placeholder: 'e.g. 06:45', hint: 'Optional. Families who match horoscopes will ask for it.' });
  f('personal', 'birthPlace', 'text', { max: 60, placeholder: 'e.g. Nizamabad, Telangana' });
  f('personal', 'heightCm', 'height', { min: 90, maxValue: 250, core: true, hint: 'Enter feet and inches or centimetres; both are printed.' });
  f('personal', 'weightKg', 'number', { max: 3, min: 30, maxValue: 200, unit: 'kg', placeholder: 'e.g. 68' });
  f('personal', 'complexion', 'select', { hint: 'Optional. Many families prefer to leave this out.' });
  f('personal', 'bloodGroup', 'select', {});
  f('personal', 'maritalStatus', 'select', { core: true });
  f('personal', 'childrenDetails', 'text', {
    max: 100, placeholder: 'e.g. One daughter, 6 years, lives with me',
    when: function (d) { var m = d && d.personal && d.personal.maritalStatus; return !!m && m !== 'never_married'; },
  });
  f('personal', 'motherTongue', 'text', { max: 40, placeholder: 'e.g. Gor Boli (Banjara)' });
  f('personal', 'languages', 'multiselect', sel('language', { free: true, maxItems: 8, itemMax: 30, hint: 'Pick from the list or type your own.' }));
  f('personal', 'nationality', 'text', { max: 40, placeholder: 'e.g. Indian' });
  f('personal', 'about', 'textarea', {
    max: 600, prose: true,
    placeholder: 'e.g. I am a calm, family-oriented person who enjoys cooking and weekend treks. I value honesty and respect for elders, and I am looking for a partner who is kind and ambitious.',
    hint: 'Three or four sentences: your nature, what you value, and how you spend your time. A blank line starts a new paragraph.',
  });

  // ---- family
  f('family', 'fatherName', 'text', { max: 60, core: true, placeholder: 'e.g. Shri Ramesh Rathod' });
  f('family', 'fatherOccupation', 'text', { max: 80, placeholder: 'e.g. Retired Headmaster, Govt. School' });
  f('family', 'motherName', 'text', { max: 60, core: true, placeholder: 'e.g. Smt. Kamala Rathod' });
  f('family', 'motherOccupation', 'text', { max: 80, placeholder: 'e.g. Homemaker' });
  f('family', 'siblings', 'list', {
    maxItems: 8,
    hint: 'Add each brother or sister with a short note, e.g. "Married, Software Engineer in Pune".',
    itemFields: [
      { id: 'family.siblings.relation', key: 'relation', type: 'select', enumKey: 'siblingRelation', options: O.siblingRelation },
      { id: 'family.siblings.maritalStatus', key: 'maritalStatus', type: 'select', enumKey: 'siblingStatus', options: O.siblingStatus },
      { id: 'family.siblings.details', key: 'details', type: 'text', max: 100, placeholder: 'e.g. Rohan, Civil Engineer in Pune' },
    ],
  });
  f('family', 'familyType', 'select', {});
  f('family', 'familyStatus', 'select', {});
  f('family', 'familyValues', 'select', {});
  f('family', 'nativePlace', 'text', { max: 80, placeholder: 'e.g. Bhimla Tanda, Nizamabad district' });
  f('family', 'familyAbout', 'textarea', {
    max: 400, prose: true,
    placeholder: 'e.g. We are a close-knit family rooted in Banjara traditions. Festivals like Teej are celebrated together with the whole tanda.',
    hint: 'Optional. A few lines about your family, roots and traditions.',
  });

  // ---- education
  f('education', 'highest', 'text', { max: 80, core: true, placeholder: 'e.g. B.Tech, Computer Science' });
  f('education', 'degrees', 'list', {
    maxItems: 5,
    hint: 'Most recent first.',
    itemFields: [
      { id: 'education.degrees.degree', key: 'degree', type: 'text', max: 60, placeholder: 'e.g. M.Tech, Data Science' },
      { id: 'education.degrees.institution', key: 'institution', type: 'text', max: 80, placeholder: 'e.g. JNTU Hyderabad' },
      { id: 'education.degrees.year', key: 'year', type: 'number', max: 4, min: 1950, maxValue: 2040, placeholder: 'e.g. 2019' },
    ],
  });
  f('education', 'details', 'textarea', { max: 300, prose: true, placeholder: 'e.g. Gold medallist; cleared GATE 2019.', hint: 'Optional. Awards, certifications or ongoing studies.' });

  // ---- profession
  f('profession', 'occupation', 'text', { max: 60, core: true, placeholder: 'e.g. Software Engineer' });
  f('profession', 'employer', 'text', { max: 80, placeholder: 'e.g. Infosys Ltd.' });
  f('profession', 'designation', 'text', { max: 60, placeholder: 'e.g. Senior Associate' });
  f('profession', 'workLocation', 'text', { max: 60, placeholder: 'e.g. Hyderabad' });
  f('profession', 'details', 'textarea', { max: 300, prose: true, placeholder: 'e.g. Six years in cloud software; leads a team of five.', hint: 'Optional. Experience, business or plans.' });

  // ---- income
  f('income', 'amount', 'income', { max: 12, placeholder: 'e.g. 1200000', hint: 'In full (12,00,000 prints as ₹12 Lakh). Leave blank to describe it in words instead.' });
  f('income', 'period', 'select', { enumKey: 'incomePeriod', options: O.incomePeriod });
  f('income', 'currency', 'select', {});
  f('income', 'text', 'text', { max: 60, placeholder: 'e.g. Will share on request' });
  f('income', 'familyIncomeText', 'text', { max: 60, placeholder: 'e.g. ₹18 Lakh per annum' });

  // ---- religion and community
  f('religion', 'religion', 'select', { core: true });
  f('religion', 'caste', 'text', { max: 40, placeholder: 'e.g. Banjara (Lambadi)' });
  f('religion', 'subCaste', 'text', { max: 40, placeholder: 'e.g. Gormati' });
  f('religion', 'gotra', 'text', { max: 40, when: dharmic, placeholder: 'e.g. Bhukya', hint: 'Your own (paternal) gotra.' });
  f('religion', 'motherGotra', 'text', { max: 40, when: dharmic, placeholder: 'e.g. Banoth', hint: "Your mother's gotra before marriage." });
  f('religion', 'clan', 'text', { max: 40, placeholder: 'e.g. Rathod', hint: 'Banjara clan (Rathod, Pawar, Chavan, Vadtiya, Banoth and others). Optional.' });
  f('religion', 'tanda', 'text', { max: 60, placeholder: 'e.g. Bhimla Tanda', hint: 'Ancestral tanda (settlement). Optional.' });
  f('religion', 'raasi', 'select', { when: dharmic });
  f('religion', 'nakshatra', 'select', { when: dharmic });
  f('religion', 'manglik', 'select', { when: dharmic });
  f('religion', 'sect', 'text', { max: 40, when: function (d) { return rel(d) === 'muslim'; }, placeholder: 'e.g. Sunni' });
  f('religion', 'denomination', 'text', { max: 40, when: function (d) { return rel(d) === 'christian'; }, placeholder: 'e.g. Catholic' });
  f('religion', 'church', 'text', { max: 80, when: function (d) { return rel(d) === 'christian'; }, placeholder: 'e.g. St. Mary’s Church, Secunderabad' });
  f('religion', 'amritdhari', 'select', sel('yesNo', { when: function (d) { return rel(d) === 'sikh'; } }));
  f('religion', 'note', 'textarea', { max: 200, prose: true, placeholder: 'e.g. Kundli available on request.' });

  // ---- lifestyle
  f('lifestyle', 'diet', 'select', { core: true });
  f('lifestyle', 'smoking', 'select', { enumKey: 'habit', options: O.habit });
  f('lifestyle', 'drinking', 'select', { enumKey: 'habit', options: O.habit });
  f('lifestyle', 'hobbies', 'multiselect', sel('hobby', { free: true, maxItems: 10, itemMax: 30 }));
  f('lifestyle', 'interests', 'multiselect', sel('interest', { free: true, maxItems: 10, itemMax: 30 }));

  // ---- partner preferences
  f('partner', 'ageMin', 'number', { max: 2, min: 18, maxValue: 80, placeholder: 'e.g. 24' });
  f('partner', 'ageMax', 'number', { max: 2, min: 18, maxValue: 80, placeholder: 'e.g. 29' });
  f('partner', 'heightMinCm', 'height', { min: 120, maxValue: 230 });
  f('partner', 'heightMaxCm', 'height', { min: 120, maxValue: 230 });
  f('partner', 'education', 'text', { max: 80, placeholder: 'e.g. Graduate or above' });
  f('partner', 'profession', 'text', { max: 80, placeholder: 'e.g. Working professional or homemaker' });
  f('partner', 'location', 'text', { max: 80, placeholder: 'e.g. Telangana, Karnataka or abroad' });
  f('partner', 'maritalStatus', 'select', { enumKey: 'partnerMarital', options: O.partnerMarital });
  f('partner', 'religionCaste', 'text', { max: 80, placeholder: 'e.g. Banjara community preferred' });
  f('partner', 'other', 'textarea', {
    max: 400, prose: true,
    placeholder: 'e.g. Someone kind and well-educated who values family and is open to living in Hyderabad.',
    hint: 'Keep it warm and short; a long list of conditions reads as demanding.',
  });

  // ---- contact
  f('contact', 'contactPerson', 'text', { max: 60, placeholder: 'e.g. Ramesh Rathod' });
  f('contact', 'relation', 'select', { enumKey: 'contactRelation', options: O.contactRelation });
  f('contact', 'phone', 'phone', { max: 20, privacy: true, placeholder: 'e.g. +91 98765 43210', hint: 'A phone number or an email is required.' });
  f('contact', 'altPhone', 'phone', { max: 20, privacy: true });
  f('contact', 'whatsapp', 'phone', { max: 20, privacy: true });
  f('contact', 'email', 'email', { max: 80, privacy: true, placeholder: 'e.g. family@example.com' });
  f('contact', 'address', 'textarea', { max: 200, privacy: true, placeholder: 'House no., street, area', hint: 'Optional. Many families share only the city.' });
  f('contact', 'city', 'text', { max: 40, placeholder: 'e.g. Hyderabad' });
  f('contact', 'state', 'text', { max: 40, placeholder: 'e.g. Telangana' });
  f('contact', 'country', 'text', { max: 40, placeholder: 'e.g. India' });
  f('contact', 'bestTime', 'text', { max: 40, placeholder: 'e.g. Evenings after 6 pm' });

  // ---- additional
  f('additional', 'horoscopeNote', 'text', { max: 120, placeholder: 'e.g. Horoscope available on request' });
  f('additional', 'expectations', 'textarea', { max: 400, prose: true, placeholder: 'e.g. A simple wedding with close family.' });
  f('additional', 'note', 'textarea', { max: 400, prose: true, placeholder: 'Anything else you would like families to know.' });

  var BY_ID = {};
  FIELDS.forEach(function (fd) { BY_ID[fd.id] = fd; });
  // Rows the renderer derives; they can be hidden like fields.
  var DERIVED_IDS = ['personal.age', 'partner.age', 'partner.height', 'contact.location'];
  var HIDEABLE = FIELDS.map(function (fd) { return fd.id; }).concat(DERIVED_IDS);

  // ------------------------------------------------------------------ helpers
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // eslint-disable-next-line no-control-regex
  var CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var TAGS = /<\/?[A-Za-z!?][^<>]*(>|$)/g;

  function capLen(s, max) {
    if (!max || s.length <= max) return s;
    var out = s.slice(0, max);
    var c = out.charCodeAt(out.length - 1);
    if (c >= 0xd800 && c <= 0xdbff) out = out.slice(0, -1); // never split a surrogate pair
    return out.replace(/\s+$/, '');
  }

  // Text sanitiser shared by every string field. Returns a string.
  function cleanStr(v, max, multiline) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' && isFinite(v)) v = String(v);
    if (typeof v !== 'string') return null; // wrong type, caller reports
    var s = v.replace(TAGS, '').replace(/[\u2028\u2029]/g, '\n').replace(CTRL, '').replace(/\t/g, ' ');
    if (multiline) {
      s = s.replace(/\r\n?/g, '\n').split('\n').map(function (line) {
        return line.replace(/[ \u00A0]+/g, ' ').replace(/^ +| +$/g, '');
      }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    } else {
      s = s.replace(/[\s\u00A0]+/g, ' ').trim();
    }
    return capLen(s, max);
  }

  function err(errors, path, message, soft) {
    var e = { path: path, code: 'VALIDATION_ERROR', message: message };
    if (soft) e.soft = true;
    errors.push(e);
  }

  function cleanText(v, max, multiline, path, errors) {
    var s = cleanStr(v, max, multiline);
    if (s === null) { err(errors, path, 'Expected text'); return ''; }
    return s;
  }

  function cleanNumber(fd, v, path, errors) {
    if (v === null || v === undefined || v === '') return '';
    var s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.replace(/[\s,]/g, '') : null;
    if (s === null || !/^\d+(\.\d+)?$/.test(s)) { err(errors, path, 'Enter a number'); return ''; }
    var n = Math.round(Number(s));
    if ((fd.min !== undefined && n < fd.min) || (fd.maxValue !== undefined && n > fd.maxValue)) {
      err(errors, path, 'Enter a value between ' + fd.min + ' and ' + fd.maxValue);
      return '';
    }
    return String(n);
  }

  function cleanField(fd, v, path, errors) {
    switch (fd.type) {
      case 'text':
      case 'textarea':
        return cleanText(v, fd.max, !!fd.multiline, path, errors);
      case 'select': {
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'string' && fd.options.indexOf(v) >= 0) return v;
        err(errors, path, 'Choose one of the listed options');
        return '';
      }
      case 'multiselect': {
        var arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : v === null || v === undefined ? [] : null;
        if (arr === null) { err(errors, path, 'Expected a list'); return []; }
        var out = []; var seen = {};
        for (var i = 0; i < arr.length && out.length < (fd.maxItems || 10); i++) {
          var s = cleanStr(arr[i], fd.itemMax || 30, false);
          if (!s) continue;
          if (fd.options.indexOf(s) < 0 && !fd.free) { err(errors, path, 'Choose from the listed options'); continue; }
          var k = s.toLowerCase();
          if (seen[k]) continue;
          seen[k] = true;
          out.push(s);
        }
        return out;
      }
      case 'date': {
        if (v === null || v === undefined || v === '') return '';
        var d = typeof v === 'string' ? v.trim().slice(0, 10) : '';
        var p = K.fmt.parseIsoDate(d);
        if (!p || p.y < 1900 || p.y > 2100) { err(errors, path, 'Enter a valid date'); return ''; }
        return d;
      }
      case 'time': {
        if (v === null || v === undefined || v === '') return '';
        var m = typeof v === 'string' ? /^([01]?\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.exec(v.trim()) : null;
        if (!m) { err(errors, path, 'Enter a valid time'); return ''; }
        return (m[1].length === 1 ? '0' : '') + m[1] + ':' + m[2];
      }
      case 'number':
      case 'height':
        return cleanNumber(fd, v, path, errors);
      case 'income': {
        if (v === null || v === undefined || v === '') return '';
        var raw = typeof v === 'number' ? String(Math.round(v)) : typeof v === 'string' ? v.replace(/[\s,₹]/g, '') : '';
        if (!/^\d{1,12}(\.\d+)?$/.test(raw)) { err(errors, path, 'Enter the amount in digits'); return ''; }
        var n = Math.round(Number(raw));
        return n > 0 ? String(n) : '';
      }
      case 'phone': {
        var ph = cleanText(v, 40, false, path, errors).replace(/[^\d+\-() ]/g, '').replace(/\s+/g, ' ').trim();
        ph = capLen(ph, fd.max || 20);
        if (ph) {
          var digits = ph.replace(/\D/g, '').length;
          if (digits < 7 || digits > 15) err(errors, path, 'Enter a valid phone number', true);
        }
        return ph;
      }
      case 'email': {
        var em = cleanText(v, 200, false, path, errors).replace(/\s+/g, '');
        em = capLen(em, fd.max || 80);
        if (em && !EMAIL_RE.test(em)) err(errors, path, 'Enter a valid email address', true);
        return em;
      }
      case 'list': {
        if (v === null || v === undefined) return [];
        if (!Array.isArray(v)) { err(errors, path, 'Expected a list'); return []; }
        var items = [];
        for (var j = 0; j < v.length && items.length < (fd.maxItems || 5); j++) {
          if (!isObj(v[j])) continue;
          var item = {}; var any = false;
          for (var q = 0; q < fd.itemFields.length; q++) {
            var itf = fd.itemFields[q];
            item[itf.key] = cleanField(itf, v[j][itf.key], path + '[' + items.length + '].' + itf.key, errors);
            if (item[itf.key] !== '') any = true;
          }
          if (any) items.push(item);
        }
        return items;
      }
      default:
        return '';
    }
  }

  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,24}$/;

  function emptyValue(fd) { return fd.type === 'multiselect' || fd.type === 'list' ? [] : ''; }

  function emptyData() {
    var d = { invocation: '', hiddenFields: [] };
    SECTIONS.forEach(function (s) { d[s] = {}; });
    FIELDS.forEach(function (fd) { d[fd.section][fd.key] = emptyValue(fd); });
    d.custom = {};
    SECTIONS.forEach(function (s) { d.custom[s] = []; });
    d.sectionTitles = {};
    return d;
  }

  function utf8Len(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } else n += 3;
    }
    return n;
  }

  // Server-side cleaner. Never throws; always returns safe data.
  // errors: [{path, code, message, soft?}]. soft errors (email/phone format)
  // keep the value so drafts survive half-typed input; hard errors drop it.
  function clean(input) {
    var errors = [];
    var src = isObj(input) ? input : {};
    if (input !== null && input !== undefined && !isObj(input)) err(errors, '', 'Biodata must be an object');
    var out = emptyData();

    out.invocation = cleanText(src.invocation, LIMITS.invocationMax, false, 'invocation', errors);

    if (Array.isArray(src.hiddenFields)) {
      src.hiddenFields.forEach(function (id) {
        if (typeof id === 'string' && HIDEABLE.indexOf(id) >= 0 && out.hiddenFields.indexOf(id) < 0 &&
          out.hiddenFields.length < LIMITS.hiddenFieldsMax) out.hiddenFields.push(id);
      });
    }

    SECTIONS.forEach(function (sec) {
      var s = isObj(src[sec]) ? src[sec] : {};
      FIELDS.forEach(function (fd) {
        if (fd.section !== sec) return;
        out[sec][fd.key] = cleanField(fd, has(s, fd.key) ? s[fd.key] : undefined, fd.id, errors);
      });
    });

    var total = 0;
    var custom = isObj(src.custom) ? src.custom : {};
    SECTIONS.forEach(function (sec) {
      var arr = custom[sec];
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (!isObj(it)) continue;
        if (out.custom[sec].length >= LIMITS.customPerSection || total >= LIMITS.customTotal) {
          errors.push({
            path: 'custom.' + sec, code: 'TOO_MANY_CUSTOM_FIELDS',
            message: 'Up to ' + LIMITS.customPerSection + ' custom fields per section and ' + LIMITS.customTotal + ' in total',
          });
          break;
        }
        var p = 'custom.' + sec + '[' + out.custom[sec].length + ']';
        var lab = isObj(it.label) ? it.label : { en: typeof it.label === 'string' ? it.label : '' };
        var id = typeof it.id === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(it.id) ? it.id : 'c' + (total + 1);
        out.custom[sec].push({
          id: id,
          label: {
            en: cleanText(lab.en, LIMITS.customLabelMax, false, p + '.label.en', errors),
            hi: cleanText(lab.hi, LIMITS.customLabelMax, false, p + '.label.hi', errors),
          },
          value: cleanText(it.value, LIMITS.customValueMax, false, p + '.value', errors),
        });
        total++;
      }
    });

    var titles = isObj(src.sectionTitles) ? src.sectionTitles : {};
    SECTIONS.forEach(function (sec) {
      var t = titles[sec];
      if (!isObj(t)) return;
      var en = cleanText(t.en, LIMITS.sectionTitleMax, false, 'sectionTitles.' + sec + '.en', errors);
      var hi = cleanText(t.hi, LIMITS.sectionTitleMax, false, 'sectionTitles.' + sec + '.hi', errors);
      if (en || hi) out.sectionTitles[sec] = { en: en, hi: hi };
    });

    if (utf8Len(JSON.stringify(out)) > LIMITS.maxDataBytes) err(errors, '', 'Biodata is too large');
    return { data: out, errors: errors };
  }

  function filled(v) { return Array.isArray(v) ? v.length > 0 : v !== '' && v !== null && v !== undefined; }

  // Inline validation for the builder: { path: message }.
  function validate(data, now) {
    var res = clean(data);
    var d = res.data;
    var out = {};
    res.errors.forEach(function (e) { if (!out[e.path]) out[e.path] = e.message; });
    FIELDS.forEach(function (fd) {
      if (fd.required && !filled(d[fd.section][fd.key]) && !out[fd.id]) out[fd.id] = 'This field is required';
    });
    if (d.personal.dob) {
      var age = K.fmt.computeAge(d.personal.dob, now);
      if (age === null) out['personal.dob'] = 'Date of birth cannot be in the future';
      else if (age < 18) out['personal.dob'] = 'The age must be at least 18';
      else if (age > 100) out['personal.dob'] = 'Check the year of birth';
    }
    var c = d.contact;
    if (!c.phone && !c.email && !out['contact.phone']) out['contact.phone'] = 'Add a phone number or an email address';
    var pa = d.partner;
    if (pa.ageMin && pa.ageMax && +pa.ageMin > +pa.ageMax) out['partner.ageMax'] = 'Must be at least the minimum age';
    if (pa.heightMinCm && pa.heightMaxCm && +pa.heightMinCm > +pa.heightMaxCm) out['partner.heightMaxCm'] = 'Must be at least the minimum height';
    return out;
  }

  function applicable(fd, d) { return !fd.when || fd.when(d); }

  // 'empty' | 'partial' | 'complete'. The photo step reports 'empty' (the
  // builder knows its own photo state) and design is always 'complete'.
  function stepStatus(data, stepId, now) {
    if (stepId === 'design') return 'complete';
    if (SECTIONS.indexOf(stepId) < 0) return 'empty';
    var d = clean(data).data;
    var n = 0; var coreMissing = false;
    FIELDS.forEach(function (fd) {
      if (fd.section !== stepId || !applicable(fd, d)) return;
      var ok = filled(d[stepId][fd.key]);
      if (ok) n++;
      else if (fd.core || fd.required) coreMissing = true;
    });
    d.custom[stepId].forEach(function (c) { if (c.value) n++; });
    if (n === 0) return 'empty';
    var errs = validate(data, now);
    for (var k in errs) if (k === stepId || k.indexOf(stepId + '.') === 0 || k.indexOf('custom.' + stepId) === 0) return 'partial';
    return coreMissing ? 'partial' : 'complete';
  }

  // Design allowlist. Returns only the keys given, cleaned; values that are
  // not valid for the template are dropped silently (so switching templates
  // falls back to the new template's defaults). Unknown keys are reported.
  function cleanDesign(design, templateId) {
    var out = {}; var errors = [];
    if (design === null || design === undefined) return { design: out, errors: errors };
    if (!isObj(design)) {
      errors.push({ path: 'design', code: 'VALIDATION_ERROR', message: 'Design must be an object' });
      return { design: out, errors: errors };
    }
    var def = K.registry && templateId ? K.registry.get(templateId) : null;
    Object.keys(design).forEach(function (key) {
      var v = design[key];
      if (DESIGN_KEYS.indexOf(key) < 0) {
        errors.push({ path: 'design.' + key, code: 'UNKNOWN_DESIGN_KEY', message: 'Unknown design option: ' + String(key).slice(0, 40) });
        return;
      }
      switch (key) {
        case 'palette':
          if (typeof v === 'string' && has(K.palettes, v) && (!def || def.palettes.indexOf(v) >= 0)) out.palette = v;
          break;
        case 'font':
          if (typeof v === 'string' && has(K.fontPresets, v) && (!def || def.fonts.indexOf(v) >= 0)) out.font = v;
          break;
        case 'scale': {
          var n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
          if (isFinite(n)) out.scale = Math.round(Math.min(1.15, Math.max(0.85, n)) * 100) / 100;
          break;
        }
        case 'spacing':
          if (SPACINGS.indexOf(v) >= 0) out.spacing = v;
          break;
        case 'photoPlacement': {
          var ok = typeof v === 'string' && (def ? def.photoPlacements.indexOf(v) >= 0 : allPlacements().indexOf(v) >= 0);
          if (ok) out.photoPlacement = v;
          break;
        }
        case 'photoShape':
          if (PHOTO_SHAPES.indexOf(v) >= 0) out.photoShape = v;
          break;
        case 'sectionOrder':
          if (Array.isArray(v)) out.sectionOrder = normaliseOrder(v);
          break;
        case 'hiddenSections':
          if (Array.isArray(v)) {
            out.hiddenSections = [];
            v.forEach(function (s) { if (SECTIONS.indexOf(s) >= 0 && out.hiddenSections.indexOf(s) < 0) out.hiddenSections.push(s); });
          }
          break;
        case 'labelLanguage':
          if (LABEL_LANGUAGES.indexOf(v) >= 0) out.labelLanguage = v;
          break;
        case 'footerText': {
          var s = cleanStr(v, LIMITS.footerMax, false);
          if (s !== null) out.footerText = s;
          break;
        }
        case 'shareContact':
          out.shareContact = v === true || v === 'true' || v === 1 || v === '1';
          break;
      }
    });
    return { design: out, errors: errors };
  }

  function normaliseOrder(arr) {
    var out = [];
    (Array.isArray(arr) ? arr : []).forEach(function (s) {
      if (SECTIONS.indexOf(s) >= 0 && out.indexOf(s) < 0) out.push(s);
    });
    SECTIONS.forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    return out;
  }

  function allPlacements() {
    var out = ['none'];
    var a = K.archetypes || {};
    Object.keys(a).forEach(function (id) {
      (a[id].photoSlots || []).forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    });
    return out;
  }

  K.schema = {
    STEPS: STEPS,
    SECTIONS: SECTIONS,
    DEFAULT_ORDER: SECTIONS.slice(),
    FIELDS: FIELDS,
    OPTIONS: O,
    DESIGN_KEYS: DESIGN_KEYS,
    LIMITS: LIMITS,
    SPACINGS: SPACINGS,
    PHOTO_SHAPES: PHOTO_SHAPES,
    LABEL_LANGUAGES: LABEL_LANGUAGES,
    DERIVED_IDS: DERIVED_IDS,
    HIDEABLE: HIDEABLE,
    field: function (id) { return BY_ID[id] || null; },
    fieldsOf: function (section) { return FIELDS.filter(function (fd) { return fd.section === section; }); },
    isApplicable: applicable,
    emptyData: emptyData,
    clean: clean,
    cleanText: function (v, max, multiline) { var s = cleanStr(v, max, multiline); return s === null ? '' : s; },
    validate: validate,
    stepStatus: stepStatus,
    cleanDesign: cleanDesign,
    normaliseOrder: normaliseOrder,
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
