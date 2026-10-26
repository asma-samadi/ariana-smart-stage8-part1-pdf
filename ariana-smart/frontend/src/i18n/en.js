// English dictionary (source of truth). Dari (prs.js) and Pashto (pus.js) must mirror this exact key structure;
// test/i18n.test.js fails if a key, array length or {placeholder} differs.
export default {
  meta: {
    title: 'Ariana Smart — Educational Airline Platform',
    description:
      'Ariana Smart is an educational airline passenger-services demo inspired by Ariana Afghan Airlines. Not an official airline website.'
  },
  language: { label: 'Language' },
  brand: { name: 'Ariana Smart', tagline: 'Educational airline platform' },
  nav: {
    label: 'Main navigation',
    skip: 'Skip to main content',
    home: 'Home',
    about: 'About',
    travel: 'Travel Information',
    apply: 'Ticket Application',
    assistant: 'AI Assistant',
    contact: 'Contact',
    login: 'Log in',
    register: 'Register',
    dashboard: 'Dashboard',
    logout: 'Log out',
    openMenu: 'Open menu',
    closeMenu: 'Close menu'
  },
  theme: { toLight: 'Switch to light theme', toDark: 'Switch to dark theme' },
  demo: {
    banner:
      'Educational demonstration project — not affiliated with Ariana Afghan Airlines. Routes, schedules and passengers are fictional. No real tickets are issued.'
  },
  common: { comingSoon: 'Coming soon', planned: 'Planned', available: 'Available', fictional: 'Fictional sample', learnMore: 'Learn more' },
  hero: {
    eyebrow: 'Educational airline platform',
    title: 'A smarter way to explore airline passenger services',
    lead:
      'Ariana Smart is a learning project inspired by Ariana Afghan Airlines. Explore sample routes, understand how a ticket application works, and see how AI can support passengers.',
    ctaApply: 'Apply for a Ticket',
    ctaAssistant: 'Meet the AI Assistant',
    chips: ['Educational project', 'Fictional sample data', 'No real tickets issued'],
    artAlt: 'Illustration of an aircraft climbing above layered mountain ridges at dusk'
  },
  explorer: {
    title: 'Explore sample routes',
    note: 'Demonstration data — not live flights',
    from: 'From',
    to: 'To',
    any: 'Any airport',
    count: 'Showing {count} of {total} sample routes',
    reset: 'Reset filters',
    empty: 'No sample routes match these filters.'
  },
  routes: {
    title: 'Featured sample routes',
    lead:
      'These routes are invented to demonstrate how route information will be presented. They are not real schedules and cannot be booked.',
    code: 'Sample code',
    duration: 'Sample duration',
    durationFmt: '{h}h {m}m',
    frequency: 'Sample frequency',
    viewAll: 'View travel information',
    freq: { daily: 'Daily', threeWeekly: '3 times a week', weekly: 'Weekly' }
  },
  airports: {
    KBL: { city: 'Kabul', name: 'Kabul International Airport' },
    HEA: { city: 'Herat', name: 'Herat International Airport' },
    MZR: { city: 'Mazar-i-Sharif', name: 'Mazar-i-Sharif International Airport' },
    DXB: { city: 'Dubai', name: 'Dubai International Airport' },
    IST: { city: 'Istanbul', name: 'Istanbul Airport' },
    DEL: { city: 'Delhi', name: 'Indira Gandhi International Airport' }
  },
  steps: {
    eyebrow: 'Application process',
    title: 'How a ticket application will work',
    lead:
      'The complete workflow is being built in stages. These are the planned steps; submitting an application will never confirm a booking or issue a ticket.',
    items: [
      { title: 'Create an account', text: 'Register and sign in securely to keep your applications private to you.' },
      { title: 'Complete the application', text: 'Enter passenger and travel details with clear, field-by-field validation.' },
      { title: 'Upload documents', text: 'Add the required documents to private storage that only you and authorized staff can access.' },
      { title: 'Track your status', text: 'Follow your application from submission to review using a reference number.' }
    ]
  },
  info: {
    eyebrow: 'Travel information',
    title: 'Prepare with clear, structured guidance',
    lead: 'Sample guidance showing how requirements and statuses will be explained to passengers.',
    cards: [
      { title: 'Document checklist', text: 'See which documents a sample application asks for and why.', link: 'View checklist' },
      { title: 'Travel preparation', text: 'General tips for getting ready before any journey.', link: 'Read the tips' },
      { title: 'Application statuses', text: 'Understand what each stage of an application means.', link: 'See status guide' }
    ]
  },
  support: {
    eyebrow: 'Passenger support',
    title: 'Help for every step',
    lead: 'Support channels shown here that are not built yet are marked clearly.',
    cards: {
      guidance: { title: 'Application guidance', text: 'Step-by-step explanations of the process, requirements and statuses.' },
      assistant: { title: 'AI passenger assistant', text: 'A planned assistant that answers questions about the process, using only approved information.' },
      contact: { title: 'Contact the project team', text: 'A contact page for questions about this educational project.' },
      languages: { title: 'English, Dari and Pashto', text: 'Switch the interface language from the menu. Right-to-left layout polish is still being completed.' }
    }
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Is Ariana Smart an official Ariana Afghan Airlines website?',
        a: 'No. Ariana Smart is an independent educational project inspired by the airline. It is not affiliated with, endorsed by, or connected to Ariana Afghan Airlines.'
      },
      {
        q: 'Can I book a real flight here?',
        a: 'No. This site does not sell tickets, confirm bookings or show live availability. Submitting a future demonstration application will not issue a ticket.'
      },
      {
        q: 'Are the routes, schedules and fares real?',
        a: 'No. Routes, codes, durations and frequencies shown here are fictional samples. No fares are displayed. Always check real flight information with an airline or authorized agent.'
      },
      {
        q: 'What will I need to apply?',
        a: 'In a later stage you will create an account, complete a passenger and travel form, and upload sample documents. The exact list will appear on the Travel Information page.'
      },
      {
        q: 'How will the AI assistant work?',
        a: 'It is planned to answer questions about the process and the sample data, and to say clearly when it does not know something. It will not invent schedules, prices or visa outcomes, and it will never see another passenger’s data.'
      },
      {
        q: 'Will my data be safe?',
        a: 'The project is designed with private document storage and strict access rules, but it is a student project that has not been independently audited. Do not submit real passport details or documents unless you are running your own secured instance.'
      }
    ]
  },
  cta: {
    title: 'Ready to see how the process works?',
    text: 'Start with the travel information, then follow the planned application steps.',
    primary: 'Apply for a Ticket',
    secondary: 'Read travel information'
  },
  footer: {
    about:
      'An educational demonstration of AI-supported airline passenger services. Inspired by, but not affiliated with, Ariana Afghan Airlines.',
    explore: 'Explore',
    passenger: 'Passenger',
    project: 'Project',
    faq: 'FAQ',
    disclaimerTitle: 'Disclaimer',
    disclaimer:
      'Ariana Smart is an educational project. It is not an official airline website and does not issue tickets, confirm bookings, or provide real flight information. All routes, schedules and sample passengers are fictional.',
    rights: '© {year} Ariana Smart — educational project'
  },
  about: {
    title: 'About Ariana Smart',
    lead: 'An educational platform that shows how modern web technology and AI can make airline passenger services clearer and easier to use.',
    purposeTitle: 'Purpose',
    purposeText:
      'Ariana Smart was created as a learning project. It demonstrates how an airline-style website can guide passengers through travel information and a ticket application, while keeping their data private.',
    featuresTitle: 'Planned features',
    features: [
      'Clear travel information and route examples',
      'Secure registration, login and a personal dashboard',
      'A multi-section ticket application with validation',
      'Private document upload with strict access control',
      'PDF summaries of your own applications',
      'An AI assistant that answers from approved information',
      'English, Dari and Pashto with right-to-left layout',
      'Light and dark themes'
    ],
    aiTitle: 'How AI can support passengers',
    aiText:
      'An assistant can explain requirements, translate guidance, and help people find the right page. It must be honest about what it does not know, avoid inventing flight details, and keep personal data away from third-party services.',
    disclaimerTitle: 'Demonstration, not an airline service',
    disclaimerText:
      'This is not an official Ariana Afghan Airlines service. Nothing here is a real booking, ticket, fare, schedule or travel authorization. Sample data is clearly labeled as fictional.',
    statusTitle: 'Build status',
    statusText: 'Stage 7 (part 2) of 9: accounts, dashboard, the ticket application form, private document uploads, Google Sheets sync, English, Dari and Pashto with right-to-left layout, and light and dark themes. A local rule-based passenger assistant is available; it does not use an external AI model.'
  },
  travel: {
    title: 'Travel information',
    lead: 'Structured sample information showing how routes, requirements and statuses will be presented.',
    demoNotice: 'All routes, durations and frequencies on this page are fictional demonstration data, not real flight information.',
    routesTitle: 'Sample routes',
    cols: { code: 'Sample code', from: 'Departure', to: 'Destination', duration: 'Duration', frequency: 'Frequency' },
    docsTitle: 'Sample document requirements',
    docsLead: 'These requirements are examples for the demonstration workflow only.',
    docs: [
      'Valid passport or national ID (sample requirement)',
      'Recent passport-style photograph',
      'Supporting document for the journey, if applicable'
    ],
    prepTitle: 'Travel preparation guidance',
    prep: [
      'Check that your passport is valid for the whole journey.',
      'Confirm entry requirements with the destination’s official authority.',
      'Keep digital and paper copies of important documents in separate places.',
      'Arrive at the airport with plenty of time before departure.',
      'Verify real flight times with the airline before you travel.'
    ],
    statusTitle: 'Application status guide',
    statusLead: 'Each application will move through these statuses. A status here is a demonstration label, never a real ticket or authorization.'
  },
  status: {
    draft: { label: 'Draft', desc: 'Started but not yet submitted. You can still edit it.' },
    submitted: { label: 'Submitted', desc: 'Received and saved. It is waiting for review.' },
    under_review: { label: 'Under Review', desc: 'A reviewer is checking the information and documents.' },
    documents_required: { label: 'Documents Required', desc: 'More or clearer documents are needed before review can continue.' },
    approved_demo: { label: 'Approved for Demonstration', desc: 'The demonstration review is complete. This is not a real ticket or travel authorization.' },
    rejected: { label: 'Rejected', desc: 'The application did not meet the demonstration requirements.' },
    cancelled: { label: 'Cancelled', desc: 'The application was withdrawn and is no longer processed.' }
  },
  auth: {
    loading: 'Loading…',
    working: 'Please wait…',
    backToLogin: 'Back to log in',
    fields: {
      fullName: 'Full name', email: 'Email address', password: 'Password', newPassword: 'New password',
      confirm: 'Confirm password', passwordHint: 'At least 8 characters, with letters and numbers.'
    },
    login: { title: 'Log in', lead: 'Access your private dashboard.', submit: 'Log in', forgot: 'Forgot your password?', noAccount: 'No account yet?' },
    register: {
      title: 'Create an account', lead: 'Register to keep your demonstration applications private to you.', submit: 'Create account',
      haveAccount: 'Already registered?', goLogin: 'Go to log in',
      privacy: 'This is an educational project. Use a test email and do not enter real passport details.',
      doneTitle: 'Check your email',
      doneText: 'If email confirmation is enabled for this project, we sent a link to confirm your address. After confirming, log in.'
    },
    forgot: { title: 'Reset your password', lead: 'Enter your email and we will send a reset link.', submit: 'Send reset link', sent: 'If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.' },
    reset: {
      title: 'Choose a new password', lead: 'Enter a new password for your account.', submit: 'Update password',
      invalidLink: 'This reset link is invalid or has expired. Request a new one.', requestNew: 'Request a new link', done: 'Password updated. Redirecting to your dashboard…'
    },
    config: {
      not_configured: { title: 'Supabase is not configured', text: 'Accounts are unavailable because VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set in frontend/.env. See docs/SETUP_SUPABASE.md.' },
      unsafe_key: { title: 'Unsafe key detected', text: 'The frontend configuration contains a secret (service-role) key. It was refused. Use the public anon key in the frontend and keep secret keys on the backend only.' },
      mock: { title: 'DEVELOPMENT MOCK — not real Supabase', text: 'Accounts are stored in this browser only and are NOT secure. This mode exists only for local development and testing.' }
    },
    errors: {
      emailRequired: 'Enter your email address.', emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.', passwordShort: 'Use at least 8 characters.', passwordLong: 'Use at most 72 characters.',
      passwordWeak: 'Use both letters and numbers.', passwordMismatch: 'The passwords do not match.',
      nameShort: 'Enter your full name.', nameLong: 'Use at most 100 characters.',
      invalidCredentials: 'Incorrect email or password.', emailNotConfirmed: 'Confirm your email address first, then log in.',
      alreadyRegistered: 'An account with this email already exists. Try logging in.', rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
      samePassword: 'Choose a password different from your current one.', sessionExpired: 'Your session expired. Please log in again.',
      network: 'Network problem. Check your connection and try again.', notConfigured: 'Accounts are not configured yet.',
      generic: 'Something went wrong. Please try again.'
    }
  },
  apply: {
    title: 'Ticket application',
    lead: 'Complete the three sections below. This demonstration application never issues a ticket or confirms a booking.',
    demoNotice: 'Educational demo: use fictional or test details. Do not enter real passport numbers unless you run your own secured instance.',
    select: 'Select…', submit: 'Submit application', cancel: 'Cancel',
    sections: { passenger: 'Passenger details', journey: 'Journey details', consent: 'Consent' },
    fields: {
      fullName: 'Full name', dateOfBirth: 'Date of birth', nationality: 'Nationality', email: 'Email address', phone: 'Phone number',
      idDocumentNumber: 'ID / passport number', tripType: 'Trip type', origin: 'From', destination: 'To',
      departDate: 'Departure date', returnDate: 'Return date', passengers: 'Number of passengers',
      consent: 'I confirm the details are accurate and I agree that they are stored for this demonstration.'
    },
    hints: {
      fullName: 'As shown on your travel document.', optional: 'Optional.',
      idDoc: 'Optional. 5–20 letters, numbers or hyphens. Stored privately; never shown in lists.',
      routes: 'Only the fictional demonstration airports are available.'
    },
    trip: { one_way: 'One way', return: 'Return' },
    consentText: 'Your application is saved to your private account and is visible only to you and authorized reviewers. Submitting it does not issue a ticket, confirm a booking or guarantee travel.',
    success: {
      badge: 'Submitted', already: 'Already submitted', title: 'Your application was received',
      refLabel: 'Your application reference number:',
      note: 'Keep this number. Its status is shown on your dashboard. This is a demonstration — no ticket has been issued.',
      dashboard: 'Go to dashboard', another: 'Start another application', documents: 'Upload documents'
    },
    errors: {
      required: 'This field is required.', tooLong: 'This is too long.',
      nameShort: 'Enter the full name.', nameLong: 'Use at most 100 characters.',
      dateInvalid: 'Enter a valid date.', dobFuture: 'Date of birth must be in the past.', dobOld: 'Check the date of birth.',
      emailRequired: 'Enter an email address.', emailInvalid: 'Enter a valid email address.',
      phoneInvalid: 'Use 7–20 digits; spaces, brackets, hyphens and a leading + are allowed.',
      docInvalid: 'Use 5–20 letters, numbers or hyphens.',
      sameAirport: 'Destination must differ from the origin.', datePast: 'Departure cannot be in the past.',
      returnBeforeDepart: 'Return cannot be before departure.', passengersRange: 'Choose 1 to 9 passengers.',
      consentRequired: 'You must agree to continue.', badKey: 'Reload the page and try again.'
    },
    formErrors: {
      notFound: 'Application not found.',
      duplicate: 'You already have an open application for this person, route and date. Existing reference:',
      sessionExpired: 'Your session expired. Please log in again.', network: 'Could not reach the server. Check your connection and try again — your entries are kept.',
      rateLimited: 'Too many attempts. Please wait a minute and try again.', serverUnavailable: 'The service is not available right now. Please try again later.',
      serverError: 'Something went wrong on our side. Please try again.', notConfigured: 'Applications are unavailable until Supabase and the backend are configured.'
    }
  },
  dashboard: {
    welcome: 'Welcome, {name}', lead: 'Your private overview. Only you can see your applications.',
    account: 'Your account', total: 'Applications', privacyTitle: 'Privacy',
    privacyText: 'Your data is protected by database access rules. Do not store real passport details in a demo.',
    appsTitle: 'Your applications', empty: 'You have no applications yet.', applyCta: 'Ticket application', applyNote: 'Applications are demonstrations only and never issue a ticket.',
    loadError: 'Could not load your applications. Try again later.', editProfile: 'Edit profile',
    cols: { ref: 'Reference', route: 'Route', date: 'Departure', passengers: 'Passengers', submitted: 'Submitted', status: 'Status', documents: 'Documents', pdf: 'PDF summary' },
    manageDocs: 'Documents',
    newApplication: 'New application', downloadPdf: 'Download PDF', pdfLoading: 'Preparing…', pdfErrors: { notConfigured: 'PDF download is unavailable in demo mode.', sessionExpired: 'Your session expired. Please log in again.', notFound: 'Application not found.', network: 'Could not reach the server. Check your connection and try again.', rateLimited: 'Too many downloads. Please wait a minute.', serverUnavailable: 'The service is not available right now.', serverError: 'Could not create the PDF. Please try again.' }, trip: { one_way: 'One way', return: 'Return' }
  },
  documents: {
    title: 'Application documents',
    lead: 'Attach supporting documents to your application. Files are stored privately and are visible only to you and authorized reviewers.',
    demoNotice: 'Educational demo: upload only fictional or test files. Do not upload real passports or ID cards unless you run your own secured instance.',
    addTitle: 'Add a document', docType: 'Document type', file: 'File',
    fileHint: 'PDF, JPG or PNG, up to {mb} MB each, at most {max} files per application.',
    upload: 'Upload', uploaded: 'Document uploaded.', deleted: 'Document removed.', confirmDelete: 'Remove this document?',
    listTitle: 'Uploaded documents', none: 'No documents uploaded yet.', view: 'View', delete: 'Remove', back: 'Back to dashboard',
    notFound: 'This application was not found.', loadError: 'Could not load your documents. Try again later.',
    types: { passport: 'Passport', national_id: 'National ID', visa: 'Visa', supporting: 'Other supporting document' },
    mime: { 'application/pdf': 'PDF', 'image/jpeg': 'JPEG image', 'image/png': 'PNG image' },
    units: { kb: 'KB', mb: 'MB' },
    errors: {
      docTypeInvalid: 'Choose a document type.', fileMissing: 'Choose a file to upload.', fileEmpty: 'The file is empty.',
      fileTooLarge: 'The file is too large (maximum 5 MB).', fileType: 'Only real PDF, JPG or PNG files are accepted.', badUpload: 'The upload could not be read. Try again.',
      tooMany: 'You reached the maximum number of documents for this application.', applicationClosed: 'This application is closed; documents can no longer be changed.',
      notFound: 'Not found.', sessionExpired: 'Your session expired. Please log in again.', network: 'Could not reach the server. Check your connection and try again.',
      rateLimited: 'Too many attempts. Please wait a minute and try again.', serverUnavailable: 'The service is not available right now. Please try again later.',
      serverError: 'Something went wrong on our side. Please try again.', notConfigured: 'Uploads are unavailable until Supabase and the backend are configured.'
    }
  },
  profile: {
    title: 'Your profile', lead: 'Update your details and password.', details: 'Details', emailHint: 'Your email cannot be changed here.',
    themeNote: 'Your current theme ({theme}) is saved with your profile.', themes: { light: 'light', dark: 'dark' },
    save: 'Save changes', saved: 'Profile saved.', passwordTitle: 'Change password', passwordSave: 'Change password', passwordChanged: 'Password changed.'
  },
  soon: {
    badge: 'Not available yet',
    text: 'This feature is planned for {stage} and has not been built yet. This page is a navigation placeholder.',
    back: 'Back to home',
    pages: {
      assistant: { title: 'AI assistant', stage: 'Stage 7' },
      contact: { title: 'Contact', stage: 'a later stage' }
    }
  },
  notFound: { title: 'Page not found', text: 'The page you are looking for does not exist.', back: 'Back to home' },
  assistant: {
    title: 'AI Passenger Assistant',
    lead: 'Ask about this educational demo, its sample routes, and the planned application process.',
    notice: 'This is a local rule-based helper, not a live AI service. It cannot check real flights, fares, visas, or bookings. Do not enter passport details or other sensitive personal information.',
    chatLabel: 'Assistant conversation',
    welcome: 'Hello! I can explain how this demo works, where to find travel information, and what the sample application steps mean.',
    inputLabel: 'Your question',
    placeholder: 'Type a question about Ariana Smart…',
    send: 'Send question',
    suggestionsLabel: 'Try asking',
    openPage: 'Open related page',
    footerNote: 'Answers are based on the demo information only. If a question is not covered, the assistant will say it cannot answer.',
    answers: {
      official: 'No. Ariana Smart is an independent educational project inspired by Ariana Afghan Airlines. It is not the airline’s official website and is not affiliated with the airline.',
      booking: 'No. You cannot book a real flight here. The project does not sell tickets, confirm bookings, or show live availability. Please contact an airline or authorized agent for real travel arrangements.',
      apply: 'The application flow is a demonstration. You can open the Ticket Application page to see the available form. Submitting a demo request does not issue a ticket or confirm a booking.',
      documents: 'The Travel Information page lists sample document guidance. These are educational examples, not official visa or airline requirements. Confirm the real requirements with the relevant authorities.',
      status: 'Application statuses in this project are demonstration labels only. If you have created an application, sign in and check your dashboard for the status displayed by this demo.',
      routes: 'The routes and schedules shown in Ariana Smart are fictional examples, not live flights. Open Travel Information to view the sample routes.',
      price: 'This demo does not provide real ticket prices or fares. Contact an airline or authorized agent for current prices.',
      privacy: 'This is an educational project and has not had an independent security audit. Use test information only; do not enter real passport details or sensitive documents.',
      language: 'Use the language selector in the site navigation to switch between English, Dari, and Pashto. The page direction changes with the selected language.',
      ai: 'This assistant uses simple local keyword matching and prepared answers. It does not call an AI model or send your question to an external AI service.',
      contact: 'The Contact page is currently a placeholder. There is no verified support email or live support channel provided by this demo.',
      help: 'I can answer basic questions about the demo, fictional routes, the application process, documents, statuses, language settings, and privacy cautions. I cannot check real flights, prices, visas, or bookings.',
      greeting: 'Hello! Ask me about sample routes, the application process, documents, or how this educational project works.',
      fallback: 'I do not have an approved answer for that question yet. Try asking about sample routes, applying, documents, application status, prices, privacy, or languages.'
    },
    suggestions: [
      { label: 'Can I book a real flight?', question: 'Can I book a real flight here?' },
      { label: 'How does an application work?', question: 'How do I apply for a ticket?' },
      { label: 'Are the routes real?', question: 'Are the routes and schedules real?' },
      { label: 'Which documents are needed?', question: 'Which documents are needed?' }
    ]
  },
};
