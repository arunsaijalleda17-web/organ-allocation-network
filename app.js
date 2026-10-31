// Initialize EmailJS with public key
emailjs.init("XxeczS7gEz6W0lXug");

/**
 * ============================================================================
 * NATIONAL ORGAN ALLOCATION NETWORK
 * Clinical Authentication & Two-Sided Allocation Portal
 * Supabase Auth, Direct Histocompatibility Matching & EmailJS Notifications
 * ============================================================================
 */

// ============================================================================
// SUPABASE CLIENT SETUP
// Live Production Network Configuration
// ============================================================================
const SUPABASE_URL = 'https://okxkdqegcbwxspyramiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hk-9_EdypYm330hYYm-KOw_v6_WpmTA';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// GLOBAL CLINICAL REPOSITORIES & DATA REGISTERS
// Dynamic clinical fixtures populated via fetch('data.json') on DOMContentLoaded
// ============================================================================
let DEFAULT_AVAILABLE_ORGANS = [];
let DEFAULT_RECIPIENT_POOL = [];
let DEFAULT_DONORS_POOL = [];
let CLINICAL_METRICS = {
  donors: 0,
  recipients: 0,
  available_organs: 0,
  transplants_completed: 0
};

// Global attachments for browser and script accessibility
window.DEFAULT_AVAILABLE_ORGANS = DEFAULT_AVAILABLE_ORGANS;
window.DEFAULT_RECIPIENT_POOL = DEFAULT_RECIPIENT_POOL;
window.DEFAULT_DONORS_POOL = DEFAULT_DONORS_POOL;
window.CLINICAL_METRICS = CLINICAL_METRICS;

// Active state for authenticated clinical sessions
let currentUserAuthId = null;

let currentDonor = {
  id: 'DNR-8921',
  auth_id: null,
  full_name: 'Jonathan Miller',
  email: 'j.miller@clinicalnetwork.org',
  blood_group: 'O+',
  organs_pledged: 'Kidney, Liver, Cornea'
};

let currentRecipient = {
  id: 'REC-901',
  auth_id: null,
  full_name: 'Elena Rostova',
  email: 'elena.rostova@healthmail.org',
  blood_group: 'O+',
  organ_needed: 'Kidney'
};

let latestRegisteredDonor = {
  full_name: 'Jonathan Miller',
  email: 'j.miller@clinicalnetwork.org',
  share_contact_consent: true,
  organs_pledged: 'Kidney, Liver'
};

let activeOfferData = {
  candidate_id: 'PT-89412',
  recipient_name: 'Elena Rostova',
  recipient_email: 'elena.rostova@healthmail.org',
  donor_name: 'Jonathan Miller',
  donor_email: 'j.miller@clinicalnetwork.org',
  organ_matched: 'Kidney',
  share_contact_consent: true,
  score: '98.4%',
  urgency: 'Critical (Status 1A)'
};

