import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc, writeBatch, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDyWPFvO_MDqJbRdMjIv0WUJP4wO93dFnA",
    authDomain: "whisperledger-94715.firebaseapp.com",
    projectId: "whisperledger-94715",
    storageBucket: "whisperledger-94715.firebasestorage.app",
    messagingSenderId: "1064792050841",
    appId: "1:1064792050841:web:9e30d27d9f6aa2e4fe3c08"
};

/* =========================================================================
   THEME
   ========================================================================= */
function initTheme() {
    const apply = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    };
    const toggleBtns = [document.getElementById('themeToggleBtn'), document.getElementById('themeToggleLoginBtn')];
    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem('wl-theme', next); } catch (e) {}
    };
    toggleBtns.forEach(btn => { if (btn) btn.onclick = toggleTheme; });
}

/* =========================================================================
   RESPONSIVE SIDEBAR
   ========================================================================= */
function initSidebar() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebar = () => document.body.classList.remove('sidebar-open');
    if (hamburgerBtn) hamburgerBtn.onclick = () => document.body.classList.toggle('sidebar-open');
    if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;
    document.querySelectorAll('#sidebarNav button').forEach(btn => {
        btn.addEventListener('click', closeSidebar);
    });
}

/* =========================================================================
   TOAST NOTIFICATIONS (replaces alert())
   ========================================================================= */
const toastContainer = document.getElementById('toastContainer');
const TOAST_ICONS = {
    success: 'check-circle-2',
    error: 'x-circle',
    info: 'info'
};

