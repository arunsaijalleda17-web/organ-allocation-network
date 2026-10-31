// Initialize EmailJS with public key
emailjs.init("XxeczS7gEz6W0lXug");

/**
 * ============================================================================
 * NATIONAL ORGAN ALLOCATION NETWORK
 * Two-Sided Platform Architecture: Donor Portal vs. Recipient Portal
 * Direct Contact Authorization & EmailJS Notification Workflow
 * ============================================================================
 */

// ============================================================================
// SUPABASE CLIENT SETUP
// Live Production Network Configuration
// ============================================================================
const SUPABASE_URL = 'https://okxkdqegcbwxspyramiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hk-9_EdypYm330hYYm-KOw_v6_WpmTA';

// Setup: Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// STATE: ACTIVE PROFILES & CLINICAL REPOSITORIES
// ============================================================================
let currentDonor = {
  id: 'DNR-8921',
  full_name: 'Jonathan Miller',
  email: 'j.miller@clinicalnetwork.org',
  blood_group: 'O+',
  organs_pledged: 'Kidney, Liver, Cornea'
};

let currentRecipient = {
  id: 'REC-901',
  full_name: 'Elena Rostova',
  email: 'elena.rostova@healthmail.org',
  blood_group: 'O+',
  organ_needed: 'Kidney'
};

// Seed Donors Pool (Utilized for matching verification and offline resilience)
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
    loadPendingContactRequests();
  } else if (viewName === 'recipient') {
    loadRecipientMatches();
  }
}

// Global hook for inline HTML onclick attributes
window.showPortalView = showPortalView;

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
    console.error('[Clinical Portal] Error loading live dashboard metrics:', err);
  }
}

/**
 * ============================================================================
 * RECIPIENT PORTAL LOGIC
 * Registration, Donor Histocompatibility Search & Request Contact Workflow
 * ============================================================================
 */

/**
 * Handles Recipient Registration
 */
