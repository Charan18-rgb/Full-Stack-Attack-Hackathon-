let currentMode = "message";
let currentSender = "";
let isSimpleMode = false;
let currentSafetyXp = parseInt(localStorage.getItem('fraudshield_xp') || '0');
let checksCount = parseInt(localStorage.getItem('fraudshield_checks') || '0');
let currentAnalysisData = null;

const demoScamScenarios = {
    message: [
        { sender: "9876543217", text: "Congratulations 🎉 You won ₹5000 cashback. Claim now: bit.ly/reward" },
        { sender: "5463788964", text: "Dear customer, your UPI KYC expired. Update now: tinyurl.com/kyc" },
        { sender: "4536273456", text: "Urgent! Your bank account will be blocked today. Click here: upi-update.in" },
        { sender: "4689008669", text: "आप लॉटरी जीत गए हैं तुरंत पैसा भेजें: bit.ly/fraud" },
        { sender: "5462271385", text: "ನೀವು ಲಾಟರಿ ಗೆದ್ದಿದ್ದೀರಿ ತಕ್ಷಣ ಹಣ ಕಳುಹಿಸಿ: bit.ly/scam" }
    ],
    email: [
        { sender: "admin@bank-alert.com", subject: "Urgent Account Verification Required", text: "Dear Customer, verify your bank account immediately or it will be suspended." },
        { sender: "prize@lottery.com", subject: "You've Won Lottery Prize", text: "You are selected as winner of ₹5,00,000 lottery." },
        { sender: "security@portal.com", subject: "Password Reset Notice", text: "Click below link to reset password now." },
        { sender: "refund@amazon-fake.com", subject: "Amazon Refund Notice", text: "We tried refunding your amount. Click to confirm." },
        { sender: "tax@refund.in", subject: "Income Tax Refund", text: "You are eligible for refund. Submit bank details now." }
    ],
    transaction: [
        { sender: "unknown_upi@bank", amount: "25000", text: "Urgent refund needed now" },
        { sender: "scam_acc@bank", amount: "50000", text: "Click link and send money to verify account" },
        { sender: "merchant_pay@upi", amount: "1999", text: "Merchant requested ₹1999 for verification." },
        { sender: "unknown_user@ybl", amount: "7500", text: "You received payment request ₹7500 from unknown user." },
        { sender: "activation@bank", amount: "1000", text: "Accept payment request ₹1000 for activation." }
    ]
};

const demoSafeScenarios = {
    message: [
        { sender: "9876543210", text: "Your OTP for login is 482910. Do not share it." },
        { sender: "9123456789", text: "Your electricity bill of ₹450 paid successfully." },
        { sender: "9876543210", text: "Your order has been shipped and will arrive tomorrow." },
        { sender: "1234567890", text: "चलो खाना खाते हैं। धन्यवाद।" },
        { sender: "9123456789", text: "ನಾವು ಊಟಕ್ಕೆ ಹೋಗೋಣ. ಧನ್ಯವಾದ." }
    ],
    email: [
        { sender: "manager@company.com", subject: "Meeting Reminder", text: "Reminder for today's team meeting." },
        { sender: "billing@vendor.com", subject: "Invoice Attached", text: "Please find attached invoice." },
        { sender: "team@company.com", subject: "Project Update", text: "Latest update on project attached." },
        { sender: "hr@company.com", subject: "Welcome to Company", text: "Thank you for joining us." },
        { sender: "orders@store.com", subject: "Order Confirmation", text: "Your order placed successfully." }
    ],
    transaction: [
        { sender: "9123456789", amount: "500", text: "Payment of ₹500 sent to Rahul successfully." },
        { sender: "9876543210", amount: "299", text: "Recharge ₹299 completed successfully." },
        { sender: "1234567890", amount: "1000", text: "Transfer ₹1000 to friend completed." },
        { sender: "9123456789", amount: "450", text: "Grocery payment ₹450 done." },
        { sender: "9876543210", amount: "8000", text: "Rent payment ₹8000 completed." }
    ]
};