function showToast(message, type = 'info', durationMs = 4200) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${TOAST_ICONS[type] || TOAST_ICONS.info}" class="toast-icon w-4 h-4"></i>
        <span class="flex-1">${esc(message)}</span>
        <i data-lucide="x" class="toast-close w-3.5 h-3.5"></i>
    `;
    toastContainer.appendChild(toast);
    lucide.createIcons();

    const remove = () => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 180);
    };
    toast.querySelector('.toast-close').onclick = remove;
    setTimeout(remove, durationMs);
}

/* =========================================================================
   CONFIRM MODAL (replaces confirm())
   ========================================================================= */
const confirmModal = document.getElementById('confirmModal');
const confirmModalIcon = document.getElementById('confirmModalIcon');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');

function showConfirm(message, { title = 'Please Confirm', danger = false, confirmText = 'Confirm' } = {}) {
    return new Promise((resolve) => {
        if (!confirmModal) { resolve(true); return; }
        confirmModalTitle.innerText = title;
        confirmModalMessage.innerText = message;
        confirmModalConfirmBtn.innerText = confirmText;
        confirmModalConfirmBtn.className = danger ? 'btn btn-danger flex-1' : 'btn btn-primary flex-1';
        confirmModalIcon.className = danger
            ? 'w-12 h-12 rounded-2xl chip chip-danger mx-auto flex items-center justify-center'
            : 'w-12 h-12 rounded-2xl chip chip-brand mx-auto flex items-center justify-center';

        const cleanup = (result) => {
            confirmModal.classList.add('hidden');
            confirmModalCancelBtn.onclick = null;
            confirmModalConfirmBtn.onclick = null;
            resolve(result);
        };

        confirmModalCancelBtn.onclick = () => cleanup(false);
        confirmModalConfirmBtn.onclick = () => cleanup(true);
        confirmModal.classList.remove('hidden');
    });
}

/* =========================================================================
   BADGE HELPERS (canonical status/label pills)
   ========================================================================= */
function badgeHtml(text, variant, square = false) {
    return `<span class="badge badge-${variant}${square ? ' badge-square' : ''}">${esc(text)}</span>`;
}

function userStatusBadge(status) {
    if (status === 'suspended') return badgeHtml('Suspended', 'danger');
    if (status === 'flagged') return badgeHtml('Flagged', 'warning');
    return badgeHtml('Active', 'success');
}

function riskBadge(status) {
    if (status === 'suspended') return badgeHtml('High Risk', 'danger', true);
    if (status === 'flagged') return badgeHtml('Med Risk', 'warning', true);
    return badgeHtml('Low Risk', 'success', true);
}

function pushBadgeHtml(hasToken) {
    return hasToken
        ? '<span class="text-success font-semibold inline-flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-success"></span> Ready</span>'
        : '<span class="text-muted">Missing</span>';
}

function ticketStatusBadge(status) {
    if (status === 'resolved') return badgeHtml('Resolved', 'success');
    if (status === 'replied') return badgeHtml('Replied', 'info');
    return badgeHtml('Received', 'warning');
}

// DOM Elements - Login & Shell
const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const rememberMe = document.getElementById('rememberMe');
const quickTestAdminBtn = document.getElementById('quickTestAdminBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginError = document.getElementById('adminLoginError');
const statusIndicator = document.getElementById('statusIndicator');
const signOutBtn = document.getElementById('signOutBtn');

// Navigation Tabs
const tabUsersBtn = document.getElementById('tabUsersBtn');
const tabBehaviorBtn = document.getElementById('tabBehaviorBtn');
const tabComplianceBtn = document.getElementById('tabComplianceBtn');
const tabRequestsBtn = document.getElementById('tabRequestsBtn');
const tabCommsBtn = document.getElementById('tabCommsBtn');
const tabPlansBtn = document.getElementById('tabPlansBtn');

const tabUsersContent = document.getElementById('tabUsersContent');
const tabBehaviorContent = document.getElementById('tabBehaviorContent');
const tabComplianceContent = document.getElementById('tabComplianceContent');
const tabRequestsContent = document.getElementById('tabRequestsContent');
const tabCommsContent = document.getElementById('tabCommsContent');
const tabPlansContent = document.getElementById('tabPlansContent');

// Plans & Subscriptions Tab Elements
const statPlanTotalUsers = document.getElementById('statPlanTotalUsers');
const statPlanProUsers = document.getElementById('statPlanProUsers');
const statPlanTrialUsers = document.getElementById('statPlanTrialUsers');
const statPlanFreeUsers = document.getElementById('statPlanFreeUsers');
const statPlanMRR = document.getElementById('statPlanMRR');

const planConfigForm = document.getElementById('planConfigForm');
const cfgMonthlyPrice = document.getElementById('cfgMonthlyPrice');
const cfgYearlyPrice = document.getElementById('cfgYearlyPrice');
const cfgDiscountPct = document.getElementById('cfgDiscountPct');
const cfgTrialDays = document.getElementById('cfgTrialDays');
const cfgPromoBanner = document.getElementById('cfgPromoBanner');
const cfgFreeSmsLimit = document.getElementById('cfgFreeSmsLimit');
const cfgFreeRefundLimit = document.getElementById('cfgFreeRefundLimit');
const cfgFreeBudgetLimit = document.getElementById('cfgFreeBudgetLimit');
const savePlanConfigBtn = document.getElementById('savePlanConfigBtn');

const subSearchInput = document.getElementById('subSearchInput');
const subTierFilter = document.getElementById('subTierFilter');
const subTableBody = document.getElementById('subTableBody');
const subscriptionRequestCount = document.getElementById('subscriptionRequestCount');
const subscriptionRequestsBody = document.getElementById('subscriptionRequestsBody');

// Users Tab Elements
const statTotalUsers = document.getElementById('statTotalUsers');
const statActiveUsers = document.getElementById('statActiveUsers');
const statSuspendedUsers = document.getElementById('statSuspendedUsers');
const statPushUsers = document.getElementById('statPushUsers');
const userSearchInput = document.getElementById('userSearchInput');
const userStatusFilter = document.getElementById('userStatusFilter');
const userTableBody = document.getElementById('userTableBody');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');

// User Drawer Elements
const userDetailDrawer = document.getElementById('userDetailDrawer');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const drawerAvatar = document.getElementById('drawerAvatar');
const drawerUserName = document.getElementById('drawerUserName');
const drawerUserEmail = document.getElementById('drawerUserEmail');
const drawerStatusBadge = document.getElementById('drawerStatusBadge');
const drawerRoleBadge = document.getElementById('drawerRoleBadge');
const drawerRiskBadge = document.getElementById('drawerRiskBadge');
const toggleSuspendBtn = document.getElementById('toggleSuspendBtn');
const toggleFlagBtn = document.getElementById('toggleFlagBtn');
const exportGdprBtn = document.getElementById('exportGdprBtn');
const drawerUid = document.getElementById('drawerUid');
const drawerUsername = document.getElementById('drawerUsername');
const drawerCreatedAt = document.getElementById('drawerCreatedAt');
const drawerLastActive = document.getElementById('drawerLastActive');
const drawerExpenseCount = document.getElementById('drawerExpenseCount');
const drawerPushStatus = document.getElementById('drawerPushStatus');
const directPushBtn = document.getElementById('directPushBtn');
const directWaBtn = document.getElementById('directWaBtn');
const directSmsBtn = document.getElementById('directSmsBtn');
const directMailBtn = document.getElementById('directMailBtn');
const drawerAdminNotes = document.getElementById('drawerAdminNotes');
const saveAdminNotesBtn = document.getElementById('saveAdminNotesBtn');
const purgeUserBtn = document.getElementById('purgeUserBtn');

// Telemetry Tab Elements
const behaviorStreamFeed = document.getElementById('behaviorStreamFeed');
const behaviorLogCount = document.getElementById('behaviorLogCount');
const riskCountHigh = document.getElementById('riskCountHigh');
const riskCountSuspended = document.getElementById('riskCountSuspended');
const riskCountNoPush = document.getElementById('riskCountNoPush');

// Compliance Tab Elements
const auditLogCount = document.getElementById('auditLogCount');
const auditTableBody = document.getElementById('auditTableBody');

// Support & Requests Sub-tabs
const subTabSupportBtn = document.getElementById('subTabSupportBtn');
const subTabStatementsBtn = document.getElementById('subTabStatementsBtn');
const supportSection = document.getElementById('supportSection');
const statementsSection = document.getElementById('statementsSection');

const supportCount = document.getElementById('supportCount');
const unresolvedSupportBadge = document.getElementById('unresolvedSupportBadge');
const supportTableBody = document.getElementById('supportTableBody');
const noTicketSelected = document.getElementById('noTicketSelected');
const ticketDetailPanel = document.getElementById('ticketDetailPanel');
const detCaseId = document.getElementById('detCaseId');
const detStatusBadge = document.getElementById('detStatusBadge');
const detSenderName = document.getElementById('detSenderName');
const detSenderEmail = document.getElementById('detSenderEmail');
const detSubject = document.getElementById('detSubject');
const detMessage = document.getElementById('detMessage');
const previousRepliesWrapper = document.getElementById('previousRepliesWrapper');
const previousRepliesList = document.getElementById('previousRepliesList');
const replyMessage = document.getElementById('replyMessage');
const replyBtn = document.getElementById('replyBtn');
const markResolvedBtn = document.getElementById('markResolvedBtn');

const statementCount = document.getElementById('statementCount');
const statementTableBody = document.getElementById('statementTableBody');

// Comms Engine Elements
const selectedAudienceBadge = document.getElementById('selectedAudienceBadge');
const chanPush = document.getElementById('chanPush');
const chanWa = document.getElementById('chanWa');
const chanSms = document.getElementById('chanSms');
const chanMail = document.getElementById('chanMail');
const recipientLabel = document.getElementById('recipientLabel');
const targetUser = document.getElementById('targetUser');
const timeImmediate = document.getElementById('timeImmediate');
const timeScheduled = document.getElementById('timeScheduled');
const sendBtn = document.getElementById('sendBtn');
const trailCount = document.getElementById('trailCount');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const trailTableBody = document.getElementById('trailTableBody');

// Admin Security PIN Modal
const pinModal = document.getElementById('pinModal');
const adminPinInput = document.getElementById('adminPinInput');
const pinErrorMsg = document.getElementById('pinErrorMsg');
const cancelPinBtn = document.getElementById('cancelPinBtn');
const confirmPinBtn = document.getElementById('confirmPinBtn');

// Global Application State
let db;
let auth;
let currentUserAdmin = null;

let allUsers = [];
let selectedUserIds = new Set();
let activeSelectedUser = null;

let globalPiiRevealed = false;
let drawerPiiRevealed = false;

let activeChannel = "push";
let selectedTiming = "immediate";
let scheduledQueue = [];

let allSupportTickets = [];
let selectedTicket = null;
let allStatementRequests = [];
let allSubscriptionRequests = [];
let complianceAuditLogs = [];
let pendingPinCallback = null;

const bootstrapAdminEmails = new Set(["agarwaltanmay401@gmail.com"]);

// PII Masking Utilities
function esc(val) {
    return String(val ?? '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function maskEmail(email) {
    return email || "No Email";
}

function maskPhone(phone) {
    return phone || "N/A";
}

function maskToken(token) {
    return token || "Missing";
}

// Audit Logger
async function logComplianceEvent(action, targetUid, targetEmail, details = {}) {
    if (!db) return;
    try {
        const logRef = doc(collection(db, "compliance_audit_logs"));
        await setDoc(logRef, {
            adminEmail: currentUserAdmin ? currentUserAdmin.email : "system",
            action: action,
            targetUid: targetUid || "N/A",
            targetEmail: targetEmail || "N/A",
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.warn("Compliance log error:", e);
    }
}

// Admin Security PIN Challenge Trigger
function requestAdminPin(callback) {
    pendingPinCallback = callback;
    adminPinInput.value = "";
    pinErrorMsg.classList.add('hidden');
    pinModal.classList.remove('hidden');
    adminPinInput.focus();
}

cancelPinBtn.onclick = () => {
    pinModal.classList.add('hidden');
    pendingPinCallback = null;
};

confirmPinBtn.onclick = () => {
    const pin = adminPinInput.value.trim();
    // Authorized PIN check (default demo 1234 or non-empty)
    if (pin === "1234" || pin === "0000" || pin.length >= 4) {
        pinModal.classList.add('hidden');
        if (typeof pendingPinCallback === "function") {
            pendingPinCallback();
        }
        pendingPinCallback = null;
    } else {
        pinErrorMsg.innerText = "Invalid PIN code. Try '1234'.";
        pinErrorMsg.classList.remove('hidden');
    }
};

// Quick Admin Credential Filler for easy testing
quickTestAdminBtn.onclick = () => {
    adminEmail.value = "agarwaltanmay401@gmail.com";
    adminPassword.value = "Password123!";
};

// Auth Gate logic
function showLoginError(msg) {
    adminLoginError.innerText = msg;
    adminLoginError.classList.remove('hidden');
}

function clearLoginError() {
    adminLoginError.innerText = "";
    adminLoginError.classList.add('hidden');
}

async function requireAdminSession(auth) {
    return new Promise((resolve) => {
        adminLoginForm.onsubmit = async (e) => {
            e.preventDefault();
            clearLoginError();
            const email = adminEmail.value.trim();
            const password = adminPassword.value;
            if (!email || !password) {
                showLoginError("Please provide both email and password.");
                return;
            }

            adminLoginBtn.disabled = true;
            adminLoginBtn.innerText = "Verifying Admin Access...";
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                adminLoginBtn.disabled = false;
                adminLoginBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Sign In to Admin Console';
                lucide.createIcons();

                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    adminLoginError.innerHTML = `
                        <div class="space-y-2">
                            <p class="font-bold text-danger">Sign-in failed (Invalid credentials or account not registered in Firebase Auth yet).</p>
                            <p class="text-[11px] text-secondary">Choose an action below to proceed:</p>
                            <div class="flex flex-col gap-1.5 pt-1">
                                <button type="button" id="autoCreateAdminBtn" class="btn btn-primary text-xs w-full">
                                    <i data-lucide="user-plus" class="w-3.5 h-3.5"></i> Register Account with this Password
                                </button>
                                <button type="button" id="sendResetLinkBtn" class="btn btn-secondary text-xs w-full">
                                    <i data-lucide="mail" class="w-3.5 h-3.5"></i> Send Password Reset Link to ${esc(email)}
                                </button>
                            </div>
                        </div>
                    `;
                    adminLoginError.classList.remove('hidden');
                    lucide.createIcons();

                    const autoCreateBtn = document.getElementById('autoCreateAdminBtn');
                    if (autoCreateBtn) {
                        autoCreateBtn.onclick = async () => {
                            autoCreateBtn.disabled = true;
                            autoCreateBtn.innerText = "Registering Account...";
                            try {
                                await createUserWithEmailAndPassword(auth, email, password);
                                showToast("Admin account registered successfully! Logging you in...", "success");
                            } catch (regErr) {
                                showToast("Registration failed: " + regErr.message, "error");
                                autoCreateBtn.disabled = false;
                                autoCreateBtn.innerText = "Register Account with this Password";
                            }
                        };
                    }

                    const sendResetBtn = document.getElementById('sendResetLinkBtn');
                    if (sendResetBtn) {
                        sendResetBtn.onclick = async () => {
                            sendResetBtn.disabled = true;
                            sendResetBtn.innerText = "Sending Link...";
                            try {
                                await sendPasswordResetEmail(auth, email);
                                showToast(`Password reset link sent to ${email}! Please check your email inbox.`, "success");
                            } catch (resetErr) {
                                showToast("Reset link error: " + resetErr.message, "error");
                            } finally {
                                sendResetBtn.disabled = false;
                                sendResetBtn.innerText = `Send Password Reset Link to ${email}`;
                            }
                        };
                    }
                } else {
                    showLoginError(err.message || "Sign in failed. Check credentials.");
                }
            }
        };

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                appShell.classList.add('hidden');
                loginScreen.classList.remove('hidden');
                adminLoginBtn.disabled = false;
                adminLoginBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Sign In to Admin Console';
                lucide.createIcons();
                return;
            }

            try {
                const token = await user.getIdTokenResult(true);
                const isClaimAdmin = token.claims.admin === true;
                const isBootstrap = bootstrapAdminEmails.has((user.email || "").toLowerCase());

                if (!isClaimAdmin && !isBootstrap) {
                    await signOut(auth);
                    showLoginError("Account signed in is not authorized for Admin Dashboard access.");
                    return;
                }

                currentUserAdmin = user;
                loginScreen.classList.add('hidden');
                appShell.classList.remove('hidden');
                clearLoginError();
                resolve(user);
            } catch (err) {
                await signOut(auth).catch(() => null);
                showLoginError(err.message || "Unable to verify administrative authorization.");
            } finally {
                adminLoginBtn.disabled = false;
                adminLoginBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Sign In to Admin Console';
                lucide.createIcons();
            }
        });
    });
}

// --- TAB SWITCHING SYSTEM FOR SIDEBAR & BREADCRUMBS ---
const activeBreadcrumbTitle = document.getElementById('activeBreadcrumbTitle');

const MAIN_TABS = {
    users: { btn: tabUsersBtn, content: tabUsersContent, title: "Users Directory & Control" },
    behavior: { btn: tabBehaviorBtn, content: tabBehaviorContent, title: "User Telemetry & Behavior Stream" },
    compliance: { btn: tabComplianceBtn, content: tabComplianceContent, title: "Compliance Vault & PII Governance" },
    requests: { btn: tabRequestsBtn, content: tabRequestsContent, title: "Support Ticket Inbox & PDF Requests" },
    comms: { btn: tabCommsBtn, content: tabCommsContent, title: "Promotional Campaigns & Push Engine" },
    plans: { btn: tabPlansBtn, content: tabPlansContent, title: "Plans & Subscriptions Management" }
};

function switchMainTab(tabName) {
    Object.values(MAIN_TABS).forEach(tab => {
        if (tab.btn) tab.btn.classList.remove('is-active');
        if (tab.content) tab.content.classList.add('hidden');
    });

    const target = MAIN_TABS[tabName];
    if (!target) return;
    if (target.btn) target.btn.classList.add('is-active');
    if (target.content) target.content.classList.remove('hidden');
    if (activeBreadcrumbTitle) activeBreadcrumbTitle.innerText = target.title;
}

tabUsersBtn.onclick = () => switchMainTab('users');
tabBehaviorBtn.onclick = () => switchMainTab('behavior');
tabComplianceBtn.onclick = () => switchMainTab('compliance');
tabRequestsBtn.onclick = () => switchMainTab('requests');
tabCommsBtn.onclick = () => switchMainTab('comms');
tabPlansBtn.onclick = () => switchMainTab('plans');

// Sub-tabs in Support & Requests
subTabSupportBtn.onclick = () => {
    subTabSupportBtn.classList.add('is-active');
    subTabStatementsBtn.classList.remove('is-active');
    supportSection.classList.remove('hidden');
    statementsSection.classList.add('hidden');
};
subTabStatementsBtn.onclick = () => {
    subTabSupportBtn.classList.remove('is-active');
    subTabStatementsBtn.classList.add('is-active');
    supportSection.classList.add('hidden');
    statementsSection.classList.remove('hidden');
};

// --- RENDER USERS DIRECTORY TABLE ---
function renderUserTable() {
    userTableBody.innerHTML = '';
    const searchVal = userSearchInput.value.trim().toLowerCase();
    const filterVal = userStatusFilter.value;

    const filtered = allUsers.filter(u => {
        const nameMatch = (u.name || '').toLowerCase().includes(searchVal);
        const emailMatch = (u.email || '').toLowerCase().includes(searchVal);
        const uidMatch = (u.uid || '').toLowerCase().includes(searchVal);
        const matchSearch = nameMatch || emailMatch || uidMatch;

        if (!matchSearch) return false;
        if (filterVal === 'active') return u.status !== 'suspended' && u.status !== 'flagged';
        if (filterVal === 'suspended') return u.status === 'suspended';
        if (filterVal === 'flagged') return u.status === 'flagged';
        return true;
    });

    // Update stats cards
    statTotalUsers.innerText = allUsers.length;
    const activeCount = allUsers.filter(u => u.status !== 'suspended' && u.status !== 'flagged').length;
    const suspendedCount = allUsers.filter(u => u.status === 'suspended' || u.status === 'flagged').length;
    const pushCount = allUsers.filter(u => u.pushToken && (u.pushToken.startsWith('Expo') || u.pushToken.startsWith('Exponent'))).length;

    statActiveUsers.innerText = activeCount;
    statSuspendedUsers.innerText = suspendedCount;
    statPushUsers.innerText = pushCount;

    riskCountHigh.innerText = suspendedCount;
    riskCountSuspended.innerText = suspendedCount;
    riskCountNoPush.innerText = allUsers.length - pushCount;

    if (filtered.length === 0) {
        userTableBody.innerHTML = `
            <tr class="table-row">
                <td colspan="7" class="py-12 text-center text-muted">No matching user records found.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach((data) => {
        const isSelected = selectedUserIds.has(data.uid);
        const tr = document.createElement('tr');
        tr.className = `table-row cursor-pointer${isSelected ? ' table-row-active' : ''}`;

        const statusBadgeMarkup = userStatusBadge(data.status);
        const riskScoreBadgeMarkup = riskBadge(data.status);
        const pushBadgeMarkup = pushBadgeHtml(!!data.pushToken);

        tr.onclick = (e) => {
            if (e.target.type === "checkbox" || e.target.closest('.user-action-btn')) return;
            openUserDrawer(data);
        };

        const maskedDisplayEmail = maskEmail(data.email);

        tr.innerHTML = `
            <td class="py-3.5 text-center">
                <input type="checkbox" class="user-select-checkbox rounded border-strong bg-inputbg text-brand focus:ring-2 focus:ring-brand cursor-pointer w-4 h-4" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="py-3.5">
                <div class="font-bold text-primary flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg chip chip-brand flex items-center justify-center text-xs font-bold">
                        ${esc((data.name || 'U').charAt(0).toUpperCase())}
                    </div>
                    <span>${esc(data.name || 'User')}</span>
                </div>
            </td>
            <td class="py-3.5 text-secondary font-mono text-[11px]">${esc(maskedDisplayEmail)}</td>
            <td class="py-3.5 text-center">${statusBadgeMarkup}</td>
            <td class="py-3.5 text-center">${riskScoreBadgeMarkup}</td>
            <td class="py-3.5 text-center">${pushBadgeMarkup}</td>
            <td class="py-3.5 text-right pr-2 space-x-1">
                <button class="send-comms-btn btn btn-ghost btn-sm text-success">
                    <i data-lucide="send" class="w-3 h-3"></i> Send Comms
                </button>
                <button class="user-action-btn btn btn-ghost btn-sm text-brand">
                    Inspect
                </button>
            </td>
        `;

        const cb = tr.querySelector('.user-select-checkbox');
        cb.onchange = (e) => {
            if (e.target.checked) selectedUserIds.add(data.uid);
            else selectedUserIds.delete(data.uid);
            updateAudienceBadge();
        };

        const sendCommsBtn = tr.querySelector('.send-comms-btn');
        if (sendCommsBtn) {
            sendCommsBtn.onclick = (e) => {
                e.stopPropagation();
                selectedUserIds = new Set([data.uid]);
                updateAudienceBadge();
                switchMainTab('comms');
                if (notifTitleInput) notifTitleInput.focus();
            };
        }

        const inspectBtn = tr.querySelector('.user-action-btn');
        inspectBtn.onclick = (e) => {
            e.stopPropagation();
            openUserDrawer(data);
        };

        userTableBody.appendChild(tr);
        lucide.createIcons();
    });
}

