'use strict';
/**
 * biodata/content/pages.js — seed copy for the biodata maker's CMS pages
 * (Node only; NOT part of the browser bundle, never listed in bundle-order).
 *
 * Exports an array of BiodataPage-shaped objects (contract §2 / §2b):
 *   { slug, kind, metaTitle, metaDescription, h1, intro, contentBlocks, faqs,
 *     ctaConfig, relatedLinks }
 *
 * Used by apps/api/tools/seedBiodataPages.js (upsert by slug) and as the web
 * landing page's fallback copy when the API has no landing page.
 *
 * Rules for editors:
 *   - `intro` and block `html` are simple HTML (p, h2, h3, ul, ol, li, strong,
 *     em, a with an internal href, table markup). The API runs sanitizeRich.
 *   - Block `items`, table `rows`, FAQ questions/answers and every other field
 *     are plain text (escaped on render).
 *   - Table blocks: rows[0] is the header row.
 *   - Product statements here must match what the maker actually does
 *     (docs/plans/02-biodata-maker.md). No ratings, counts or testimonials.
 *   - All sample names, places and numbers are fictional.
 */

const TIPS_POST = '/blogs/tips/how-to-write-a-banjara-marriage-biodata-that-gets-serious-responses';
const PROCESS_POST = '/blogs/general/banjara-biodata-to-baraat-a-first-timer-s-guide-to-the-modern-matrimony-process';