let demoScamIndices = { message: 0, email: 0, transaction: 0 };
let demoSafeIndices = { message: 0, email: 0, transaction: 0 };

const SERVER_URL = "http://127.0.0.1:8080";

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('fraudshield_dark_mode', isDark);
    document.getElementById('dark-mode-toggle').innerText = isDark ? "☀️" : "🌙";
}

function toggleSimpleMode() {
    isSimpleMode = !isSimpleMode;
    const btn = document.getElementById('simple-mode-toggle');
    if (isSimpleMode) {
        btn.classList.add('active');
        btn.innerText = "🎓 Simple Mode: ON";
        showToast("Simple Language Enabled");
    } else {
        btn.classList.remove('active');
        btn.innerText = "🎓 Simple Mode: OFF";
        showToast("Technical Language Enabled");
    }
    if (currentAnalysisData) renderResult();
}

function closeWelcomeModal() {
    document.getElementById('welcome-modal').classList.add('hidden');
    localStorage.setItem('fraudshield_first_visit', 'true');
}

function shareOnWhatsApp() {
    const text = "I just checked this suspicious message on FraudShield  and it looks like a scam! Stay safe and check your messages too.";
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
}

function shareCardOnWhatsApp() {
    if (!currentAnalysisData) return;
    let type = currentAnalysisData.scam_type;
    const text = `⚠️ Warning! I checked a suspicious message on FraudShield AI.\nIt looks like a [${type}]. Stay safe! Never pay without verifying.`;
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
}

function updateSafetyScore() {
    document.getElementById('safety-score').innerText = currentSafetyXp;
    const fill = document.getElementById('xp-fill');
    fill.style.width = Math.min(100, currentSafetyXp) + "%";

    const msg = document.getElementById('safety-level-msg');
    if (currentSafetyXp >= 100) msg.innerText = "Expert: You are highly fraud-aware! 🏆";
    else if (currentSafetyXp >= 50) msg.innerText = "Pro: You're getting good at this! ⭐";
    else if (currentSafetyXp >= 20) msg.innerText = "Learner: You're becoming fraud-aware! 📈";
    else msg.innerText = "Starter: You're starting your safety journey! 🛡️";
}

function updateSafetyStrip() {
    document.getElementById('strip-checks-count').innerText = checksCount;
    let fillPct = Math.min(100, (checksCount / 10) * 100);
    document.getElementById('strip-progress-fill').style.width = fillPct + "%";

    let msg = "Great start! Always check before you pay!";
    if (checksCount >= 10) msg = "🏆 Fraud Expert! You are well protected!";
    else if (checksCount >= 5) msg = "You are getting smarter about fraud! 🧠";
    document.getElementById('strip-milestone-msg').innerText = msg;
}

function switchTab(mode) {
    currentMode = mode;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('email-fields').classList.add('hidden');
    document.getElementById('transaction-fields').classList.add('hidden');

    if (mode === 'email') {
        document.getElementById('email-fields').classList.remove('hidden');
    } else if (mode === 'transaction') {
        document.getElementById('transaction-fields').classList.remove('hidden');
    }
}

let toastTimeout1, toastTimeout2;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.remove('hidden');

    clearTimeout(toastTimeout1);
    clearTimeout(toastTimeout2);

    void toast.offsetWidth;

    toast.classList.add('show');

    toastTimeout1 = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout2 = setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        let conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.animationDelay = Math.random() * 2 + 's';
        conf.style.backgroundColor = ['#28a745', '#1ebd5a', '#54d37a'][Math.floor(Math.random() * 3)];
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 3000);
    }
}