selectAllCheckbox.onchange = (e) => {
    if (e.target.checked) allUsers.forEach(u => selectedUserIds.add(u.uid));
    else selectedUserIds.clear();
    renderUserTable();
    updateAudienceBadge();
};

userSearchInput.oninput = renderUserTable;
userStatusFilter.onchange = renderUserTable;

function updateAudienceBadge() {
    const size = selectedUserIds.size;
    if (size === 0) {
        if (selectedAudienceBadge) selectedAudienceBadge.innerText = "All Registered Users (Broadcast)";
        if (targetUser) targetUser.value = "All Registered Users";
    } else if (size === 1) {
        const singleUid = Array.from(selectedUserIds)[0];
        const u = allUsers.find(x => x.uid === singleUid);
        const name = u ? (u.name || u.email || singleUid.slice(0, 8)) : singleUid.slice(0, 8);
        if (selectedAudienceBadge) selectedAudienceBadge.innerText = `Target: ${name}`;
        if (targetUser) targetUser.value = `Target User: ${name}`;
    } else {
        if (selectedAudienceBadge) selectedAudienceBadge.innerText = `${size} Users Selected`;
        if (targetUser) targetUser.value = `${size} Target Users Selected`;
    }
}

// --- TARGET USER PICKER MODAL SYSTEM ---
const userPickerModal = document.getElementById('userPickerModal');
const openUserPickerBtn = document.getElementById('openUserPickerBtn');
const closeUserPickerBtn = document.getElementById('closeUserPickerBtn');
const pickerSelectAllBtn = document.getElementById('pickerSelectAllBtn');
const pickerClearAllBtn = document.getElementById('pickerClearAllBtn');
const applyUserPickerBtn = document.getElementById('applyUserPickerBtn');
const pickerUserList = document.getElementById('pickerUserList');
const pickerSelectedCount = document.getElementById('pickerSelectedCount');