// ---------------------------------------------------------------------------
// Landing: /biodata-maker
// ---------------------------------------------------------------------------
const landing = {
  slug: 'biodata-maker',
  kind: 'landing',
  metaTitle: 'Free Marriage Biodata Maker Online with PDF | BanjaraMatch',
  metaDescription:
    'Make a marriage biodata online for free. 15 templates, live A4 preview, photo, Hindi or bilingual labels and PDF download, with no sign-up needed.',
  h1: 'Free Marriage Biodata Maker',
  intro:
    `<p>Create a neat, print-ready marriage biodata in your browser. Fill in your details step by step, watch the A4 preview update as you type, choose from 15 templates and download a PDF. Every template and every feature is free, and you can start straight away without creating an account.</p>` +
    `<p>The maker is built by BanjaraMatch, so it understands the details Banjara families ask about first, such as gotra, mother's gotra, clan and tanda. It works just as well for any community or religion, and the labels can be printed in English, Hindi or both.</p>`,
  contentBlocks: [
    {
      type: 'steps',
      heading: 'How the biodata maker works',
      items: [
        'Choose a template. Pick one of 15 designs, from traditional and community styles to modern, minimal and printer-friendly ones. You can switch templates at any time without losing anything you have typed.',
        'Fill in your details step by step. Short steps cover personal details, photo, family, education, profession, income, religion and community, lifestyle, partner preferences, contact and anything extra. Skip whatever does not apply to you.',
        'Add a photo and crop it. Pan, zoom and rotate the photo inside the maker so it sits neatly in the template\'s photo frame.',
        'Arrange the design. Choose a colour palette and font, decide where the photo goes, rename, reorder or hide sections, and set the labels to English, Hindi or both.',
        'Check the live A4 preview. The preview is split into real A4 pages and shows the page count, so you know exactly how the biodata will print.',
        'Download the PDF or print it. Get an A4 PDF that is ready to send on WhatsApp or by email, or print it directly. Sign in with a free account when you want to save drafts online or share a private link.',
      ],
    },
    {
      type: 'richText',
      heading: 'Why use a biodata maker instead of a Word file',
      html:
        `<p>Most families start a biodata in Word or in a notes app on the phone. That works until the job changes, a relative asks for a Hindi copy, or the second page breaks halfway through the family section. The maker takes care of those chores:</p>` +
        `<ul>` +
        `<li><strong>The layout stays tidy.</strong> Sections flow onto A4 pages on their own, a section heading is never left stranded at the bottom of a page, and the preview tells you the page count before you download.</li>` +
        `<li><strong>Change the design without retyping.</strong> Your details are kept separate from the design, so switching the template, colours or font leaves every field in place.</li>` +
        `<li><strong>Age and height are handled for you.</strong> Enter the date of birth once and the age is worked out from it. Enter height in feet and inches or in centimetres and the maker converts between them.</li>` +
        `<li><strong>Bilingual labels in one click.</strong> Show the labels in Hindi, or English and Hindi together, without searching for the right Hindi words.</li>` +
        `<li><strong>The same file on every screen.</strong> Fonts are embedded in the PDF, so it looks the same on a phone, a laptop or a printout, Hindi text included.</li>` +
        `<li><strong>Keep private details off the page.</strong> Keep your date of birth, birth time, phone number or address in the draft but leave them off the printed biodata, and add your own fields to any section for details the form does not cover.</li>` +
        `</ul>` +
        `<p>Not sure what to include or in which order? Read our <a href="/marriage-biodata-format">marriage biodata format guide</a> first. The maker follows the same structure, so the two work well together.</p>`,
    },
    {
      type: 'richText',
      heading: 'Templates for every family',
      html:
        `<p>All 15 templates are free. Traditional and family-oriented designs suit elders who prefer a formal look. Modern and minimal designs suit working professionals. Photo-focused layouts give the picture more room. The Hindu, Muslim, Sikh and Christian classics begin with an optional invocation line that you can edit or remove. The Regional-Adaptable template prints English and Hindi labels side by side, and the black-and-white template is made for clean photocopies.</p>` +
        `<p>Browse them all in the <a href="/biodata-maker/templates">template gallery</a>, then open any design in the maker with your details already in place.</p>`,
    },
    {
      type: 'callout',
      heading: 'Your details, your control',
      html:
        `<p><strong>Without an account</strong>, everything you type stays in your own browser's local storage on that device until you clear it. When you download a PDF, your details and photo are sent to our server only to create the file and are not stored afterwards.</p>` +
        `<p><strong>With a free account</strong>, your biodatas are saved privately to your account. They are not part of matrimony profile search, and nobody else can open one unless you create a share link for it. Share links expire after 7, 30 or 90 days, can be turned off at any time, and hide your contact details unless you choose to show them.</p>` +
        `<p><strong>Photos</strong> are stored privately and never listed publicly. Each upload is re-encoded, which removes location data hidden inside the image file. Deleting a biodata removes its details and photo, and deleting your account removes all of your biodatas. Our <a href="/privacy-policy">Privacy Policy</a> explains how BanjaraMatch handles data in general.</p>`,
    },
    {
      type: 'checklist',
      heading: 'What to keep ready before you start',
      items: [
        'Full name as you want it printed, with date, time and place of birth',
        'Height, and if you wish to include them, complexion, blood group and mother tongue',
        'Parents\' names and occupations, and short details of brothers and sisters',
        'Native place, and whether the family is joint or nuclear',
        'Degrees with college or university names and years',
        'Current occupation, employer, designation and work location',
        'Income in the form you are comfortable sharing, as an annual figure or a short note',
        'Community details: gotra, mother\'s gotra, clan and tanda for Banjara families, and raasi, nakshatra and manglik status if your family uses horoscopes',
        'Partner preferences: age range, height range, education, profession and location',
        'A contact person, a phone or WhatsApp number, and the best time to call',
        'A recent, clear photo in JPG, PNG or WebP format',
      ],
    },
  ],
  faqs: [
    {
      question: 'How do I create marriage biodata online?',
      answer:
        'Open the biodata maker, choose a template and fill in the steps: personal details, photo, family, education, profession, income, religion and community, lifestyle, partner preferences and contact. The A4 preview updates as you type. When the content looks right, use the design options to adjust colours, fonts, photo position and section order, then download the PDF or print it. You can skip any step that does not apply to you.',
    },
    {
      question: 'Is the biodata maker free?',
      answer:
        'Yes. The maker, all 15 templates, PDF download and printing are free, and so are the extras that come with a free account: saved drafts, version history, duplicates and private share links. There are no paid templates and no download charges.',
    },
    {
      question: 'Can I download biodata as PDF?',
      answer:
        'Yes. Download PDF creates an A4, print-ready file with the fonts embedded, so it looks the same on any phone, computer or printer. If PDF generation is ever temporarily unavailable, use the Print button and choose "Save as PDF" in your browser\'s print window; it produces the same document.',
    },
    {
      question: 'Can I add my photo and family details?',
      answer:
        'Yes. Add a photo, then crop, zoom and rotate it to fit the template. The family step covers parents\' names and occupations, brothers and sisters, family type, status, values and native place, and you can add your own fields to any section. Photos are stored privately, never listed publicly, and re-encoded on upload so that location data hidden in the file is removed.',
    },
    {
      question: 'Can I create biodata in Hindi?',
      answer:
        'Yes. Choose English, Hindi or both for the labels, and type your details in Hindi (Devanagari) wherever you like. The maker does not translate what you type, so write each value in the language you want printed. A Devanagari font is embedded, so Hindi prints correctly in the PDF. Our guide to marriage biodata in Hindi has a full label glossary.',
    },
    {
      question: 'Can I edit biodata after creating it?',
      answer:
        'Yes. Without an account, your draft stays in your browser, so you can come back and edit it on the same device. With a free account, your biodatas are saved online and you can edit them from any device, keep up to 10 biodatas, duplicate one to make a variation and restore an earlier version from its history. Download a fresh PDF after each change.',
    },
    {
      question: 'Is my personal information private?',
      answer:
        'Yes. Guest drafts stay in your own browser, and the details sent to create a PDF are used only to generate the file and are not stored. Saved biodatas are visible only to you and are not part of matrimony profile search. You can share one only through a private link that you create; it expires after 7, 30 or 90 days, can be turned off at any time, and hides your contact details unless you turn them on. Deleting a biodata, or your account, removes its details and photo.',
    },
    {
      question: 'Can I create a biodata without registering?',
      answer:
        'Yes. You can build, preview, print and download a PDF without an account. Your draft is kept in your browser\'s local storage on that device until you clear it. Create a free account only when you want to save biodatas online, keep earlier versions or share a private link.',
    },
  ],
  ctaConfig: {
    heading: 'Ready to make your biodata?',
    text: 'Pick a template, fill in your details and download a print-ready A4 PDF. Free, with no sign-up needed.',
    primaryLabel: 'Create your biodata',
    primaryHref: '/biodata-maker/create',
    secondaryLabel: 'Browse templates',
    secondaryHref: '/biodata-maker/templates',
  },
  relatedLinks: [
    { label: 'Create your biodata', href: '/biodata-maker/create' },
    { label: 'Biodata templates', href: '/biodata-maker/templates' },
    { label: 'Marriage biodata format', href: '/marriage-biodata-format' },
    { label: 'Marriage biodata in Hindi', href: '/marriage-biodata-in-hindi' },
    { label: 'Banjara biodata: gotra and clan', href: '/banjara-biodata-gotra-and-clan' },
    { label: 'Banjara gotra list', href: '/banjara-gotra-list' },
    { label: 'How to write a biodata that gets serious responses', href: TIPS_POST },
  ],
};

