/* global window */
// Fictional sample data for thumbnails, tests and the builder's "Load sample"
// button. Every name, number and address is invented (phone uses the common
// 98765 43210 placeholder, email uses example.com).
//
// K.sampleData(gender?)  'male' (default) | 'female'
// K.sampleDataLong()     every field at its maximum (pagination/overflow tests)
(function (K) {
  'use strict';

  function base() { return K.schema.emptyData(); }

  K.sampleData = function sampleData(gender) {
    var female = gender === 'female';
    var d = base();
    var p = d.personal;
    p.fullName = female ? 'Kavya Pawar' : 'Aarav Rathod';
    p.gender = female ? 'female' : 'male';
    p.dob = female ? '1999-08-22' : '1997-03-14';
    p.birthTime = female ? '17:20' : '06:45';
    p.birthPlace = female ? 'Gulbarga, Karnataka' : 'Nizamabad, Telangana';
    p.heightCm = female ? '163' : '178';
    p.weightKg = female ? '56' : '72';
    p.bloodGroup = female ? 'o_pos' : 'b_pos';
    p.maritalStatus = 'never_married';
    p.motherTongue = 'Gor Boli (Banjara)';
    p.languages = female ? ['gor_boli', 'kannada', 'hindi', 'english'] : ['gor_boli', 'telugu', 'hindi', 'english'];
    p.nationality = 'Indian';
    p.about = female
      ? 'I am a cheerful, grounded person who loves classical music, long walks and trying out recipes from my grandmother’s kitchen. I value kindness, honesty and respect for elders.\n\nI am looking for a partner who is caring, ambitious and comfortable with both city life and our Banjara traditions.'
      : 'I am a calm, family-oriented person who enjoys weekend treks, cooking for friends and reading about history. I value honesty, hard work and staying close to my roots.\n\nI am looking for a partner who is kind and confident, and who would enjoy building a warm home together.';

    var fa = d.family;
    fa.fatherName = female ? 'Shri Suresh Pawar' : 'Shri Ramesh Rathod';
    fa.fatherOccupation = female ? 'Assistant Engineer, Irrigation Department' : 'Retired Headmaster, Zilla Parishad High School';
    fa.motherName = female ? 'Smt. Lalitha Pawar' : 'Smt. Kamala Rathod (कमला राठोड़)';
    fa.motherOccupation = female ? 'Anganwadi Supervisor' : 'Homemaker';
    fa.siblings = female
      ? [
        { relation: 'elder_brother', maritalStatus: 'married', details: 'Vikram, Sub-Inspector of Police, Bidar' },
        { relation: 'younger_sister', maritalStatus: 'unmarried', details: 'Sneha, MBBS second year' },
      ]
      : [
        { relation: 'elder_sister', maritalStatus: 'married', details: 'Priya Banoth, Lecturer in Warangal' },
        { relation: 'younger_brother', maritalStatus: 'unmarried', details: 'Rohan, B.Com final year, Osmania University' },
      ];
    fa.familyType = 'nuclear';
    fa.familyStatus = 'upper_middle_class';
    fa.familyValues = 'moderate';
    fa.nativePlace = female ? 'Sevalal Tanda, Kalaburagi district' : 'Bhimla Tanda, Nizamabad district';
    fa.familyAbout = 'We are a close-knit family rooted in Banjara traditions. Teej and Sevalal Jayanti are celebrated every year with relatives from our tanda, and education has always come first in our home.';

    var e = d.education;
    e.highest = female ? 'Post-graduate (MBA)' : 'Post-graduate (M.Tech)';
    e.degrees = female
      ? [
        { degree: 'MBA, Finance', institution: 'Christ University, Bengaluru', year: '2022' },
        { degree: 'B.Com (Honours)', institution: 'Mount Carmel College, Bengaluru', year: '2020' },
      ]
      : [
        { degree: 'M.Tech, Computer Science', institution: 'University of Hyderabad', year: '2020' },
        { degree: 'B.Tech, Electronics & Communication', institution: 'JNTU Hyderabad', year: '2018' },
      ];

    var pr = d.profession;
    pr.occupation = female ? 'Financial Analyst' : 'Software Engineer';
    pr.employer = female ? 'Meridian Capital Advisors (sample)' : 'Northstar Analytics Pvt. Ltd. (sample)';
    pr.designation = female ? 'Senior Analyst' : 'Senior Software Engineer';
    pr.workLocation = female ? 'Bengaluru' : 'Hyderabad';

    d.income.amount = female ? '1250000' : '1850000';
    d.income.period = 'annual';
    d.income.currency = 'inr';
    d.income.familyIncomeText = female ? 'About ₹15 Lakh per annum' : 'About ₹9 Lakh per annum (pension and agriculture)';

    var r = d.religion;
    r.religion = 'hindu';
    r.caste = 'Banjara (Lambadi)';
    r.subCaste = 'Gormati';
    r.gotra = female ? 'Dharavath' : 'Ramavath';
    r.motherGotra = female ? 'Bhukya' : 'Ajmera';
    r.clan = female ? 'Pawar' : 'Rathod';
    r.tanda = female ? 'Sevalal Tanda' : 'Bhimla Tanda (भीमला तांडा)';
    r.raasi = female ? 'kanya' : 'meena';
    r.nakshatra = female ? 'hasta' : 'revati';
    r.manglik = 'no';

    var l = d.lifestyle;
    l.diet = female ? 'vegetarian' : 'eggetarian';
    l.smoking = 'no';
    l.drinking = 'no';
    l.hobbies = female ? ['music', 'cooking', 'reading', 'Bharatanatyam'] : ['travelling', 'cooking', 'photography', 'Trekking'];
    l.interests = female ? ['art_culture', 'fitness'] : ['technology', 'social_work'];

    var pa = d.partner;
    pa.ageMin = female ? '26' : '24';
    pa.ageMax = female ? '31' : '28';
    pa.heightMinCm = female ? '168' : '152';
    pa.heightMaxCm = female ? '185' : '168';
    pa.education = 'Graduate or above';
    pa.profession = female ? 'Working professional' : 'Working professional or homemaker';
    pa.location = female ? 'Karnataka, Telangana or abroad' : 'Telangana, Karnataka or Maharashtra';
    pa.maritalStatus = 'never_married';
    pa.religionCaste = 'Banjara community preferred';
    pa.other = female
      ? 'Someone respectful and family-minded, who supports my career and enjoys travel.'
      : 'Someone warm and well-educated who values family, and is open to settling in Hyderabad.';

    var c = d.contact;
    c.contactPerson = female ? 'Suresh Pawar' : 'Ramesh Rathod';
    c.relation = 'father';
    c.phone = '+91 98765 43210';
    c.whatsapp = '+91 98765 43210';
    c.email = female ? 'pawar.family@example.com' : 'rathod.family@example.com';
    c.address = female ? '12, Vidya Nagar, 3rd Cross' : 'Plot 24, Sainath Colony, Kukatpally';
    c.city = female ? 'Bengaluru' : 'Hyderabad';
    c.state = female ? 'Karnataka' : 'Telangana';
    c.country = 'India';
    c.bestTime = 'Evenings after 6 pm';

    d.additional.horoscopeNote = 'Horoscope available on request';
    d.additional.note = K.t('en', 'misc', 'sampleNote');

    d.custom.family = [
      { id: 'c1', label: { en: 'Grandfather', hi: 'दादाजी' }, value: female ? 'Late Shri Hemla Pawar, farmer' : 'Late Shri Bhima Rathod, Naik of Bhimla Tanda' },
    ];
    return d;
  };

  var PROSE = 'Our family values honesty, education and close ties with relatives across the tanda and the city. ' +
    'Weekends are for long lunches, music and visiting grandparents in the village. ';
  var WORDS = 'Hyderabad Telangana Rathod Banjara Engineer Graduate Family Tanda Village District Senior Manager ';

  function fill(source, max) {
    var s = '';
    while (s.length < max) s += source;
    s = s.slice(0, max);
    return s.replace(/\s+$/, '').slice(0, max);
  }
  function fillProse(max) {
    // Paragraphs of roughly 220 characters separated by blank lines.
    var parts = []; var len = 0;
    while (len < max) {
      var para = fill(PROSE, Math.min(220, max - len - (parts.length ? 2 : 0)));
      if (!para) break;
      parts.push(para);
      len += para.length + (parts.length > 1 ? 2 : 0);
      if (max - len < 10) break;
    }
    return parts.join('\n\n').slice(0, max);
  }

  K.sampleDataLong = function sampleDataLong() {
    var d = K.sampleData('male');
    K.schema.FIELDS.forEach(function (fd) {
      var sec = d[fd.section];
      if (fd.type === 'text') sec[fd.key] = fill(WORDS, fd.max);
      else if (fd.type === 'textarea') sec[fd.key] = fd.prose ? fillProse(fd.max) : fill(WORDS, fd.max);
      else if (fd.type === 'multiselect') {
        var vals = fd.options.slice(0, fd.maxItems);
        while (vals.length < fd.maxItems) vals.push('Custom ' + vals.length);
        sec[fd.key] = vals;
      } else if (fd.type === 'list') {
        var items = [];
        for (var i = 0; i < fd.maxItems; i++) {
          var it = {};
          fd.itemFields.forEach(function (itf) {
            if (itf.type === 'select') it[itf.key] = itf.options[i % itf.options.length];
            else if (itf.type === 'number') it[itf.key] = String(2000 + i);
            else it[itf.key] = fill(WORDS, itf.max);
          });
          items.push(it);
        }
        sec[fd.key] = items;
      }
    });
    d.invocation = fill('Shubh Vivah ', K.schema.LIMITS.invocationMax);
    d.personal.maritalStatus = 'divorced'; // exposes childrenDetails
    var total = 0;
    K.schema.SECTIONS.forEach(function (s) {
      d.custom[s] = [];
      for (var i = 0; i < K.schema.LIMITS.customPerSection && total < K.schema.LIMITS.customTotal; i++) {
        d.custom[s].push({
          id: 'x' + total,
          label: { en: fill('Custom Detail ', K.schema.LIMITS.customLabelMax), hi: 'अतिरिक्त विवरण' },
          value: fill(WORDS, K.schema.LIMITS.customValueMax),
        });
        total++;
      }
    });
    return d;
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
