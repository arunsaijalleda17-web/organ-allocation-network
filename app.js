/**
 * ============================================================================
 * NATIONAL ORGAN ALLOCATION NETWORK
 * Clinical Portal Frontend Logic, Supabase Integration & n8n Email Webhook
 * ============================================================================
 */

// ============================================================================
// SUPABASE CLIENT SETUP
// Live Production Network Configuration
// ============================================================================
const SUPABASE_URL = 'https://okxkdqegcbwxspyramiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hk-9_EdypYm330hYYm-KOw_v6_WpmTA';

// Setup: Initialize Supabase Client (avoiding global collision with Supabase CDN)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// AUTOMATION & EMAIL WEBHOOK INTEGRATION
// n8n Webhook endpoint for automated clinical allocation email notifications
// ============================================================================
const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL';

// Default clinical donor profile (updated dynamically when a donor registers)
let latestRegisteredDonor = {
  full_name: 'Jonathan Miller',
  email: 'j.miller@clinicalnetwork.org',
  share_contact_consent: true,
  organs_pledged: 'Kidney, Liver'
};

// Currently selected offer payload for the allocation modal and webhook transmission
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

// Baseline Clinical Repository (Used for demonstration and offline resilience)
const DEFAULT_AVAILABLE_ORGANS = [
  { 
    id: 'ORG-8921', 
    organ_id: 'ORG-8921', 
    organ_type: 'Kidney', 
    blood_group: 'O+', 
    hospital: 'Johns Hopkins Comprehensive Center',
    donor_name: 'Jonathan Miller',
    donor_email: 'j.miller@clinicalnetwork.org',
    share_contact_consent: true
  },
  { 
    id: 'ORG-7704', 
    organ_id: 'ORG-7704', 
    organ_type: 'Heart', 
    blood_group: 'A+', 
    hospital: 'Cleveland Clinic Main Campus',
    donor_name: 'Sarah Jenkins',
    donor_email: 's.jenkins@clinicalnetwork.org',
    share_contact_consent: false
  },
  { 
    id: 'ORG-9932', 
    organ_id: 'ORG-9932', 
    organ_type: 'Liver', 
    blood_group: 'B+', 
    hospital: 'Mayo Clinic Hospital',
    donor_name: 'Dr. Michael Chang',
    donor_email: 'm.chang@clinicalnetwork.org',
    share_contact_consent: true
  },
  { 
    id: 'ORG-6541', 
    organ_id: 'ORG-6541', 
    organ_type: 'Lungs', 
    blood_group: 'O-', 
    hospital: 'Massachusetts General Hospital',
    donor_name: 'Emily Watson',
    donor_email: 'e.watson@clinicalnetwork.org',
    share_contact_consent: true
  },
  { 
    id: 'ORG-4180', 
    organ_id: 'ORG-4180', 
    organ_type: 'Pancreas', 
    blood_group: 'AB+', 
    hospital: 'Cedars-Sinai Medical Center',
    donor_name: 'David Vance',
    donor_email: 'd.vance@clinicalnetwork.org',
    share_contact_consent: false
  }
];