let tempPickerSet = new Set();

function renderPickerList() {
    if (!pickerUserList) return;
    pickerUserList.innerHTML = '';
    if (allUsers.length === 0) {
        pickerUserList.innerHTML = `<div class="text-muted text-center py-4">No users loaded yet.</div>`;
        return;
    }

    allUsers.forEach(u => {
        const isChecked = tempPickerSet.has(u.uid);
        const item = document.createElement('label');
        item.className = "flex items-center justify-between p-2 rounded-lg hover:bg-hoverbg cursor-pointer text-xs";
        item.innerHTML = `
            <div class="flex items-center gap-2.5 overflow-hidden">
                <input type="checkbox" data-uid="${esc(u.uid)}" class="picker-cb rounded border-strong bg-inputbg text-brand focus:ring-2 focus:ring-brand w-4 h-4 cursor-pointer" ${isChecked ? 'checked' : ''}>
                <div class="truncate">
                    <span class="font-bold text-primary">${esc(u.name || u.username || 'User')}</span>
                    <span class="block text-[10px] text-muted font-mono truncate">${esc(u.email || u.uid)}</span>
                </div>
            </div>
            ${u.pushToken ? badgeHtml('Push Ready', 'success') : badgeHtml('No Token', 'neutral')}
        `;

        const cb = item.querySelector('.picker-cb');
        cb.onchange = (e) => {
            if (e.target.checked) tempPickerSet.add(u.uid);
            else tempPickerSet.delete(u.uid);
            if (pickerSelectedCount) pickerSelectedCount.innerText = `${tempPickerSet.size} Users Selected`;
        };

        pickerUserList.appendChild(item);
    });

    if (pickerSelectedCount) pickerSelectedCount.innerText = `${tempPickerSet.size} Users Selected`;
}

if (openUserPickerBtn) {
    openUserPickerBtn.onclick = () => {
        tempPickerSet = new Set(selectedUserIds);
        renderPickerList();
        userPickerModal.classList.remove('hidden');
    };
}

if (closeUserPickerBtn) {
    closeUserPickerBtn.onclick = () => userPickerModal.classList.add('hidden');
}

if (pickerSelectAllBtn) {
    pickerSelectAllBtn.onclick = () => {
        allUsers.forEach(u => tempPickerSet.add(u.uid));
        renderPickerList();
    };
}

if (pickerClearAllBtn) {
    pickerClearAllBtn.onclick = () => {
        tempPickerSet.clear();
        renderPickerList();
    };
}

if (applyUserPickerBtn) {
    applyUserPickerBtn.onclick = () => {
        selectedUserIds = new Set(tempPickerSet);
        renderUserTable();
        updateAudienceBadge();
        userPickerModal.classList.add('hidden');
    };
}

// --- DEEP USER DRAWER ---
async function openUserDrawer(userObj) {
    activeSelectedUser = userObj;
    drawerPiiRevealed = false;

    drawerAvatar.innerText = (userObj.name || 'U').charAt(0).toUpperCase();
    drawerUserName.innerText = userObj.name || 'User';
    drawerUserEmail.innerText = maskEmail(userObj.email, drawerPiiRevealed);

    drawerUid.innerText = userObj.uid;
    drawerUsername.innerText = userObj.username || 'N/A';
    drawerCreatedAt.innerText = userObj.createdAt ? new Date(userObj.createdAt).toLocaleDateString() : 'N/A';
    drawerLastActive.innerText = userObj.lastActive ? new Date(userObj.lastActive).toLocaleString() : 'N/A';
    drawerPushStatus.innerText = userObj.pushToken ? 'Registered & Valid' : 'Not Registered';

    // Fetch User Expense Count from subcollection
    try {
        const expSnap = await getDocs(collection(db, `users/${userObj.uid}/expenses`));
        drawerExpenseCount.innerText = expSnap.size;
    } catch (e) {
        drawerExpenseCount.innerText = "0";
    }

    // Status badges
    drawerStatusBadge.className = "badge badge-square " + (userObj.status === 'suspended' ? 'badge-danger' : 'badge-success');
    drawerStatusBadge.innerText = userObj.status === 'suspended' ? 'Suspended' : 'Active';

    if (userObj.status === 'suspended') {
        toggleSuspendBtn.innerHTML = '<i data-lucide="user-check" class="w-3.5 h-3.5"></i> Activate Account';
        toggleSuspendBtn.className = "btn btn-success justify-center";
    } else {
        toggleSuspendBtn.innerHTML = '<i data-lucide="user-x" class="w-3.5 h-3.5"></i> Suspend Account';
        toggleSuspendBtn.className = "btn btn-danger justify-center";
    }

    drawerAdminNotes.value = userObj.adminNotes || '';

    userDetailDrawer.classList.remove('hidden');
    lucide.createIcons();
}

function closeDrawer() {
    userDetailDrawer.classList.add('hidden');
}

closeDrawerBtn.onclick = closeDrawer;

// Suspend / Activate Account Action
toggleSuspendBtn.onclick = async () => {
    if (!activeSelectedUser) return;
    const newStatus = activeSelectedUser.status === 'suspended' ? 'active' : 'suspended';

    requestAdminPin(async () => {
        try {
            await updateDoc(doc(db, "users", activeSelectedUser.uid), { status: newStatus });
            activeSelectedUser.status = newStatus;
            await logComplianceEvent("CHANGE_USER_STATUS", activeSelectedUser.uid, activeSelectedUser.email, { newStatus });
            showToast(`User status updated to ${newStatus.toUpperCase()}`, "success");
            openUserDrawer(activeSelectedUser);
            renderUserTable();
        } catch (e) {
            showToast("Failed to update status: " + e.message, "error");
        }
    });
};

// --- DIRECT TARGETED COMMS FROM DRAWER ---
const sendDirectFromDrawer = (channel) => {
    if (!activeSelectedUser) return;
    selectedUserIds = new Set([activeSelectedUser.uid]);
    activeChannel = channel;
    setActiveChannelButton();

    updateAudienceBadge();
    renderUserTable();
    closeDrawer();
    switchMainTab('comms');
    if (notifTitleInput) notifTitleInput.focus();
};

if (directPushBtn) directPushBtn.onclick = () => sendDirectFromDrawer('push');
if (directWaBtn) directWaBtn.onclick = () => sendDirectFromDrawer('whatsapp');
if (directSmsBtn) directSmsBtn.onclick = () => sendDirectFromDrawer('sms');
if (directMailBtn) directMailBtn.onclick = () => sendDirectFromDrawer('email');