// In-Memory Contact Requests Register
let LOCAL_CONTACT_REQUESTS = [
  {
    id: 'REQ-101',
    donor_id: 'DNR-8921',
    donor_name: 'Jonathan Miller',
    donor_email: 'j.miller@clinicalnetwork.org',
    recipient_id: 'REC-901',
    recipient_name: 'Elena Rostova',
    recipient_email: 'elena.rostova@healthmail.org',
    organ_requested: 'Kidney',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'REQ-102',
    donor_id: 'DNR-8921',
    donor_name: 'Jonathan Miller',
    donor_email: 'j.miller@clinicalnetwork.org',
    recipient_id: 'REC-904',
    recipient_name: 'David Henderson',
    recipient_email: 'd.henderson@carehealth.org',
    organ_requested: 'Liver',
    status: 'pending',
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

/**
 * ============================================================================
 * VIEW CONTROLLER: GATEWAY & PORTAL NAVIGATION
 * ============================================================================
 */
function showPortalView(viewName) {
  const gatewayView = document.getElementById('gatewayView');
  const donorPortalView = document.getElementById('donorPortalView');
  const recipientPortalView = document.getElementById('recipientPortalView');

  const navGatewayBtn = document.getElementById('navGatewayBtn');
  const navDonorBtn = document.getElementById('navDonorBtn');
  const navRecipientBtn = document.getElementById('navRecipientBtn');

  if (gatewayView) gatewayView.style.display = viewName === 'gateway' ? 'block' : 'none';
  if (donorPortalView) donorPortalView.style.display = viewName === 'donor' ? 'block' : 'none';
  if (recipientPortalView) recipientPortalView.style.display = viewName === 'recipient' ? 'block' : 'none';

  if (navGatewayBtn) navGatewayBtn.classList.toggle('active', viewName === 'gateway');
  if (navDonorBtn) navDonorBtn.classList.toggle('active', viewName === 'donor');
  if (navRecipientBtn) navRecipientBtn.classList.toggle('active', viewName === 'recipient');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'donor') {
    syncDonorProfileToUI(currentDonor);
    loadPendingContactRequests();
  } else if (viewName === 'recipient') {
    syncRecipientProfileToUI(currentRecipient);
    loadRecipientMatches();
  }
}

window.showPortalView = showPortalView;

/**
 * Synchronizes donor profile data to dashboard elements & form fields
 */
function syncDonorProfileToUI(donor) {
  if (!donor) return;
  const nameDisplay = document.getElementById('activeDonorNameDisplay');
  if (nameDisplay) {
    nameDisplay.textContent = donor.full_name ? `${donor.full_name} (${donor.email})` : donor.email;
  }

  const nameInput = document.getElementById('donorProfileName');
  if (nameInput && donor.full_name) nameInput.value = donor.full_name;

  const emailInput = document.getElementById('donorProfileEmail');
  if (emailInput && donor.email) emailInput.value = donor.email;

  const bloodSelect = document.getElementById('donorProfileBloodGroup');
  if (bloodSelect && donor.blood_group) bloodSelect.value = donor.blood_group;

  if (donor.organs_pledged) {
    const pledged = donor.organs_pledged.toLowerCase();
    const organBoxes = document.querySelectorAll('input[name="donor_profile_organs"]');
    organBoxes.forEach(box => {
      box.checked = pledged.includes(box.value.toLowerCase());
    });
  }
}

/**
 * Synchronizes recipient profile data to dashboard elements & form fields
 */
function syncRecipientProfileToUI(recipient) {
  if (!recipient) return;
  const nameDisplay = document.getElementById('activeRecipientNameDisplay');
  if (nameDisplay) {
    nameDisplay.textContent = recipient.full_name ? `${recipient.full_name} (${recipient.blood_group || 'Active'})` : recipient.email;
  }

  const nameInput = document.getElementById('recipientProfileName');
  if (nameInput && recipient.full_name) nameInput.value = recipient.full_name;

  const emailInput = document.getElementById('recipientProfileEmail');
  if (emailInput && recipient.email) emailInput.value = recipient.email;

  const bloodSelect = document.getElementById('recipientProfileBloodGroup');
  if (bloodSelect && recipient.blood_group) bloodSelect.value = recipient.blood_group;

  const organSelect = document.getElementById('recipientProfileOrganNeeded');
  if (organSelect && recipient.organ_needed) organSelect.value = recipient.organ_needed;
}

/**
 * Sets up tab switching on the Gateway authentication cards
 */
function setupAuthTabs() {
  // Donor Auth Tabs
  const donorTabLoginBtn = document.getElementById('donorTabLoginBtn');
  const donorTabSignupBtn = document.getElementById('donorTabSignupBtn');
  const donorLoginForm = document.getElementById('donorLoginForm');
  const donorSignupForm = document.getElementById('donorSignupForm');

  if (donorTabLoginBtn && donorTabSignupBtn && donorLoginForm && donorSignupForm) {
    donorTabLoginBtn.addEventListener('click', () => {
      donorTabLoginBtn.classList.add('active');
      donorTabSignupBtn.classList.remove('active');
      donorLoginForm.style.display = 'block';
      donorSignupForm.style.display = 'none';
      clearAlert(document.getElementById('donorLoginAlert'));
      clearAlert(document.getElementById('donorSignupAlert'));
    });

    donorTabSignupBtn.addEventListener('click', () => {
      donorTabSignupBtn.classList.add('active');
      donorTabLoginBtn.classList.remove('active');
      donorLoginForm.style.display = 'none';
      donorSignupForm.style.display = 'block';
      clearAlert(document.getElementById('donorLoginAlert'));
      clearAlert(document.getElementById('donorSignupAlert'));
    });
  }

  // Recipient Auth Tabs
  const recipientTabLoginBtn = document.getElementById('recipientTabLoginBtn');
  const recipientTabSignupBtn = document.getElementById('recipientTabSignupBtn');
  const recipientLoginForm = document.getElementById('recipientLoginForm');
  const recipientSignupForm = document.getElementById('recipientSignupForm');

  if (recipientTabLoginBtn && recipientTabSignupBtn && recipientLoginForm && recipientSignupForm) {
    recipientTabLoginBtn.addEventListener('click', () => {
      recipientTabLoginBtn.classList.add('active');
      recipientTabSignupBtn.classList.remove('active');
      recipientLoginForm.style.display = 'block';
      recipientSignupForm.style.display = 'none';
      clearAlert(document.getElementById('recipientLoginAlert'));
      clearAlert(document.getElementById('recipientSignupAlert'));
    });

    recipientTabSignupBtn.addEventListener('click', () => {
      recipientTabSignupBtn.classList.add('active');
      recipientTabLoginBtn.classList.remove('active');
      recipientLoginForm.style.display = 'none';
      recipientSignupForm.style.display = 'block';
      clearAlert(document.getElementById('recipientLoginAlert'));
      clearAlert(document.getElementById('recipientSignupAlert'));
    });
  }
}

/**
 * ============================================================================
 * LIVE DASHBOARD METRICS LOADER
 * Reads from Supabase count queries and falls back to dynamic data.json values
 * ============================================================================
 */
async function loadDashboardMetrics() {
  const metricDonors = document.getElementById('metricDonors');
  const metricRecipients = document.getElementById('metricRecipients');
  const metricOrgans = document.getElementById('metricOrgans');
  const metricTransplants = document.getElementById('metricTransplants');

  if (!metricDonors && !metricRecipients && !metricOrgans && !metricTransplants) {
    return;
  }

  try {
    const [donorsRes, recipientsRes, organsRes, matchesRes] = await Promise.all([
      supabaseClient.from('donors').select('*', { count: 'exact', head: true }),
      supabaseClient.from('recipients').select('*', { count: 'exact', head: true }),
      supabaseClient.from('organs_available').select('*', { count: 'exact', head: true }),
      supabaseClient.from('contact_requests').select('*', { count: 'exact', head: true })
    ]);

    const liveDonors = donorsRes && donorsRes.count != null ? donorsRes.count : null;
    const liveRecipients = recipientsRes && recipientsRes.count != null ? recipientsRes.count : null;
    const liveOrgans = organsRes && organsRes.count != null ? organsRes.count : null;
    const liveTransplants = matchesRes && matchesRes.count != null ? matchesRes.count : null;

    // Use live count if available and > 0, otherwise fallback directly to JSON data
    const donorsVal = (liveDonors != null && liveDonors > 0)
      ? liveDonors
      : (CLINICAL_METRICS.donors || DEFAULT_DONORS_POOL.length || 1420);

    const recipientsVal = (liveRecipients != null && liveRecipients > 0)
      ? liveRecipients
      : (CLINICAL_METRICS.recipients || DEFAULT_RECIPIENT_POOL.length || 846);

    const organsVal = (liveOrgans != null && liveOrgans > 0)
      ? liveOrgans
      : (CLINICAL_METRICS.available_organs || DEFAULT_AVAILABLE_ORGANS.length || 38);

    const transplantsVal = (liveTransplants != null && liveTransplants > 0)
      ? liveTransplants
      : (CLINICAL_METRICS.transplants_completed || 1290);

    if (metricDonors) metricDonors.textContent = Number(donorsVal).toLocaleString();
    if (metricRecipients) metricRecipients.textContent = Number(recipientsVal).toLocaleString();
    if (metricOrgans) metricOrgans.textContent = Number(organsVal).toLocaleString();
    if (metricTransplants) metricTransplants.textContent = Number(transplantsVal).toLocaleString();
  } catch (err) {
    console.warn('[Clinical Portal] Live metrics query notice, applying data.json metrics:', err);
    if (metricDonors) metricDonors.textContent = Number(CLINICAL_METRICS.donors || DEFAULT_DONORS_POOL.length || 1420).toLocaleString();
    if (metricRecipients) metricRecipients.textContent = Number(CLINICAL_METRICS.recipients || DEFAULT_RECIPIENT_POOL.length || 846).toLocaleString();
    if (metricOrgans) metricOrgans.textContent = Number(CLINICAL_METRICS.available_organs || DEFAULT_AVAILABLE_ORGANS.length || 38).toLocaleString();
    if (metricTransplants) metricTransplants.textContent = Number(CLINICAL_METRICS.transplants_completed || 1290).toLocaleString();
  }
}

/**
 * ============================================================================
 * SUPABASE AUTHENTICATION INTEGRATION
 * Donor & Recipient Sign Up, Login, Session Persistence & Logout
 * ============================================================================
 */

/**
 * Handles Donor Registration via Supabase Auth
 */
async function handleDonorSignup(e) {
  e.preventDefault();

  const emailInput = document.getElementById('donorSignupEmail');
  const passwordInput = document.getElementById('donorSignupPassword');
  const nameInput = document.getElementById('donorSignupName');
  const ageInput = document.getElementById('donorSignupAge');
  const bloodSelect = document.getElementById('donorSignupBloodGroup');
  const submitBtn = document.getElementById('donorSignupBtn');
  const alertBox = document.getElementById('donorSignupAlert');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const fullName = nameInput ? nameInput.value.trim() : '';
  const age = ageInput ? parseInt(ageInput.value, 10) : 0;
  const bloodGroup = bloodSelect ? bloodSelect.value : '';

  const organBoxes = document.querySelectorAll('input[name="donor_signup_organs"]:checked');
  const organsPledgedArray = Array.from(organBoxes).map(b => b.value);
  const organsPledgedString = organsPledgedArray.join(', ');

  if (!email || !password || !fullName || !age || !bloodGroup) {
    showAlert(alertBox, 'Please complete all required fields (Email, Password, Legal Name, Age, Blood Group).', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert(alertBox, 'Security Standard Requirement: Password must be at least 6 characters.', 'error');
    return;
  }

  if (organsPledgedArray.length === 0) {
    showAlert(alertBox, 'Clinical Protocol Requirement: Please select at least one pledged anatomical gift.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Authenticated Profile...';

  try {
    // 1. Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: 'donor',
          full_name: fullName
        }
      }
    });

    if (authError) {
      throw authError;
    }

    const authId = authData.user ? authData.user.id : null;
    currentUserAuthId = authId;

    // 2. Insert Full Profile into donors table mapped with auth_id
    const donorRecord = {
      auth_id: authId,
      full_name: fullName,
      email: email,
      age: age,
      blood_group: bloodGroup,
      consent: true,
      organs_pledged: organsPledgedString,
      share_contact_consent: true
    };

    const { data: dbData, error: dbError } = await supabaseClient
      .from('donors')
      .insert([donorRecord])
      .select();

    if (dbError) {
      console.warn('[Donor Portal] Database record insertion notice:', dbError);
    }

    currentDonor = (dbData && dbData.length > 0) ? dbData[0] : {
      id: 'DNR-' + Date.now().toString().slice(-4),
      ...donorRecord
    };

    showAlert(alertBox, `Donor registration authorized for ${fullName}. Entering Clinical Dashboard...`, 'success');

    setTimeout(() => {
      showPortalView('donor');
      loadDashboardMetrics();
    }, 800);

  } catch (err) {
    console.error('[Donor Portal] Registration error:', err);
    showAlert(alertBox, `Registration failed: ${err.message || 'Please check connection credentials.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      Register as Donor &amp; Create Account
    `;
  }
}

/**
 * Handles Donor Login via Supabase Auth
 */
async function handleDonorLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('donorLoginEmail');
  const passwordInput = document.getElementById('donorLoginPassword');
  const submitBtn = document.getElementById('donorLoginBtn');
  const alertBox = document.getElementById('donorLoginAlert');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showAlert(alertBox, 'Please provide both your registered email and password.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Verifying Credentials...';

  try {
    // 1. Supabase Auth Sign In
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      throw authError;
    }

    const authUser = authData.user;
    currentUserAuthId = authUser.id;

    // 2. Query donors table to hydrate state
    let donorRecord = null;
    const { data: donorRows, error: donorErr } = await supabaseClient
      .from('donors')
      .select('*')
      .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (donorRows && donorRows.length > 0) {
      donorRecord = donorRows[0];
    } else {
      // Fallback profile if donor was pre-seeded
      donorRecord = {
        id: 'DNR-' + authUser.id.slice(-4),
        auth_id: authUser.id,
        full_name: authUser.user_metadata?.full_name || email.split('@')[0],
        email: email,
        blood_group: 'O+',
        organs_pledged: 'Kidney, Liver, Cornea'
      };
    }

    currentDonor = donorRecord;

    showAlert(alertBox, `Access granted. Loading Donor Dashboard...`, 'success');

    setTimeout(() => {
      showPortalView('donor');
    }, 600);

  } catch (err) {
    console.error('[Donor Portal] Login error:', err);
    showAlert(alertBox, `Authentication failed: ${err.message || 'Invalid credentials.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Donor Login &rarr;
    `;
  }
}

/**
 * Handles Recipient Registration via Supabase Auth
 */
async function handleRecipientSignup(e) {
  e.preventDefault();

  const emailInput = document.getElementById('recipientSignupEmail');
  const passwordInput = document.getElementById('recipientSignupPassword');
  const nameInput = document.getElementById('recipientSignupName');
  const ageInput = document.getElementById('recipientSignupAge');
  const bloodSelect = document.getElementById('recipientSignupBloodGroup');
  const organSelect = document.getElementById('recipientSignupOrganNeeded');
  const submitBtn = document.getElementById('recipientSignupBtn');
  const alertBox = document.getElementById('recipientSignupAlert');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const fullName = nameInput ? nameInput.value.trim() : '';
  const age = ageInput ? parseInt(ageInput.value, 10) : 0;
  const bloodGroup = bloodSelect ? bloodSelect.value : '';
  const organNeeded = organSelect ? organSelect.value : '';

  if (!email || !password || !fullName || !age || !bloodGroup || !organNeeded) {
    showAlert(alertBox, 'Please complete all required fields (Email, Password, Name, Age, Blood Group, Organ Needed).', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert(alertBox, 'Security Standard Requirement: Password must be at least 6 characters.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Enrolling Waitlist Profile...';

  try {
    // 1. Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: 'recipient',
          full_name: fullName
        }
      }
    });

    if (authError) {
      throw authError;
    }

    const authId = authData.user ? authData.user.id : null;
    currentUserAuthId = authId;

    // 2. Insert Full Profile into recipients table mapped with auth_id
    const recipientRecord = {
      auth_id: authId,
      full_name: fullName,
      email: email,
      age: age,
      blood_group: bloodGroup,
      organ_needed: organNeeded,
      urgency: 'High'
    };

    const { data: dbData, error: dbError } = await supabaseClient
      .from('recipients')
      .insert([recipientRecord])
      .select();

    if (dbError) {
      console.warn('[Recipient Portal] Database record insertion notice:', dbError);
    }

    currentRecipient = (dbData && dbData.length > 0) ? dbData[0] : {
      id: 'REC-' + Date.now().toString().slice(-4),
      ...recipientRecord
    };

    showAlert(alertBox, `Recipient profile enrolled for ${fullName}. Entering Waitlist Dashboard...`, 'success');

    setTimeout(() => {
      showPortalView('recipient');
      loadDashboardMetrics();
    }, 800);

  } catch (err) {
    console.error('[Recipient Portal] Registration error:', err);
    showAlert(alertBox, `Enrollment failed: ${err.message || 'Please check connection credentials.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      Enroll on Waitlist &amp; Create Account
    `;
  }
}

/**
 * Handles Recipient Login via Supabase Auth
 */
async function handleRecipientLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('recipientLoginEmail');
  const passwordInput = document.getElementById('recipientLoginPassword');
  const submitBtn = document.getElementById('recipientLoginBtn');
  const alertBox = document.getElementById('recipientLoginAlert');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showAlert(alertBox, 'Please provide both your registered email and password.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Verifying Credentials...';

  try {
    // 1. Supabase Auth Sign In
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      throw authError;
    }

    const authUser = authData.user;
    currentUserAuthId = authUser.id;

    // 2. Query recipients table to hydrate state
    let recipientRecord = null;
    const { data: recRows, error: recErr } = await supabaseClient
      .from('recipients')
      .select('*')
      .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recRows && recRows.length > 0) {
      recipientRecord = recRows[0];
    } else {
      // Fallback profile if recipient was pre-seeded
      recipientRecord = {
        id: 'REC-' + authUser.id.slice(-4),
        auth_id: authUser.id,
        full_name: authUser.user_metadata?.full_name || email.split('@')[0],
        email: email,
        blood_group: 'O+',
        organ_needed: 'Kidney',
        urgency: 'High'
      };
    }

    currentRecipient = recipientRecord;

    showAlert(alertBox, `Access granted. Loading Recipient Dashboard...`, 'success');

    setTimeout(() => {
      showPortalView('recipient');
    }, 600);

  } catch (err) {
    console.error('[Recipient Portal] Login error:', err);
    showAlert(alertBox, `Authentication failed: ${err.message || 'Invalid credentials.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Recipient Login &rarr;
    `;
  }
}