async function loadStats() {
    try {
        const res = await fetch(`${SERVER_URL}/stats`);
        const data = await res.json();

        document.getElementById('stat-scams').innerText = data.total_scams_detected || 0;
        document.getElementById('stat-safe').innerText = data.total_safe_checked || 0;
        document.getElementById('stat-common-scam').innerText = data.most_common_scam_type || "N/A";

        // Explicitly handle "N/A" or 0% for accuracy
        const accuracy = data.accuracy_rate;
        document.getElementById('stat-accuracy').innerText = accuracy === "0%" ? "N/A" : accuracy;
    } catch (e) {
        console.error("Failed to load stats", e);
        document.getElementById('stat-accuracy').innerText = "N/A";
    }
}

async function analyze() {
    const sender = document.getElementById('sender').value.trim();
    const text = document.getElementById('message').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const amountStr = document.getElementById('amount').value.trim();
    const amount = parseFloat(amountStr) || 0;

    if (currentMode === "message" && !text) {
        alert("⚠️ Please enter some message content to analyze.");
        return;
    }
    if (currentMode === "email" && !subject && !text) {
        alert("⚠️ Please enter an email subject or message body to analyze.");
        return;
    }
    if (currentMode === "transaction" && (!amountStr || amount <= 0)) {
        alert("⚠️ Please enter a valid transaction amount greater than 0.");
        return;
    }

    currentSender = sender;

    const payload = {
        mode: currentMode,
        sender: sender,
        text: text,
        subject: subject,
        body: text,
        amount: amount
    };

    document.getElementById('spinner-overlay').classList.remove('hidden');
    const card = document.getElementById('result-card');
    card.classList.add('hidden');
    card.classList.remove('fade-in', 'high-risk-pulse');
    document.getElementById('safe-checkmark').classList.add('hidden');

    try {
        const res = await fetch(`${SERVER_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        document.getElementById('spinner-overlay').classList.add('hidden');

        displayResult(data);
        showToast("Analysis Complete!");

        checksCount++;
        localStorage.setItem('fraudshield_checks', checksCount);
        updateSafetyStrip();

        loadHistory();
        loadStats();
    } catch (e) {
        document.getElementById('spinner-overlay').classList.add('hidden');
        alert("Error connecting to server. Is app.py running?");
        console.error(e);
    }
}

function displayResult(data) {
    currentAnalysisData = data;
    renderResult();

    // GAMIFICATION XP UPDATE
    currentSafetyXp += 10;
    localStorage.setItem('fraudshield_xp', currentSafetyXp);
    updateSafetyScore();

    // UPDATE GUARDIAN
    updateGuardian(data.risk_level);
}

function applySimpleModeToText(text) {
    if (!isSimpleMode) return text;
    let newText = text;
    newText = newText.replace(/Phishing Attack/gi, "Fake message to steal your info");
    newText = newText.replace(/Phishing Link/gi, "Fake message to steal your info");
    newText = newText.replace(/AI Model Prediction.*/i, "Our smart system detected");
    newText = newText.replace(/Sender Reputation.*/i, "Is this number trustworthy?");
    newText = newText.replace(/Urgency\/Pressure Tactics.*/i, "They are trying to rush you");
    return newText;
}

function renderResult() {
    const data = currentAnalysisData;
    if (!data) return;

    const card = document.getElementById('result-card');
    card.classList.remove('hidden');
    void card.offsetWidth;
    card.classList.add('fade-in');

    const title = document.getElementById('risk-level-title');
    const conf = document.getElementById('confidence-score');
    const circle = document.getElementById('risk-gauge-circle');
    const percentageText = document.getElementById('risk-text-value');

    circle.setAttribute('stroke-dasharray', `${data.risk_score}, 100`);
    percentageText.textContent = `${data.risk_score}%`;

    conf.innerText = data.confidence;
    document.getElementById('confidence-label').innerText = isSimpleMode ? "How sure we are:" : "Confidence:";

    circle.style.stroke = "var(--success)";
    title.className = "risk-title text-low";
    document.getElementById('safe-checkmark').classList.add('hidden');
    card.classList.remove('high-risk-pulse');

    let displayRiskLevel = data.risk_level + " Risk";
    if (isSimpleMode) {
        if (data.risk_level === "High") displayRiskLevel = "🚨 This looks like a SCAM!";
        else if (data.risk_level === "Medium") displayRiskLevel = "⚠️ Be Careful!";
        else displayRiskLevel = "✅ This seems Safe";
    }

    if (data.risk_level === "High") {
        circle.style.stroke = "var(--danger)";
        title.className = "risk-title text-high";
        card.classList.add('high-risk-pulse');
    } else if (data.risk_level === "Medium") {
        circle.style.stroke = "var(--warning)";
        title.className = "risk-title text-medium";
    } else {
        document.getElementById('safe-checkmark').classList.remove('hidden');
        if (data.risk_score < 30) createConfetti();
    }

    title.innerText = displayRiskLevel;

    // Feature 1 & 2: Link Warning Box
    let linkWarning = document.getElementById('link-warning-box');
    if (!linkWarning) {
        linkWarning = document.createElement('div');
        linkWarning.id = 'link-warning-box';
        linkWarning.className = 'link-warning-box';
        linkWarning.innerHTML = `
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">⚠️ Suspicious Link Detected! Do NOT click.</div>
            <button class="btn-warning" onclick="simulateClick()">Simulate What Happens If You Click</button>
        `;
        document.querySelector('.result-details').prepend(linkWarning);
    }

    if (data.detected_links && data.detected_links.some(l => l.risk > 0)) {
        linkWarning.style.display = 'block';
    } else {
        linkWarning.style.display = 'none';
    }

    // Scam Explainer
    const explainerCard = document.getElementById('scam-explainer-card');
    if (data.scam_type !== "✅ No Scam Detected" && data.scam_type !== "None" && data.scam_type !== "Safe" && data.scam_type !== "Unknown Scam") {
        explainerCard.classList.remove('hidden');
        document.getElementById('explainer-title').innerText = `What is a ${applySimpleModeToText(data.scam_type)}?`;
        document.getElementById('explainer-text').innerText = data.scam_explainer.desc || "This message triggered our scam filters.";

        const protectList = document.getElementById('explainer-protect-list');
        protectList.innerHTML = "";
        if (data.scam_explainer.protect) {
            data.scam_explainer.protect.forEach(p => {
                const li = document.createElement('li');
                li.innerText = p;
                protectList.appendChild(li);
            });
        }
    } else {
        explainerCard.classList.add('hidden');
    }

    const badge = document.getElementById('scam-type-badge');
    badge.innerText = applySimpleModeToText(data.scam_type);

    document.getElementById('breakdown-title').innerText = isSimpleMode ? "Why we think so:" : "Risk Breakdown (Explainable AI)";
    document.getElementById('suggestions-title').innerText = isSimpleMode ? "What you should do:" : "Smart Suggestions";

    document.getElementById('analyze-btn').innerText = isSimpleMode ? "Check if this is a Scam 🔍" : "Analyze Risk";
    document.getElementById('btn-report').innerText = isSimpleMode ? "Mark as Dangerous 🚨" : "🚨 Report as Spam";
    document.getElementById('btn-trust').innerText = isSimpleMode ? "This is Safe ✅" : "✅ Mark as Trusted";

    const reasonsList = document.getElementById('reasons-list');
    reasonsList.innerHTML = "";
    if (data.reasons.length === 0) {
        reasonsList.innerHTML = `<div class='breakdown-row'><span>${isSimpleMode ? "We didn't find anything dangerous." : "No specific risk factors detected."}</span><span>0</span></div>`;
    } else {
        data.reasons.forEach(r => {
            const row = document.createElement('div');
            row.className = "breakdown-row";
            const pointsClass = r.points.startsWith('+') ? 'text-danger' : 'text-success';
            let displayReason = applySimpleModeToText(r.text);
            row.innerHTML = `<span>${displayReason}</span><span class="breakdown-points ${pointsClass}">${r.points}</span>`;
            reasonsList.appendChild(row);
        });
    }

    const suggestionsList = document.getElementById('suggestions-list');
    suggestionsList.innerHTML = "";
    if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach(s => {
            const li = document.createElement('li');
            li.innerText = s;
            suggestionsList.appendChild(li);
        });
    }

    let hlText = document.getElementById('message').value;
    if (currentMode === 'email') hlText = document.getElementById('subject').value + " " + hlText;

    let highlightedHTML = hlText;
    if (data.detected_links && data.detected_links.length > 0) {
        data.detected_links.forEach(linkObj => {
            if (linkObj.risk > 0) {
                const regex = new RegExp(`(${linkObj.url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                highlightedHTML = highlightedHTML.replace(regex, `<span class="link-risk">$1</span>`);
            }
        });
    }

    if (data.highlight_words && data.highlight_words.length > 0) {
        data.highlight_words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedHTML = highlightedHTML.replace(regex, `<span class="highlight-red">$1</span>`);
        });
    }
    document.getElementById('highlighted-text').innerHTML = highlightedHTML || "<em>No text provided</em>";
    document.getElementById('action-msg').innerText = "";
}