// ---------------------------------------------------------------------------
// Guide: /marriage-biodata-format
// ---------------------------------------------------------------------------
const format = {
  slug: 'marriage-biodata-format',
  kind: 'guide',
  metaTitle: 'Marriage Biodata Format: Sections & Fields | BanjaraMatch',
  metaDescription:
    'The standard marriage biodata format: section order, what each field should say, one page or two, photo guidelines and common mistakes to avoid.',
  h1: 'Marriage Biodata Format: Sections, Fields and Layout',
  intro:
    `<p>A marriage biodata is a short document, usually one or two A4 pages, that introduces a bride or groom and their family to a prospective match. Families exchange it at the very start, often before the two people have spoken, through relatives, community contacts, WhatsApp groups or a matrimony site. It is read quickly and passed along, so a clear and familiar format matters more than clever wording.</p>` +
    `<p>This guide is a structural reference: the order the sections usually follow, what belongs in each field, how long the document should be and how to choose the photo. For advice on the wording itself, read our companion post on <a href="${TIPS_POST}">writing a Banjara marriage biodata that gets serious responses</a>.</p>`,
  contentBlocks: [
    {
      type: 'richText',
      heading: 'When families exchange a biodata',
      html:
        `<p>In most Indian families the biodata comes before everything else. Someone mentions a suitable match, the families swap biodatas, and the elders decide whether to take the conversation further. If the details fit, the usual next steps are a phone call between the parents, a horoscope or gotra check where the family follows one, and then a meeting. Because the biodata is often the only thing the other family sees at first, it should answer the routine questions on its own: who the person is, what they do, who the family is and how to get in touch.</p>` +
        `<p>A biodata is also forwarded. One sent to an uncle may reach several households within a day, which is a good reason to keep it factual, current and limited to what you are comfortable sharing widely. We describe the whole journey, from the first exchange to the wedding day, in <a href="${PROCESS_POST}">Banjara biodata to baraat</a>.</p>`,
    },
    {
      type: 'steps',
      heading: 'The standard section order',
      items: [
        'Personal details: full name, date of birth or age, time and place of birth, height, marital status, mother tongue and a two- or three-line introduction. Complexion and blood group are optional.',
        'Family details: father\'s and mother\'s names and occupations, brothers and sisters with their marital status, family type (joint or nuclear), family values and native place.',
        'Education: the highest qualification first, then other degrees with the institution and year.',
        'Profession and income: occupation, employer, designation and work location, followed by income stated in the way you are comfortable with.',
        'Religion, community and horoscope (optional): religion, caste or community and gotra, plus raasi, nakshatra and manglik status for families who use horoscopes.',
        'Lifestyle: diet, whether you smoke or drink, and a few hobbies or interests.',
        'Partner preferences: age and height range, education, profession, location and anything else that genuinely matters to you.',
        'Contact details: contact person and their relation to you, phone or WhatsApp number, email, city and the best time to call.',
      ],
    },
    {
      type: 'richText',
      heading: 'Why this order works',
      html:
        `<p>The order follows the way families read a biodata. Personal details come first because they decide whether anyone reads further. Family details come second because in an arranged match the parents read that section as closely as the personal one. Education and work follow, then the community and horoscope details that some families check before calling. Partner preferences sit near the end, and contact details close the document so they are easy to find.</p>` +
        `<p>You do not have to follow it rigidly. Some families move religion and community straight after the personal details because gotra is the first thing their elders look for. Others move education up for a candidate who has just finished studying. Any order is fine as long as related details stay together and the contact section is easy to spot. In the biodata maker you can drag sections into any order, rename them, or hide those you do not need.</p>`,
    },
    {
      type: 'table',
      heading: 'Field reference: what to write and how much',
      rows: [
        ['Field', 'Example', 'Keep it to'],
        ['Full name', 'Priya Sunil Rathod', 'The name relatives know you by; add a nickname only if it is widely used'],
        ['Date of birth', '14 March 1998', 'The full date; age can be worked out from it'],
        ['Time and place of birth', '6:45 am, Nanded', 'Include only if horoscopes matter to your family'],
        ['Height', '5 ft 4 in (163 cm)', 'Your measured height, not rounded up'],
        ['Marital status', 'Never married', 'One plain term; add a line about children only if relevant'],
        ['Education', 'B.Tech (Civil), 2019, a state engineering college', 'Degree, year and institution, highest first'],
        ['Occupation', 'Site Engineer at a construction company, Pune', 'Role, employer or type of employer, and city'],
        ['Income', 'Rs 6.5 lakh per year', 'One figure or a range, clearly marked annual or monthly'],
        ['Father', 'Sunil Rathod, retired Head Constable', 'Name and occupation on one line'],
        ['Siblings', '1 elder brother (married), 1 younger sister (studying)', 'Number, relation and marital status; names are optional'],
        ['Native place', 'Kinwat, Nanded district, Maharashtra', 'Village or town, district and state'],
        ['Diet', 'Vegetarian', 'One word'],
        ['Partner preferences', '25 to 30 years, graduate, working, Maharashtra or Telangana', 'Three or four real priorities, not a long wish list'],
        ['Contact', 'Sunil Rathod (father), 98xxx xxxxx', 'One main number and the name of the person who answers it'],
      ],
    },
    {
      type: 'richText',
      heading: 'One page or two?',
      html:
        `<p>One page is ideal when everything fits without shrinking the text. A single A4 sheet is easy to forward, print and read on a phone, and most biodatas with a photo, family details and short partner preferences fit comfortably.</p>` +
        `<p>Two pages are perfectly acceptable when you have a large family to describe, several degrees, or horoscope details your family wants included. What matters is that the second page starts cleanly: a section heading should never sit alone at the bottom of page one, and the contact details should not be split across two pages. Avoid going beyond two pages; long biodatas tend to be skimmed rather than read.</p>` +
        `<p>If you are only slightly over one page, trim the introduction and the partner preferences first, hide fields that add little, or reduce the text size a little before you drop whole sections. The maker shows the page count as you edit, so you can see the effect of every change.</p>`,
    },
    {
      type: 'richText',
      heading: 'Photo guidelines',
      html:
        `<ul>` +
        `<li><strong>Recent:</strong> taken within the last year, and looking the way you look today.</li>` +
        `<li><strong>Clear face:</strong> head and shoulders, facing the camera, in good daylight. Skip sunglasses, heavy filters and beauty apps.</li>` +
        `<li><strong>Simple background:</strong> a plain wall or some greenery works better than a crowded room.</li>` +
        `<li><strong>Dressed for a family meeting:</strong> traditional or smart formal clothes both work well.</li>` +
        `<li><strong>Only you:</strong> no group photos, cropped-out friends or children in the frame.</li>` +
        `<li><strong>Good quality:</strong> a normal phone camera photo is fine. Avoid screenshots and copies forwarded on WhatsApp, which are compressed and blurry.</li>` +
        `<li><strong>One is enough:</strong> a single good photo on the biodata; share more later if the family asks.</li>` +
        `</ul>` +
        `<p>Remember that a biodata travels, so choose a photo you are comfortable with many people seeing.</p>`,
    },
    {
      type: 'checklist',
      heading: '8 common biodata mistakes',
      items: [
        'Spelling your name, gotra or native place differently from your matrimony profile or from the way relatives write it',
        'Leaving out a contact person, or giving a number that nobody answers',
        'Using an old photo or a heavily filtered one',
        'Writing an income without saying whether it is monthly or annual',
        'Listing every relative\'s job instead of summarising the family in a few lines',
        'A long list of partner demands instead of a few genuine priorities',
        'Squeezing two pages onto one with tiny text, or letting a heading spill awkwardly onto the next page',
        'Sending an old file after your job, city or phone number has changed',
      ],
    },
    {
      type: 'richText',
      heading: 'A sample layout, top to bottom',
      html:
        `<ol>` +
        `<li><strong>Header:</strong> an optional invocation line, for example "श्री गणेशाय नमः" in many Hindu families, then the full name in large type with the photo beside or below it.</li>` +
        `<li><strong>Personal details:</strong> eight to ten label and value rows such as date of birth, age, height, marital status and mother tongue, followed by a short introduction.</li>` +
        `<li><strong>Family details:</strong> father and mother on separate lines, then siblings, family type and native place.</li>` +
        `<li><strong>Education and profession:</strong> three to five rows.</li>` +
        `<li><strong>Community and horoscope:</strong> religion, community and gotra, and raasi or nakshatra where used.</li>` +
        `<li><strong>Partner preferences:</strong> three or four rows or a short paragraph.</li>` +
        `<li><strong>Contact:</strong> contact person, phone number and city, placed at the bottom so it is easy to find.</li>` +
        `</ol>` +
        `<p>The templates in the maker style this skeleton in different ways. Some put the photo and contact details in a side column, others use a coloured header band or an ornamental border, but your details stay exactly the same when you switch between them.</p>`,
    },
    {
      type: 'cta',
      heading: 'Build your biodata in this format',
      html: '<p>The free maker follows this section order, keeps headings and contact details together on the page and shows the page count as you type.</p>',
      ctaLabel: 'Start your biodata',
      ctaHref: '/biodata-maker/create',
    },
  ],
  faqs: [
    {
      question: 'What is the correct format for a marriage biodata?',
      answer:
        'There is no single official format, but most families expect this order: personal details, family details, education, profession and income, religion and community (with horoscope details if your family uses them), lifestyle, partner preferences and contact details, with a photo near the top. Keep it to one or two A4 pages.',
    },
    {
      question: 'Should a marriage biodata be one page or two?',
      answer:
        'One page if everything fits in readable text, which is the case for most biodatas. Two pages are fine for a large family, several degrees or horoscope details, as long as no heading is left alone at the bottom of a page and the contact details stay together. Avoid three or more pages.',
    },
    {
      question: 'What should I not put in a marriage biodata?',
      answer:
        'Leave out identity document numbers such as Aadhaar or PAN, bank details and anything you would not want forwarded to strangers. Many families also skip the full home address and give only the city until they have spoken to the other family. Keep personal opinions and long lists of demands out of the partner preferences.',
    },
    {
      question: 'Is it necessary to include horoscope details?',
      answer:
        'Only if your family, or the families you expect to hear from, use horoscopes. If they do, include time and place of birth along with raasi, nakshatra and manglik status. If not, leave the section out; a biodata without horoscope details is complete.',
    },
    {
      question: 'How should I write income in a biodata?',
      answer:
        'Write one figure or a range and say clearly whether it is annual or monthly, for example "Rs 6.5 lakh per year". If you prefer not to state a number, a short note such as "Salaried, details on request" is acceptable. Family income, if you mention it, belongs on a separate line.',
    },
    {
      question: 'Which file format is best for sending a biodata?',
      answer:
        'A PDF. It keeps the layout and fonts exactly as designed, prints cleanly on A4 and opens on any phone. Images such as screenshots get compressed when forwarded, and Word files can change layout on a different computer.',
    },
    {
      question: 'Can I use the same biodata for every match?',
      answer:
        'Yes, as long as it is current. Update the age, job, city and contact details whenever they change, and send the latest file each time. If you need a variation, for example one in Hindi for elders, make a copy rather than editing the original.',
    },
  ],
  ctaConfig: {
    heading: 'Make a biodata in the standard format',
    text: 'Fill in each section, preview the A4 pages as you type and download a PDF. Free, no sign-up needed.',
    primaryLabel: 'Create your biodata',
    primaryHref: '/biodata-maker/create',
    secondaryLabel: 'Read biodata writing tips',
    secondaryHref: TIPS_POST,
  },
  relatedLinks: [
    { label: 'Free biodata maker', href: '/biodata-maker' },
    { label: 'Biodata templates', href: '/biodata-maker/templates' },
    { label: 'Marriage biodata in Hindi', href: '/marriage-biodata-in-hindi' },
    { label: 'Banjara biodata: gotra and clan', href: '/banjara-biodata-gotra-and-clan' },
    { label: 'How to write a biodata that gets serious responses', href: TIPS_POST },
    { label: 'Banjara biodata to baraat', href: PROCESS_POST },
  ],
};