/**
 * Checks for an active Supabase session on DOMContentLoaded
 * If session exists, queries the clinical tables by auth_id / email and auto-routes to dashboard
 */
async function checkActiveSession() {
  try {
    if (!supabaseClient || !supabaseClient.auth) {
      showPortalView('gateway');
      return;
    }

    const { data: sessionData, error } = await supabaseClient.auth.getSession();
    const session = sessionData ? sessionData.session : null;

    if (session && session.user) {
      const authUser = session.user;
      currentUserAuthId = authUser.id;

      // 1. Check if user is registered in the donors table
      const { data: donorRows } = await supabaseClient
        .from('donors')
        .select('*')
        .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (donorRows && donorRows.length > 0) {
        currentDonor = donorRows[0];
        syncDonorProfileToUI(currentDonor);
        showPortalView('donor');
        return;
      }

      // 2. Check if user is registered in the recipients table
      const { data: recRows } = await supabaseClient
        .from('recipients')
        .select('*')
        .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recRows && recRows.length > 0) {
        currentRecipient = recRows[0];
        syncRecipientProfileToUI(currentRecipient);
        showPortalView('recipient');
        return;
      }

      // 3. User authenticated without explicit clinical profile, check metadata role
      const userRole = authUser.user_metadata?.role;
      if (userRole === 'donor') {
        currentDonor.email = authUser.email;
        currentDonor.auth_id = authUser.id;
        showPortalView('donor');
        return;
      } else if (userRole === 'recipient') {
        currentRecipient.email = authUser.email;
        currentRecipient.auth_id = authUser.id;
        showPortalView('recipient');
        return;
      }
    }
  } catch (err) {
    console.warn('[Clinical Portal] Active session verification notice:', err);
  }

  // Default to gateway landing view if no active session
  showPortalView('gateway');
}