function simulateClick() {
    const overlay = document.getElementById('simulation-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.remove('safe-mode');
    document.querySelectorAll('.sim-reveal, .sim-shield').forEach(e => e.classList.add('hidden'));

    setTimeout(() => {
        overlay.classList.add('safe-mode');
        document.querySelectorAll('.sim-reveal, .sim-shield').forEach(e => e.classList.remove('hidden'));
    }, 2000);
}

function closeSimulation() {
    document.getElementById('simulation-overlay').classList.add('hidden');
}

function copyAnalyzedText() {
    const textElement = document.getElementById('highlighted-text');
    const textToCopy = textElement.innerText || textElement.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Text Copied!");
    }).catch(err => {
        console.error("Copy failed", err);
    });
}

async function reportSpam() {
    if (!currentSender) return;
    const res = await fetch(`${SERVER_URL}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: currentSender })
    });
    const data = await res.json();
    document.getElementById('action-msg').innerText = data.message;
    document.getElementById('action-msg').style.color = "var(--danger)";
    showToast("Reported Successfully");
    loadStats();
}

async function markTrusted() {
    if (!currentSender) return;
    const res = await fetch(`${SERVER_URL}/trust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: currentSender })
    });
    const data = await res.json();
    document.getElementById('action-msg').innerText = data.message;
    document.getElementById('action-msg').style.color = "var(--success)";
    showToast("Marked as Trusted");
}