// GDPR Data Export Generator
exportGdprBtn.onclick = async () => {
    if (!activeSelectedUser) return;
    requestAdminPin(async () => {
        try {
            // Collect expenses
            const expSnap = await getDocs(collection(db, `users/${activeSelectedUser.uid}/expenses`));
            const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const payload = {
                exportDate: new Date().toISOString(),
                requestedByAdmin: currentUserAdmin?.email,
                userProfile: activeSelectedUser,
                expenses: expenses
            };

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whisperledger_gdpr_export_${activeSelectedUser.uid}.json`;
            a.click();
            URL.revokeObjectURL(url);

            await logComplianceEvent("GDPR_DATA_EXPORT", activeSelectedUser.uid, activeSelectedUser.email);
            showToast("GDPR data export downloaded.", "success");
        } catch (e) {
            showToast("Export failed: " + e.message, "error");
        }
    });
};

// Save Operational Admin Notes
saveAdminNotesBtn.onclick = async () => {
    if (!activeSelectedUser) return;
    const noteText = drawerAdminNotes.value.trim();
    try {
        await updateDoc(doc(db, "users", activeSelectedUser.uid), { adminNotes: noteText });
        activeSelectedUser.adminNotes = noteText;
        showToast("Operational note saved.", "success");
    } catch (e) {
        showToast("Failed to save note: " + e.message, "error");
    }
};

// --- SUPPORT TICKETS & REPLIES ---
function renderSupportTable() {
    supportTableBody.innerHTML = '';
    if (allSupportTickets.length === 0) {
        supportTableBody.innerHTML = `<tr class="table-row"><td colspan="5" class="py-8 text-center text-muted">No support tickets found in Firestore.</td></tr>`;
        return;
    }

    allSupportTickets.forEach((ticket) => {
        const tr = document.createElement('tr');
        const isSelected = selectedTicket && selectedTicket.id === ticket.id;
        tr.className = `table-row cursor-pointer${isSelected ? ' table-row-active' : ''}`;

        const dateStr = ticket.createdAt ? new Date(ticket.createdAt.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

        tr.onclick = () => selectSupportTicket(ticket);

        tr.innerHTML = `
            <td class="py-3.5 font-mono text-muted">#${esc(ticket.id.slice(0,6))}...</td>
            <td class="py-3.5 font-semibold text-primary">${esc(ticket.userName || 'User')}</td>
            <td class="py-3.5 text-secondary truncate max-w-[140px]">${esc(ticket.subject || 'No Subject')}</td>
            <td class="py-3.5 text-center">${ticketStatusBadge(ticket.status)}</td>
            <td class="py-3.5 text-right text-muted text-[11px] pr-2">${esc(dateStr)}</td>
        `;
        supportTableBody.appendChild(tr);
    });
}

function selectSupportTicket(ticket) {
    selectedTicket = ticket;
    renderSupportTable();
    noTicketSelected.classList.add('hidden');
    ticketDetailPanel.classList.remove('hidden');

    detCaseId.innerText = `#${ticket.id}`;
    detStatusBadge.outerHTML = ticketStatusBadge(ticket.status).replace('<span', '<span id="detStatusBadge"');
    detSenderName.innerText = ticket.userName || 'Guest User';
    detSenderEmail.innerText = ticket.userEmail || 'No Email';
    detSubject.innerText = ticket.subject || 'Support Ticket';
    detMessage.innerText = ticket.description || ticket.message || ticket.body || 'No description body provided.';

    replyMessage.value = '';
    replyMessage.focus();
}

replyBtn.onclick = async () => {
    if (!selectedTicket) return;
    const message = replyMessage.value.trim();
    if (!message) { showToast("Please type your reply first.", "error"); return; }

    replyBtn.disabled = true;
    replyBtn.innerText = "Dispatching Email Reply...";

    try {
        // 1. Write to mail collection for email dispatch ONLY (no push notifications)
        if (selectedTicket.userEmail) {
            await setDoc(doc(collection(db, "mail")), {
                to: [selectedTicket.userEmail],
                message: {
                    subject: `Re: WhisperLedger Support [Ticket #${selectedTicket.id}]`,
                    text: message + "\n\n---\nWhisperLedger Customer Support Team"
                }
            });
        }

        // 2. Update ticket status & append reply history (no push notification)
        await updateDoc(doc(db, "support_cases", selectedTicket.id), {
            status: "replied",
            replies: arrayUnion({ message, sentAt: Date.now() })
        });

        await logComplianceEvent("DISPATCH_SUPPORT_REPLY_EMAIL", selectedTicket.id, selectedTicket.userEmail || "No Email");

        showToast("Official Support reply dispatched strictly via Email!", "success");
        replyMessage.value = '';
    } catch (e) {
        showToast("Failed to send reply: " + e.message, "error");
    } finally {
        replyBtn.disabled = false;
        replyBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Send Official Email Reply';
        lucide.createIcons();
    }
};

markResolvedBtn.onclick = async () => {
    if (!selectedTicket) return;
    try {
        await updateDoc(doc(db, "support_cases", selectedTicket.id), { status: "resolved" });
        showToast("Ticket marked as Resolved.", "success");
    } catch (e) {
        showToast("Failed: " + e.message, "error");
    }
};

// --- STATEMENT REQUESTS RENDER ---
function renderStatementTable() {
    statementTableBody.innerHTML = '';
    if (allStatementRequests.length === 0) {
        statementTableBody.innerHTML = `<tr class="table-row"><td colspan="6" class="py-8 text-center text-muted">No financial statement download requests recorded yet.</td></tr>`;
        return;
    }

    allStatementRequests.forEach(req => {
        const tr = document.createElement('tr');
        tr.className = "table-row";

        const dateStr = req.requestedAt ? new Date(req.requestedAt).toLocaleString() : 'N/A';

        tr.innerHTML = `
            <td class="py-3 font-mono text-brand">#${esc(req.id.slice(0,6))}</td>
            <td class="py-3 font-mono text-muted">${esc(req.userId || 'Guest')}</td>
            <td class="py-3 text-center">${badgeHtml(req.format || 'PDF', 'brand', true)}</td>
            <td class="py-3 text-center text-secondary font-semibold">${esc(req.month || 'Month')} ${esc(req.year || '')}</td>
            <td class="py-3 text-center">${badgeHtml(req.status || 'Completed', 'success', true)}</td>
            <td class="py-3 text-right text-muted text-[11px] pr-2">${esc(dateStr)}</td>
        `;
        statementTableBody.appendChild(tr);
    });
}

// --- FIREBASE INITIALIZATION & REAL-TIME SNAPSHOTS ---
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    await requireAdminSession(auth);
    statusIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-success"></span> Connected to Firebase';
    signOutBtn.onclick = () => signOut(auth);

    // 1. Real-time Users Snapshot
    onSnapshot(collection(db, "users"), (snapshot) => {
        allUsers = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (!d.uid) d.uid = docSnap.id;
            allUsers.push(d);
        });
        renderUserTable();
        renderSubscriptionsTable();
        renderSubscriptionRequests();
    });

    // 1.1 Real-time Plan Config Snapshot & Controller
    initPlanConfigListener();

    // 1.2 Mobile Subscription Upgrade / Cancel Requests
    const qSubscriptionRequests = query(collection(db, "subscription_requests"), orderBy("createdAt", "desc"));
    onSnapshot(qSubscriptionRequests, (snapshot) => {
        allSubscriptionRequests = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            d.id = docSnap.id;
            allSubscriptionRequests.push(d);
        });
        renderSubscriptionRequests();
    });

    // 2. Real-time Support Cases Snapshot
    const qSupport = query(collection(db, "support_cases"), orderBy("createdAt", "desc"));
    onSnapshot(qSupport, (snapshot) => {
        allSupportTickets = [];
        let unresolved = 0;
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            d.id = docSnap.id;
            allSupportTickets.push(d);
            if (d.status === "received") unresolved++;
        });

        supportCount.innerText = `${allSupportTickets.length} Tickets`;
        if (unresolved > 0) {
            unresolvedSupportBadge.innerText = unresolved;
            unresolvedSupportBadge.classList.remove('hidden');
        } else {
            unresolvedSupportBadge.classList.add('hidden');
        }
        renderSupportTable();
    });

    // 3. Real-time Statement Requests Snapshot
    onSnapshot(collection(db, "statement_requests"), (snapshot) => {
        allStatementRequests = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            d.id = docSnap.id;
            allStatementRequests.push(d);
        });
        statementCount.innerText = `${allStatementRequests.length} Requests`;
        renderStatementTable();
    });

    // 4. Compliance Audit Logs Snapshot
    onSnapshot(collection(db, "compliance_audit_logs"), (snapshot) => {
        auditTableBody.innerHTML = '';
        auditLogCount.innerText = `${snapshot.size} Audit Records`;

        if (snapshot.empty) {
            auditTableBody.innerHTML = `<tr class="table-row"><td colspan="5" class="py-8 text-center text-muted">No compliance audit events logged yet.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const tr = document.createElement('tr');
            tr.className = "table-row";

            const timeStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';

            tr.innerHTML = `
                <td class="py-3 text-muted font-mono text-[11px]">${esc(timeStr)}</td>
                <td class="py-3 font-semibold text-brand">${esc(d.adminEmail || 'admin')}</td>
                <td class="py-3 font-bold text-primary">${esc(d.action)}</td>
                <td class="py-3 font-mono text-secondary">${esc(d.targetEmail || d.targetUid)}</td>
                <td class="py-3 text-right text-muted text-[11px] pr-2">${esc(JSON.stringify(d.details || {}))}</td>
            `;
            auditTableBody.appendChild(tr);
        });
    });

    // 5. Broadcast Trails Snapshot
    const qTrails = query(collection(db, "broadcast_history"), orderBy("sentAt", "desc"), limit(50));
    onSnapshot(qTrails, (snapshot) => {
        trailTableBody.innerHTML = '';
        trailCount.innerText = `${snapshot.size} Broadcasts`;

        if (snapshot.empty) {
            trailTableBody.innerHTML = `<tr class="table-row"><td colspan="6" class="py-8 text-center text-muted">No broadcast history logged yet.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const tr = document.createElement('tr');
            tr.className = "table-row";
            const timeStr = d.sentAt ? new Date(d.sentAt.seconds * 1000).toLocaleString() : 'Pending...';

            tr.innerHTML = `
                <td class="py-3 text-muted text-[11px]">${esc(timeStr)}</td>
                <td class="py-3 text-center">${badgeHtml(d.channel, 'brand', true)}</td>
                <td class="py-3 font-semibold text-primary truncate max-w-[120px]">${esc(d.title)}</td>
                <td class="py-3 text-secondary truncate max-w-[200px]">${esc(d.body)}</td>
                <td class="py-3 text-right font-medium text-secondary">${Array.isArray(d.recipients) ? d.recipients.length : 1} user(s)</td>
                <td class="py-3 text-right pr-2">
                    <button class="delete-trail-btn btn btn-ghost btn-icon text-muted hover:text-danger">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </td>
            `;

            const btn = tr.querySelector('.delete-trail-btn');
            btn.onclick = async () => {
                const confirmed = await showConfirm("Delete this broadcast history entry? This cannot be undone.", { title: "Delete Broadcast Entry", danger: true, confirmText: "Delete" });
                if (confirmed) {
                    await deleteDoc(doc(db, "broadcast_history", docSnap.id));
                    showToast("Broadcast entry deleted.", "success");
                }
            };
            trailTableBody.appendChild(tr);
        });
        lucide.createIcons();
    });

} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// Live Smartphone Push Preview & Character Counter Synchronizer
const notifTitleInput = document.getElementById('notifTitle');
const notifBodyInput = document.getElementById('notifBody');
const notifImageInput = document.getElementById('notifImage');
const previewTitle = document.getElementById('previewTitle');
const previewBody = document.getElementById('previewBody');
const previewImage = document.getElementById('previewImage');
const previewImageWrapper = document.getElementById('previewImageWrapper');
const titleCharCount = document.getElementById('titleCharCount');
const bodyCharCount = document.getElementById('bodyCharCount');
const clearImageBtn = document.getElementById('clearImageBtn');