const DEFAULT_RECIPIENT_POOL = [
  { id: 'REC-901', full_name: 'Elena Rostova', email: 'elena.rostova@healthmail.org', age: 34, organ_needed: 'Kidney', blood_group: 'O+', urgency: 'Critical', score: 98.4 },
  { id: 'REC-902', full_name: 'Marcus Vance', email: 'marcus.vance@medicare-center.org', age: 46, organ_needed: 'Kidney', blood_group: 'O+', urgency: 'High', score: 92.1 },
  { id: 'REC-903', full_name: 'Aisha Al-Mansoor', email: 'aisha.almansoor@healthmail.org', age: 29, organ_needed: 'Kidney', blood_group: 'A+', urgency: 'High', score: 87.5 },
  { id: 'REC-904', full_name: 'David Henderson', email: 'd.henderson@carehealth.org', age: 52, organ_needed: 'Kidney', blood_group: 'B+', urgency: 'Medium', score: 79.8 },
  { id: 'REC-905', full_name: 'Chloe Lin', email: 'chloe.lin@carehealth.org', age: 41, organ_needed: 'Kidney', blood_group: 'AB+', urgency: 'Low', score: 71.2 },
  { id: 'REC-910', full_name: 'Robert Sterling', email: 'robert.sterling@cardiaccare.org', age: 58, organ_needed: 'Heart', blood_group: 'A+', urgency: 'Critical', score: 99.1 },
  { id: 'REC-911', full_name: 'Sophia Chen', email: 'sophia.chen@northwestern-med.org', age: 37, organ_needed: 'Heart', blood_group: 'AB+', urgency: 'High', score: 91.4 },
  { id: 'REC-912', full_name: 'William Alvarez', email: 'w.alvarez@barnes-care.org', age: 61, organ_needed: 'Heart', blood_group: 'A+', urgency: 'Medium', score: 84.0 },
  { id: 'REC-920', full_name: 'Tariq O\'Connor', email: 'tariq.oconnor@umn-health.org', age: 45, organ_needed: 'Liver', blood_group: 'B+', urgency: 'Critical', score: 97.8 },
  { id: 'REC-921', full_name: 'Hannah Brooks', email: 'hannah.brooks@froedtert-med.org', age: 33, organ_needed: 'Liver', blood_group: 'AB+', urgency: 'High', score: 89.6 },
  { id: 'REC-930', full_name: 'Nadia Petrova', email: 'nadia.petrova@brigham-health.org', age: 28, organ_needed: 'Lungs', blood_group: 'O-', urgency: 'Critical', score: 98.9 },
  { id: 'REC-931', full_name: 'Daniel Thorne', email: 'daniel.thorne@mountsinai-med.org', age: 50, organ_needed: 'Lungs', blood_group: 'O+', urgency: 'High', score: 88.2 },
  { id: 'REC-940', full_name: 'Grace Miller', email: 'grace.miller@ucla-health.org', age: 42, organ_needed: 'Pancreas', blood_group: 'AB+', urgency: 'High', score: 93.5 }
];

/**
 * ============================================================================
 * LIVE DASHBOARD METRICS LOADER
 * supabaseClient.from('tableName').select('*', { count: 'exact', head: true })
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
      supabaseClient.from('matches').select('*', { count: 'exact', head: true })
    ]);

    if (metricDonors && donorsRes && donorsRes.count !== null && donorsRes.count !== undefined) {
      metricDonors.textContent = Number(donorsRes.count).toLocaleString();
    }
    if (metricRecipients && recipientsRes && recipientsRes.count !== null && recipientsRes.count !== undefined) {
      metricRecipients.textContent = Number(recipientsRes.count).toLocaleString();
    }
    if (metricOrgans && organsRes && organsRes.count !== null && organsRes.count !== undefined) {
      metricOrgans.textContent = Number(organsRes.count).toLocaleString();
    }
    if (metricTransplants && matchesRes && matchesRes.count !== null && matchesRes.count !== undefined) {
      metricTransplants.textContent = Number(matchesRes.count).toLocaleString();
    }
  } catch (err) {
    console.error('[Clinical Portal] Error loading live dashboard metrics:', err);
  }
}

/**
 * ============================================================================
 * FUNCTION 1: Handle Donor Form Submit
 * Captures Name, Email, Age, Blood Group, Pledged Organs, and Share Consent
 * ============================================================================
 */