async function loadHistory() {
    try {
        const res = await fetch(`${SERVER_URL}/history`);
        const data = await res.json();

        const hl = document.getElementById('history-list');
        hl.innerHTML = "";

        if (data.length === 0) {
            hl.innerHTML = '<p class="empty-history">No recent checks.</p>';
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = "history-item";

            let colorClass = "bg-low";
            if (item.risk_level === "High") colorClass = "bg-high";
            else if (item.risk_level === "Medium") colorClass = "bg-medium";

            div.innerHTML = `
                <div class="history-item-header">
                    <span>${item.timestamp}</span>
                    <span>${item.mode.toUpperCase()}</span>
                </div>
                <div class="history-item-body">
                    <span class="risk-indicator ${colorClass}"></span>
                    ${item.sender || 'Unknown Sender'} - ${item.risk_score}% Risk
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.text}
                </div>
            `;
            hl.appendChild(div);
        });
    } catch (e) {
        console.error("Failed to load history", e);
    }
}

async function refreshApp() {
    document.getElementById('sender').value = "";
    document.getElementById('message').value = "";
    document.getElementById('subject').value = "";
    document.getElementById('amount').value = "";
    document.getElementById('result-card').classList.add('hidden');
    document.getElementById('result-card').classList.remove('high-risk-pulse');
    document.getElementById('safe-checkmark').classList.add('hidden');

    document.getElementById('risk-gauge-circle').setAttribute('stroke-dasharray', '0, 100');

    try {
        await fetch(`${SERVER_URL}/reset`, { method: "POST" });
    } catch (e) {
        console.error("Failed to reset backend", e);
    }

    currentSafetyXp = 0;
    checksCount = 0;
    localStorage.setItem('fraudshield_xp', '0');
    localStorage.setItem('fraudshield_checks', '0');
    updateSafetyScore();
    updateSafetyStrip();

    await loadHistory();
    await loadStats();
    showToast("Dashboard Reset");
}