function updatePreview() {
    if (!notifTitleInput || !notifBodyInput) return;
    const titleVal = notifTitleInput.value.trim();
    const bodyVal = notifBodyInput.value.trim();
    const imageVal = notifImageInput ? notifImageInput.value.trim() : '';

    if (previewTitle) {
        previewTitle.innerText = titleVal || "🎁 Special Offer: 50% Off WhisperLedger Pro!";
    }
    if (previewBody) {
        previewBody.innerText = bodyVal || "Upgrade to WhisperLedger Pro today for 50% off and unlock unlimited AI receipt parsing & auto SMS recovery.";
    }
    if (previewImage && previewImageWrapper) {
        if (imageVal) {
            previewImage.src = imageVal;
            previewImageWrapper.classList.remove('hidden');
        } else {
            previewImage.src = '';
            previewImageWrapper.classList.add('hidden');
        }
    }
    if (titleCharCount) {
        titleCharCount.innerText = `${notifTitleInput.value.length} / 60`;
    }
    if (bodyCharCount) {
        bodyCharCount.innerText = `${notifBodyInput.value.length} / 240`;
    }
}

if (notifTitleInput) notifTitleInput.oninput = updatePreview;
if (notifBodyInput) notifBodyInput.oninput = updatePreview;
if (notifImageInput) notifImageInput.oninput = updatePreview;

// Image Preset Button Click Listeners
document.querySelectorAll('.img-preset-btn').forEach(btn => {
    btn.onclick = () => {
        if (notifImageInput) {
            notifImageInput.value = btn.dataset.url || '';
            updatePreview();
        }
    };
});

if (clearImageBtn) {
    clearImageBtn.onclick = () => {
        if (notifImageInput) {
            notifImageInput.value = '';
            updatePreview();
        }
    };
}

// Notification Template Gallery 1-Click Card Listeners
document.querySelectorAll('.notif-template-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.notif-template-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        if (notifTitleInput) notifTitleInput.value = btn.dataset.title || '';
        if (notifBodyInput) notifBodyInput.value = btn.dataset.body || '';
        if (notifImageInput) notifImageInput.value = btn.dataset.image || '';
        updatePreview();
    };
});

// Channel Selection Handler
const channels = [
    { btn: chanPush, name: 'push' },
    { btn: chanWa, name: 'whatsapp' },
    { btn: chanSms, name: 'sms' },
    { btn: chanMail, name: 'email' }
];

function setActiveChannelButton() {
    channels.forEach(c => {
        if (c.btn) c.btn.classList.toggle('is-active', c.name === activeChannel);
    });
}
setActiveChannelButton();

channels.forEach(ch => {
    if (!ch.btn) return;
    ch.btn.onclick = () => {
        activeChannel = ch.name;
        setActiveChannelButton();
    };
});

// Delivery Timing Switcher
timeImmediate.onclick = () => {
    selectedTiming = "immediate";
    timeImmediate.classList.add('is-active');
    timeScheduled.classList.remove('is-active');
};

timeScheduled.onclick = () => {
    selectedTiming = "scheduled";
    timeScheduled.classList.add('is-active');
    timeImmediate.classList.remove('is-active');
    showToast("Scheduled campaign mode activated.", "info");
};

// Clear Broadcast History
clearHistoryBtn.onclick = async () => {
    if (!db) return;
    const confirmed = await showConfirm("Are you sure you want to clear all campaign broadcast history? This cannot be undone.", { title: "Clear Broadcast History", danger: true, confirmText: "Clear History" });
    if (!confirmed) return;
    requestAdminPin(async () => {
        try {
            const snap = await getDocs(collection(db, "broadcast_history"));
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            showToast("Campaign broadcast history cleared.", "success");
        } catch (e) {
            showToast("Clear failed: " + e.message, "error");
        }
    });
};

// --- BROADCAST SUBMIT DISPATCHER ---
sendBtn.onclick = async () => {
    const title = notifTitleInput ? notifTitleInput.value.trim() : '';
    const body = notifBodyInput ? notifBodyInput.value.trim() : '';
    const imageUrl = notifImageInput ? notifImageInput.value.trim() : '';

    if (!title || !body) {
        showToast("Please provide both campaign title and message body.", "error");
        return;
    }

    const targetUsers = selectedUserIds.size > 0
        ? allUsers.filter(u => selectedUserIds.has(u.uid))
        : allUsers;

    if (targetUsers.length === 0) {
        showToast("No registered users available to receive broadcast.", "error");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerText = "Dispatching Campaign...";

    try {
        const notifId = "broadcast_" + Date.now();

        // 1. Write Firestore notification records for in-app list
        const writes = targetUsers.map(u => {
            return setDoc(doc(db, `users/${u.uid}/notifications`, notifId), {
                title: title,
                body: body,
                imageUrl: imageUrl,
                notificationType: "admin_broadcast",
                channel: activeChannel,
                read: false,
                createdAt: Date.now()
            });
        });
        await Promise.all(writes);

        // 2. Dispatch Direct HTTP Push Request ONLY IF CHANNEL IS 'push'!
        let sentPushCount = 0;
        if (activeChannel === "push") {
            const validExpoTokens = targetUsers
                .map(u => u.pushToken)
                .filter(t => typeof t === "string" && (t.startsWith("ExpoPushToken") || t.startsWith("ExponentPushToken")));

            if (validExpoTokens.length > 0) {
                sentPushCount = validExpoTokens.length;
                try {
                    await fetch("https://exp.host/--/api/v2/push/send", {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(validExpoTokens.map(token => {
                            let fullImageUrl = imageUrl;
                            if (imageUrl && !imageUrl.startsWith('http')) {
                                try { fullImageUrl = new URL(imageUrl, window.location.href).href; } catch(e) {}
                            }
                            return {
                                to: token,
                                sound: "default",
                                title: title,
                                body: body,
                                priority: "high",
                                channelId: "default",
                                _displayInForeground: true,
                                mutableContent: true,
                                data: {
                                    notificationType: "admin_broadcast",
                                    title: title,
                                    body: body,
                                    imageUrl: fullImageUrl,
                                    image: fullImageUrl,
                                    picture: fullImageUrl,
                                    bigPictureUrl: fullImageUrl,
                                    pictureUrl: fullImageUrl,
                                    style: "picture"
                                },
                                ...(fullImageUrl ? {
                                    richMedia: { url: fullImageUrl },
                                    image: fullImageUrl,
                                    attachments: [{ url: fullImageUrl, identifier: "image" }]
                                } : {})
                            };
                        }))
                    });
                    console.log(`[Push Engine] Expo Push API invoked for ${validExpoTokens.length} active device token(s).`);
                } catch (pushErr) {
                    console.warn("[Push Engine] Expo Push API fetch failed:", pushErr);
                }
            }
        }

        // 3. Save Admin Audit Trail
        await setDoc(doc(collection(db, "broadcast_history")), {
            title: title,
            body: body,
            imageUrl: imageUrl,
            channel: activeChannel,
            timing: selectedTiming,
            recipients: targetUsers.map(u => ({ uid: u.uid, email: u.email })),
            sentAt: serverTimestamp()
        });

        await logComplianceEvent("DISPATCH_PROMOTIONAL_CAMPAIGN", "multiple", `${targetUsers.length}_users`, {
            title,
            channel: activeChannel,
            hasImage: !!imageUrl,
            expoPushTokensSent: sentPushCount
        });

        const channelName = activeChannel === "push" ? "Push Notification" : activeChannel === "email" ? "Email" : activeChannel === "whatsapp" ? "WhatsApp" : "SMS";
        showToast(`Success! ${channelName} Campaign dispatched to ${targetUsers.length} user(s)!`, "success");
        if (notifTitleInput) notifTitleInput.value = '';
        if (notifBodyInput) notifBodyInput.value = '';
        if (notifImageInput) notifImageInput.value = '';
        updatePreview();
    } catch (e) {
        showToast("Dispatch failed: " + e.message, "error");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Dispatch Notification Now';
        lucide.createIcons();
    }
};

/* =========================================================================
   PLANS & SUBSCRIPTIONS CONTROLLER & TIER MANAGER
   ========================================================================= */
let currentPlanConfig = {
    monthlyPrice: 99,
    yearlyPrice: 799,
    discountPercentage: 33,
    trialDays: 7,
    promoBanner: "Launch Offer: 7 Days Free Trial on All Pro Features",
    freeSmsLookbackLimit: 10,
    freeRefundCaseLimit: 2,
    freeBudgetLimit: 1
};

function hasActiveProAccess(sub = {}) {
    if (sub.tier !== 'pro') return false;
    if (sub.isLifetime || sub.plan === 'lifetime') return true;
    if (sub.status !== 'active') return false;
    return !sub.expiresAt || Date.now() <= sub.expiresAt;
}

function isActiveTrial(sub = {}) {
    return hasActiveProAccess(sub) && sub.plan === 'trial';
}

function normalizePositiveInt(value, fallback, min = 0, max = 100000) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
}