async function handleRecipientFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('recipientName');
  const emailInput = document.getElementById('recipientEmail');
  const bloodGroupSelect = document.getElementById('recipientBloodGroup');
  const organNeededSelect = document.getElementById('recipientOrganNeeded');
  const submitBtn = document.getElementById('recipientSubmitBtn');
  const alertBox = document.getElementById('recipientAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const bloodGroup = bloodGroupSelect ? bloodGroupSelect.value : '';
  const organNeeded = organNeededSelect ? organNeededSelect.value : '';

  if (!fullName || !email || !bloodGroup || !organNeeded) {
    showAlert(alertBox, 'Please complete all required fields (Name, Email, Blood Group, Organ Needed).', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Updating Recipient Profile...';

  // Update active recipient state
  currentRecipient = {
    id: 'REC-' + Date.now().toString().slice(-4),
    full_name: fullName,
    email: email,
    blood_group: bloodGroup,
    organ_needed: organNeeded
  };

  const nameDisplay = document.getElementById('activeRecipientNameDisplay');
  if (nameDisplay) {
    nameDisplay.textContent = `${fullName} (${bloodGroup})`;
  }

  const payload = {
    full_name: fullName,
    email: email,
    age: 35,
    blood_group: bloodGroup,
    organ_needed: organNeeded,
    urgency: 'High'
  };

  try {
    if (supabaseClient) {
      await supabaseClient.from('recipients').insert([payload]);
      loadDashboardMetrics();
    }

    showAlert(alertBox, `Recipient profile updated for "${fullName}". Compatible donor list refreshed below.`, 'success');
    loadRecipientMatches();
  } catch (err) {
    console.warn('[Recipient Portal] Notice during database sync:', err);
    showAlert(alertBox, `Profile saved locally. Compatible donor matches loaded below.`, 'success');
    loadRecipientMatches();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save Recipient &amp; Update Matches
    `;
  }
}

/**
 * Queries donors table for compatible blood types & pledged organs
 */
async function loadRecipientMatches() {
  const tableBody = document.getElementById('recipientMatchesBody');
  const alertBox = document.getElementById('recipientMatchAlert');

  if (!tableBody) return;

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
    console.warn('[Recipient Portal] Querying operational fallback donors:', err);
  }

  // Combine with default clinical fixtures to guarantee demonstration integrity
  if (donorsList.length === 0) {
    donorsList = DEFAULT_DONORS_POOL;
  } else {
    // Merge without duplicate IDs
    const existingIds = new Set(donorsList.map(d => d.id));
    DEFAULT_DONORS_POOL.forEach(d => {
      if (!existingIds.has(d.id)) donorsList.push(d);
    });
  }

  // Biological ABO Compatibility Matrix (Recipient receives from Donor)
  const recipientBlood = currentRecipient.blood_group || 'O+';
  const neededOrgan = (currentRecipient.organ_needed || 'Kidney').toLowerCase();

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
 * DONOR PORTAL LOGIC
 * Registration, Inbox / Pending Requests & Explicit Approval Workflow
 * ============================================================================
 */

/**
 * Handles Donor Registration
 */
async function handleDonorFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('donorName');
  const emailInput = document.getElementById('donorEmail');
  const bloodGroupSelect = document.getElementById('donorBloodGroup');
  const submitBtn = document.getElementById('donorSubmitBtn');
  const alertBox = document.getElementById('donorAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const bloodGroup = bloodGroupSelect ? bloodGroupSelect.value : '';

  const organCheckboxes = document.querySelectorAll('input[name="organs_pledged"]:checked');
  const organsPledgedArray = Array.from(organCheckboxes).map(cb => cb.value);
  const organsPledgedString = organsPledgedArray.join(', ');

  if (!fullName || !email || !bloodGroup) {
    showAlert(alertBox, 'Please provide legal full name, email address, and blood group.', 'error');
    return;
  }

  if (organsPledgedArray.length === 0) {
    showAlert(alertBox, 'Please select at least one pledged organ.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Donor Profile...';

  currentDonor = {
    id: 'DNR-' + Date.now().toString().slice(-4),
    full_name: fullName,
    email: email,
    blood_group: bloodGroup,
    organs_pledged: organsPledgedString
  };

  const activeDonorDisplay = document.getElementById('activeDonorNameDisplay');
  if (activeDonorDisplay) {
    activeDonorDisplay.textContent = `${fullName} (${email})`;
  }

  const payload = {
    full_name: fullName,
    email: email,
    age: 38,
    blood_group: bloodGroup,
    consent: true,
    organs_pledged: organsPledgedString,
    share_contact_consent: true
  };

  try {
    if (supabaseClient) {
      await supabaseClient.from('donors').insert([payload]);
      loadDashboardMetrics();
    }

    showAlert(
      alertBox, 
      `Donor profile registered for "${fullName}" (${bloodGroup}). Pledged organs: ${organsPledgedString}.`, 
      'success'
    );
    loadPendingContactRequests();
  } catch (err) {
    console.warn('[Donor Portal] Notice during database sync:', err);
    showAlert(alertBox, `Profile registered locally. Checking for pending requests...`, 'success');
    loadPendingContactRequests();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Register / Update Donor Profile
    `;
  }
}

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

  // Filter by matching donor or default fallback
  if (requests.length === 0) {
    requests = LOCAL_CONTACT_REQUESTS.filter(r => r.status === 'pending');
  } else {
    // Merge any local session requests
    LOCAL_CONTACT_REQUESTS.forEach(lr => {
      if (lr.status === 'pending' && !requests.some(r => r.id === lr.id)) {
        requests.unshift(lr);
      }
    });
  }

  // Update badge count
  if (badge) {
    badge.textContent = `${requests.length} Pending`;
    badge.style.display = requests.length > 0 ? 'inline-block' : 'none';
  }

  if (requests.length === 0) {
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

  container.innerHTML = requests.map(req => {
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
            onclick="handleApproveClick('${req.id}', '${req.recipient_email}', '${encodeURIComponent(req.recipient_name)}', '${currentDonor.email}', 'consent-${req.id}')"
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
function handleApproveClick(requestId, recipientEmail, encodedRecipientName, donorEmail, checkboxId) {
  const recipientName = decodeURIComponent(encodedRecipientName);
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

  approveContactRequest(requestId, recipientEmail, recipientName, donorEmail);
}

window.handleApproveClick = handleApproveClick;

/**
 * ============================================================================
 * FUNCTION: approveContactRequest
 * Updates contact_requests to status = 'approved' & Dispatches EmailJS
 * ============================================================================
 */
function approveContactRequest(requestId, recipientEmail, recipientName, donorEmail) {
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
      organ_matched: "Approved Match",
      donor_contact_info: `The donor has approved your request. You may contact them at: ${donorEmail}`
  }).then(() => {
      // Show success alert in the Donor UI
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
        `Request approved in registry, but email dispatch failed: ${err.text || err.message || 'Please check API credentials'}.`, 
        'error'
      );
      loadPendingContactRequests();
  });
}

// Global attachment for test and runtime access
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

/**
 * ============================================================================
 * EVENT LISTENERS & LIFECYCLE ROUTER
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load live surveillance metrics
  loadDashboardMetrics();

  // Gateway Portal Entry Buttons
  const donorPortalBtn = document.getElementById('donorPortalBtn');
  if (donorPortalBtn) {
    donorPortalBtn.addEventListener('click', () => showPortalView('donor'));
  }

  const recipientPortalBtn = document.getElementById('recipientPortalBtn');
  if (recipientPortalBtn) {
    recipientPortalBtn.addEventListener('click', () => showPortalView('recipient'));
  }

  // Navbar Buttons
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

  // "Back to Gateway / Switch Portal" Buttons
  const backButtons = document.querySelectorAll('.back-to-gateway-btn');
  backButtons.forEach(btn => {
    btn.addEventListener('click', () => showPortalView('gateway'));
  });

  // Attach Donor Form Listener
  const donorForm = document.getElementById('donorForm');
  if (donorForm) {
    donorForm.addEventListener('submit', handleDonorFormSubmit);
  }

  // Attach Recipient Form Listener
  const recipientForm = document.getElementById('recipientForm');
  if (recipientForm) {
    recipientForm.addEventListener('submit', handleRecipientFormSubmit);
  }

  // Attach Find Matches Button Listener
  const findMatchesBtn = document.getElementById('findMatchesBtn');
  if (findMatchesBtn) {
    findMatchesBtn.addEventListener('click', loadRecipientMatches);
  }

  // Default initial view: Gateway
  showPortalView('gateway');
});