// ---------------------------------------------------------------------------
// Guide: /marriage-biodata-in-hindi
// ---------------------------------------------------------------------------
const hindi = {
  slug: 'marriage-biodata-in-hindi',
  kind: 'guide',
  metaTitle: 'Marriage Biodata in Hindi: Format & Labels | BanjaraMatch',
  metaDescription:
    'Make a Hindi or bilingual marriage biodata: an English to Hindi label glossary, date and height conventions, typing tips and a free maker with Hindi labels.',
  h1: 'Marriage Biodata in Hindi: Bilingual Format and Label Glossary',
  intro:
    `<p>For many families the biodata that matters most is the one the grandparents can read. A biodata in Hindi, or in English and Hindi together, reaches elders who are more at home in Hindi as well as younger relatives and families who read English first. It also travels well: the same file works for relatives in another state and for family members abroad.</p>` +
    `<p>This guide gives you the Hindi term for every field a biodata usually carries, shows how to write dates, times and heights in Hindi, and explains how the Hindi and Both label modes work in our free <a href="/biodata-maker">biodata maker</a>. The section order itself is covered in our <a href="/marriage-biodata-format">marriage biodata format guide</a>.</p>`,
  contentBlocks: [
    {
      type: 'richText',
      heading: 'Why a bilingual biodata helps',
      html:
        `<ul>` +
        `<li><strong>Elders read it themselves.</strong> When the labels are in Hindi, parents and grandparents can go through the biodata without someone translating it for them, and they are usually the first to decide whether to call.</li>` +
        `<li><strong>Relatives in other states.</strong> Families are spread across states with different first languages. English and Hindi side by side means almost every reader finds a language they are comfortable with.</li>` +
        `<li><strong>Family abroad.</strong> Relatives settled outside India, and the families they introduce, often prefer English, while the elders at home prefer Hindi. One bilingual file serves both.</li>` +
        `<li><strong>One document instead of two.</strong> Keeping separate English and Hindi copies means updating both every time something changes. A bilingual biodata needs only one update.</li>` +
        `</ul>` +
        `<p>Banjara families have a particular reason to like bilingual biodatas. Gor Boli, the community's own language, has no single standard script and has been written in Devanagari, Telugu, Kannada or Marathi script depending on the region. Hindi in Devanagari, alongside English, gives families in different states a common written form, while Gor Boli can still be listed as the mother tongue.</p>`,
    },
    {
      type: 'table',
      heading: 'English to Hindi label glossary: personal and family details',
      rows: [
        ['English label', 'Hindi label', 'Note'],
        ['Personal details', 'व्यक्तिगत विवरण', 'Section heading'],
        ['Full name', 'पूरा नाम', ''],
        ['Gender', 'लिंग', ''],
        ['Date of birth', 'जन्म तिथि', ''],
        ['Age', 'आयु', 'Also written उम्र'],
        ['Time of birth', 'जन्म समय', ''],
        ['Place of birth', 'जन्म स्थान', ''],
        ['Height', 'ऊँचाई', 'Also written ऊंचाई or कद'],
        ['Weight', 'वज़न', ''],
        ['Complexion', 'रंग', 'Optional field'],
        ['Blood group', 'रक्त समूह', ''],
        ['Marital status', 'वैवाहिक स्थिति', ''],
        ['Mother tongue', 'मातृभाषा', ''],
        ['Languages known', 'ज्ञात भाषाएँ', ''],
        ['Nationality', 'राष्ट्रीयता', ''],
        ['About me', 'मेरे बारे में', ''],
        ['Family details', 'पारिवारिक विवरण', 'Section heading'],
        ["Father's name", 'पिता का नाम', ''],
        ["Father's occupation", 'पिता का व्यवसाय', ''],
        ["Mother's name", 'माता का नाम', ''],
        ["Mother's occupation", 'माता का व्यवसाय', ''],
        ['Siblings', 'भाई-बहन', ''],
        ['Family type', 'परिवार का प्रकार', 'Joint: संयुक्त, nuclear: एकल'],
        ['Family status', 'पारिवारिक स्थिति', ''],
        ['Family values', 'पारिवारिक मूल्य', ''],
        ['Native place', 'मूल निवास', 'Also written पैतृक स्थान'],
      ],
    },
    {
      type: 'table',
      heading: 'Glossary continued: education, work, community and contact',
      rows: [
        ['English label', 'Hindi label', 'Note'],
        ['Education', 'शिक्षा', 'Section heading'],
        ['Highest education', 'उच्चतम शिक्षा', ''],
        ['Institution', 'संस्थान', ''],
        ['Profession', 'व्यवसाय', 'Section heading; नौकरी for a job'],
        ['Occupation', 'व्यवसाय', ''],
        ['Employer', 'कंपनी / संस्था', ''],
        ['Designation', 'पद', ''],
        ['Work location', 'कार्य स्थान', ''],
        ['Annual income', 'वार्षिक आय', ''],
        ['Family income', 'पारिवारिक आय', ''],
        ['Religion', 'धर्म', ''],
        ['Caste / community', 'जाति / समुदाय', ''],
        ['Sub-caste', 'उपजाति', ''],
        ['Gotra', 'गोत्र', ''],
        ["Mother's gotra", 'माता का गोत्र', ''],
        ['Clan', 'कुल', ''],
        ['Tanda', 'तांडा', 'Banjara settlement'],
        ['Raasi (moon sign)', 'राशि', ''],
        ['Nakshatra', 'नक्षत्र', ''],
        ['Manglik', 'मांगलिक', ''],
        ['Lifestyle', 'जीवनशैली', 'Section heading'],
        ['Diet', 'आहार', 'Also written खान-पान'],
        ['Hobbies', 'शौक', ''],
        ['Partner preferences', 'जीवनसाथी की अपेक्षाएँ', 'Section heading'],
        ['Contact details', 'संपर्क विवरण', 'Section heading'],
        ['Contact person', 'संपर्क व्यक्ति', ''],
        ['Relation', 'संबंध', ''],
        ['Phone', 'फ़ोन नंबर', 'Also मोबाइल नंबर'],
        ['Email', 'ईमेल', ''],
        ['Address', 'पता', ''],
        ['City', 'शहर', ''],
        ['State', 'राज्य', ''],
        ['Best time to call', 'संपर्क का उचित समय', ''],
        ['Additional information', 'अतिरिक्त जानकारी', 'Section heading'],
      ],
    },
    {
      type: 'table',
      heading: 'Common values in Hindi',
      rows: [
        ['English', 'Hindi'],
        ['Never married', 'अविवाहित'],
        ['Married (for siblings)', 'विवाहित'],
        ['Divorced', 'तलाकशुदा'],
        ['Widower / widow', 'विधुर / विधवा'],
        ['Joint family', 'संयुक्त परिवार'],
        ['Nuclear family', 'एकल परिवार'],
        ['Vegetarian', 'शाकाहारी'],
        ['Non-vegetarian', 'मांसाहारी'],
        ['Elder brother / younger brother', 'बड़े भाई / छोटे भाई'],
        ['Elder sister / younger sister', 'बड़ी बहन / छोटी बहन'],
        ['Yes / No', 'हाँ / नहीं'],
        ['Lakh / crore', 'लाख / करोड़'],
        ['Per year / per month', 'प्रति वर्ष / प्रति माह'],
      ],
    },
    {
      type: 'richText',
      heading: 'Writing dates, time, height and income in Hindi',
      html:
        `<p><strong>Dates.</strong> Write the day, the Hindi month name and the year, for example <em>14 मार्च 1998</em>. The month names are जनवरी, फ़रवरी, मार्च, अप्रैल, मई, जून, जुलाई, अगस्त, सितंबर, अक्टूबर, नवंबर and दिसंबर. A numeric date such as 14/03/1998 is also fine; in India the day comes before the month.</p>` +
        `<p><strong>Digits.</strong> Most Hindi biodatas use the ordinary digits 0 to 9, which every reader recognises. Devanagari digits (०, १, २ and so on) look traditional but are slower for many people to read. Whichever you choose, use the same style throughout the document.</p>` +
        `<p><strong>Time of birth.</strong> Write the time with the part of the day, for example <em>सुबह 6:45 बजे</em> (morning), <em>दोपहर 1:30 बजे</em> (afternoon), <em>शाम 6:10 बजे</em> (evening) or <em>रात 11:20 बजे</em> (night). Copy the time exactly as it appears in the birth record or the family's horoscope.</p>` +
        `<p><strong>Height.</strong> Write feet and inches, adding centimetres in brackets if you like: <em>5 फ़ुट 4 इंच (163 सेमी)</em>.</p>` +
        `<p><strong>Income.</strong> Write the amount with लाख or करोड़ and say whether it is yearly or monthly: <em>6.5 लाख रुपये प्रति वर्ष</em>.</p>` +
        `<p><strong>Names.</strong> Write names, gotras and places as they are pronounced, and use the same Devanagari spelling every time. If the family already has a settled Hindi spelling of the surname, for example on a wedding card or a certificate, follow it.</p>`,
    },
    {
      type: 'richText',
      heading: 'How the Hindi and Both label modes work in the maker',
      html:
        `<p>In the design options you choose one of three label modes:</p>` +
        `<ul>` +
        `<li><strong>English:</strong> every label and section heading in English.</li>` +
        `<li><strong>Hindi:</strong> labels and section headings in Hindi.</li>` +
        `<li><strong>Both:</strong> each label shows English and Hindi together, a good choice when the biodata will reach readers of both languages. The Regional-Adaptable template starts in this mode.</li>` +
        `</ul>` +
        `<p>The label mode changes only the labels. Your details are printed exactly as you type them, and nothing is machine translated. For an all-Hindi biodata, type the values in Hindi too. For a bilingual biodata, many families keep names, degrees and company names in English, which reads naturally, and write the introduction and family notes in Hindi.</p>` +
        `<p>Custom fields and renamed section headings can carry both an English and a Hindi label. A Devanagari font is embedded in the preview and in the PDF, so Hindi text prints correctly even on a computer or phone that has no Hindi fonts installed.</p>`,
    },
    {
      type: 'richText',
      heading: 'Typing Hindi on your phone or computer',
      html:
        `<h3>Android</h3>` +
        `<p>Gboard, Google's keyboard (which took over from the older Google Indic Keyboard), supports Hindi. Open Gboard settings, go to Languages, add Hindi and choose either the Devanagari layout or the transliteration layout. With transliteration you type the word in English letters, for example "pita", and pick पिता from the suggestions. Switch keyboards with the globe key. Voice typing in Hindi is handy for longer paragraphs such as the introduction.</p>` +
        `<h3>iPhone</h3>` +
        `<p>Go to Settings, General, Keyboard, Keyboards, Add New Keyboard and choose Hindi. Add the Devanagari layout, the Transliteration layout or both, then switch with the globe key.</p>` +
        `<h3>Windows</h3>` +
        `<p>Go to Settings, Time and language, Language and region, and add Hindi. In the Hindi language options, add the Hindi Phonetic keyboard, which lets you type by sound on an ordinary keyboard. Switch between keyboards with the Windows key and the Space bar.</p>` +
        `<h3>Mac</h3>` +
        `<p>Go to System Settings, Keyboard, Input Sources and add Hindi Transliteration. Switch input sources from the menu bar.</p>` +
        `<p>Whichever method you use, read the preview carefully before you download. A missing matra or a stray English letter is easy to miss on a small phone screen, so read the biodata aloud once or ask an elder to check the Hindi.</p>`,
    },
    {
      type: 'checklist',
      heading: 'Before you share a Hindi or bilingual biodata',
      items: [
        'Names, gotra and places are spelled the same way everywhere, in both Hindi and English',
        'One digit style is used throughout the document',
        'Income says whether it is per year or per month',
        'The label mode (English, Hindi or Both) suits the families who will read it',
        'Values typed in Hindi have been read once on a phone screen',
        'A family elder has read the Hindi text',
      ],
    },
  ],
  faqs: [
    {
      question: 'Can I make my marriage biodata in Hindi for free?',
      answer:
        'Yes. The BanjaraMatch biodata maker is free, and every template can show its labels in English, Hindi or both. You can type your details in Hindi, preview the result on A4 pages and download a PDF without creating an account.',
    },
    {
      question: 'Does the maker translate my details into Hindi automatically?',
      answer:
        'No. Only the labels and section headings switch language. Whatever you type is printed exactly as you typed it, so type the values in Hindi if you want them in Hindi. This avoids awkward machine translations of names, places and job titles.',
    },
    {
      question: 'Is a Hindi biodata or a bilingual biodata better?',
      answer:
        'It depends on who will read it. If every family involved reads Hindi comfortably, an all-Hindi biodata is warm and simple. If it will reach relatives in other states, younger readers or family abroad, a bilingual biodata with both labels covers everyone in one document.',
    },
    {
      question: 'Will Hindi text print correctly in the PDF?',
      answer:
        'Yes. The maker embeds a Devanagari font in the preview and in the PDF, so Hindi labels and the Hindi text you type appear correctly on any phone, computer or printer, even one without Hindi fonts installed. Check the preview once for typing mistakes before you download.',
    },
    {
      question: 'How do I write my date of birth in Hindi?',
      answer:
        'Write the day, the Hindi month name and the year, for example "14 मार्च 1998", or use the numeric form 14/03/1998 with the day first. Use ordinary digits unless your family prefers Devanagari digits, and keep the same style throughout.',
    },
    {
      question: 'How do I type in Hindi on my phone?',
      answer:
        'On Android, add Hindi in Gboard settings and choose the Devanagari or transliteration layout; transliteration lets you type in English letters and pick the Hindi word. On an iPhone, add the Hindi keyboard in Settings under General and Keyboard. You can also type in another app and paste the text into the maker.',
    },
  ],
  ctaConfig: {
    heading: 'Make a bilingual biodata',
    text: 'Start with the Regional-Adaptable template, which shows English and Hindi labels side by side. Switch to any other template at any time.',
    primaryLabel: 'Start a bilingual biodata',
    primaryHref: '/biodata-maker/create?template=regional-adaptable',
    secondaryLabel: 'Marriage biodata format guide',
    secondaryHref: '/marriage-biodata-format',
  },
  relatedLinks: [
    { label: 'Free biodata maker', href: '/biodata-maker' },
    { label: 'Biodata templates', href: '/biodata-maker/templates' },
    { label: 'Marriage biodata format', href: '/marriage-biodata-format' },
    { label: 'Banjara biodata: gotra and clan', href: '/banjara-biodata-gotra-and-clan' },
    { label: 'How to write a biodata that gets serious responses', href: TIPS_POST },
  ],
};