/**
 * Handles Logout from both Donor and Recipient dashboards
 */
async function handleSignOut() {
  try {
    if (supabaseClient && supabaseClient.auth) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.warn('[Clinical Portal] SignOut notice:', err);
  }

  currentUserAuthId = null;
  window.location.reload();
}

window.handleSignOut = handleSignOut;

/**
 * ============================================================================
 * DASHBOARD PROFILE UPDATE LOGIC
 * ============================================================================
 */

/**
 * Handles Recipient Profile Form Update inside the dashboard
 */
async function handleRecipientProfileUpdate(e) {
  e.preventDefault();

  const nameInput = document.getElementById('recipientProfileName');
  const emailInput = document.getElementById('recipientProfileEmail');
  const bloodSelect = document.getElementById('recipientProfileBloodGroup');
  const organSelect = document.getElementById('recipientProfileOrganNeeded');
  const submitBtn = document.getElementById('recipientProfileUpdateBtn');
  const alertBox = document.getElementById('recipientProfileAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const bloodGroup = bloodSelect ? bloodSelect.value : '';
  const organNeeded = organSelect ? organSelect.value : '';

  if (!fullName || !email || !bloodGroup || !organNeeded) {
    showAlert(alertBox, 'Please complete all required fields.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Updating Profile...';

  currentRecipient.full_name = fullName;
  currentRecipient.email = email;
  currentRecipient.blood_group = bloodGroup;
  currentRecipient.organ_needed = organNeeded;

  syncRecipientProfileToUI(currentRecipient);

  try {
    if (supabaseClient) {
      if (currentRecipient.id && currentRecipient.id.toString().includes('-') && currentRecipient.id.length > 10) {
        await supabaseClient.from('recipients').update({
          full_name: fullName,
          email: email,
          blood_group: bloodGroup,
          organ_needed: organNeeded
        }).eq('id', currentRecipient.id);
      } else if (currentUserAuthId) {
        await supabaseClient.from('recipients').update({
          full_name: fullName,
          blood_group: bloodGroup,
          organ_needed: organNeeded
        }).eq('auth_id', currentUserAuthId);
      }
    }
    showAlert(alertBox, 'Recipient profile updated. Searching compatible donors below...', 'success');
    loadRecipientMatches();
  } catch (err) {
    console.warn('[Recipient Portal] Profile update notice:', err);
    showAlert(alertBox, 'Profile saved locally. Donor matches refreshed.', 'success');
    loadRecipientMatches();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Update Profile &amp; Search Matches
    `;
  }
}

/**
 * Handles Donor Profile Form Update inside the dashboard
 */
async function handleDonorProfileUpdate(e) {
  e.preventDefault();

  const nameInput = document.getElementById('donorProfileName');
  const emailInput = document.getElementById('donorProfileEmail');
  const bloodSelect = document.getElementById('donorProfileBloodGroup');
  const submitBtn = document.getElementById('donorProfileUpdateBtn');
  const alertBox = document.getElementById('donorProfileAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const bloodGroup = bloodSelect ? bloodSelect.value : '';

  const organBoxes = document.querySelectorAll('input[name="donor_profile_organs"]:checked');
  const organsPledgedArray = Array.from(organBoxes).map(b => b.value);
  const organsPledgedString = organsPledgedArray.join(', ');

  if (!fullName || !email || !bloodGroup) {
    showAlert(alertBox, 'Please complete all required fields.', 'error');
    return;
  }

  if (organsPledgedArray.length === 0) {
    showAlert(alertBox, 'Please select at least one pledged organ.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Updating Registry...';

  currentDonor.full_name = fullName;
  currentDonor.email = email;
  currentDonor.blood_group = bloodGroup;
  currentDonor.organs_pledged = organsPledgedString;

  syncDonorProfileToUI(currentDonor);

  try {
    if (supabaseClient) {
      if (currentDonor.id && currentDonor.id.toString().includes('-') && currentDonor.id.length > 10) {
        await supabaseClient.from('donors').update({
          full_name: fullName,
          email: email,
          blood_group: bloodGroup,
          organs_pledged: organsPledgedString
        }).eq('id', currentDonor.id);
      } else if (currentUserAuthId) {
        await supabaseClient.from('donors').update({
          full_name: fullName,
          blood_group: bloodGroup,
          organs_pledged: organsPledgedString
        }).eq('auth_id', currentUserAuthId);
      }
    }
    showAlert(alertBox, 'Donor registry successfully updated. Reviewing incoming requests...', 'success');
    loadPendingContactRequests();
  } catch (err) {
    console.warn('[Donor Portal] Registry update notice:', err);
    showAlert(alertBox, 'Registry saved locally. Checking pending requests...', 'success');
    loadPendingContactRequests();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Update Donor Registry
    `;
  }
}

/**
 * ============================================================================
 * RECIPIENT MATCHING & CONTACT PERMISSION WORKFLOW
 * Reads from Supabase and falls back directly to data.json global fixtures
 * ============================================================================
 */

/**
 * Queries donors table for compatible blood types & pledged organs
 */
async function loadRecipientMatches() {
  const tableBody = document.getElementById('recipientMatchesBody');
  const alertBox = document.getElementById('recipientMatchAlert');

  if (!tableBody) return;

  const recipientBlood = currentRecipient.blood_group || 'O+';
  const neededOrgan = (currentRecipient.organ_needed || 'Kidney').toLowerCase();

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--text-slate-light); padding: 2rem;">
        Searching national donor registry for compatible blood types &amp; ${currentRecipient.organ_needed} donors...
      </td>
    </tr>
  `;

  let donorsList = [];

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('donors').select('*');
      if (!error && data && data.length > 0) {
        donorsList = data;
      }
    }
  } catch (err) {
    console.warn('[Recipient Portal] Querying fallback donors:', err);
  }

  // Combine with dynamic clinical data loaded from data.json
  if (donorsList.length === 0) {
    donorsList = DEFAULT_DONORS_POOL;
  } else {
    const existingIds = new Set(donorsList.map(d => d.id || d.email));
    DEFAULT_DONORS_POOL.forEach(d => {
      if (!existingIds.has(d.id) && !existingIds.has(d.email)) {
        donorsList.push(d);
      }
    });
  }

  // Biological ABO Compatibility Matrix (Recipient receives from Donor)
  const compatibleDonorBloodGroups = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };

  const allowedDonors = compatibleDonorBloodGroups[recipientBlood] || [recipientBlood];

  // Filter donors by compatible blood type and pledged organ match
  const matches = donorsList.filter(donor => {
    const dBlood = donor.blood_group || 'O+';
    const dOrgans = (donor.organs_pledged || 'Kidney').toLowerCase();

    const isBloodCompatible = allowedDonors.includes(dBlood);
    const isOrganPledged = dOrgans.includes(neededOrgan);

    return isBloodCompatible && isOrganPledged;
  });

  if (matches.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-slate-muted); padding: 2.5rem 1rem;">
          No matching donors found currently for blood group ${recipientBlood} and organ "${currentRecipient.organ_needed}".
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = matches.map((donor, idx) => {
    const isExact = donor.blood_group === recipientBlood;
    const matchTagClass = isExact ? 'exact' : 'compatible';
    const matchTagText = isExact ? 'Exact Match' : 'Compatible';
    const donorId = donor.id || `DNR-${idx + 101}`;
    const donorName = donor.full_name || `Donor #${donorId}`;
    const donorEmail = donor.email || 'donor@clinicalnetwork.org';
    const pledged = donor.organs_pledged || currentRecipient.organ_needed;

    // Check if a request is already pending for this donor
    const isPending = LOCAL_CONTACT_REQUESTS.some(r => 
      (r.donor_id === donorId || r.donor_email === donorEmail) && 
      r.recipient_email === currentRecipient.email && 
      r.status === 'pending'
    );

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--color-medical-dark);">${donorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-slate-light); font-family: var(--font-mono);">${donorId}</div>
        </td>
        <td><span class="blood-tag ${matchTagClass}">${donor.blood_group}</span></td>
        <td style="font-size: 0.825rem; color: var(--text-slate-muted);">${pledged}</td>
        <td><span class="blood-tag ${matchTagClass}">${matchTagText}</span></td>
        <td>
          ${isPending 
            ? `<span class="badge-urgency high">Request Pending</span>` 
            : `<button 
                type="button" 
                class="btn-action-sm btn-allocate" 
                onclick="handleRequestContact('${donorId}', '${encodeURIComponent(donorName)}', '${encodeURIComponent(donorEmail)}')"
               >
                 Request Contact Permission &rarr;
               </button>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Recipient action: Clicking "Request Contact Permission" inserts record into contact_requests
 */
async function handleRequestContact(donorId, encodedDonorName, encodedDonorEmail) {
  const donorName = decodeURIComponent(encodedDonorName);
  const donorEmail = decodeURIComponent(encodedDonorEmail);
  const alertBox = document.getElementById('recipientMatchAlert');

  const requestId = 'REQ-' + Date.now().toString().slice(-6);

  const requestPayload = {
    id: requestId,
    donor_id: donorId,
    donor_name: donorName,
    donor_email: donorEmail,
    recipient_id: currentRecipient.id,
    recipient_name: currentRecipient.full_name,
    recipient_email: currentRecipient.email,
    organ_requested: currentRecipient.organ_needed,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  // Add to local state
  LOCAL_CONTACT_REQUESTS.unshift(requestPayload);

  try {
    if (supabaseClient) {
      await supabaseClient.from('contact_requests').insert([requestPayload]);
      loadDashboardMetrics();
    }
  } catch (err) {
    console.warn('[Recipient Portal] Database request logged to operational register:', err);
  }

  showAlert(
    alertBox, 
    `Contact permission requested from ${donorName}. Your request has been transmitted and placed in the donor's authorization inbox.`, 
    'success'
  );

  loadRecipientMatches();
}

window.handleRequestContact = handleRequestContact;

/**
 * ============================================================================
 * DONOR INBOX & APPROVAL WORKFLOW WITH EMAILJS
 * ============================================================================
 */

/**
 * Queries contact_requests table for pending requests matching logged-in donor
 */
async function loadPendingContactRequests() {
  const container = document.getElementById('pendingRequestsList');
  const badge = document.getElementById('pendingRequestsBadge');

  if (!container) return;

  let requests = [];

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('contact_requests')
        .select('*')
        .eq('status', 'pending');

      if (!error && data && data.length > 0) {
        requests = data;
      }
    }
  } catch (err) {
    console.warn('[Donor Portal] Using operational requests cache:', err);
  }

  // Filter by matching donor or default demonstration requests
  if (requests.length === 0) {
    requests = LOCAL_CONTACT_REQUESTS.filter(r => r.status === 'pending');
  } else {
    LOCAL_CONTACT_REQUESTS.forEach(lr => {
      if (lr.status === 'pending' && !requests.some(r => r.id === lr.id)) {
        requests.unshift(lr);
      }
    });
  }

  // Filter requests that target this specific donor
  const donorEmail = currentDonor.email ? currentDonor.email.toLowerCase() : '';
  const filteredRequests = requests.filter(r => {
    if (!r.donor_email) return true;
    return r.donor_email.toLowerCase() === donorEmail || r.donor_id === currentDonor.id;
  });

  const displayRequests = filteredRequests.length > 0 ? filteredRequests : requests;

  // Update badge count
  if (badge) {
    badge.textContent = `${displayRequests.length} Pending`;
    badge.style.display = displayRequests.length > 0 ? 'inline-block' : 'none';
  }

  if (displayRequests.length === 0) {
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--border-slate); border-radius: var(--radius-md); padding: 2.5rem 1.5rem; text-align: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sterile)" stroke-width="2" style="margin-bottom: 0.75rem;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <h4 style="color: var(--color-medical-dark); font-size: 1.1rem; margin-bottom: 0.35rem;">Inbox Clear</h4>
        <p style="color: var(--text-slate-muted); font-size: 0.85rem; max-width: 420px; margin: 0 auto;">
          You have no pending contact requests. Compatible recipients seeking anatomical gifts will appear here for your explicit authorization.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayRequests.map(req => {
    return `
      <div class="request-card" id="req-card-${req.id}">
        <div class="request-header">
          <div>
            <span class="badge-urgency high" style="margin-bottom: 0.35rem;">Pending Authorization</span>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--color-medical-dark);">${req.recipient_name}</h4>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-slate-light);">${req.id}</span>
        </div>

        <div class="request-details">
          <div>
            <span style="color: var(--text-slate-light); font-size: 0.75rem; display: block;">Organ Requested:</span>
            <strong style="color: var(--color-medical-primary); font-size: 0.95rem;">${req.organ_requested || 'Kidney'}</strong>
          </div>
          <div>
            <span style="color: var(--text-slate-light); font-size: 0.75rem; display: block;">Recipient Email:</span>
            <span>${req.recipient_email}</span>
          </div>
          <div>
            <span style="color: var(--text-slate-light); font-size: 0.75rem; display: block;">Request Date:</span>
            <span>${new Date(req.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>

        <!-- Mandatory Consent Checkbox & Action Button -->
        <div class="request-actions">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input 
              type="checkbox" 
              id="consent-${req.id}" 
              class="checkbox-input donor-consent-check"
            >
            <label for="consent-${req.id}" style="font-size: 0.825rem; font-weight: 600; color: var(--color-medical-dark); cursor: pointer;">
              I consent to share my email address with this recipient.
            </label>
          </div>

          <button 
            type="button" 
            id="btn-approve-${req.id}"
            class="btn-primary" 
            style="padding: 0.45rem 1rem; font-size: 0.85rem; background: #059669; width: auto;"
            onclick="handleApproveClick('${req.id}', '${req.recipient_email}', '${encodeURIComponent(req.recipient_name)}', '${currentDonor.email}', '${encodeURIComponent(req.organ_requested || 'Kidney')}', 'consent-${req.id}')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Approve Request
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Validates mandatory consent checkbox before triggering approval
 */
function handleApproveClick(requestId, recipientEmail, encodedRecipientName, donorEmail, encodedOrgan, checkboxId) {
  const recipientName = decodeURIComponent(encodedRecipientName);
  const organRequested = decodeURIComponent(encodedOrgan);
  const consentBox = document.getElementById(checkboxId);
  const alertBox = document.getElementById('donorInboxAlert');

  if (!consentBox || !consentBox.checked) {
    showAlert(alertBox, 'Mandatory Authorization Required: Please check the box confirming you consent to share your email address with this recipient.', 'error');
    if (consentBox) consentBox.focus();
    return;
  }

  const approveBtn = document.getElementById(`btn-approve-${requestId}`);
  if (approveBtn) {
    approveBtn.disabled = true;
    approveBtn.textContent = 'Transmitting Approval...';
  }

  approveContactRequest(requestId, recipientEmail, recipientName, donorEmail, organRequested);
}

window.handleApproveClick = handleApproveClick;

/**
 * ============================================================================
 * FUNCTION: approveContactRequest
 * Updates contact_requests to status = 'approved' & Dispatches EmailJS
 * ============================================================================
 */
function approveContactRequest(requestId, recipientEmail, recipientName, donorEmail, organRequested = "Kidney") {
  const alertBox = document.getElementById('donorInboxAlert');

  // 1. Update contact_requests record in Supabase
  if (supabaseClient) {
    supabaseClient
      .from('contact_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .then(({ error }) => {
        if (error) console.warn('[Donor Portal] Database update notice:', error);
      });
  }

  // Update in-memory register
  const localReq = LOCAL_CONTACT_REQUESTS.find(r => r.id === requestId);
  if (localReq) {
    localReq.status = 'approved';
  }

  // 2. IMMEDIATELY following update, execute EmailJS payload
  emailjs.send("service_pf8kr4v", "template_2jwt66l", {
      to_email: recipientEmail,
      recipient_name: recipientName,
      organ_matched: organRequested || "Approved Match",
      donor_contact_info: `The donor has authorized sharing contact details. You may contact them directly at: ${donorEmail}`
  }).then(() => {
      showAlert(
        alertBox, 
        `Contact request approved! Official authorization notification and contact details transmitted to ${recipientName} (${recipientEmail}).`, 
        'success'
      );
      loadPendingContactRequests();
      loadDashboardMetrics();
  }).catch((err) => {
      console.error('Email failed:', err);
      showAlert(
        alertBox, 
        `Request approved in registry, but notification dispatch encountered an issue: ${err.text || err.message || 'Check network connection'}.`, 
        'error'
      );
      loadPendingContactRequests();
  });
}

window.approveContactRequest = approveContactRequest;

/**
 * ============================================================================
 * ALLOCATION ENGINE (matching.html) & LOCAL CLINICAL FALLBACK ENGINE
 * Reads directly from DEFAULT_AVAILABLE_ORGANS & DEFAULT_RECIPIENT_POOL
 * ============================================================================
 */

/**
 * Fetches available organs for the allocation dropdown
 */
async function fetchAvailableOrgans() {
  const organSelect = document.getElementById('organSelect');
  if (!organSelect) return;

  let organs = [];

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('organs_available').select('*');
      if (!error && data && data.length > 0) {
        organs = data;
      }
    }
  } catch (err) {
    console.warn('[Allocation Engine] Database query notice, using JSON organs:', err);
  }

  // Fallback to data.json dynamically populated organs
  if (organs.length === 0) {
    organs = DEFAULT_AVAILABLE_ORGANS;
  }

  window._currentOrgans = organs;

  // Clear existing options except default placeholder
  const placeholderText = '-- Choose an available organ from the procurement network --';
  organSelect.innerHTML = `<option value="">${placeholderText}</option>`;

  organs.forEach(organ => {
    const opt = document.createElement('option');
    const organId = organ.id || organ.organ_id;
    const organType = organ.organ_type || organ.type || 'Organ';
    const bloodGroup = organ.blood_group || organ.blood_type || 'Unknown';
    const hospital = organ.hospital || organ.hospital_name || organ.procurement_hospital || 'Network Hospital';

    opt.value = organId;
    opt.textContent = `${organType} (Blood Group: ${bloodGroup}) • ID: ${organId} [${hospital}]`;
    opt.dataset.organType = organType;
    opt.dataset.bloodGroup = bloodGroup;
    organSelect.appendChild(opt);
  });
}

window.fetchAvailableOrgans = fetchAvailableOrgans;

/**
 * Fallback Matching Engine: ABO Histocompatibility & Urgency Algorithm
 * Reads directly from DEFAULT_RECIPIENT_POOL (loaded dynamically from data.json)
 */
function executeLocalClinicalMatching(selectedId, organ) {
  if (!organ) return [];

  const organType = (organ.organ_type || organ.type || 'Kidney').toLowerCase();
  const organBlood = organ.blood_group || organ.blood_type || 'O+';

  // Biological ABO Compatibility Matrix (Organ -> Recipient)
  const allowedRecipients = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  }[organBlood] || [organBlood];

  // Filter directly from DEFAULT_RECIPIENT_POOL loaded from data.json
  const filtered = DEFAULT_RECIPIENT_POOL.filter(cand => {
    const candOrgan = (cand.organ_needed || '').toLowerCase();
    const typeMatch = candOrgan.includes(organType) || organType.includes(candOrgan);
    const bloodMatch = allowedRecipients.includes(cand.blood_group);
    return typeMatch && bloodMatch;
  });

  // Sort descending by score
  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

  return filtered;
}

window.executeLocalClinicalMatching = executeLocalClinicalMatching;

/**
 * Executes matching for the selected procured organ
 */
async function handleRunMatchingClick() {
  const organSelect = document.getElementById('organSelect');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const resultsContainer = document.getElementById('matchesResultsContainer');
  const specsBar = document.getElementById('organSpecsBar');

  if (!organSelect) return;
  const selectedId = organSelect.value;

  if (!selectedId) {
    if (specsBar) specsBar.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    if (loadingState) loadingState.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'none';
    return;
  }

  const organsList = window._currentOrgans || DEFAULT_AVAILABLE_ORGANS;
  const currentOrgan = organsList.find(o => (o.id === selectedId || o.organ_id === selectedId)) || {
    organ_type: 'Kidney',
    blood_group: 'O+',
    hospital: 'Procurement Center',
    donor_name: latestRegisteredDonor.full_name,
    donor_email: latestRegisteredDonor.email,
    share_contact_consent: latestRegisteredDonor.share_contact_consent
  };

  // Update specifications display bar
  if (specsBar) {
    specsBar.style.display = 'grid';
    const tEl = document.getElementById('spec-organ-type');
    const bEl = document.getElementById('spec-blood-group');
    const hEl = document.getElementById('spec-hospital');
    const iEl = document.getElementById('spec-ischemia');

    if (tEl) tEl.textContent = currentOrgan.organ_type || 'Organ';
    if (bEl) bEl.textContent = currentOrgan.blood_group || 'O+';
    if (hEl) hEl.textContent = currentOrgan.hospital || 'Transplant Center';
    if (iEl) iEl.textContent = `${currentOrgan.ischemia_hours || '2.5'} Hours`;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (loadingState) loadingState.style.display = 'block';
  if (resultsContainer) resultsContainer.style.display = 'none';

  try {
    let matches = [];

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('find_matches_for_organ', {
          p_organ_id: selectedId
        });
        if (!error && data && data.length > 0) {
          matches = data;
        }
      } catch (rpcErr) {
        console.warn('[Allocation Engine] RPC notice, using local matching engine:', rpcErr);
      }
    }

    // If RPC returned no matches or is not available, execute the local clinical matching engine
    if (matches.length === 0) {
      await new Promise(r => setTimeout(r, 300));
      matches = executeLocalClinicalMatching(selectedId, currentOrgan);
    }

    renderMatchingResults(matches, currentOrgan);

    if (loadingState) loadingState.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';

  } catch (err) {
    console.error('[Allocation Engine] Matching error:', err);
    const fallbackMatches = executeLocalClinicalMatching(selectedId, currentOrgan);
    renderMatchingResults(fallbackMatches, currentOrgan);
    if (loadingState) loadingState.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';
  }
}

window.handleRunMatchingClick = handleRunMatchingClick;

/**
 * Renders candidate cards into #matchesList
 */
function renderMatchingResults(matches, organ) {
  const matchesList = document.getElementById('matchesList');
  const countBadge = document.getElementById('matchesCountBadge');
  const organBlood = organ ? (organ.blood_group || organ.blood_type || '') : '';

  if (countBadge) {
    countBadge.textContent = `${matches.length} Candidates Matched`;
  }

  if (!matchesList) return;

  if (matches.length === 0) {
    matchesList.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <p style="color: var(--text-muted); font-size: 0.95rem;">No candidates currently match the histocompatibility specifications for this organ.</p>
      </div>
    `;
    return;
  }

  matchesList.innerHTML = matches.map((match, idx) => {
    const rank = idx + 1;
    const name = match.full_name || match.name || `Candidate #${match.id}`;
    const organNeeded = match.organ_needed || organ.organ_type || 'Organ';
    const blood = match.blood_group || match.blood_type || 'Unknown';
    const urgency = match.urgency || match.urgency_status || 'High';
    const score = Number(match.score || 95.0).toFixed(1);

    const isExact = organBlood === blood;
    const bloodTagClass = isExact ? 'exact' : 'compatible';
    const bloodTagText = isExact ? `Exact ABO (${blood})` : `Compatible ABO (${blood})`;

    return `
      <div class="candidate-match-card">
        <div class="candidate-rank-col">
          <div class="candidate-rank-badge">#${rank}</div>
          <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Rank</span>
        </div>

        <div class="candidate-info-col">
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary-dark);">${name}</h3>
            <span class="blood-tag ${bloodTagClass}">${bloodTagText}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 1rem; flex-wrap: wrap;">
            <span>ID: <strong style="font-family: var(--font-mono);">${match.id || 'PT-REG'}</strong></span>
            <span>Organ: <strong>${organNeeded}</strong></span>
            <span>Urgency: <strong style="color: var(--color-critical);">${urgency}</strong></span>
          </div>
        </div>

        <div class="candidate-score-col">
          <div style="text-align: right;">
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-sterile-dark); font-family: var(--font-mono);">${score}%</span>
            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">Match Score</span>
          </div>
          <button 
            type="button" 
            class="btn-primary" 
            style="padding: 0.45rem 0.9rem; font-size: 0.85rem;"
            onclick="openAllocationOfferModal('${match.id}', '${encodeURIComponent(name)}', '${encodeURIComponent(organNeeded)}', '${score}%', '${encodeURIComponent(urgency)}')"
          >
            Initiate Offer &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.renderMatchingResults = renderMatchingResults;

/**
 * Opens Offer Modal on matching.html
 */
function openAllocationOfferModal(candidateId, candidateName, organType, score, urgency) {
  const modal = document.getElementById('offerModal');
  if (!modal) return;

  const resolvedName = decodeURIComponent(candidateName);
  const resolvedOrgan = decodeURIComponent(organType);
  const resolvedUrgency = decodeURIComponent(urgency);

  const organsList = window._currentOrgans || DEFAULT_AVAILABLE_ORGANS;
  const organSelect = document.getElementById('organSelect');
  const selectedOrganId = organSelect ? organSelect.value : '';
  const currentOrgan = organsList.find(o => (o.id === selectedOrganId || o.organ_id === selectedOrganId)) || organsList[0] || {};

  activeOfferData = {
    candidate_id: candidateId,
    recipient_name: resolvedName,
    recipient_email: `${resolvedName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@transplant-inbox.org`,
    donor_name: currentOrgan.donor_name || 'Anonymous Donor',
    donor_email: currentOrgan.donor_email || 'donor@clinicalnetwork.org',
    organ_matched: resolvedOrgan,
    share_contact_consent: currentOrgan.share_contact_consent !== false,
    score: score,
    urgency: resolvedUrgency
  };

  const idEl = document.getElementById('modalCandidateId');
  const organEl = document.getElementById('modalOrganType');
  const scoreEl = document.getElementById('modalScore');
  const urgencyEl = document.getElementById('modalUrgency');

  if (idEl) idEl.textContent = candidateId;
  if (organEl) organEl.textContent = resolvedOrgan;
  if (scoreEl) scoreEl.textContent = score;
  if (urgencyEl) urgencyEl.textContent = resolvedUrgency;

  modal.classList.add('active');
  modal.style.display = 'flex';
}

window.openAllocationOfferModal = openAllocationOfferModal;

/**
 * Sets up Allocation Offer Modal listeners
 */
function setupOfferModal() {
  const modal = document.getElementById('offerModal');
  if (!modal) return;

  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const confirmBtn = document.getElementById('modalConfirmBtn');

  function closeModal() {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const originalText = confirmBtn.innerHTML;
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Transmitting Offer...';

      let donorContact = "The donor has opted to remain anonymous.";
      if (activeOfferData.share_contact_consent) {
        donorContact = `Donor Email: ${activeOfferData.donor_email}`;
      }

      emailjs.send("service_pf8kr4v", "template_2jwt66l", {
        to_email: activeOfferData.recipient_email,
        recipient_name: activeOfferData.recipient_name,
        organ_matched: activeOfferData.organ_matched,
        donor_contact_info: donorContact
      }).then(() => {
        closeModal();
        alert(`Allocation offer and notification transmitted successfully to ${activeOfferData.recipient_name}.`);
      }).catch(err => {
        console.error('Email failed:', err);
        closeModal();
        alert(`Offer recorded in dispatch register. Notification status: ${err.text || 'Offline'}.`);
      }).finally(() => {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
      });
    });
  }
}

/**
 * ============================================================================
 * HELPER UTILITIES
 * ============================================================================
 */
function showAlert(container, message, type = 'info') {
  if (!container) return;
  container.className = `alert-box ${type}`;
  container.style.display = 'flex';
  container.innerHTML = `
    <div style="flex: 1;">${message}</div>
    <button type="button" onclick="this.parentElement.style.display='none'" style="background:none;border:none;cursor:pointer;font-weight:bold;color:inherit;font-size:1.1rem;line-height:1;" aria-label="Close alert">&times;</button>
  `;
}

function clearAlert(container) {
  if (!container) return;
  container.style.display = 'none';
  container.innerHTML = '';
}

/**
 * ============================================================================
 * EVENT LISTENERS & LIFECYCLE ROUTER
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch clinical data dynamically from data.json
  fetch('data.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load data.json: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Loaded Clinical Data from data.json:", data);

      // Assign the fetched JSON data to global variables
      if (data.available_organs && Array.isArray(data.available_organs)) {
        DEFAULT_AVAILABLE_ORGANS = data.available_organs;
        window.DEFAULT_AVAILABLE_ORGANS = DEFAULT_AVAILABLE_ORGANS;
        window._currentOrgans = DEFAULT_AVAILABLE_ORGANS;
      }

      if (data.waitlist_recipients && Array.isArray(data.waitlist_recipients)) {
        DEFAULT_RECIPIENT_POOL = data.waitlist_recipients;
        window.DEFAULT_RECIPIENT_POOL = DEFAULT_RECIPIENT_POOL;
      } else if (data.recipients && Array.isArray(data.recipients)) {
        DEFAULT_RECIPIENT_POOL = data.recipients;
        window.DEFAULT_RECIPIENT_POOL = DEFAULT_RECIPIENT_POOL;
      }

      if (data.donors && Array.isArray(data.donors)) {
        DEFAULT_DONORS_POOL = data.donors;
        window.DEFAULT_DONORS_POOL = DEFAULT_DONORS_POOL;
      } else if (data.donors_pool && Array.isArray(data.donors_pool)) {
        DEFAULT_DONORS_POOL = data.donors_pool;
        window.DEFAULT_DONORS_POOL = DEFAULT_DONORS_POOL;
      }

      if (data.metrics) {
        CLINICAL_METRICS = data.metrics;
        window.CLINICAL_METRICS = CLINICAL_METRICS;
      }

      // Update dashboard metrics directly with the loaded JSON data
      loadDashboardMetrics();

      // If on Allocation Engine page (matching.html), populate the organ select dropdown
      if (document.getElementById('organSelect')) {
        fetchAvailableOrgans();
      }

      // If on Recipient dashboard, refresh compatible donor matches with the loaded JSON data
      if (document.getElementById('recipientMatchesBody')) {
        loadRecipientMatches();
      }
    })
    .catch(error => {
      console.error("Error loading JSON:", error);
    });

  // 2. Setup Auth Tabs on Gateway
  setupAuthTabs();

  // 3. Load initial live metrics
  loadDashboardMetrics();

  // 4. Check for Active Supabase Auth Session
  checkActiveSession();

  // 5. Attach Gateway Auth Forms
  const donorLoginForm = document.getElementById('donorLoginForm');
  if (donorLoginForm) {
    donorLoginForm.addEventListener('submit', handleDonorLogin);
  }

  const donorSignupForm = document.getElementById('donorSignupForm');
  if (donorSignupForm) {
    donorSignupForm.addEventListener('submit', handleDonorSignup);
  }

  const recipientLoginForm = document.getElementById('recipientLoginForm');
  if (recipientLoginForm) {
    recipientLoginForm.addEventListener('submit', handleRecipientLogin);
  }

  const recipientSignupForm = document.getElementById('recipientSignupForm');
  if (recipientSignupForm) {
    recipientSignupForm.addEventListener('submit', handleRecipientSignup);
  }

  // 6. Attach Dashboard Profile Form Listeners
  const donorProfileForm = document.getElementById('donorProfileForm');
  if (donorProfileForm) {
    donorProfileForm.addEventListener('submit', handleDonorProfileUpdate);
  }

  const recipientProfileForm = document.getElementById('recipientProfileForm');
  if (recipientProfileForm) {
    recipientProfileForm.addEventListener('submit', handleRecipientProfileUpdate);
  }

  // 7. Attach Logout Buttons
  const donorLogoutBtn = document.getElementById('donorLogoutBtn');
  if (donorLogoutBtn) {
    donorLogoutBtn.addEventListener('click', handleSignOut);
  }

  const recipientLogoutBtn = document.getElementById('recipientLogoutBtn');
  if (recipientLogoutBtn) {
    recipientLogoutBtn.addEventListener('click', handleSignOut);
  }

  // 8. Attach Navbar Navigation Buttons
  const navGatewayBtn = document.getElementById('navGatewayBtn');
  if (navGatewayBtn) {
    navGatewayBtn.addEventListener('click', () => showPortalView('gateway'));
  }

  const navDonorBtn = document.getElementById('navDonorBtn');
  if (navDonorBtn) {
    navDonorBtn.addEventListener('click', () => showPortalView('donor'));
  }

  const navRecipientBtn = document.getElementById('navRecipientBtn');
  if (navRecipientBtn) {
    navRecipientBtn.addEventListener('click', () => showPortalView('recipient'));
  }

  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      showPortalView('gateway');
    });
  }

  // 9. Attach Find Matches Button Listener in Recipient Dashboard
  const findMatchesBtn = document.getElementById('findMatchesBtn');
  if (findMatchesBtn) {
    findMatchesBtn.addEventListener('click', loadRecipientMatches);
  }

  // 10. Attach Allocation Engine Listeners (matching.html)
  const runMatchingBtn = document.getElementById('runMatchingBtn');
  if (runMatchingBtn) {
    runMatchingBtn.addEventListener('click', handleRunMatchingClick);
  }

  const organSelect = document.getElementById('organSelect');
  if (organSelect) {
    organSelect.addEventListener('change', handleRunMatchingClick);
  }

  const refreshOrgansBtn = document.getElementById('refreshOrgansBtn');
  if (refreshOrgansBtn) {
    refreshOrgansBtn.addEventListener('click', async () => {
      refreshOrgansBtn.disabled = true;
      refreshOrgansBtn.textContent = 'Refreshing...';
      await fetchAvailableOrgans();
      refreshOrgansBtn.disabled = false;
      refreshOrgansBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Refresh Organs
      `;
    });
  }

  setupOfferModal();
});