function fillScamDemo() {
    const mode = currentMode;
    const scenarios = demoScamScenarios[mode];
    const scenario = scenarios[demoScamIndices[mode]];

    document.getElementById('sender').value = scenario.sender || "";
    document.getElementById('message').value = scenario.text || "";
    document.getElementById('subject').value = scenario.subject || "";
    document.getElementById('amount').value = scenario.amount || "";

    analyze();
    demoScamIndices[mode] = (demoScamIndices[mode] + 1) % scenarios.length;
}

function fillSafeDemo() {
    const mode = currentMode;
    const scenarios = demoSafeScenarios[mode];
    const scenario = scenarios[demoSafeIndices[mode]];

    document.getElementById('sender').value = scenario.sender || "";
    document.getElementById('message').value = scenario.text || "";
    document.getElementById('subject').value = scenario.subject || "";
    document.getElementById('amount').value = scenario.amount || "";

    analyze();
    demoSafeIndices[mode] = (demoSafeIndices[mode] + 1) % scenarios.length;
}

// Feature 3: Guardian Logic
let guardianTips = [
    "💡 Tip: Real banks NEVER ask for your OTP!",
    "💡 Tip: Urgent requests are almost always scams!",
    "💡 Tip: Always verify who is asking for money!"
];

setInterval(() => {
    const tip = document.getElementById('guardian-tip');
    if (tip.classList.contains('hidden') || tip.innerText.startsWith("💡")) {
        tip.innerText = guardianTips[Math.floor(Math.random() * guardianTips.length)];
        tip.classList.remove('hidden');
        document.querySelector('.guardian-icon').style.animation = "bounce 0.5s";
        setTimeout(() => document.querySelector('.guardian-icon').style.animation = "", 500);
    }
}, 30000);

function toggleGuardianChat() {
    const tip = document.getElementById('guardian-tip');
    tip.classList.toggle('hidden');
}

function updateGuardian(risk) {
    const tip = document.getElementById('guardian-tip');
    tip.classList.remove('hidden');
    if (risk === "High") {
        tip.innerText = "🚨 DANGER! This is a scam! Do NOT send money. Block this number immediately!";
    } else if (risk === "Medium") {
        tip.innerText = "⚠️ Be careful! Something looks suspicious here. Verify the sender before doing anything.";
    } else {
        tip.innerText = "✅ Looks safe! But always stay alert. Never share your OTP with anyone.";
    }
    document.querySelector('.guardian-icon').style.animation = "bounce 0.5s";
    setTimeout(() => document.querySelector('.guardian-icon').style.animation = "", 500);
}

// Auto-refresh loops
setInterval(() => {
    loadHistory();
    loadStats();
}, 30000);

// Initialize on start
window.onload = () => {
    if (localStorage.getItem('fraudshield_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerText = "☀️";
    }

    if (!localStorage.getItem('fraudshield_first_visit')) {
        document.getElementById('welcome-modal').classList.remove('hidden');
    }

    updateSafetyScore();
    updateSafetyStrip();
    loadHistory();
    loadStats();
};