// ---------------------------------------------------------------------------
// Guide: /banjara-biodata-gotra-and-clan
// ---------------------------------------------------------------------------
const banjara = {
  slug: 'banjara-biodata-gotra-and-clan',
  kind: 'guide',
  metaTitle: 'Banjara Biodata: Gotra, Clan & Tanda Details | BanjaraMatch',
  metaDescription:
    "How to write gotra, mother's gotra, clan and tanda in a Banjara marriage biodata, spell names consistently and set out a clear community details section.",
  h1: 'Banjara Marriage Biodata: Gotra, Clan and Tanda Details',
  intro:
    `<p>A Banjara biodata answers the same questions as any other: who the person is, what they do and who the family is. But Banjara elders usually look for a few details first that generic biodata formats leave out: the gotra, the mother's gotra, the clan, and the tanda or native village. Whether your family says Banjara, Lambadi, Lambani, Gormati, Sugali or Vanjara, getting these details right and writing them clearly saves a round of phone calls and shows the biodata was prepared with care.</p>` +
    `<p>This guide explains each community field, why it matters and how to write it so that families in other states recognise it. For the overall section order, see our <a href="/marriage-biodata-format">marriage biodata format guide</a>.</p>`,
  contentBlocks: [
    {
      type: 'richText',
      heading: 'Community fields a Banjara biodata carries',
      html:
        `<ul>` +
        `<li><strong>Gotra (jaath):</strong> your lineage, inherited from your father, for example Ramavath or Nenavath. This is the detail marriage rules actually check.</li>` +
        `<li><strong>Mother's gotra:</strong> the gotra of your mother's family before her marriage.</li>` +
        `<li><strong>Clan (Gor Samuh):</strong> the broader lineage group your gotra belongs to. Most sources count four major clans, Rathod, Pawar, Chavan and Jadhav, though some communities and regional records also treat Banoth and Turi as clans in their own right.</li>` +
        `<li><strong>Tanda or native village:</strong> the tanda your family belongs to or comes from, with the taluk or district.</li>` +
        `<li><strong>Native state:</strong> useful because spellings and some customs differ from state to state.</li>` +
        `<li><strong>Community name:</strong> Banjara, Lambadi, Lambani, Gormati, Sugali or Vanjara, whichever your family uses.</li>` +
        `</ul>` +
        `<p>In the biodata maker, gotra, mother's gotra, clan and tanda sit in the Religion and Community step, and native place sits in the Family step. If your family also wants something else printed, such as the name of the family deity, add it as a custom field with its own English and Hindi label.</p>`,
    },
    {
      type: 'richText',
      heading: 'Why both gotras matter',
      html:
        `<p>Banjara families traditionally do not arrange a marriage between two people of the same gotra. People who share a gotra are regarded as brother and sister, however distant the actual relationship. Because the gotras within one clan share common ancestry, many families also avoid a match within the same clan. Our <a href="/banjara-gotra-list">Banjara gotra list</a> explains these rules and lists the documented gotras clan by clan.</p>` +
        `<p>The mother's gotra matters for a related reason. Many families also look at the mother's side before going ahead, and practice here differs from tanda to tanda and from family to family. Printing the mother's gotra on the biodata lets the other family make whatever check they follow straight away, instead of calling just to ask. It is a small line that answers a question before it is raised.</p>` +
        `<p>If you are not completely sure of your gotra, or of your mother's, ask the elders before you finalise the biodata. A wrong or missing gotra is one of the few mistakes that can end a conversation before it starts.</p>`,
    },
    {
      type: 'richText',
      heading: 'Writing surnames, gotras and clan names consistently',
      html:
        `<p>The same name is often spelled several ways, because it has been written down in Telugu, Kannada, Marathi, Hindi and English over the years. Our gotra list notes, for example, that Banoth is written Bhanoth in Maharashtra and Vanoth in Karnataka, and that Rathod becomes Rathore in Rajasthan. Clan and surname spellings vary in the same way: Chavan and Chauhan, Jadhav and Jadav, Pawar and Panwar, Naik and Nayak.</p>` +
        `<ul>` +
        `<li><strong>Pick one spelling and use it everywhere:</strong> on the biodata, on your matrimony profile and in what you tell relatives.</li>` +
        `<li><strong>Follow your documents for your own surname.</strong> Use the spelling on your certificates so that the biodata and the paperwork match later on.</li>` +
        `<li><strong>Add a known variant once, in brackets,</strong> if relatives in another state know the gotra by a different spelling, for example "Banoth (Bhanoth)".</li>` +
        `<li><strong>Write the clan beside the gotra,</strong> for example "Ramavath (Rathod)". It helps families who think in clans rather than gotras.</li>` +
        `<li><strong>Fill in surname and gotra separately.</strong> In some families the surname and the gotra are the same word; in others they are not. Write both, even if they repeat.</li>` +
        `<li><strong>Keep Hindi spellings consistent too.</strong> In a Hindi or bilingual biodata, settle on one Devanagari spelling for each name and reuse it.</li>` +
        `</ul>`,
    },
    {
      type: 'table',
      heading: 'Sample community details section',
      rows: [
        ['Field', 'Sample entry (fictional)'],
        ['Religion', 'Hindu'],
        ['Community', 'Banjara (Lambadi)'],
        ['Gotra', 'Ramavath (Rathod clan)'],
        ["Mother's gotra", 'Vankdoth (Pawar clan)'],
        ['Clan', 'Rathod'],
        ['Tanda / native village', 'A tanda near Bodhan, Nizamabad district'],
        ['Native state', 'Telangana'],
        ['Mother tongue', 'Gor Boli; also speaks Telugu, Hindi and English'],
      ],
    },
    {
      type: 'richText',
      heading: 'How to read the sample',
      html:
        `<p>Each line answers one question an elder is likely to ask, in the order they usually ask it. The gotra and the mother's gotra each carry their clan in brackets, so a reader can see at a glance that the two sides come from different clans. The tanda line names the nearest town and district rather than only the tanda, which helps relatives who do not know the area. The mother tongue line lists Gor Boli first and the other languages after it.</p>` +
        `<p>Leave out any line your family does not use. A biodata with five accurate lines is better than one with eight lines where two are guesses.</p>`,
    },
    {
      type: 'richText',
      heading: 'Regional names: Lambadi, Lambani, Gormati and more',
      html:
        `<p>The community is known by different names in different states: Lambadi or Sugali in Telangana and Andhra Pradesh, Gormati or Gor Banjara in Maharashtra, Lambani in Karnataka, Vanjara in Gujarat, and Banjara in Rajasthan, Madhya Pradesh and across North India. They are regional names for the same community.</p>` +
        `<p>On the biodata, write the name your own family uses. If the biodata may travel to another state, add Banjara alongside it, for example "Lambadi (Banjara)" or "Gormati (Gor Banjara)", so that nobody has to guess. You can read more on our <a href="/lambadi-matrimony">Lambadi matrimony</a> and <a href="/gormati-matrimony">Gormati matrimony</a> pages, and in the <a href="/banjara-community-history">history of the Banjara community</a>.</p>` +
        `<p>For language, Gor Boli is the community's own language across all these regions, and most families also speak the language of their state. List Gor Boli as the mother tongue and the others under languages known.</p>`,
    },
    {
      type: 'checklist',
      heading: 'Banjara biodata checklist',
      items: [
        'Gotra confirmed with the elders and spelled the same way everywhere',
        'Mother\'s gotra included',
        'Clan written beside each gotra',
        'Tanda or native village with taluk or district and state',
        'The community name your family uses, with Banjara in brackets if the biodata will travel',
        'Gor Boli and the other languages you speak',
        'Spellings that match your matrimony profile',
        'A contact person who can answer questions about the family and the gotra',
      ],
    },
    {
      type: 'richText',
      heading: 'Beyond the community details',
      html:
        `<p>Community fields are one part of a good biodata. For the wording of the rest, read <a href="${TIPS_POST}">how to write a Banjara marriage biodata that gets serious responses</a>. For what happens after biodatas are exchanged, from the first phone call to the wedding, read <a href="${PROCESS_POST}">Banjara biodata to baraat: a first-timer's guide</a>. If elders in your family prefer Hindi, our guide to <a href="/marriage-biodata-in-hindi">marriage biodata in Hindi</a> has the Hindi labels for every field, including गोत्र, कुल and तांडा.</p>`,
    },
  ],
  faqs: [
    {
      question: 'Should a Banjara biodata mention the gotra?',
      answer:
        'Yes. Gotra is usually the first thing Banjara elders check, because families traditionally do not arrange a marriage within the same gotra. Write it clearly, with the clan in brackets, and confirm the spelling with the elders before you share the biodata.',
    },
    {
      question: "Why should I include my mother's gotra?",
      answer:
        "Many families also look at the mother's side before going ahead, and the exact practice differs between tandas and families. Including the mother's gotra lets the other family make their check straight away instead of calling to ask.",
    },
    {
      question: 'What is the difference between a gotra and a clan?',
      answer:
        'A clan, or Gor Samuh, is a broad lineage group, and a gotra is a sub-lineage within it. For example, Ramavath and Nenavath are gotras within the Rathod clan. Marriage rules are checked at the gotra level, and many families also avoid matches within the same clan. Our Banjara gotra list explains this in detail.',
    },
    {
      question: 'My surname and my gotra are the same word. Do I write it twice?',
      answer:
        'Yes. Fill in the surname as part of your name and the gotra in its own field, even if they repeat. Families from other states may not assume they are the same, and a separate gotra line removes any doubt.',
    },
    {
      question: 'How do I write the tanda in a biodata?',
      answer:
        'Write the tanda name followed by the nearest town or taluk, the district and the state. Relatives who do not know the area can then place it easily. If the family now lives elsewhere, mention the tanda as the native place and the current city separately.',
    },
    {
      question: 'Should I write Banjara, Lambadi or Gormati on my biodata?',
      answer:
        'Write the name your family uses. If the biodata may reach families in other states, add Banjara in brackets, for example "Lambadi (Banjara)", because the regional names refer to the same community and readers elsewhere may know only one of them.',
    },
  ],
  ctaConfig: {
    heading: 'Make a Banjara biodata with the right details',
    text: 'The maker has fields for gotra, mother\'s gotra, clan and tanda, prints labels in English, Hindi or both, and is free to use.',
    primaryLabel: 'Create your biodata',
    primaryHref: '/biodata-maker/create',
    secondaryLabel: 'Banjara gotra list',
    secondaryHref: '/banjara-gotra-list',
  },
  relatedLinks: [
    { label: 'Free biodata maker', href: '/biodata-maker' },
    { label: 'Banjara gotra list', href: '/banjara-gotra-list' },
    { label: 'Lambadi matrimony', href: '/lambadi-matrimony' },
    { label: 'Gormati matrimony', href: '/gormati-matrimony' },
    { label: 'Banjara community history', href: '/banjara-community-history' },
    { label: 'Marriage biodata format', href: '/marriage-biodata-format' },
    { label: 'How to write a biodata that gets serious responses', href: TIPS_POST },
    { label: 'Banjara biodata to baraat', href: PROCESS_POST },
  ],
};

module.exports = [landing, format, hindi, banjara];