function initPlanConfigListener() {
    onSnapshot(doc(db, "app_config", "subscription_plans"), (snap) => {
        if (snap.exists()) {
            currentPlanConfig = { ...currentPlanConfig, ...snap.data() };
            if (cfgMonthlyPrice) cfgMonthlyPrice.value = currentPlanConfig.monthlyPrice || 99;
            if (cfgYearlyPrice) cfgYearlyPrice.value = currentPlanConfig.yearlyPrice || 799;
            if (cfgDiscountPct) cfgDiscountPct.value = currentPlanConfig.discountPercentage || 33;
            if (cfgTrialDays) cfgTrialDays.value = currentPlanConfig.trialDays || 7;
            if (cfgPromoBanner) cfgPromoBanner.value = currentPlanConfig.promoBanner || "";
            if (cfgFreeSmsLimit) cfgFreeSmsLimit.value = currentPlanConfig.freeSmsLookbackLimit ?? 10;
            if (cfgFreeRefundLimit) cfgFreeRefundLimit.value = currentPlanConfig.freeRefundCaseLimit ?? 2;
            if (cfgFreeBudgetLimit) cfgFreeBudgetLimit.value = currentPlanConfig.freeBudgetLimit ?? 1;
        } else {
            setDoc(doc(db, "app_config", "subscription_plans"), currentPlanConfig);
        }
        renderSubscriptionsTable();
    });

    if (planConfigForm) {
        planConfigForm.onsubmit = async (e) => {
            e.preventDefault();
            const monthly = parseInt(cfgMonthlyPrice.value, 10) || 99;
            const yearly = parseInt(cfgYearlyPrice.value, 10) || 799;
            const discount = parseInt(cfgDiscountPct.value, 10) || 33;
            const trial = parseInt(cfgTrialDays.value, 10) || 7;
            const promo = cfgPromoBanner.value.trim();
            const freeSmsLookbackLimit = normalizePositiveInt(cfgFreeSmsLimit?.value, 10, 0, 100);
            const freeRefundCaseLimit = normalizePositiveInt(cfgFreeRefundLimit?.value, 2, 0, 100);
            const freeBudgetLimit = normalizePositiveInt(cfgFreeBudgetLimit?.value, 1, 0, 100);

            savePlanConfigBtn.disabled = true;
            savePlanConfigBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...';
            try {
                await setDoc(doc(db, "app_config", "subscription_plans"), {
                    monthlyPrice: monthly,
                    yearlyPrice: yearly,
                    discountPercentage: discount,
                    trialDays: trial,
                    promoBanner: promo,
                    freeSmsLookbackLimit,
                    freeRefundCaseLimit,
                    freeBudgetLimit,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUserAdmin ? currentUserAdmin.email : "admin"
                }, { merge: true });
                showToast("Plan configuration published to all users successfully!", "success");
                logComplianceEvent("UPDATE_PLAN_CONFIG", "GLOBAL", "ALL_USERS", {
                    monthly,
                    yearly,
                    discount,
                    trial,
                    freeSmsLookbackLimit,
                    freeRefundCaseLimit,
                    freeBudgetLimit
                });
            } catch (err) {
                console.error("Save plan config error:", err);
                showToast("Failed to save plan config: " + err.message, "error");
            } finally {
                savePlanConfigBtn.disabled = false;
                savePlanConfigBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save &amp; Publish Configuration';
                lucide.createIcons();
            }
        };
    }

    if (subSearchInput) subSearchInput.oninput = renderSubscriptionsTable;
    if (subTierFilter) subTierFilter.onchange = renderSubscriptionsTable;
}

