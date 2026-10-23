/* global window */
// Bilingual labels for every section, field, enum value, month and the few
// fixed words a biodata prints. English is the fallback for anything missing
// in Hindi. Field labels are keyed by field id ('personal.fullName'); list
// item fields by 'family.siblings.relation'; derived rows by ids such as
// 'personal.age' or 'contact.location'.
//
// K.t(lang, group, key)          plain text (unescaped), falls back to en, then key
// K.label(group, key, mode)      escaped HTML for mode 'en' | 'hi' | 'both'
//                                Hindi is always wrapped in <span lang="hi">.
(function (K) {
  'use strict';

  var en = {
    sections: {
      personal: 'Personal Details',
      photo: 'Photo',
      family: 'Family Details',
      education: 'Education',
      profession: 'Profession',
      income: 'Income',
      religion: 'Religion & Community',
      lifestyle: 'Lifestyle',
      partner: 'Partner Preferences',
      contact: 'Contact Details',
      additional: 'Additional Information',
      design: 'Design & Export',
    },
    fields: {
      invocation: 'Invocation line',
      'personal.fullName': 'Full Name',
      'personal.gender': 'Gender',
      'personal.dob': 'Date of Birth',
      'personal.age': 'Age',
      'personal.ageOverride': 'Age (override)',
      'personal.birthTime': 'Time of Birth',
      'personal.birthPlace': 'Place of Birth',
      'personal.heightCm': 'Height',
      'personal.weightKg': 'Weight',
      'personal.complexion': 'Complexion',
      'personal.bloodGroup': 'Blood Group',
      'personal.maritalStatus': 'Marital Status',
      'personal.childrenDetails': 'Children',
      'personal.motherTongue': 'Mother Tongue',
      'personal.languages': 'Languages Known',
      'personal.nationality': 'Nationality',
      'personal.about': 'About Me',

      'family.fatherName': "Father's Name",
      'family.fatherOccupation': "Father's Occupation",
      'family.motherName': "Mother's Name",
      'family.motherOccupation': "Mother's Occupation",
      'family.siblings': 'Siblings',
      'family.siblings.relation': 'Relation',
      'family.siblings.maritalStatus': 'Marital Status',
      'family.siblings.details': 'Details',
      'family.familyType': 'Family Type',
      'family.familyStatus': 'Family Status',
      'family.familyValues': 'Family Values',
      'family.nativePlace': 'Native Place',
      'family.familyAbout': 'About the Family',

      'education.highest': 'Highest Qualification',
      'education.degrees': 'Qualifications',
      'education.degrees.degree': 'Degree',
      'education.degrees.institution': 'Institution',
      'education.degrees.year': 'Year',
      'education.details': 'More About Education',

      'profession.occupation': 'Occupation',
      'profession.employer': 'Employer',
      'profession.designation': 'Designation',
      'profession.workLocation': 'Work Location',
      'profession.details': 'About My Work',

      'income.amount': 'Income',
      'income.period': 'Income Period',
      'income.currency': 'Currency',
      'income.text': 'Income (in words)',
      'income.familyIncomeText': 'Family Income',

      'religion.religion': 'Religion',
      'religion.caste': 'Caste',
      'religion.subCaste': 'Sub-caste',
      'religion.gotra': 'Gotra',
      'religion.motherGotra': "Mother's Gotra",
      'religion.clan': 'Clan',
      'religion.tanda': 'Tanda',
      'religion.raasi': 'Raasi (Moon Sign)',
      'religion.nakshatra': 'Nakshatra',
      'religion.manglik': 'Manglik',
      'religion.sect': 'Sect',
      'religion.denomination': 'Denomination',
      'religion.church': 'Church',
      'religion.amritdhari': 'Amritdhari',
      'religion.note': 'Note',

      'lifestyle.diet': 'Diet',
      'lifestyle.smoking': 'Smoking',
      'lifestyle.drinking': 'Drinking',
      'lifestyle.hobbies': 'Hobbies',
      'lifestyle.interests': 'Interests',

      'partner.age': 'Age',
      'partner.ageMin': 'Age from',
      'partner.ageMax': 'Age to',
      'partner.height': 'Height',
      'partner.heightMinCm': 'Height from',
      'partner.heightMaxCm': 'Height to',
      'partner.education': 'Education',
      'partner.profession': 'Profession',
      'partner.location': 'Preferred Location',
      'partner.maritalStatus': 'Marital Status',
      'partner.religionCaste': 'Religion / Caste',
      'partner.other': 'Other Expectations',

      'contact.contactPerson': 'Contact Person',
      'contact.relation': 'Relation',
      'contact.phone': 'Phone',
      'contact.altPhone': 'Alternate Phone',
      'contact.whatsapp': 'WhatsApp',
      'contact.email': 'Email',
      'contact.address': 'Address',
      'contact.location': 'Location',
      'contact.city': 'City',
      'contact.state': 'State',
      'contact.country': 'Country',
      'contact.bestTime': 'Best Time to Call',

      'additional.horoscopeNote': 'Horoscope',
      'additional.expectations': 'Expectations',
      'additional.note': 'Note',
    },
    values: {
      gender: { male: 'Male', female: 'Female' },
      maritalStatus: {
        never_married: 'Never Married', divorced: 'Divorced', awaiting_divorce: 'Awaiting Divorce',
        widowed: 'Widowed', annulled: 'Annulled',
      },
      complexion: { fair: 'Fair', wheatish: 'Wheatish', wheatish_brown: 'Wheatish Brown', dusky: 'Dusky' },
      bloodGroup: {
        a_pos: 'A+', a_neg: 'A−', b_pos: 'B+', b_neg: 'B−', ab_pos: 'AB+', ab_neg: 'AB−', o_pos: 'O+', o_neg: 'O−',
      },
      language: {
        hindi: 'Hindi', english: 'English', gor_boli: 'Gor Boli (Banjara)', telugu: 'Telugu', kannada: 'Kannada',
        marathi: 'Marathi', tamil: 'Tamil', gujarati: 'Gujarati', punjabi: 'Punjabi', urdu: 'Urdu',
        bengali: 'Bengali', rajasthani: 'Rajasthani', odia: 'Odia', malayalam: 'Malayalam',
      },
      siblingRelation: {
        elder_brother: 'Elder Brother', younger_brother: 'Younger Brother', brother: 'Brother',
        elder_sister: 'Elder Sister', younger_sister: 'Younger Sister', sister: 'Sister',
      },
      siblingStatus: { married: 'Married', unmarried: 'Unmarried' },
      familyType: { joint: 'Joint Family', nuclear: 'Nuclear Family', extended: 'Extended Family' },
      familyStatus: {
        lower_middle_class: 'Lower Middle Class', middle_class: 'Middle Class',
        upper_middle_class: 'Upper Middle Class', affluent: 'Affluent',
      },
      familyValues: { traditional: 'Traditional', moderate: 'Moderate', liberal: 'Liberal' },
      incomePeriod: { annual: 'Annual', monthly: 'Monthly' },
      currency: {
        inr: 'INR (₹)', usd: 'USD ($)', gbp: 'GBP (£)', eur: 'EUR (€)', aed: 'AED', cad: 'CAD (C$)',
        aud: 'AUD (A$)', sgd: 'SGD (S$)',
      },
      religion: {
        hindu: 'Hindu', muslim: 'Muslim', sikh: 'Sikh', christian: 'Christian', jain: 'Jain',
        buddhist: 'Buddhist', other: 'Other',
      },
      raasi: {
        mesha: 'Mesha (Aries)', vrishabha: 'Vrishabha (Taurus)', mithuna: 'Mithuna (Gemini)',
        karka: 'Karka (Cancer)', simha: 'Simha (Leo)', kanya: 'Kanya (Virgo)', tula: 'Tula (Libra)',
        vrischika: 'Vrischika (Scorpio)', dhanu: 'Dhanu (Sagittarius)', makara: 'Makara (Capricorn)',
        kumbha: 'Kumbha (Aquarius)', meena: 'Meena (Pisces)',
      },
      nakshatra: {
        ashwini: 'Ashwini', bharani: 'Bharani', krittika: 'Krittika', rohini: 'Rohini',
        mrigashira: 'Mrigashira', ardra: 'Ardra', punarvasu: 'Punarvasu', pushya: 'Pushya',
        ashlesha: 'Ashlesha', magha: 'Magha', purva_phalguni: 'Purva Phalguni',
        uttara_phalguni: 'Uttara Phalguni', hasta: 'Hasta', chitra: 'Chitra', swati: 'Swati',
        vishakha: 'Vishakha', anuradha: 'Anuradha', jyeshtha: 'Jyeshtha', mula: 'Mula',
        purva_ashadha: 'Purva Ashadha', uttara_ashadha: 'Uttara Ashadha', shravana: 'Shravana',
        dhanishta: 'Dhanishta', shatabhisha: 'Shatabhisha', purva_bhadrapada: 'Purva Bhadrapada',
        uttara_bhadrapada: 'Uttara Bhadrapada', revati: 'Revati',
      },
      manglik: { no: 'No', yes: 'Yes', partial: 'Partial (Anshik)', unknown: 'Not Known' },
      yesNo: { yes: 'Yes', no: 'No' },
      diet: {
        vegetarian: 'Vegetarian', non_vegetarian: 'Non-vegetarian', eggetarian: 'Eggetarian',
        vegan: 'Vegan', jain_food: 'Jain Food',
      },
      habit: { no: 'No', occasionally: 'Occasionally', yes: 'Yes' },
      hobby: {
        reading: 'Reading', music: 'Music', cooking: 'Cooking', travelling: 'Travelling', sports: 'Sports',
        dancing: 'Dancing', photography: 'Photography', gardening: 'Gardening', movies: 'Movies',
        yoga: 'Yoga', painting: 'Painting', writing: 'Writing',
      },
      interest: {
        technology: 'Technology', social_work: 'Social Work', fitness: 'Fitness', art_culture: 'Art & Culture',
        spirituality: 'Spirituality', business: 'Business', nature: 'Nature', education: 'Education',
      },
      partnerMarital: {
        never_married: 'Never Married', divorced_or_widowed: 'Divorced or Widowed', any: 'Any',
      },
      contactRelation: {
        self: 'Self', father: 'Father', mother: 'Mother', brother: 'Brother', sister: 'Sister',
        uncle: 'Uncle', aunt: 'Aunt', guardian: 'Guardian', other: 'Relative',
      },
    },
    months: [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December',
    ],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    misc: {
      biodata: 'Biodata',
      marriageBiodata: 'Marriage Biodata',
      years: 'years',
      year: 'year',
      kg: 'kg',
      cm: 'cm',
      perAnnum: 'per annum',
      perMonth: 'per month',
      lakh: 'Lakh',
      crore: 'Crore',
      rangeMin: '{v} and above',
      rangeMax: 'up to {v}',
      am: 'AM',
      pm: 'PM',
      page: 'Page',
      sample: 'Sample',
      sampleNote: 'Sample biodata. All names and details are fictional.',
      continued: 'continued',
      none: 'None',
    },
  };

  var hi = {
    sections: {
      personal: 'व्यक्तिगत विवरण',
      photo: 'फ़ोटो',
      family: 'पारिवारिक विवरण',
      education: 'शिक्षा',
      profession: 'व्यवसाय',
      income: 'आय',
      religion: 'धर्म एवं समुदाय',
      lifestyle: 'जीवनशैली',
      partner: 'जीवनसाथी की अपेक्षाएँ',
      contact: 'संपर्क विवरण',
      additional: 'अतिरिक्त जानकारी',
      design: 'डिज़ाइन और डाउनलोड',
    },
    fields: {
      invocation: 'मंगलाचरण',
      'personal.fullName': 'पूरा नाम',
      'personal.gender': 'लिंग',
      'personal.dob': 'जन्म तिथि',
      'personal.age': 'आयु',
      'personal.ageOverride': 'आयु',
      'personal.birthTime': 'जन्म समय',
      'personal.birthPlace': 'जन्म स्थान',
      'personal.heightCm': 'ऊँचाई',
      'personal.weightKg': 'वज़न',
      'personal.complexion': 'रंग',
      'personal.bloodGroup': 'रक्त समूह',
      'personal.maritalStatus': 'वैवाहिक स्थिति',
      'personal.childrenDetails': 'संतान',
      'personal.motherTongue': 'मातृभाषा',
      'personal.languages': 'ज्ञात भाषाएँ',
      'personal.nationality': 'राष्ट्रीयता',
      'personal.about': 'मेरे बारे में',

      'family.fatherName': 'पिता का नाम',
      'family.fatherOccupation': 'पिता का व्यवसाय',
      'family.motherName': 'माता का नाम',
      'family.motherOccupation': 'माता का व्यवसाय',
      'family.siblings': 'भाई-बहन',
      'family.siblings.relation': 'संबंध',
      'family.siblings.maritalStatus': 'वैवाहिक स्थिति',
      'family.siblings.details': 'विवरण',
      'family.familyType': 'परिवार का प्रकार',
      'family.familyStatus': 'पारिवारिक स्थिति',
      'family.familyValues': 'पारिवारिक मूल्य',
      'family.nativePlace': 'मूल निवास',
      'family.familyAbout': 'परिवार के बारे में',

      'education.highest': 'उच्चतम शिक्षा',
      'education.degrees': 'शैक्षणिक योग्यता',
      'education.degrees.degree': 'डिग्री',
      'education.degrees.institution': 'संस्थान',
      'education.degrees.year': 'वर्ष',
      'education.details': 'शिक्षा के बारे में',

      'profession.occupation': 'व्यवसाय',
      'profession.employer': 'कंपनी / संस्था',
      'profession.designation': 'पद',
      'profession.workLocation': 'कार्य स्थान',
      'profession.details': 'कार्य के बारे में',

      'income.amount': 'आय',
      'income.period': 'आय की अवधि',
      'income.currency': 'मुद्रा',
      'income.text': 'आय (शब्दों में)',
      'income.familyIncomeText': 'पारिवारिक आय',

      'religion.religion': 'धर्म',
      'religion.caste': 'जाति',
      'religion.subCaste': 'उपजाति',
      'religion.gotra': 'गोत्र',
      'religion.motherGotra': 'माता का गोत्र',
      'religion.clan': 'कुल',
      'religion.tanda': 'तांडा',
      'religion.raasi': 'राशि',
      'religion.nakshatra': 'नक्षत्र',
      'religion.manglik': 'मांगलिक',
      'religion.sect': 'संप्रदाय',
      'religion.denomination': 'संप्रदाय',
      'religion.church': 'चर्च',
      'religion.amritdhari': 'अमृतधारी',
      'religion.note': 'टिप्पणी',

      'lifestyle.diet': 'आहार',
      'lifestyle.smoking': 'धूम्रपान',
      'lifestyle.drinking': 'मद्यपान',
      'lifestyle.hobbies': 'शौक',
      'lifestyle.interests': 'रुचियाँ',

      'partner.age': 'आयु',
      'partner.ageMin': 'न्यूनतम आयु',
      'partner.ageMax': 'अधिकतम आयु',
      'partner.height': 'ऊँचाई',
      'partner.heightMinCm': 'न्यूनतम ऊँचाई',
      'partner.heightMaxCm': 'अधिकतम ऊँचाई',
      'partner.education': 'शिक्षा',
      'partner.profession': 'व्यवसाय',
      'partner.location': 'पसंदीदा स्थान',
      'partner.maritalStatus': 'वैवाहिक स्थिति',
      'partner.religionCaste': 'धर्म / जाति',
      'partner.other': 'अन्य अपेक्षाएँ',

      'contact.contactPerson': 'संपर्क व्यक्ति',
      'contact.relation': 'संबंध',
      'contact.phone': 'फ़ोन',
      'contact.altPhone': 'वैकल्पिक फ़ोन',
      'contact.whatsapp': 'व्हाट्सऐप',
      'contact.email': 'ईमेल',
      'contact.address': 'पता',
      'contact.location': 'स्थान',
      'contact.city': 'शहर',
      'contact.state': 'राज्य',
      'contact.country': 'देश',
      'contact.bestTime': 'संपर्क का उचित समय',

      'additional.horoscopeNote': 'कुंडली',
      'additional.expectations': 'अपेक्षाएँ',
      'additional.note': 'टिप्पणी',
    },
    values: {
      gender: { male: 'पुरुष', female: 'महिला' },
      maritalStatus: {
        never_married: 'अविवाहित', divorced: 'तलाकशुदा', awaiting_divorce: 'तलाक प्रक्रियाधीन',
        widowed: 'विधुर / विधवा', annulled: 'विवाह निरस्त',
      },
      complexion: { fair: 'गोरा', wheatish: 'गेहुँआ', wheatish_brown: 'गेहुँआ-साँवला', dusky: 'साँवला' },
      bloodGroup: {
        a_pos: 'A+', a_neg: 'A−', b_pos: 'B+', b_neg: 'B−', ab_pos: 'AB+', ab_neg: 'AB−', o_pos: 'O+', o_neg: 'O−',
      },
      language: {
        hindi: 'हिंदी', english: 'अंग्रेज़ी', gor_boli: 'गोर बोली (बंजारा)', telugu: 'तेलुगु', kannada: 'कन्नड़',
        marathi: 'मराठी', tamil: 'तमिल', gujarati: 'गुजराती', punjabi: 'पंजाबी', urdu: 'उर्दू',
        bengali: 'बांग्ला', rajasthani: 'राजस्थानी', odia: 'ओड़िया', malayalam: 'मलयालम',
      },
      siblingRelation: {
        elder_brother: 'बड़े भाई', younger_brother: 'छोटे भाई', brother: 'भाई',
        elder_sister: 'बड़ी बहन', younger_sister: 'छोटी बहन', sister: 'बहन',
      },
      siblingStatus: { married: 'विवाहित', unmarried: 'अविवाहित' },
      familyType: { joint: 'संयुक्त परिवार', nuclear: 'एकल परिवार', extended: 'विस्तृत परिवार' },
      familyStatus: {
        lower_middle_class: 'निम्न मध्यम वर्ग', middle_class: 'मध्यम वर्ग',
        upper_middle_class: 'उच्च मध्यम वर्ग', affluent: 'संपन्न',
      },
      familyValues: { traditional: 'पारंपरिक', moderate: 'संतुलित', liberal: 'उदार' },
      incomePeriod: { annual: 'वार्षिक', monthly: 'मासिक' },
      currency: {
        inr: 'भारतीय रुपया (₹)', usd: 'अमेरिकी डॉलर ($)', gbp: 'ब्रिटिश पाउंड (£)', eur: 'यूरो (€)',
        aed: 'यूएई दिरहम', cad: 'कनाडाई डॉलर', aud: 'ऑस्ट्रेलियाई डॉलर', sgd: 'सिंगापुर डॉलर',
      },
      religion: {
        hindu: 'हिंदू', muslim: 'मुस्लिम', sikh: 'सिख', christian: 'ईसाई', jain: 'जैन',
        buddhist: 'बौद्ध', other: 'अन्य',
      },
      raasi: {
        mesha: 'मेष', vrishabha: 'वृषभ', mithuna: 'मिथुन', karka: 'कर्क', simha: 'सिंह', kanya: 'कन्या',
        tula: 'तुला', vrischika: 'वृश्चिक', dhanu: 'धनु', makara: 'मकर', kumbha: 'कुंभ', meena: 'मीन',
      },
      nakshatra: {
        ashwini: 'अश्विनी', bharani: 'भरणी', krittika: 'कृत्तिका', rohini: 'रोहिणी',
        mrigashira: 'मृगशिरा', ardra: 'आर्द्रा', punarvasu: 'पुनर्वसु', pushya: 'पुष्य',
        ashlesha: 'आश्लेषा', magha: 'मघा', purva_phalguni: 'पूर्वा फाल्गुनी',
        uttara_phalguni: 'उत्तरा फाल्गुनी', hasta: 'हस्त', chitra: 'चित्रा', swati: 'स्वाति',
        vishakha: 'विशाखा', anuradha: 'अनुराधा', jyeshtha: 'ज्येष्ठा', mula: 'मूल',
        purva_ashadha: 'पूर्वाषाढ़ा', uttara_ashadha: 'उत्तराषाढ़ा', shravana: 'श्रवण',
        dhanishta: 'धनिष्ठा', shatabhisha: 'शतभिषा', purva_bhadrapada: 'पूर्वा भाद्रपद',
        uttara_bhadrapada: 'उत्तरा भाद्रपद', revati: 'रेवती',
      },
      manglik: { no: 'नहीं', yes: 'हाँ', partial: 'आंशिक', unknown: 'ज्ञात नहीं' },
      yesNo: { yes: 'हाँ', no: 'नहीं' },
      diet: {
        vegetarian: 'शाकाहारी', non_vegetarian: 'मांसाहारी', eggetarian: 'शाकाहारी (अंडा सहित)',
        vegan: 'वीगन', jain_food: 'जैन आहार',
      },
      habit: { no: 'नहीं', occasionally: 'कभी-कभी', yes: 'हाँ' },
      hobby: {
        reading: 'पढ़ना', music: 'संगीत', cooking: 'खाना बनाना', travelling: 'यात्रा', sports: 'खेल-कूद',
        dancing: 'नृत्य', photography: 'फ़ोटोग्राफ़ी', gardening: 'बाग़वानी', movies: 'फ़िल्में',
        yoga: 'योग', painting: 'चित्रकला', writing: 'लेखन',
      },
      interest: {
        technology: 'तकनीक', social_work: 'समाज सेवा', fitness: 'फ़िटनेस', art_culture: 'कला और संस्कृति',
        spirituality: 'अध्यात्म', business: 'व्यवसाय', nature: 'प्रकृति', education: 'शिक्षा',
      },
      partnerMarital: {
        never_married: 'अविवाहित', divorced_or_widowed: 'तलाकशुदा या विधुर / विधवा', any: 'कोई भी',
      },
      contactRelation: {
        self: 'स्वयं', father: 'पिता', mother: 'माता', brother: 'भाई', sister: 'बहन',
        uncle: 'चाचा / मामा', aunt: 'चाची / मौसी', guardian: 'अभिभावक', other: 'संबंधी',
      },
    },
    months: [
      'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर',
      'अक्टूबर', 'नवंबर', 'दिसंबर',
    ],
    monthsShort: [
      'जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰',
    ],
    misc: {
      biodata: 'बायोडाटा',
      marriageBiodata: 'विवाह बायोडाटा',
      years: 'वर्ष',
      year: 'वर्ष',
      kg: 'किलो',
      cm: 'सेमी',
      perAnnum: 'प्रति वर्ष',
      perMonth: 'प्रति माह',
      lakh: 'लाख',
      crore: 'करोड़',
      rangeMin: '{v} या अधिक',
      rangeMax: '{v} तक',
      am: 'पूर्वाह्न',
      pm: 'अपराह्न',
      page: 'पृष्ठ',
      sample: 'नमूना',
      sampleNote: 'नमूना बायोडाटा। सभी नाम और विवरण काल्पनिक हैं।',
      continued: 'जारी',
      none: 'कोई नहीं',
    },
  };

  K.labels = { en: en, hi: hi };
  K.LANGS = ['en', 'hi'];

  function lookup(dict, group, key) {
    var g = dict && dict[group];
    if (!g) return undefined;
    if (Object.prototype.hasOwnProperty.call(g, key)) return g[key];
    if (group === 'values' && typeof key === 'string' && key.indexOf('.') > 0) {
      var i = key.indexOf('.');
      var sub = g[key.slice(0, i)];
      var id = key.slice(i + 1);
      if (sub && Object.prototype.hasOwnProperty.call(sub, id)) return sub[id];
    }
    return undefined;
  }

  // Plain text label. group: sections|fields|values|months|monthsShort|misc.
  // For values pass 'enumKey.id' (e.g. 'diet.vegetarian'); for months the index.
  K.t = function t(lang, group, key) {
    var v = lookup(K.labels[lang], group, key);
    if (v === undefined && lang !== 'en') v = lookup(K.labels.en, group, key);
    if (v === undefined) return key === undefined || key === null ? '' : String(key);
    return v;
  };

  // Escaped HTML. mode 'en' | 'hi' | 'both'.
  K.label = function label(group, key, mode) {
    if (mode === 'hi') return '<span lang="hi">' + K.esc(K.t('hi', group, key)) + '</span>';
    if (mode === 'both') {
      var e = K.t('en', group, key);
      var h = K.t('hi', group, key);
      if (e === h) return K.esc(e);
      return '<span class="bd-en">' + K.esc(e) + '</span><span class="bd-hi" lang="hi">' + K.esc(h) + '</span>';
    }
    return K.esc(K.t('en', group, key));
  };

  // Same as K.label but for a caller-provided {en, hi} pair (custom field labels,
  // section title overrides). Missing halves fall back to the other half.
  K.labelPair = function labelPair(pair, mode) {
    var e = (pair && pair.en) || '';
    var h = (pair && pair.hi) || '';
    if (mode === 'hi') return h ? '<span lang="hi">' + K.esc(h) + '</span>' : K.esc(e);
    if (mode === 'both') {
      if (!h || !e || h === e) return h && !e ? '<span lang="hi">' + K.esc(h) + '</span>' : K.esc(e || h);
      return '<span class="bd-en">' + K.esc(e) + '</span><span class="bd-hi" lang="hi">' + K.esc(h) + '</span>';
    }
    return e ? K.esc(e) : '<span lang="hi">' + K.esc(h) + '</span>';
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
