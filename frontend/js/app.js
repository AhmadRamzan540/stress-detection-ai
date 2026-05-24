document.addEventListener('DOMContentLoaded', () => {

    // --- Tab Navigation Logic ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active-tab'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-tab');
        });
    });

    // --- Form & Prediction Logic ---
    const form = document.getElementById('prediction-form');
    const resultContainer = document.getElementById('result-container');
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const loader = analyzeBtn.querySelector('.loader');
    const resetBtn = document.getElementById('reset-btn');
    const suggestionsList = document.getElementById('suggestions-list');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading State
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        analyzeBtn.disabled = true;

        // Read input values (Call Duration is in minutes, Screen Time is in hours and converted to minutes)
        const callDurMinutes  = parseFloat(document.getElementById('call_dur').value) || 0;
        const screenTimeHours = parseFloat(document.getElementById('screen_time').value) || 0;

        const screenTimeMinutes = screenTimeHours * 60;

        const data = {
            PSQI_score:       parseFloat(document.getElementById('psqi').value),
            skin_conductance: parseFloat(document.getElementById('skin_cond').value),
            call_duration:    callDurMinutes,    // backend expects minutes
            screen_on_time:   screenTimeMinutes, // backend expects minutes
        };

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Server error');

            const result = await response.json();

            setTimeout(() => {
                showResult(result, data);
            }, 800);

        } catch (error) {
            console.error(error);
            alert("Error connecting to the analysis engine. Please try again.");
            resetUI();
        }
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('hidden');
        form.classList.remove('hidden');
        // Clear calc badges
        ['psqi-badge', 'skin-badge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.add('hidden'); el.textContent = ''; }
        });
        resetUI();
    });

    function showResult(result, data) {
        form.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        const resultIcon  = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultMsg   = document.getElementById('result-msg');

        document.getElementById('model-name').textContent = result.best_model;
        document.getElementById('model-acc').textContent  = result.model_accuracy;

        // --- Score Summary Section ---
        const scoreSummary = document.getElementById('score-summary');
        const psqiVal  = document.getElementById('psqi').value || '—';
        const skinVal  = document.getElementById('skin_cond').value || '—';
        const callMins = data.call_duration.toFixed(0);
        const scrMins  = data.screen_on_time.toFixed(0);

        scoreSummary.innerHTML = `
            <h3 class="summary-title">Input Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-icon">🌙</span>
                    <span class="summary-label">PSQI Score</span>
                    <span class="summary-value">${psqiVal} <small>/ 21</small></span>
                </div>
                <div class="summary-item">
                    <span class="summary-icon">⚡</span>
                    <span class="summary-label">Skin Conductance</span>
                    <span class="summary-value">${skinVal} <small>μS</small></span>
                </div>
                <div class="summary-item">
                    <span class="summary-icon">📞</span>
                    <span class="summary-label">Call Duration</span>
                    <span class="summary-value">${callMins} <small>mins</small></span>
                </div>
                <div class="summary-item">
                    <span class="summary-icon">📱</span>
                    <span class="summary-label">Screen Time</span>
                    <span class="summary-value">${scrMins} <small>mins</small></span>
                </div>
            </div>
        `;

        // Clear previous suggestions
        suggestionsList.innerHTML = '';

        if (result.is_stressed) {
            resultIcon.className = 'result-icon danger-icon';
            resultIcon.innerHTML = `
                <svg class="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="cross-circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="cross-path" fill="none" d="M16 16 36 36 M36 16 16 36"/>
                </svg>
            `;
            resultTitle.textContent = "High Stress Detected";
            resultTitle.style.color = "var(--danger)";

            const suggestions = [
                "Reduce your daily screen time by taking 5-minute breaks every hour.",
                "Practice mindfulness or deep breathing exercises for 10 minutes a day.",
                "Prioritize your sleep schedule to improve your PSQI score.",
                "Limit prolonged phone calls which may contribute to sensory overload.",
                "Consider a digital detox for the upcoming weekend."
            ];
            suggestions.forEach(sug => {
                const li = document.createElement('li');
                li.textContent = sug;
                suggestionsList.appendChild(li);
            });
            document.querySelector('.suggestions-box').style.borderLeftColor = "var(--danger)";

        } else {
            resultIcon.className = 'result-icon success-icon';
            resultIcon.innerHTML = `
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            `;
            resultTitle.textContent = "Normal Levels";
            resultTitle.style.color = "var(--success)";

            const suggestions = [
                "Keep maintaining your current healthy habits and sleep routines.",
                "Stay physically active to keep your stress resilience high.",
                "Continue balancing your screen time to avoid future burnout.",
                "Excellent job keeping your stress indicators within optimal ranges!"
            ];
            suggestions.forEach(sug => {
                const li = document.createElement('li');
                li.textContent = sug;
                suggestionsList.appendChild(li);
            });
            document.querySelector('.suggestions-box').style.borderLeftColor = "var(--success)";
        }

        resultMsg.textContent = result.message;
    }

    function resetUI() {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

// ─── Modal Logic ────────────────────────────────────────────────────────────

window.openModal = function(id) {
    document.getElementById(id).classList.remove('hidden');
    // Refresh live previews when modal opens
    if (id === 'psqi-modal') updatePSQIPreview();
    if (id === 'skin-modal') updateSkinPreview();
};

window.closeModal = function(id) {
    document.getElementById(id).classList.add('hidden');
};

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

// ─── PSQI Live Preview ───────────────────────────────────────────────────────

window.updatePSQIPreview = function() {
    const qual  = parseInt(document.getElementById('calc-sleep-qual').value) || 0;
    const lat   = parseInt(document.getElementById('calc-sleep-lat').value)  || 0;
    const dur   = parseInt(document.getElementById('calc-sleep-dur').value)  || 0;
    const eff   = parseInt(document.getElementById('calc-sleep-eff').value)  || 0;
    const dist  = parseInt(document.getElementById('calc-sleep-dist').value) || 0;
    const med   = parseInt(document.getElementById('calc-sleep-med').value)  || 0;
    const day   = parseInt(document.getElementById('calc-sleep-day').value)  || 0;

    const total = qual + lat + dur + eff + dist + med + day; // 0–21

    const previewVal  = document.getElementById('psqi-preview-val');
    const interpEl    = document.getElementById('psqi-interp');
    const previewBox  = document.getElementById('psqi-live-preview');

    if (previewVal) previewVal.textContent = total;

    let interp = '', color = '';
    if (total <= 5)       { interp = 'Good Sleep Quality';      color = '#10b981'; }
    else if (total <= 10) { interp = 'Moderate Sleep Issues';   color = '#f59e0b'; }
    else if (total <= 15) { interp = 'Poor Sleep Quality';      color = '#ef4444'; }
    else                  { interp = 'Very Poor Sleep Quality'; color = '#b91c1c'; }

    if (interpEl)   { interpEl.textContent = interp; interpEl.style.color = color; }
    if (previewBox) { previewBox.style.borderColor = color; }
    if (previewVal) previewVal.style.color = color;
};

// ─── PSQI Calculate & Apply ──────────────────────────────────────────────────

window.calculatePSQI = function() {
    const qual  = parseInt(document.getElementById('calc-sleep-qual').value) || 0;
    const lat   = parseInt(document.getElementById('calc-sleep-lat').value)  || 0;
    const dur   = parseInt(document.getElementById('calc-sleep-dur').value)  || 0;
    const eff   = parseInt(document.getElementById('calc-sleep-eff').value)  || 0;
    const dist  = parseInt(document.getElementById('calc-sleep-dist').value) || 0;
    const med   = parseInt(document.getElementById('calc-sleep-med').value)  || 0;
    const day   = parseInt(document.getElementById('calc-sleep-day').value)  || 0;

    // True PSQI: sum of 7 component scores (each 0–3) → range 0–21
    const psqiFinal = qual + lat + dur + eff + dist + med + day;

    const psqiInput = document.getElementById('psqi');
    psqiInput.value = psqiFinal;
    psqiInput.focus();
    psqiInput.blur();

    // Show result badge in the PSQI section
    showCalcBadge('psqi-badge', `${psqiFinal} / 21`, 'PSQI');

    closeModal('psqi-modal');
};

// ─── Skin Conductance Live Preview ──────────────────────────────────────────

window.updateSkinPreview = function() {
    const sweat = parseInt(document.getElementById('calc-skin-sweat').value) || 0;
    const hr    = parseInt(document.getElementById('calc-skin-hr').value)    || 0;
    const anx   = parseInt(document.getElementById('calc-skin-anx').value)   || 0;
    const exert = parseInt(document.getElementById('calc-skin-exert').value) || 0;

    // Max raw = 2+2+2+2 = 8 → map to 0.5–6.0 μS
    const raw = sweat + hr + anx + exert;
    const skinFinal = parseFloat((0.5 + (raw / 8) * 5.5).toFixed(2));

    const previewVal = document.getElementById('skin-preview-val');
    const interpEl   = document.getElementById('skin-interp');
    const previewBox = document.getElementById('skin-live-preview');

    if (previewVal) previewVal.textContent = skinFinal.toFixed(2);

    let interp = '', color = '';
    if (skinFinal < 1.5)      { interp = 'Very Low (Calm)';    color = '#10b981'; }
    else if (skinFinal < 3.0) { interp = 'Moderate';           color = '#f59e0b'; }
    else if (skinFinal < 5.0) { interp = 'Elevated';           color = '#ef4444'; }
    else                      { interp = 'Very High (Stressed)'; color = '#b91c1c'; }

    if (interpEl)   { interpEl.textContent = interp; interpEl.style.color = color; }
    if (previewBox) { previewBox.style.borderColor = color; }
    if (previewVal) previewVal.style.color = color;
};

// ─── Skin Calculate & Apply ──────────────────────────────────────────────────

window.calculateSkin = function() {
    const sweat = parseInt(document.getElementById('calc-skin-sweat').value) || 0;
    const hr    = parseInt(document.getElementById('calc-skin-hr').value)    || 0;
    const anx   = parseInt(document.getElementById('calc-skin-anx').value)   || 0;
    const exert = parseInt(document.getElementById('calc-skin-exert').value) || 0;

    const raw = sweat + hr + anx + exert; // max 8
    const skinFinal = parseFloat((0.5 + (raw / 8) * 5.5).toFixed(2));

    const skinInput = document.getElementById('skin_cond');
    skinInput.value = skinFinal;
    skinInput.focus();
    skinInput.blur();

    // Show result badge in the Skin section
    showCalcBadge('skin-badge', `${skinFinal} μS`, 'GSR');

    closeModal('skin-modal');
};

// ─── Shared Badge Helper ─────────────────────────────────────────────────────

function showCalcBadge(badgeId, value, label) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    badge.innerHTML = `<span class="badge-label">${label} Calculated:</span> <span class="badge-val">${value}</span>`;
    badge.classList.remove('hidden');
    // Animate in
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(4px)';
    requestAnimationFrame(() => {
        badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        badge.style.opacity = '1';
        badge.style.transform = 'translateY(0)';
    });
}