function renderSubscriptionsTable() {
    if (!subTableBody) return;
    subTableBody.innerHTML = '';

    const searchVal = (subSearchInput?.value || '').trim().toLowerCase();
    const filterVal = subTierFilter?.value || 'all';

    let totalPro = 0;
    let totalTrials = 0;
    let totalFree = 0;
    let mrrTotal = 0;

    const filtered = allUsers.filter(u => {
        const sub = u.subscription || {};
        const isPro = hasActiveProAccess(sub);
        const isTrial = isActiveTrial(sub);

        if (isPro) {
            totalPro++;
            if (isTrial) totalTrials++;
            if (sub.plan === 'yearly') {
                mrrTotal += Math.round((currentPlanConfig.yearlyPrice || 799) / 12);
            } else if (!sub.isLifetime && !isTrial) {
                mrrTotal += (currentPlanConfig.monthlyPrice || 99);
            }
        } else {
            totalFree++;
        }

        const nameMatch = (u.name || '').toLowerCase().includes(searchVal);
        const emailMatch = (u.email || '').toLowerCase().includes(searchVal);
        const uidMatch = (u.uid || '').toLowerCase().includes(searchVal);
        const matchSearch = nameMatch || emailMatch || uidMatch;

        if (!matchSearch) return false;
        if (filterVal === 'pro' && !isPro) return false;
        if (filterVal === 'trial' && !isTrial) return false;
        if (filterVal === 'free' && isPro) return false;
        return true;
    });

    if (statPlanTotalUsers) statPlanTotalUsers.innerText = allUsers.length;
    if (statPlanProUsers) statPlanProUsers.innerText = totalPro;
    if (statPlanTrialUsers) statPlanTrialUsers.innerText = totalTrials;
    if (statPlanFreeUsers) statPlanFreeUsers.innerText = totalFree;
    if (statPlanMRR) statPlanMRR.innerText = `₹${mrrTotal.toLocaleString('en-IN')}`;

    if (filtered.length === 0) {
        subTableBody.innerHTML = `
            <tr class="table-row">
                <td colspan="6" class="py-8 text-center text-muted">No matching subscriber records found.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(u => {
        const sub = u.subscription || {};
        const isPro = hasActiveProAccess(sub);
        const isTrial = isActiveTrial(sub);

        const tr = document.createElement('tr');
        tr.className = "table-row";

        let tierBadge = isPro
            ? `<span class="badge badge-brand bg-amber-500/15 text-amber-500 border border-amber-500/30">${isTrial ? 'TRIAL' : 'PRO'}</span>`
            : `<span class="badge badge-neutral">FREE</span>`;

        let planText = isPro
            ? (sub.isLifetime ? "VIP Lifetime" : (sub.plan === 'yearly' ? 'Annual (₹' + currentPlanConfig.yearlyPrice + ')' : (sub.plan === 'trial' ? `${currentPlanConfig.trialDays || 7}-Day Trial` : 'Monthly (₹' + currentPlanConfig.monthlyPrice + ')')))
            : "Standard Free";

        let expiresText = isPro
            ? (sub.isLifetime ? "Never (Lifetime)" : (sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-IN") : "Active"))
            : "—";

        tr.innerHTML = `
            <td class="py-3 pl-2">
                <div class="font-bold text-primary flex items-center gap-2">
                    <div class="w-6 h-6 rounded-md chip chip-brand flex items-center justify-center text-[10px] font-bold">
                        ${esc((u.name || 'U').charAt(0).toUpperCase())}
                    </div>
                    <span>${esc(u.name || 'User')}</span>
                </div>
            </td>
            <td class="py-3 text-secondary font-mono text-[11px]">${esc(u.email || 'No Email')}</td>
            <td class="py-3 text-center">${tierBadge}</td>
            <td class="py-3 text-center text-secondary">${esc(planText)}</td>
            <td class="py-3 text-center text-muted">${esc(expiresText)}</td>
            <td class="py-3 text-right pr-2">
                <div class="flex items-center justify-end gap-1.5">
                    ${!isPro || !sub.isLifetime ? `
                        <button class="btn btn-secondary btn-sm text-[11px] grant-lifetime-btn text-amber-500 hover:text-amber-400" title="Grant Lifetime VIP Access">
                            <i data-lucide="award" class="w-3.5 h-3.5"></i> VIP Lifetime
                        </button>
                        <button class="btn btn-secondary btn-sm text-[11px] grant-30d-btn text-brand" title="Grant 30 Days Pro">
                            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> +30 Days
                        </button>
                    ` : ''}
                    ${isPro ? `
                        <button class="btn btn-ghost btn-sm text-[11px] reset-free-btn text-danger hover:bg-danger/10" title="Reset to Free Tier">
                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Free
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        const lifetimeBtn = tr.querySelector('.grant-lifetime-btn');
        if (lifetimeBtn) {
            lifetimeBtn.onclick = async () => {
                const ok = await showConfirm(`Upgrade ${u.name || u.email} to Lifetime Pro with zero expiration?`, {
                    title: "Grant VIP Lifetime Pro?",
                    confirmText: "Grant VIP Pro"
                });
                if (ok) {
                    await setProTier(u.uid, u.email, "lifetime", true);
                }
            };
        }

        const grant30dBtn = tr.querySelector('.grant-30d-btn');
        if (grant30dBtn) {
            grant30dBtn.onclick = async () => {
                await setProTier(u.uid, u.email, "monthly", false, 30);
            };
        }

        const resetFreeBtn = tr.querySelector('.reset-free-btn');
        if (resetFreeBtn) {
            resetFreeBtn.onclick = async () => {
                const ok = await showConfirm(`Revert ${u.name || u.email} back to standard Free tier?`, {
                    title: "Reset to Free Tier?",
                    danger: true,
                    confirmText: "Revert to Free"
                });
                if (ok) {
                    await resetToFree(u.uid, u.email);
                }
            };
        }

        subTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

function renderSubscriptionRequests() {
    if (!subscriptionRequestsBody) return;
    subscriptionRequestsBody.innerHTML = '';

    const pendingRequests = allSubscriptionRequests.filter(req => (req.status || 'pending') === 'pending');
    if (subscriptionRequestCount) {
        subscriptionRequestCount.innerText = `${pendingRequests.length} Pending`;
    }

    if (allSubscriptionRequests.length === 0) {
        subscriptionRequestsBody.innerHTML = `
            <tr class="table-row">
                <td colspan="5" class="py-8 text-center text-muted">No mobile subscription requests yet.</td>
            </tr>
        `;
        return;
    }

    allSubscriptionRequests.slice(0, 25).forEach(req => {
        const user = allUsers.find(u => u.uid === req.userId) || {};
        const status = req.status || 'pending';
        const requestedPlan = req.requestedPlan || (req.requestType === 'cancel_request' ? 'cancel' : 'monthly');
        const isPending = status === 'pending';
        const tr = document.createElement('tr');
        tr.className = "table-row";

        const requestedAt = req.createdAt
            ? new Date(req.createdAt).toLocaleString("en-IN")
            : (req.createdAtServer?.seconds ? new Date(req.createdAtServer.seconds * 1000).toLocaleString("en-IN") : "Just now");

        tr.innerHTML = `
            <td class="py-3 pl-2">
                <div class="font-bold text-primary">${esc(user.name || req.email || 'Mobile User')}</div>
                <div class="text-[11px] text-muted font-mono">${esc(req.email || user.email || req.userId || 'No Email')}</div>
                <div class="text-[10px] text-muted mt-0.5">${esc(requestedAt)}</div>
            </td>
            <td class="py-3 text-center">${badgeHtml((req.requestType || 'upgrade_request').replace(/_/g, ' '), req.requestType === 'cancel_request' ? 'warning' : 'brand', true)}</td>
            <td class="py-3 text-center text-secondary font-semibold">${esc(String(requestedPlan).toUpperCase())}</td>
            <td class="py-3 text-center">${badgeHtml(status, status === 'pending' ? 'warning' : status === 'approved' ? 'success' : 'neutral', true)}</td>
            <td class="py-3 text-right pr-2">
                <div class="flex items-center justify-end gap-1.5">
                    ${isPending && req.requestType !== 'cancel_request' ? `
                        <button class="btn btn-primary btn-sm approve-sub-request-btn">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i> Approve
                        </button>
                    ` : ''}
                    ${isPending && req.requestType === 'cancel_request' ? `
                        <button class="btn btn-warning btn-sm approve-cancel-request-btn">
                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Free
                        </button>
                    ` : ''}
                    ${isPending ? `
                        <button class="btn btn-ghost btn-sm dismiss-sub-request-btn text-muted">
                            Dismiss
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        const approveBtn = tr.querySelector('.approve-sub-request-btn');
        if (approveBtn) {
            approveBtn.onclick = async () => {
                if (!req.userId) {
                    showToast("Cannot approve request: missing user ID.", "error");
                    return;
                }
                const plan = req.requestType === 'trial_request' ? 'trial' : (req.requestedPlan || 'monthly');
                const days = plan === 'trial' ? (currentPlanConfig.trialDays || 7) : (plan === 'yearly' ? 365 : 30);
                await setProTier(req.userId, req.email || user.email, plan, false, days);
                await updateDoc(doc(db, "subscription_requests", req.id), {
                    status: "approved",
                    handledAt: serverTimestamp(),
                    handledBy: currentUserAdmin ? currentUserAdmin.email : "admin"
                });
                logComplianceEvent("APPROVE_SUBSCRIPTION_REQUEST", req.userId, req.email || user.email, { plan, days, requestId: req.id });
            };
        }

        const approveCancelBtn = tr.querySelector('.approve-cancel-request-btn');
        if (approveCancelBtn) {
            approveCancelBtn.onclick = async () => {
                if (!req.userId) {
                    showToast("Cannot reset request: missing user ID.", "error");
                    return;
                }
                await resetToFree(req.userId, req.email || user.email);
                await updateDoc(doc(db, "subscription_requests", req.id), {
                    status: "approved",
                    handledAt: serverTimestamp(),
                    handledBy: currentUserAdmin ? currentUserAdmin.email : "admin"
                });
                logComplianceEvent("APPROVE_SUBSCRIPTION_CANCEL_REQUEST", req.userId, req.email || user.email, { requestId: req.id });
            };
        }

        const dismissBtn = tr.querySelector('.dismiss-sub-request-btn');
        if (dismissBtn) {
            dismissBtn.onclick = async () => {
                const ok = await showConfirm("Dismiss this mobile subscription request without changing the user's tier?", {
                    title: "Dismiss Subscription Request",
                    confirmText: "Dismiss"
                });
                if (!ok) return;
                await updateDoc(doc(db, "subscription_requests", req.id), {
                    status: "dismissed",
                    handledAt: serverTimestamp(),
                    handledBy: currentUserAdmin ? currentUserAdmin.email : "admin"
                });
                showToast("Subscription request dismissed.", "info");
            };
        }

        subscriptionRequestsBody.appendChild(tr);
    });

    lucide.createIcons();
}

async function setProTier(uid, email, plan = "monthly", isLifetime = false, days = 30) {
    try {
        const now = Date.now();
        const expiresAt = isLifetime ? null : (now + days * 24 * 60 * 60 * 1000);
        const subData = {
            tier: "pro",
            plan: plan,
            status: "active",
            startedAt: now,
            expiresAt: expiresAt,
            isLifetime: isLifetime,
            upgradedBy: currentUserAdmin ? currentUserAdmin.email : "admin",
            upgradedAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", uid), { subscription: subData }, { merge: true });
        showToast(`Upgraded ${email || uid} to Pro (${plan})!`, "success");
        logComplianceEvent("UPGRADE_USER_PRO", uid, email, { plan, isLifetime, days });
    } catch (e) {
        console.error("setProTier error:", e);
        showToast("Failed to update subscription: " + e.message, "error");
    }
}

async function resetToFree(uid, email) {
    try {
        const subData = {
            tier: "free",
            plan: "free",
            status: "none",
            expiresAt: null,
            isLifetime: false,
            resetBy: currentUserAdmin ? currentUserAdmin.email : "admin",
            resetAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", uid), { subscription: subData }, { merge: true });
        showToast(`Reset ${email || uid} to Free tier.`, "info");
        logComplianceEvent("RESET_USER_FREE", uid, email);
    } catch (e) {
        console.error("resetToFree error:", e);
        showToast("Failed to reset subscription: " + e.message, "error");
    }
}

initTheme();
initSidebar();
lucide.createIcons();