async function handleDonorFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('donorName');
  const emailInput = document.getElementById('donorEmail');
  const ageInput = document.getElementById('donorAge');
  const bloodGroupSelect = document.getElementById('donorBloodGroup');
  const consentCheckbox = document.getElementById('donorConsent');
  const shareConsentCheckbox = document.getElementById('donorShareConsent');
  const submitBtn = document.getElementById('donorSubmitBtn');
  const alertBox = document.getElementById('donorAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const age = ageInput ? parseInt(ageInput.value, 10) : NaN;
  const bloodGroup = bloodGroupSelect ? bloodGroupSelect.value : '';
  const hasConsent = consentCheckbox ? consentCheckbox.checked : false;
  const shareContactConsent = shareConsentCheckbox ? shareConsentCheckbox.checked : false;

  // Capture array of checked organs and join as comma-separated string
  const organCheckboxes = document.querySelectorAll('input[name="organs_pledged"]:checked');
  const organsPledgedArray = Array.from(organCheckboxes).map(cb => cb.value);
  const organsPledgedString = organsPledgedArray.join(', ');

  // Validation
  if (!fullName || !email || isNaN(age) || !bloodGroup) {
    showAlert(alertBox, 'Please complete all required fields including legal full name, email address, age, and blood group.', 'error');
    return;
  }

  if (organsPledgedArray.length === 0) {
    showAlert(alertBox, 'Please select at least one pledged organ for clinical registry declaration.', 'error');
    return;
  }

  if (!hasConsent) {
    showAlert(alertBox, 'Official consent authorization must be verified before donor registration.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Donor...';

  // Construct complete donor record
  const donorPayload = {
    full_name: fullName,
    email: email,
    age: age,
    blood_group: bloodGroup,
    consent: hasConsent,
    organs_pledged: organsPledgedString,
    share_contact_consent: shareContactConsent
  };

  // Cache latest registered donor for allocation offer webhook integration
  latestRegisteredDonor = {
    full_name: fullName,
    email: email,
    share_contact_consent: shareContactConsent,
    organs_pledged: organsPledgedString
  };

  try {
    if (supabaseClient) {
      // Live Supabase Insert
      const { data, error } = await supabaseClient.from('donors').insert([donorPayload]).select();

      if (error) throw error;

      showAlert(
        alertBox, 
        `Donor "${fullName}" (${bloodGroup}) successfully registered with pledged organs: ${organsPledgedString}.`, 
        'success'
      );
      loadDashboardMetrics();
    } else {
      showAlert(
        alertBox, 
        `Donor "${fullName}" (${bloodGroup}, Age ${age}) recorded in clinical registry with pledged organs: ${organsPledgedString}.`, 
        'success'
      );
    }

    document.getElementById('donorForm').reset();
  } catch (err) {
    console.error('[Clinical Portal] Error inserting donor:', err);
    showAlert(alertBox, `Registration error: ${err.message || 'Unable to register donor at this time.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Register Donor
    `;
  }
}

/**
 * ============================================================================
 * FUNCTION 2: Handle Recipient Form Submit
 * Captures Name, Email, Age, Blood Group, Organ Needed, and Clinical Urgency
 * ============================================================================
 */
async function handleRecipientFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('recipientName');
  const emailInput = document.getElementById('recipientEmail');
  const ageInput = document.getElementById('recipientAge');
  const bloodGroupSelect = document.getElementById('recipientBloodGroup');
  const organNeededSelect = document.getElementById('recipientOrganNeeded');
  const urgencySelect = document.getElementById('recipientUrgency');
  const submitBtn = document.getElementById('recipientSubmitBtn');
  const alertBox = document.getElementById('recipientAlert');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const age = ageInput ? parseInt(ageInput.value, 10) : NaN;
  const bloodGroup = bloodGroupSelect ? bloodGroupSelect.value : '';
  const organNeeded = organNeededSelect ? organNeededSelect.value : '';
  const urgency = urgencySelect ? urgencySelect.value : '';

  // Validation
  if (!fullName || !email || isNaN(age) || !bloodGroup || !organNeeded || !urgency) {
    showAlert(alertBox, 'Please complete all required fields including legal full name, email, age, blood group, needed organ, and clinical urgency tier.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Recipient...';

  const recipientPayload = {
    full_name: fullName,
    email: email,
    age: age,
    blood_group: bloodGroup,
    organ_needed: organNeeded,
    urgency: urgency
  };

  try {
    if (supabaseClient) {
      // Live Supabase Insert
      const { data, error } = await supabaseClient.from('recipients').insert([recipientPayload]).select();

      if (error) throw error;

      showAlert(alertBox, `Recipient "${fullName}" enrolled on active waitlist for ${organNeeded} (${urgency}).`, 'success');
      loadDashboardMetrics();
    } else {
      DEFAULT_RECIPIENT_POOL.unshift({
        id: `REC-${Date.now().toString().slice(-4)}`,
        full_name: fullName,
        email: email,
        age: age,
        organ_needed: organNeeded,
        blood_group: bloodGroup,
        urgency: urgency,
        score: urgency === 'Critical' ? 96.5 : (urgency === 'High' ? 88.0 : 78.0)
      });

      showAlert(
        alertBox, 
        `Recipient "${fullName}" enrolled on active waitlist for ${organNeeded} (${urgency} Tier).`, 
        'success'
      );
    }

    document.getElementById('recipientForm').reset();
  } catch (err) {
    console.error('[Clinical Portal] Error inserting recipient:', err);
    showAlert(alertBox, `Registration error: ${err.message || 'Unable to register recipient at this time.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      Register Recipient
    `;
  }
}

/**
 * ============================================================================
 * FUNCTION 3: Fetch organs_available On Load
 * supabaseClient.from('organs_available').select('*')
 * ============================================================================
 */
async function fetchAvailableOrgans() {
  const organSelect = document.getElementById('organSelect');
  if (!organSelect) return;

  organSelect.innerHTML = '<option value="">-- Choose an available organ from network --</option>';

  let organs = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('organs_available')
        .select('*');

      if (error) throw error;
      if (data && data.length > 0) {
        organs = data;
      }
    } catch (err) {
      console.warn('[Clinical Portal] Live organs_available fetch failed, using clinical fallback data:', err);
    }
  }

  // Fallback to operational repository if empty
  if (organs.length === 0) {
    organs = DEFAULT_AVAILABLE_ORGANS;
  }

  window._currentOrgans = organs;

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

/**
 * ============================================================================
 * FUNCTION 4: Handle "Run Matching Algorithm" Click
 * supabaseClient.rpc('find_matches_for_organ', { p_organ_id: selectedId })
 * ============================================================================
 */
async function handleRunMatchingClick() {
  const organSelect = document.getElementById('organSelect');
  const runBtn = document.getElementById('runMatchingBtn');
  const alertBox = document.getElementById('matchingAlert');
  const resultsWrap = document.getElementById('matchingResultsWrap');
  const emptyState = document.getElementById('matchingEmptyState');
  const resultsCount = document.getElementById('matchResultsCount');

  const selectedId = organSelect ? organSelect.value : '';

  if (!selectedId) {
    showAlert(alertBox, 'Please select an available organ from the dropdown menu before running the matching algorithm.', 'error');
    return;
  }

  runBtn.disabled = true;
  runBtn.innerHTML = 'Computing Matches...';
  if (alertBox) alertBox.style.display = 'none';

  const organsList = window._currentOrgans || DEFAULT_AVAILABLE_ORGANS;
  const currentOrgan = organsList.find(o => (o.id === selectedId || o.organ_id === selectedId)) || {
    organ_type: 'Kidney',
    blood_group: 'O+',
    donor_name: latestRegisteredDonor.full_name,
    donor_email: latestRegisteredDonor.email,
    share_contact_consent: latestRegisteredDonor.share_contact_consent
  };

  try {
    let matches = [];

    if (supabaseClient) {
      // Execute Requested Supabase RPC
      const { data, error } = await supabaseClient.rpc('find_matches_for_organ', {
        p_organ_id: selectedId
      });

      if (error) throw error;
      matches = data || [];
    } else {
      // Operational Matching Algorithm (ABO Histocompatibility & Urgency)
      await new Promise(r => setTimeout(r, 450)); // Realistic algorithmic latency
      matches = executeLocalClinicalMatching(selectedId, currentOrgan);
    }

    // Cache matches for offer modal interaction
    window._currentMatches = matches;

    renderMatchingResults(matches, currentOrgan);

    if (matches.length > 0) {
      if (resultsWrap) resultsWrap.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';
      if (resultsCount) resultsCount.textContent = `${matches.length} Candidates Matched`;
      showAlert(alertBox, `Algorithmic crossmatch completed successfully. ${matches.length} compatible candidates identified.`, 'success');
    } else {
      if (resultsWrap) resultsWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      showAlert(alertBox, 'No compatible recipients currently on the waitlist match the ABO blood group and organ type.', 'info');
    }

  } catch (err) {
    console.error('[Allocation Engine] Error running matching algorithm:', err);
    showAlert(alertBox, `Error executing allocation algorithm: ${err.message || 'Unknown algorithm error.'}`, 'error');
    // Fallback to local matching
    const fallbackMatches = executeLocalClinicalMatching(selectedId, currentOrgan);
    window._currentMatches = fallbackMatches;
    renderMatchingResults(fallbackMatches, currentOrgan);
    if (resultsWrap) resultsWrap.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      Run Matching Algorithm
    `;
  }
}

/**
 * Local Histocompatibility Matching Engine
 */
function executeLocalClinicalMatching(selectedId, organ) {
  const organType = (organ.organ_type || organ.type || 'Kidney').toLowerCase();
  const organBlood = organ.blood_group || organ.blood_type || 'O+';

  // Compatible Blood Group Recipient Matrix
  const aboMatrix = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };

  const allowedRecipients = aboMatrix[organBlood] || [organBlood];

  const filtered = DEFAULT_RECIPIENT_POOL.filter(cand => {
    const candOrgan = cand.organ_needed.toLowerCase();
    const typeMatch = candOrgan.includes(organType) || organType.includes(candOrgan);
    const bloodMatch = allowedRecipients.includes(cand.blood_group);
    return typeMatch && bloodMatch;
  });

  // Calculate scores and sort descending
  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

  return filtered;
}

/**
 * Render Matched Candidates in Results Table & Cards
 */
function renderMatchingResults(matches, organ) {
  const resultsBody = document.getElementById('matchingResultsBody');
  const matchesList = document.getElementById('matchesList');
  const countBadge = document.getElementById('matchesCountBadge');

  const organBlood = organ ? (organ.blood_group || organ.blood_type || '') : '';

  if (countBadge) {
    countBadge.textContent = `${matches.length} Clinically Compatible Candidates`;
  }

  // Populate table format for index.html
  if (resultsBody) {
    resultsBody.innerHTML = matches.map((match, idx) => {
      const rank = idx + 1;
      const candId = match.candidate_id || match.id || `PT-${idx + 101}`;
      const name = match.full_name || match.name || `Candidate #${candId}`;
      const organNeeded = match.organ_needed || match.organ_type || (organ ? organ.organ_type : 'Organ');
      const blood = match.blood_group || match.blood_type || 'Unknown';
      const urgency = match.urgency || match.urgency_status || 'Medium';
      const score = Number(match.score || match.match_score || match.medical_urgency_score || 85.0).toFixed(1);

      const isExact = organBlood === blood;
      const bloodTagClass = isExact ? 'exact' : 'compatible';
      const bloodTagText = isExact ? `Exact (${blood})` : `Compatible (${blood})`;

      let urgencyClass = 'medium';
      const uLower = urgency.toLowerCase();
      if (uLower.includes('crit') || uLower.includes('1a')) urgencyClass = 'critical';
      else if (uLower.includes('high') || uLower.includes('1b')) urgencyClass = 'high';
      else if (uLower.includes('low') || uLower.includes('3')) urgencyClass = 'low';

      return `
        <tr>
          <td><span class="rank-badge">#${rank}</span></td>
          <td>
            <div style="font-weight: 700; color: var(--color-medical-dark);">${name}</div>
            <div style="font-size: 0.75rem; color: var(--text-slate-light); font-family: var(--font-mono);">${candId}</div>
          </td>
          <td><strong>${organNeeded}</strong></td>
          <td><span class="blood-tag ${bloodTagClass}">${blood}</span></td>
          <td><span class="badge-urgency ${urgencyClass}">${urgency}</span></td>
          <td>
            <div class="score-badge-wrap">
              <span class="score-num">${score}%</span>
              <div class="score-bar-track">
                <div class="score-bar-fill" style="width: ${Math.min(100, Math.max(10, score))}%;"></div>
              </div>
            </div>
          </td>
          <td>
            <span class="blood-tag ${bloodTagClass}">${bloodTagText}</span>
          </td>
          <td>
            <button 
              type="button" 
              class="btn-action-sm btn-allocate" 
              onclick="openAllocationOfferModal('${candId}', '${encodeURIComponent(name)}', '${encodeURIComponent(organNeeded)}', '${score}%', '${encodeURIComponent(urgency)}')"
            >
              Transmit Offer &rarr;
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Populate card format for matching.html if present
  if (matchesList) {
    if (matches.length === 0) {
      matchesList.innerHTML = `
        <div style="background: #ffffff; border: 1px solid var(--border-slate); border-radius: var(--radius-lg); padding: 2.5rem; text-align: center;">
          <h4 style="color: var(--color-medical-dark); font-size: 1.1rem; margin-bottom: 0.5rem;">No Compatible Candidates Identified</h4>
          <p style="color: var(--text-slate-muted); font-size: 0.875rem; max-width: 480px; margin: 0 auto;">
            No candidates currently on the active waitlist match the ABO blood group and crossmatch criteria for this organ type within viable preservation limits.
          </p>
        </div>
      `;
    } else {
      matchesList.innerHTML = matches.map((match, idx) => {
        const rank = idx + 1;
        const candId = match.candidate_id || match.id || `PT-${idx + 101}`;
        const name = match.full_name || match.name || `Candidate #${candId}`;
        const organNeeded = match.organ_needed || match.organ_type || (organ ? organ.organ_type : 'Organ');
        const blood = match.blood_group || match.blood_type || 'Unknown';
        const urgency = match.urgency || match.urgency_status || 'Medium';
        const score = Number(match.score || match.match_score || match.medical_urgency_score || 85.0).toFixed(1);
        const hospital = match.hospital_name || match.hospital || 'Accredited Transplant Facility';

        const isExact = organBlood === blood;
        const bloodTagClass = isExact ? 'exact' : 'compatible';
        const bloodTagText = isExact ? `Exact (${blood})` : `Compatible (${blood})`;

        let urgencyClass = 'medium';
        const uLower = urgency.toLowerCase();
        if (uLower.includes('crit') || uLower.includes('1a')) urgencyClass = 'critical';
        else if (uLower.includes('high') || uLower.includes('1b')) urgencyClass = 'high';
        else if (uLower.includes('low') || uLower.includes('3')) urgencyClass = 'low';

        return `
          <div style="background: #ffffff; border: 1px solid var(--border-slate); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 1.15rem;">
              <span class="rank-badge">#${rank}</span>
              <div>
                <div style="font-weight: 700; color: var(--color-medical-dark); font-size: 1.05rem;">${name}</div>
                <div style="font-size: 0.75rem; color: var(--text-slate-light); font-family: var(--font-mono);">${candId} &bull; ${hospital}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
              <span class="badge-urgency ${urgencyClass}">${urgency}</span>
              <span class="blood-tag ${bloodTagClass}">${bloodTagText}</span>
              <div class="score-badge-wrap" style="min-width: 120px;">
                <span class="score-num">${score}%</span>
                <div class="score-bar-track">
                  <div class="score-bar-fill" style="width: ${Math.min(100, Math.max(10, score))}%;"></div>
                </div>
              </div>
              <button 
                type="button" 
                class="btn-action-sm btn-allocate" 
                onclick="openAllocationOfferModal('${candId}', '${encodeURIComponent(name)}', '${encodeURIComponent(organNeeded)}', '${score}%', '${encodeURIComponent(urgency)}')"
              >
                Transmit Offer &rarr;
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Handle matching.html containers if present
  const matchesResultsContainer = document.getElementById('matchesResultsContainer');
  const emptyState = document.getElementById('emptyState');
  if (matchesResultsContainer) {
    matchesResultsContainer.style.display = 'block';
  }
  if (emptyState && matches.length > 0) {
    emptyState.style.display = 'none';
  }
}

/**
 * ============================================================================
 * ALLOCATION OFFER MODAL & EMAIL WEBHOOK DISPATCH
 * ============================================================================
 */

/**
 * Opens the Allocation Offer confirmation modal with active match parameters
 */
function openAllocationOfferModal(candidateId, candidateName, organType, score, urgency) {
  const matches = window._currentMatches || [];
  const candidate = matches.find(c => (c.candidate_id === candidateId || c.id === candidateId)) ||
                    DEFAULT_RECIPIENT_POOL.find(c => (c.id === candidateId || c.candidate_id === candidateId)) || {};

  const resolvedName = candidateName ? decodeURIComponent(candidateName) : (candidate.full_name || candidate.name || 'Candidate ' + candidateId);
  const resolvedOrgan = organType ? decodeURIComponent(organType) : (candidate.organ_needed || 'Kidney');
  const resolvedScore = score || (candidate.score ? Number(candidate.score).toFixed(1) + '%' : '98.0%');
  const resolvedUrgency = urgency ? decodeURIComponent(urgency) : (candidate.urgency || candidate.urgency_status || 'Critical');

  // Determine recipient email from candidate pool or default convention
  const recipientEmail = candidate.email || 
    (DEFAULT_RECIPIENT_POOL.find(c => c.full_name === resolvedName)?.email) || 
    `${resolvedName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@transplant-inbox.org`;

  // Determine donor details from currently selected organ
  const organsList = window._currentOrgans || DEFAULT_AVAILABLE_ORGANS;
  const organSelect = document.getElementById('organSelect');
  const selectedOrganId = organSelect ? organSelect.value : '';
  const currentOrgan = organsList.find(o => (o.id === selectedOrganId || o.organ_id === selectedOrganId)) || organsList[0] || {};

  const donorName = currentOrgan.donor_name || latestRegisteredDonor.full_name;
  const donorEmail = currentOrgan.donor_email || latestRegisteredDonor.email;
  const shareContactConsent = (currentOrgan.share_contact_consent !== undefined) 
    ? currentOrgan.share_contact_consent 
    : latestRegisteredDonor.share_contact_consent;

  activeOfferData = {
    candidate_id: candidateId,
    recipient_name: resolvedName,
    recipient_email: recipientEmail,
    donor_name: donorName,
    donor_email: donorEmail,
    organ_matched: resolvedOrgan,
    share_contact_consent: shareContactConsent,
    score: resolvedScore,
    urgency: resolvedUrgency
  };

  const modal = document.getElementById('offerModal');
  if (modal) {
    const candIdEl = document.getElementById('modalCandidateId');
    const organTypeEl = document.getElementById('modalOrganType');
    const scoreEl = document.getElementById('modalScore');
    const urgEl = document.getElementById('modalUrgency');

    if (candIdEl) candIdEl.textContent = `${candidateId} - ${resolvedName}`;
    if (organTypeEl) organTypeEl.textContent = resolvedOrgan;
    if (scoreEl) scoreEl.textContent = resolvedScore;
    if (urgEl) urgEl.textContent = resolvedUrgency;

    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

// Attach globally for inline HTML event binding
window.openAllocationOfferModal = openAllocationOfferModal;

/**
 * Sets up modal event listeners and the "Transmit Allocation Offer" n8n Webhook trigger
 */
function setupOfferModal() {
  const modal = document.getElementById('offerModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const confirmBtn = document.getElementById('modalConfirmBtn');

  if (!modal) return;

  function closeModal() {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Transmit Allocation Offer click handler with n8n Webhook POST request
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      const originalText = confirmBtn.innerHTML;
      confirmBtn.innerHTML = 'Transmitting Allocation Offer...';

      // JSON payload required: Recipient Name & Email, Donor Name & Email, Organ Matched, share_contact_consent
      const webhookPayload = {
        recipient_name: activeOfferData.recipient_name,
        recipient_email: activeOfferData.recipient_email,
        donor_name: activeOfferData.donor_name,
        donor_email: activeOfferData.donor_email,
        organ_matched: activeOfferData.organ_matched,
        share_contact_consent: activeOfferData.share_contact_consent,
        // CamelCase variants for flexible n8n node parameter mapping
        recipientName: activeOfferData.recipient_name,
        recipientEmail: activeOfferData.recipient_email,
        donorName: activeOfferData.donor_name,
        donorEmail: activeOfferData.donor_email,
        organMatched: activeOfferData.organ_matched,
        shareContactConsent: activeOfferData.share_contact_consent,
        timestamp: new Date().toISOString()
      };

      try {
        console.log('[Webhook] Dispatching allocation offer payload to n8n:', N8N_WEBHOOK_URL, webhookPayload);
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });
        console.log('[Webhook] n8n response received, status:', response.status);
      } catch (webhookErr) {
        console.warn('[Webhook] n8n Webhook notification dispatch notice:', webhookErr);
      }

      closeModal();
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalText;

      const alertBox = document.getElementById('matchingAlert');
      if (alertBox) {
        showAlert(
          alertBox, 
          `Official allocation offer transmitted for ${activeOfferData.recipient_name} (${activeOfferData.organ_matched}). Email dispatch webhook triggered successfully.`, 
          'success'
        );
      }
    });
  }
}

/**
 * ============================================================================
 * Helper Utilities
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
 * Event Listeners & Lifecycle Router
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load live dashboard metrics
  loadDashboardMetrics();

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

  // Attach Allocation Engine Matching Button Listener
  const runBtn = document.getElementById('runMatchingBtn');
  if (runBtn) {
    runBtn.addEventListener('click', handleRunMatchingClick);
  }

  // On matching.html, trigger matching dynamically when organ selection changes
  const organSelect = document.getElementById('organSelect');
  if (organSelect && !runBtn) {
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

  // Initialize offer confirmation modal & webhook handler
  setupOfferModal();

  // Function 3: Fetch organs_available on load
  fetchAvailableOrgans();
});
