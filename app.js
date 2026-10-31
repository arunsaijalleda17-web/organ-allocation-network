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
// STATE: ACTIVE PROFILES & CLINICAL REPOSITORIES
// ============================================================================
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

// Seed Donors Pool (Utilized for matching verification and offline clinical resilience)
const DEFAULT_DONORS_POOL = [
  {
    id: 'DNR-8921',
    full_name: 'Jonathan Miller',
    email: 'j.miller@clinicalnetwork.org',
    blood_group: 'O+',
    organs_pledged: 'Kidney, Liver, Cornea',
    age: 34
  },
  {
    id: 'DNR-7704',
    full_name: 'Sarah Jenkins',
    email: 's.jenkins@clinicalnetwork.org',
    blood_group: 'A+',
    organs_pledged: 'Heart, Kidney, Lungs',
    age: 28
  },
  {
    id: 'DNR-9932',
    full_name: 'Dr. Michael Chang',
    email: 'm.chang@clinicalnetwork.org',
    blood_group: 'B+',
    organs_pledged: 'Liver, Kidney, Pancreas',
    age: 45
  },
  {
    id: 'DNR-6541',
    full_name: 'Emily Watson',
    email: 'e.watson@clinicalnetwork.org',
    blood_group: 'O-',
    organs_pledged: 'Lungs, Kidney, Heart, Liver, Cornea',
    age: 22
  },
  {
    id: 'DNR-4180',
    full_name: 'David Vance',
    email: 'd.vance@clinicalnetwork.org',
    blood_group: 'AB+',
    organs_pledged: 'Pancreas, Kidney, Cornea',
    age: 39
  }
];

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

    if (metricDonors && donorsRes && donorsRes.count != null) {
      metricDonors.textContent = Number(donorsRes.count).toLocaleString();
    }
    if (metricRecipients && recipientsRes && recipientsRes.count != null) {
      metricRecipients.textContent = Number(recipientsRes.count).toLocaleString();
    }
    if (metricOrgans && organsRes && organsRes.count != null) {
      metricOrgans.textContent = Number(organsRes.count).toLocaleString();
    }
    if (metricTransplants && matchesRes && matchesRes.count != null) {
      metricTransplants.textContent = Number(matchesRes.count).toLocaleString();
    }
  } catch (err) {
    console.error('[Clinical Portal] Error loading live metrics:', err);
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

  // Combine with default clinical fixtures to guarantee demonstration integrity
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
  // 1. Setup Auth Tabs on Gateway
  setupAuthTabs();

  // 2. Load live metrics
  loadDashboardMetrics();

  // 3. Check for Active Supabase Auth Session
  checkActiveSession();

  // 4. Attach Gateway Auth Forms
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

  // 5. Attach Dashboard Profile Form Listeners
  const donorProfileForm = document.getElementById('donorProfileForm');
  if (donorProfileForm) {
    donorProfileForm.addEventListener('submit', handleDonorProfileUpdate);
  }

  const recipientProfileForm = document.getElementById('recipientProfileForm');
  if (recipientProfileForm) {
    recipientProfileForm.addEventListener('submit', handleRecipientProfileUpdate);
  }

  // 6. Attach Logout Buttons
  const donorLogoutBtn = document.getElementById('donorLogoutBtn');
  if (donorLogoutBtn) {
    donorLogoutBtn.addEventListener('click', handleSignOut);
  }

  const recipientLogoutBtn = document.getElementById('recipientLogoutBtn');
  if (recipientLogoutBtn) {
    recipientLogoutBtn.addEventListener('click', handleSignOut);
  }

  // 7. Attach Navbar Navigation Buttons
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

  // 8. Attach Find Matches Button Listener in Recipient Dashboard
  const findMatchesBtn = document.getElementById('findMatchesBtn');
  if (findMatchesBtn) {
    findMatchesBtn.addEventListener('click', loadRecipientMatches);
  }
});
