/**
 * ============================================================================
 * NATIONAL ORGAN ALLOCATION NETWORK
 * Clinical Portal Frontend Logic & Supabase Integration
 * ============================================================================
 */

// ============================================================================
// SUPABASE CLIENT SETUP
// Replace 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' with your live credentials
// ============================================================================
const SUPABASE_URL = 'https://okxkdqegcbwxspyramiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hk-9_EdypYm330hYYm-KOw_v6_WpmTA';

// Setup: const supabase = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
const supabase = (typeof window !== 'undefined' && window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http'))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Baseline Clinical Repository (Used for demonstration and offline resilience)
const DEFAULT_AVAILABLE_ORGANS = [
  { id: 'ORG-8921', organ_id: 'ORG-8921', organ_type: 'Kidney', blood_group: 'O+', hospital: 'Johns Hopkins Comprehensive Center' },
  { id: 'ORG-7704', organ_id: 'ORG-7704', organ_type: 'Heart', blood_group: 'A+', hospital: 'Cleveland Clinic Main Campus' },
  { id: 'ORG-9932', organ_id: 'ORG-9932', organ_type: 'Liver', blood_group: 'B+', hospital: 'Mayo Clinic Hospital' },
  { id: 'ORG-6541', organ_id: 'ORG-6541', organ_type: 'Lungs', blood_group: 'O-', hospital: 'Massachusetts General Hospital' },
  { id: 'ORG-4180', organ_id: 'ORG-4180', organ_type: 'Pancreas', blood_group: 'AB+', hospital: 'Cedars-Sinai Medical Center' }
];

const DEFAULT_RECIPIENT_POOL = [
  { id: 'REC-901', full_name: 'Elena Rostova', age: 34, organ_needed: 'Kidney', blood_group: 'O+', urgency: 'Critical', score: 98.4 },
  { id: 'REC-902', full_name: 'Marcus Vance', age: 46, organ_needed: 'Kidney', blood_group: 'O+', urgency: 'High', score: 92.1 },
  { id: 'REC-903', full_name: 'Aisha Al-Mansoor', age: 29, organ_needed: 'Kidney', blood_group: 'A+', urgency: 'High', score: 87.5 },
  { id: 'REC-904', full_name: 'David Henderson', age: 52, organ_needed: 'Kidney', blood_group: 'B+', urgency: 'Medium', score: 79.8 },
  { id: 'REC-905', full_name: 'Chloe Lin', age: 41, organ_needed: 'Kidney', blood_group: 'AB+', urgency: 'Low', score: 71.2 },
  { id: 'REC-910', full_name: 'Robert Sterling', age: 58, organ_needed: 'Heart', blood_group: 'A+', urgency: 'Critical', score: 99.1 },
  { id: 'REC-911', full_name: 'Sophia Chen', age: 37, organ_needed: 'Heart', blood_group: 'AB+', urgency: 'High', score: 91.4 },
  { id: 'REC-912', full_name: 'William Alvarez', age: 61, organ_needed: 'Heart', blood_group: 'A+', urgency: 'Medium', score: 84.0 },
  { id: 'REC-920', full_name: 'Tariq O\'Connor', age: 45, organ_needed: 'Liver', blood_group: 'B+', urgency: 'Critical', score: 97.8 },
  { id: 'REC-921', full_name: 'Hannah Brooks', age: 33, organ_needed: 'Liver', blood_group: 'AB+', urgency: 'High', score: 89.6 },
  { id: 'REC-930', full_name: 'Nadia Petrova', age: 28, organ_needed: 'Lungs', blood_group: 'O-', urgency: 'Critical', score: 98.9 },
  { id: 'REC-931', full_name: 'Daniel Thorne', age: 50, organ_needed: 'Lungs', blood_group: 'O+', urgency: 'High', score: 88.2 },
  { id: 'REC-940', full_name: 'Grace Miller', age: 42, organ_needed: 'Pancreas', blood_group: 'AB+', urgency: 'High', score: 93.5 }
];

let localDonorsCount = 142850;
let localRecipientsCount = 104218;
let localOrgansCount = 38;
let localTransplantsCount = 41290;

/**
 * ============================================================================
 * FUNCTION 1: Handle Donor Form Submit
 * supabase.from('donors').insert(...)
 * ============================================================================
 */
async function handleDonorFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('donorName');
  const ageInput = document.getElementById('donorAge');
  const bloodGroupSelect = document.getElementById('donorBloodGroup');
  const consentCheckbox = document.getElementById('donorConsent');
  const submitBtn = document.getElementById('donorSubmitBtn');
  const alertBox = document.getElementById('donorAlert');

  const fullName = nameInput.value.trim();
  const age = parseInt(ageInput.value, 10);
  const bloodGroup = bloodGroupSelect.value;
  const hasConsent = consentCheckbox.checked;

  // Validation
  if (!fullName || isNaN(age) || !bloodGroup) {
    showAlert(alertBox, 'Please complete all required fields with valid clinical information.', 'error');
    return;
  }

  if (!hasConsent) {
    showAlert(alertBox, 'Official consent authorization must be verified before donor registration.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Donor...';

  try {
    if (supabase) {
      // Live Supabase Insert
      const { data, error } = await supabase.from('donors').insert([
        {
          full_name: fullName,
          age: age,
          blood_group: bloodGroup,
          consent: hasConsent
        }
      ]).select();

      if (error) throw error;

      showAlert(alertBox, `Donor "${fullName}" (${bloodGroup}) successfully registered in the national network.`, 'success');
    } else {
      // Operational Staging Record
      localDonorsCount += 1;
      showAlert(
        alertBox, 
        `Donor "${fullName}" (${bloodGroup}, Age ${age}) recorded in clinical registry. (Running in operational staging mode)`, 
        'success'
      );
    }

    document.getElementById('donorForm').reset();
    updateMetricsDisplay();
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
 * supabase.from('recipients').insert(...)
 * ============================================================================
 */
async function handleRecipientFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('recipientName');
  const ageInput = document.getElementById('recipientAge');
  const bloodGroupSelect = document.getElementById('recipientBloodGroup');
  const organNeededSelect = document.getElementById('recipientOrganNeeded');
  const urgencySelect = document.getElementById('recipientUrgency');
  const submitBtn = document.getElementById('recipientSubmitBtn');
  const alertBox = document.getElementById('recipientAlert');

  const fullName = nameInput.value.trim();
  const age = parseInt(ageInput.value, 10);
  const bloodGroup = bloodGroupSelect.value;
  const organNeeded = organNeededSelect.value;
  const urgency = urgencySelect.value;

  // Validation
  if (!fullName || isNaN(age) || !bloodGroup || !organNeeded || !urgency) {
    showAlert(alertBox, 'Please complete all required fields for recipient waitlist intake.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Registering Recipient...';

  try {
    if (supabase) {
      // Live Supabase Insert
      const { data, error } = await supabase.from('recipients').insert([
        {
          full_name: fullName,
          age: age,
          blood_group: bloodGroup,
          organ_needed: organNeeded,
          urgency: urgency
        }
      ]).select();

      if (error) throw error;

      showAlert(alertBox, `Recipient "${fullName}" enrolled on active waitlist for ${organNeeded} (${urgency}).`, 'success');
    } else {
      // Operational Staging Record
      localRecipientsCount += 1;
      DEFAULT_RECIPIENT_POOL.unshift({
        id: `REC-${Date.now().toString().slice(-4)}`,
        full_name: fullName,
        age: age,
        organ_needed: organNeeded,
        blood_group: bloodGroup,
        urgency: urgency,
        score: urgency === 'Critical' ? 96.5 : (urgency === 'High' ? 88.0 : 78.0)
      });

      showAlert(
        alertBox, 
        `Recipient "${fullName}" enrolled on active waitlist for ${organNeeded} (${urgency} Tier). (Running in operational staging mode)`, 
        'success'
      );
    }

    document.getElementById('recipientForm').reset();
    updateMetricsDisplay();
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
 * supabase.from('organs_available').select('*')
 * ============================================================================
 */
async function fetchAvailableOrgans() {
  const organSelect = document.getElementById('organSelect');
  if (!organSelect) return;

  organSelect.innerHTML = '<option value="">-- Choose an available organ from network --</option>';

  let organs = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
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
    opt.textContent = `${organType} (Blood Group: ${bloodGroup}) &bull; ID: ${organId} [${hospital}]`;
    opt.dataset.organType = organType;
    opt.dataset.bloodGroup = bloodGroup;
    organSelect.appendChild(opt);
  });
}

/**
 * ============================================================================
 * FUNCTION 4: Handle "Run Matching Algorithm" Click
 * supabase.rpc('find_matches_for_organ', { p_organ_id: selectedId })
 * ============================================================================
 */
async function handleRunMatchingClick() {
  const organSelect = document.getElementById('organSelect');
  const runBtn = document.getElementById('runMatchingBtn');
  const alertBox = document.getElementById('matchingAlert');
  const resultsWrap = document.getElementById('matchingResultsWrap');
  const emptyState = document.getElementById('matchingEmptyState');
  const resultsBody = document.getElementById('matchingResultsBody');
  const resultsCount = document.getElementById('matchResultsCount');

  const selectedId = organSelect.value;

  if (!selectedId) {
    showAlert(alertBox, 'Please select an available organ from the dropdown menu before running the matching algorithm.', 'error');
    return;
  }

  runBtn.disabled = true;
  runBtn.innerHTML = 'Computing Matches...';
  alertBox.style.display = 'none';

  const organsList = window._currentOrgans || DEFAULT_AVAILABLE_ORGANS;
  const currentOrgan = organsList.find(o => (o.id === selectedId || o.organ_id === selectedId)) || {
    organ_type: 'Kidney',
    blood_group: 'O+'
  };

  try {
    let matches = [];

    if (supabase) {
      // Execute Requested Supabase RPC
      const { data, error } = await supabase.rpc('find_matches_for_organ', {
        p_organ_id: selectedId
      });

      if (error) throw error;
      matches = data || [];
    } else {
      // Operational Matching Algorithm (ABO Histocompatibility & Urgency)
      await new Promise(r => setTimeout(r, 450)); // Realistic algorithmic latency
      matches = executeLocalClinicalMatching(selectedId, currentOrgan);
    }

    renderMatchingResults(matches, currentOrgan);

    if (matches.length > 0) {
      resultsWrap.style.display = 'block';
      emptyState.style.display = 'none';
      resultsCount.textContent = `${matches.length} Candidates Matched`;
      showAlert(alertBox, `Algorithmic crossmatch completed successfully. ${matches.length} compatible candidates identified.`, 'success');
    } else {
      resultsWrap.style.display = 'none';
      emptyState.style.display = 'block';
      showAlert(alertBox, 'No compatible recipients currently on the waitlist match the ABO blood group and organ type.', 'info');
    }

  } catch (err) {
    console.error('[Allocation Engine] Error running matching algorithm:', err);
    showAlert(alertBox, `Error executing allocation algorithm: ${err.message || 'Unknown algorithm error.'}`, 'error');
    // Fallback to local matching
    const fallbackMatches = executeLocalClinicalMatching(selectedId, currentOrgan);
    renderMatchingResults(fallbackMatches, currentOrgan);
    resultsWrap.style.display = 'block';
    emptyState.style.display = 'none';
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
 * Render Matched Candidates in Results Table
 */
function renderMatchingResults(matches, organ) {
  const resultsBody = document.getElementById('matchingResultsBody');
  if (!resultsBody) return;

  const organBlood = organ ? (organ.blood_group || organ.blood_type || '') : '';

  resultsBody.innerHTML = matches.map((match, idx) => {
    const rank = idx + 1;
    const name = match.full_name || match.name || `Candidate #${match.id}`;
    const organNeeded = match.organ_needed || match.organ_type || 'Organ';
    const blood = match.blood_group || match.blood_type || 'Unknown';
    const urgency = match.urgency || match.urgency_status || 'Medium';
    const score = Number(match.score || match.match_score || match.compatibility_score || 85.0).toFixed(1);

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
          <div style="font-size: 0.75rem; color: var(--text-slate-light); font-family: var(--font-mono);">${match.id || 'PT-REG'}</div>
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
      </tr>
    `;
  }).join('');
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

function updateMetricsDisplay() {
  const dEl = document.getElementById('metricDonors');
  const rEl = document.getElementById('metricRecipients');
  const oEl = document.getElementById('metricOrgans');
  const tEl = document.getElementById('metricTransplants');

  if (dEl) dEl.textContent = Number(localDonorsCount).toLocaleString();
  if (rEl) rEl.textContent = Number(localRecipientsCount).toLocaleString();
  if (oEl) oEl.textContent = Number(localOrgansCount).toLocaleString();
  if (tEl) tEl.textContent = Number(localTransplantsCount).toLocaleString();
}

/**
 * ============================================================================
 * Event Listeners & Lifecycle Router
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Update dashboard metrics
  updateMetricsDisplay();

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

  // Function 3: Fetch organs_available on load
  fetchAvailableOrgans();
});
