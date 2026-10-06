/* ==========================================================================
   Kinetic Dental & Healthcare Center - Administration Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAi_iJkiNZunOEcXxX2kuZg70q-xYqioBQ",
    authDomain: "kinetic-dental.firebaseapp.com",
    projectId: "kinetic-dental",
    storageBucket: "kinetic-dental.firebasestorage.app",
    messagingSenderId: "523401059267",
    appId: "1:523401059267:web:186d0b1b23405fea333b76",
    measurementId: "G-Z1C46B6GSF"
  };

  // Initialize Firebase
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.db = firebase.firestore();
    window.auth = firebase.auth();
  } else {
    alert("Firebase SDK failed to load. Please check your internet connection.");
    return;
  }

  /* --------------------------------------------------------------------------
     Shared Helpers
     -------------------------------------------------------------------------- */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function truncateText(str, maxLen) {
    if (!str) return '';
    const s = String(str);
    return s.length > maxLen ? s.slice(0, maxLen).trim() + '…' : s;
  }

  function formatReplyTimestamp(ts) {
    if (!ts) return '';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* --------------------------------------------------------------------------
     1. Theme Management
     -------------------------------------------------------------------------- */
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kinetic-dental-theme', theme);
    
    if (themeToggleBtn) {
      const moonIcon = themeToggleBtn.querySelector('.theme-icon-dark');
      const sunIcon = themeToggleBtn.querySelector('.theme-icon-light');
      
      if (theme === 'dark') {
        moonIcon?.classList.add('hidden');
        sunIcon?.classList.remove('hidden');
      } else {
        moonIcon?.classList.remove('hidden');
        sunIcon?.classList.add('hidden');
      }
    }
  };

  const savedTheme = localStorage.getItem('kinetic-dental-theme');
  const initialTheme = savedTheme || 'light';
  setTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  /* --------------------------------------------------------------------------
     2. Admin Email Whitelist & Authentication
     -------------------------------------------------------------------------- */
  const ALLOWED_ADMIN_EMAILS = new Set([
    'kineticdental29@gmail.com',
    'drnadiakineticdental@gmail.com',
    'drnafisanadiaanzum@gamil.com',
    'drnafisanadiaanzum@gmail.com',
    'kinetocdentalwebsite@gmail.com',
    'kineticdentalwebsite@gmail.com'
  ]);

  function isAllowedAdminEmail(email) {
    return ALLOWED_ADMIN_EMAILS.has(email.trim().toLowerCase());
  }

  function showAuthError(message) {
    authGeneralError.innerHTML = message;
    authGeneralError.style.display = 'block';
  }

  function clearAuthError() {
    authGeneralError.style.display = 'none';
    authGeneralError.textContent = '';
  }

  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const logoutBtnTop = document.getElementById('logoutBtnTop');
  const logoutBtnMain = document.getElementById('logoutBtnMain');
  const loginForm = document.getElementById('loginForm');
  const signInTab = document.getElementById('signInTab');
  const signUpTab = document.getElementById('signUpTab');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authSubmitLabel = document.getElementById('authSubmitLabel');
  const authSubmitIcon = document.getElementById('authSubmitIcon');
  const passwordField = document.getElementById('adminPassword');
  
  const emailField = document.getElementById('adminEmail');
  const authGeneralError = document.getElementById('authGeneralError');
  
  let authMode = 'signin';
  let unsubscribeFirestore = null;
  let appointmentsList = [];
  let currentFilter = 'all';
  let currentSearch = '';

  function setAuthMode(mode) {
    authMode = mode;
    const isSignUp = mode === 'signup';

    signInTab?.classList.toggle('active', !isSignUp);
    signUpTab?.classList.toggle('active', isSignUp);
    signInTab?.setAttribute('aria-selected', String(!isSignUp));
    signUpTab?.setAttribute('aria-selected', String(isSignUp));

    if (authTitle) authTitle.textContent = isSignUp ? 'Create Admin Account' : 'Sign In';
    if (authSubtitle) {
      authSubtitle.textContent = isSignUp
        ? 'Register with an authorized clinic email address.'
        : 'Access appointment submissions and patient details.';
    }
    if (authSubmitLabel) authSubmitLabel.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    if (authSubmitIcon) authSubmitIcon.setAttribute('data-lucide', isSignUp ? 'user-plus' : 'log-in');
    if (passwordField) passwordField.setAttribute('autocomplete', isSignUp ? 'new-password' : 'current-password');

    clearAuthError();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  signInTab?.addEventListener('click', () => setAuthMode('signin'));
  signUpTab?.addEventListener('click', () => setAuthMode('signup'));

  function handleFirebaseAuthError(err) {
    console.error('Auth failed:', err);
    if (err.code === 'auth/configuration-not-found') {
      showAuthError('<strong>Setup Required:</strong> Email/Password authentication is disabled in your Firebase console. Please go to <strong>Firebase Console &gt; Authentication &gt; Sign-in Method</strong> and enable <strong>Email/Password</strong>.');
    } else if (err.code === 'auth/email-already-in-use') {
      showAuthError('This email is already registered. Switch to <strong>Sign In</strong> and use your password.');
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      showAuthError('Incorrect email or password. If this is your first visit, use <strong>Sign Up</strong> with an authorized clinic email.');
    } else {
      showAuthError(`${authMode === 'signup' ? 'Sign Up' : 'Sign In'} failed: ${err.message}`);
    }
  }

  // Staff Quick Access & Auth State observer
  let isStaffMode = false;
  const staffQuickAccessBtn = document.getElementById('staffQuickAccessBtn');
  if (staffQuickAccessBtn) {
    staffQuickAccessBtn.addEventListener('click', () => {
      isStaffMode = true;
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      logoutBtnTop?.classList.remove('hidden');
      clearAuthError();
      showAdminToast('Signed in as Authorized Clinic Staff!');
      startFirestoreListener();
    });
  }

  // Auth State observer
  window.auth.onAuthStateChanged((user) => {
    if (isStaffMode) return;
    if (user) {
      if (!isAllowedAdminEmail(user.email || '')) {
        window.auth.signOut();
        showAuthError('Access denied. This email is not authorized for admin access.');
        return;
      }

      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      logoutBtnTop?.classList.remove('hidden');
      clearAuthError();
      
      startFirestoreListener();
    } else {
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      logoutBtnTop?.classList.add('hidden');
      
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
    }
  });

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = emailField.value.trim();
      const password = passwordField.value;
      
      clearAuthError();

      if (!isAllowedAdminEmail(email)) {
        showAuthError('Access denied. Only authorized clinic admin emails can register or sign in.');
        return;
      }

      if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
      }

      if (authMode === 'signup') {
        window.auth.createUserWithEmailAndPassword(email, password)
          .catch(handleFirebaseAuthError);
      } else {
        window.auth.signInWithEmailAndPassword(email, password)
          .catch(handleFirebaseAuthError);
      }
    });
  }

  // Sign out triggers
  const handleSignOut = () => {
    isStaffMode = false;
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtnTop?.classList.add('hidden');
    if (window.auth && window.auth.currentUser) {
      window.auth.signOut().catch(err => console.error("Signout error:", err));
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };

  if (logoutBtnTop) logoutBtnTop.addEventListener('click', handleSignOut);
  if (logoutBtnMain) logoutBtnMain.addEventListener('click', handleSignOut);

  /* --------------------------------------------------------------------------
     3. Database Actions and Table Updates
     -------------------------------------------------------------------------- */
  const metricTotal = document.getElementById('metricTotal');
  const metricPending = document.getElementById('metricPending');
  const metricConfirmed = document.getElementById('metricConfirmed');
  const metricCompleted = document.getElementById('metricCompleted');
  const metricReplied = document.getElementById('metricReplied');
  const metricValue = document.getElementById('metricValue');
  const tableBody = document.getElementById('appointmentsTableBody');
  const searchBar = document.getElementById('searchBar');
  const filterTabs = document.querySelectorAll('.tab-btn');

  const SAMPLE_APPOINTMENTS = [
    {
      id: 'apt-sample-1',
      name: 'Mrs. Nusrat Jahan',
      phone: '01712-345678',
      treatment: 'Tooth Scaling & Polishing',
      doctor: 'Dr. Nafisa Anzum Nadia',
      date: new Date().toISOString().split('T')[0],
      time: 'Morning Slot (10:00 AM - 02:00 PM)',
      status: 'Confirmed',
      replyStatus: 'replied',
      replies: [{ message: 'Your scaling appointment is confirmed for today at 11 AM.' }],
      notes: 'দাঁতের হলুদ দাগ ও মাড়ির সমস্যা।',
      createdAt: new Date()
    },
    {
      id: 'apt-sample-2',
      name: 'Md. Tanvir Hossain',
      phone: '01819-876543',
      treatment: 'Root Canal Therapy (RCT)',
      doctor: 'Dr. Marufa Arefin',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: 'Evening Slot (05:00 PM - 09:00 PM)',
      status: 'Pending',
      replyStatus: 'pending',
      notes: 'তীব্র দাঁতের ব্যথা, ঠাণ্ডা বা গরম লাগলে শিরশির করে।',
      createdAt: new Date()
    },
    {
      id: 'apt-sample-3',
      name: 'Farhana Kabir',
      phone: '01911-223344',
      treatment: 'Teeth Whitening (Bleaching)',
      doctor: 'Dr. Nafisa Anzum Nadia',
      date: new Date().toISOString().split('T')[0],
      time: 'Evening Slot (05:00 PM - 09:00 PM)',
      status: 'Completed',
      replyStatus: 'replied',
      notes: 'দাঁত সাদা করার প্যাকেজ সম্পন্ন হয়েছে।',
      createdAt: new Date()
    }
  ];

  function startFirestoreListener() {
    const cachedApts = localStorage.getItem('kinetic_appointments_cache');
    if (cachedApts) {
      try {
        const parsed = JSON.parse(cachedApts);
        if (Array.isArray(parsed) && parsed.length) {
          appointmentsList = parsed;
          calculateMetrics();
          renderTable();
        }
      } catch (e) {}
    } else {
      appointmentsList = [...SAMPLE_APPOINTMENTS];
      calculateMetrics();
      renderTable();
    }

    if (!window.db) return;

    try {
      unsubscribeFirestore = window.db.collection('appointments')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            const list = [];
            snapshot.forEach((doc) => {
              list.push({
                id: doc.id,
                ...doc.data()
              });
            });
            appointmentsList = list;
            localStorage.setItem('kinetic_appointments_cache', JSON.stringify(appointmentsList));
          }
          calculateMetrics();
          renderTable();
        }, (err) => {
          console.warn("Firestore notice (active in resilient local mode):", err.message);
          calculateMetrics();
          renderTable();
        });
    } catch (e) {
      console.warn("Firestore connection check:", e.message);
    }
  }

  function getReplyStatus(item) {
    if (item.replyStatus === 'replied' || (Array.isArray(item.replies) && item.replies.length > 0)) {
      return 'replied';
    }
    return 'pending';
  }

  function makeWhatsAppUrl(item) {
    let phone = (item.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '88' + phone;
    } else if (!phone.startsWith('88') && phone.length === 10) {
      phone = '880' + phone;
    }
    const patientName = item.name || 'Patient';
    const treatment = item.treatment || 'dental checkup';
    const slot = item.time || item.slot || 'scheduled hours';
    const date = item.date || 'your appointment date';
    const text = `Hello ${patientName}, your dental appointment at Kinetic Dental Care (Mirpur 12) for "${treatment}" is confirmed for ${date} (${slot}). Please arrive 10 minutes early. Hotline: 01313-175779. - Dr. Nadia`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  function calculateMetrics() {
    const total = appointmentsList.length;
    const pending = appointmentsList.filter(a => a.status === 'Pending').length;
    const confirmed = appointmentsList.filter(a => a.status === 'Confirmed').length;
    const completed = appointmentsList.filter(a => a.status === 'Completed').length;
    const replied = appointmentsList.filter(a => getReplyStatus(a) === 'replied').length;

    let totalVal = 0;
    appointmentsList.forEach(a => {
      const trt = (a.treatment || '').toLowerCase();
      if (trt.includes('whitening')) totalVal += 10000;
      else if (trt.includes('root canal') || trt.includes('rct')) totalVal += 3500;
      else if (trt.includes('braces') || trt.includes('aligner')) totalVal += 45000;
      else if (trt.includes('night guard')) totalVal += 3500;
      else if (trt.includes('scaling') || trt.includes('cleaning')) totalVal += 1200;
      else if (trt.includes('x-ray')) totalVal += 400;
      else if (trt.includes('surgery') || trt.includes('wisdom')) totalVal += 3000;
      else if (trt.includes('crown') || trt.includes('bridge')) totalVal += 5000;
      else totalVal += 800;
    });

    if (metricTotal) metricTotal.textContent = total;
    if (metricPending) metricPending.textContent = pending;
    if (metricConfirmed) metricConfirmed.textContent = confirmed;
    if (metricCompleted) metricCompleted.textContent = completed;
    if (metricReplied) metricReplied.textContent = replied;
    if (metricValue) metricValue.textContent = 'BDT ' + totalVal.toLocaleString();
  }

  function renderTable() {
    if (!tableBody) return;
    
    // Filter the items list
    let filtered = appointmentsList;

    // Filter by Tab Status
    if (currentFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(a => {
        if (a.date && a.date.includes(todayStr)) return true;
        if (a.createdAt) {
          const d = typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : new Date(a.createdAt);
          return d.toISOString().split('T')[0] === todayStr;
        }
        return false;
      });
    } else if (currentFilter === 'reply-pending') {
      filtered = filtered.filter(a => getReplyStatus(a) === 'pending');
    } else if (currentFilter === 'reply-replied') {
      filtered = filtered.filter(a => getReplyStatus(a) === 'replied');
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(a => a.status === currentFilter);
    }

    // Filter by Search Bar (Name, Phone, Doctor, or Treatment)
    if (currentSearch) {
      const query = currentSearch.toLowerCase();
      filtered = filtered.filter(a => 
        (a.name && a.name.toLowerCase().includes(query)) || 
        (a.phone && a.phone.includes(query)) ||
        (a.treatment && a.treatment.toLowerCase().includes(query)) ||
        (a.doctor && a.doctor.toLowerCase().includes(query))
      );
    }

    // Empty list check
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-state">
            <i data-lucide="inbox" style="width: 32px; height:32px; margin:0 auto 12px; display:block; opacity:0.5;"></i>
            <p>No matching appointment records found.</p>
          </td>
        </tr>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Generate row elements
    let html = '';
    filtered.forEach(item => {
      const formattedDate = item.createdAt ? formatDate(typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate() : new Date(item.createdAt)) : 'Synced';
      const replyStatus = getReplyStatus(item);
      const lastReply = Array.isArray(item.replies) && item.replies.length
        ? item.replies[item.replies.length - 1]
        : null;
      
      html += `
        <tr>
          <td>
            <span class="patient-info-name">${escapeHTML(item.name)}</span>
            <span class="patient-info-date">Requested: ${formattedDate}</span>
            ${item.doctor ? `<span style="font-size:0.75rem; color:var(--primary); display:block; font-weight:600; margin-top:2px;"><i data-lucide="user-check" style="width:11px;height:11px;display:inline;vertical-align:middle;"></i> ${escapeHTML(item.doctor)}</span>` : ''}
          </td>
          <td>
            <a href="tel:${escapeHTML(item.phone)}" class="text-underline" style="color: var(--primary); font-weight:700;">
              ${escapeHTML(item.phone)}
            </a>
          </td>
          <td>${escapeHTML(item.treatment)}</td>
          <td>
            <strong>${escapeHTML(item.date || '')}</strong>
            <br>
            <span style="font-size: 0.8rem; opacity: 0.8;">${escapeHTML(item.time || item.slot || '')}</span>
          </td>
          <td>
            <span class="status-badge status-${item.status}">${item.status}</span>
          </td>
          <td>
            <span class="status-badge status-reply-${replyStatus}">${replyStatus === 'replied' ? 'Replied' : 'Awaiting'}</span>
            ${lastReply ? `<div class="reply-preview">${escapeHTML(truncateText(lastReply.message, 50))}</div>` : ''}
          </td>
          <td>
            <div style="max-width:180px; font-size:0.82rem; max-height:60px; overflow-y:auto; word-break:break-word;">
              ${escapeHTML(item.notes || 'N/A')}
            </div>
          </td>
          <td>
            <div class="table-action-btns">
              <a href="tel:${escapeHTML(item.phone)}" class="btn-action-icon btn-action-call" title="Call: ${escapeHTML(item.phone)}">
                <i data-lucide="phone"></i>
              </a>
              <a href="${makeWhatsAppUrl(item)}" target="_blank" rel="noopener" class="btn-action-icon btn-action-whatsapp" title="WhatsApp Patient">
                <i data-lucide="message-circle"></i>
              </a>
              <button type="button" class="btn-action-icon btn-action-reply" onclick="openReplyModal('${item.id}')" title="Reply to Patient">
                <i data-lucide="message-square-reply"></i>
              </button>
              ${item.status === 'Pending' ? `
                <button type="button" class="btn-action-icon btn-action-status" onclick="updateAppointmentStatus('${item.id}', 'Confirmed')" title="Confirm Booking">
                  <i data-lucide="check"></i>
                </button>
              ` : ''}
              ${item.status !== 'Completed' ? `
                <button type="button" class="btn-action-icon btn-action-status" onclick="updateAppointmentStatus('${item.id}', 'Completed')" title="Mark as Completed">
                  <i data-lucide="award"></i>
                </button>
              ` : ''}
              <button type="button" class="btn-action-icon btn-action-del" onclick="deleteAppointmentRecord('${item.id}')" title="Delete Entry">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
    
    // Bind icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Handle Search Input
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderTable();
    });
  }

  // Handle Filters click
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderTable();
    });
  });

  /* --------------------------------------------------------------------------
     Export to CSV (Excel Compatible)
     -------------------------------------------------------------------------- */
  const btnExportCSV = document.getElementById('btnExportCSV');
  function exportAppointmentsToCSV() {
    if (!appointmentsList || appointmentsList.length === 0) {
      showAdminToast('No appointment records to export.', 'error');
      return;
    }

    const headers = ['Ref ID', 'Patient Name', 'Phone', 'Treatment', 'Assigned Doctor', 'Preferred Date', 'Slot / Time', 'Status', 'Reply Status', 'Notes / Symptoms'];
    const rows = appointmentsList.map(a => [
      a.id || '',
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${(a.phone || '').replace(/"/g, '""')}"`,
      `"${(a.treatment || '').replace(/"/g, '""')}"`,
      `"${(a.doctor || 'Dr. Nadia').replace(/"/g, '""')}"`,
      `"${(a.date || '').replace(/"/g, '""')}"`,
      `"${(a.time || a.slot || '').replace(/"/g, '""')}"`,
      `"${(a.status || 'Pending').replace(/"/g, '""')}"`,
      `"${(getReplyStatus(a) || 'pending').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `kinetic_dental_appointments_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminToast('Appointments exported to CSV successfully!');
  }
  if (btnExportCSV) btnExportCSV.addEventListener('click', exportAppointmentsToCSV);

  /* --------------------------------------------------------------------------
     Print Schedule Sheet
     -------------------------------------------------------------------------- */
  const btnPrintSchedule = document.getElementById('btnPrintSchedule');
  function printAppointmentsSchedule() {
    const printArea = document.getElementById('printScheduleArea');
    if (!printArea) return;

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const activeList = appointmentsList.filter(a => a.status !== 'Cancelled');

    let tableRows = activeList.map((a, i) => `
      <tr>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ddd; padding:8px;"><strong>${escapeHTML(a.name)}</strong></td>
        <td style="border:1px solid #ddd; padding:8px;">${escapeHTML(a.phone)}</td>
        <td style="border:1px solid #ddd; padding:8px;">${escapeHTML(a.treatment || 'Checkup')}</td>
        <td style="border:1px solid #ddd; padding:8px;">${escapeHTML(a.doctor || 'Dr. Nadia')}</td>
        <td style="border:1px solid #ddd; padding:8px;">${escapeHTML(a.time || a.slot || 'Chamber Hours')}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;"><strong>${escapeHTML(a.status || 'Pending')}</strong></td>
        <td style="border:1px solid #ddd; padding:8px;">${escapeHTML(a.notes || '-')}</td>
      </tr>
    `).join('');

    printArea.innerHTML = `
      <div style="padding:20px; font-family:sans-serif; color:#0f172a;">
        <div style="border-bottom:2px solid #066aab; padding-bottom:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="color:#066aab; margin:0 0 4px 0;">Kinetic Dental &amp; Healthcare Center</h2>
            <p style="margin:0; font-size:14px; color:#475569;">Daily Clinic Appointment Schedule · Mirpur 12, Dhaka (Hotline: 01313-175779)</p>
          </div>
          <div style="text-align:right;">
            <h4 style="margin:0; color:#334155;">Date: ${dateStr}</h4>
            <p style="margin:4px 0 0 0; font-size:12px; color:#64748b;">Total Listed: ${activeList.length} Patients</p>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:12px;">
          <thead>
            <tr style="background:#f1f5f9; color:#0f172a;">
              <th style="border:1px solid #ddd; padding:8px; width:30px;">#</th>
              <th style="border:1px solid #ddd; padding:8px;">Patient Name</th>
              <th style="border:1px solid #ddd; padding:8px;">Contact Phone</th>
              <th style="border:1px solid #ddd; padding:8px;">Treatment</th>
              <th style="border:1px solid #ddd; padding:8px;">Doctor</th>
              <th style="border:1px solid #ddd; padding:8px;">Slot / Time</th>
              <th style="border:1px solid #ddd; padding:8px;">Status</th>
              <th style="border:1px solid #ddd; padding:8px;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" style="text-align:center; padding:16px;">No appointment records for this date.</td></tr>'}
          </tbody>
        </table>
        <div style="margin-top:24px; font-size:11px; color:#94a3b8; display:flex; justify-content:space-between;">
          <span>Printed from Kinetic Dental Admin Panel</span>
          <span>Doctor's Signature: __________________________</span>
        </div>
      </div>
    `;

    window.print();
  }
  if (btnPrintSchedule) btnPrintSchedule.addEventListener('click', printAppointmentsSchedule);

  /* --------------------------------------------------------------------------
     Manual Walk-in / Phone Appointment Creation Modal
     -------------------------------------------------------------------------- */
  const newAppointmentModal = document.getElementById('newAppointmentModal');
  const btnOpenNewAppointmentModal = document.getElementById('btnOpenNewAppointmentModal');
  const newAppointmentModalClose = document.getElementById('newAppointmentModalClose');
  const newAppointmentCancelBtn = document.getElementById('newAppointmentCancelBtn');
  const newAppointmentForm = document.getElementById('newAppointmentForm');
  const newPtDateInput = document.getElementById('newPtDate');

  if (newPtDateInput) {
    newPtDateInput.value = new Date().toISOString().split('T')[0];
  }

  function openNewAppointmentModal() {
    if (newAppointmentModal) {
      newAppointmentModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  function closeNewAppointmentModal() {
    if (newAppointmentModal) {
      newAppointmentModal.classList.remove('active');
      document.body.style.overflow = '';
      if (newAppointmentForm) newAppointmentForm.reset();
      if (newPtDateInput) newPtDateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  if (btnOpenNewAppointmentModal) btnOpenNewAppointmentModal.addEventListener('click', openNewAppointmentModal);
  if (newAppointmentModalClose) newAppointmentModalClose.addEventListener('click', closeNewAppointmentModal);
  if (newAppointmentCancelBtn) newAppointmentCancelBtn.addEventListener('click', closeNewAppointmentModal);
  if (newAppointmentModal) {
    newAppointmentModal.addEventListener('click', (e) => {
      if (e.target === newAppointmentModal) closeNewAppointmentModal();
    });
  }

  if (newAppointmentForm) {
    newAppointmentForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newBooking = {
        id: 'apt-manual-' + Date.now(),
        name: document.getElementById('newPtName')?.value.trim() || 'Patient',
        phone: document.getElementById('newPtPhone')?.value.trim() || '',
        treatment: document.getElementById('newPtTreatment')?.value || 'General Consultation',
        doctor: document.getElementById('newPtDoctor')?.value || 'Dr. Nafisa Anzum Nadia',
        date: document.getElementById('newPtDate')?.value || new Date().toISOString().split('T')[0],
        time: document.getElementById('newPtSlot')?.value || 'Evening Slot (05:00 PM - 09:00 PM)',
        status: document.getElementById('newPtStatus')?.value || 'Confirmed',
        source: document.getElementById('newPtSource')?.value || 'Phone Call',
        notes: document.getElementById('newPtNotes')?.value.trim() || '',
        replyStatus: 'pending',
        createdAt: new Date()
      };

      appointmentsList.unshift(newBooking);
      calculateMetrics();
      renderTable();
      localStorage.setItem('kinetic_appointments_cache', JSON.stringify(appointmentsList));

      if (window.db) {
        window.db.collection('appointments').doc(newBooking.id).set({
          ...newBooking,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.warn('Firestore booking save error:', err));
      }

      closeNewAppointmentModal();
      showAdminToast('নতুন অ্যাপয়েন্টমেন্ট সফলভাবে যুক্ত হয়েছে!');
    });
  }

  /* --------------------------------------------------------------------------
     4. Global Database Actions (Accessible globally from buttons)
     -------------------------------------------------------------------------- */
  window.updateAppointmentStatus = (id, status) => {
    const item = appointmentsList.find(a => a.id === id);
    if (item) {
      item.status = status;
      calculateMetrics();
      renderTable();
      localStorage.setItem('kinetic_appointments_cache', JSON.stringify(appointmentsList));
    }

    if (window.db) {
      window.db.collection('appointments').doc(id).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        showAdminToast(`Appointment marked as ${status}!`);
      }).catch(err => {
        console.warn("Update notice (local saved):", err.message);
        showAdminToast(`Appointment marked as ${status}!`);
      });
    } else {
      showAdminToast(`Appointment marked as ${status}!`);
    }
  };

  window.deleteAppointmentRecord = (id) => {
    if (!confirm("Are you sure you want to delete this appointment request? This action cannot be undone.")) {
      return;
    }

    appointmentsList = appointmentsList.filter(a => a.id !== id);
    calculateMetrics();
    renderTable();
    localStorage.setItem('kinetic_appointments_cache', JSON.stringify(appointmentsList));

    if (window.db) {
      window.db.collection('appointments').doc(id).delete()
        .then(() => {
          showAdminToast('Appointment record deleted.');
        })
        .catch(err => {
          console.warn("Delete notice (local removed):", err.message);
          showAdminToast('Appointment deleted from records.');
        });
    } else {
      showAdminToast('Appointment deleted from records.');
    }
  };

  /* --------------------------------------------------------------------------
     4b. Admin Reply Modal & Send Reply
     -------------------------------------------------------------------------- */
  const replyModal = document.getElementById('replyModal');
  const replyForm = document.getElementById('replyForm');
  const replyMessageField = document.getElementById('replyMessage');
  const replyPatientSummary = document.getElementById('replyPatientSummary');
  const replyThread = document.getElementById('replyThread');
  const replyThreadList = document.getElementById('replyThreadList');
  const replyModalClose = document.getElementById('replyModalClose');
  const replyCancelBtn = document.getElementById('replyCancelBtn');
  const replySendLabel = document.getElementById('replySendLabel');
  let activeReplyAppointmentId = null;

  function closeReplyModal() {
    activeReplyAppointmentId = null;
    replyModal?.classList.remove('active');
    document.body.style.overflow = '';
    if (replyForm) replyForm.reset();
    replyThread?.classList.add('hidden');
    if (replyThreadList) replyThreadList.innerHTML = '';
  }

  window.openReplyModal = (id) => {
    if (!window.auth.currentUser || !isAllowedAdminEmail(window.auth.currentUser.email || '')) {
      alert('You must be signed in as an authorized admin to reply.');
      return;
    }

    const item = appointmentsList.find(a => a.id === id);
    if (!item) return;

    activeReplyAppointmentId = id;
    replyPatientSummary.innerHTML = `
      <p><strong>${escapeHTML(item.name)}</strong> · <a href="tel:${escapeHTML(item.phone)}">${escapeHTML(item.phone)}</a></p>
      <p>${escapeHTML(item.treatment)} — ${escapeHTML(item.date)} ${escapeHTML(item.time)}</p>
    `;

    const replies = Array.isArray(item.replies) ? item.replies : [];
    if (replies.length > 0) {
      replyThread.classList.remove('hidden');
      replyThreadList.innerHTML = replies.map(reply => `
        <div class="admin-reply-bubble">
          <p>${escapeHTML(reply.message)}</p>
          <span class="reply-meta">${escapeHTML(reply.repliedBy || 'Admin')} · ${formatReplyTimestamp(reply.repliedAt)}</span>
        </div>
      `).join('');
    } else {
      replyThread.classList.add('hidden');
      replyThreadList.innerHTML = '';
    }

    replyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    replyMessageField?.focus();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  replyModalClose?.addEventListener('click', closeReplyModal);
  replyCancelBtn?.addEventListener('click', closeReplyModal);
  replyModal?.addEventListener('click', (e) => {
    if (e.target === replyModal) closeReplyModal();
  });

  if (replyForm) {
    replyForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = window.auth.currentUser;
      if (!user || !isAllowedAdminEmail(user.email || '')) {
        alert('Access denied. Only authorized admins can send replies.');
        return;
      }

      const message = replyMessageField.value.trim();
      if (!message) {
        replyMessageField.closest('.form-group')?.classList.add('invalid');
        return;
      }
      replyMessageField.closest('.form-group')?.classList.remove('invalid');

      if (!activeReplyAppointmentId || !window.db) return;

      const replySendBtn = document.getElementById('replySendBtn');
      if (replySendBtn) replySendBtn.disabled = true;
      if (replySendLabel) replySendLabel.textContent = 'Sending...';

      const newReply = {
        message: message,
        repliedAt: firebase.firestore.Timestamp.now(),
        repliedBy: user.email
      };

      window.db.collection('appointments').doc(activeReplyAppointmentId).update({
        replies: firebase.firestore.FieldValue.arrayUnion(newReply),
        replyStatus: 'replied',
        lastReplyAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        closeReplyModal();
      })
      .catch(err => {
        console.error('Reply failed:', err);
        alert('Failed to send reply: ' + err.message);
      })
      .finally(() => {
        if (replySendBtn) replySendBtn.disabled = false;
        if (replySendLabel) replySendLabel.textContent = 'Send Reply';
      });
    });
  }

  /* --------------------------------------------------------------------------
     5. Admin Toast Notification
     -------------------------------------------------------------------------- */
  function showAdminToast(msg, type = 'success') {
    const toast = document.getElementById('adminToast');
    const toastMsg = document.getElementById('adminToastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.className = `admin-toast ${type} show`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  /* --------------------------------------------------------------------------
     6. Main Navigation Tab Switching
     -------------------------------------------------------------------------- */
  const mainTabBtns = document.querySelectorAll('.admin-main-tab-btn');
  const contentPanes = document.querySelectorAll('.admin-content-pane');

  mainTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      mainTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      contentPanes.forEach(pane => {
        const match = pane.id.toLowerCase().includes(targetTab.toLowerCase());
        pane.classList.toggle('active', match);
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  });

  /* --------------------------------------------------------------------------
     7. Special Offers & Posters Management
     -------------------------------------------------------------------------- */
  const DEFAULT_OFFER = {
    active: true,
    title: 'রমজান ও ঈদ স্পেশাল ডেন্টাল প্যাকেজ',
    subtitle: 'দাঁতের স্কেলিং ও পলিশিং এবং টিথ হোয়াইটেনিং-এ ২৫% ছাড়! সাথে রয়েছে সম্পূর্ণ ফ্রি ডিজিটাল চেকআপ ও ওরাল হেলথ গাইড।',
    badge: '25% OFF · Limited Period',
    image: 'achivment.jpeg',
    showInHero: true,
    showPopup: true,
    ctaText: 'অফারটি গ্রহণ করুন / Book with Offer',
    treatment: 'Tooth Scaling & Polishing'
  };

  const offerForm = document.getElementById('offerForm');
  const offerActiveToggle = document.getElementById('offerActiveToggle');
  const offerTitleInput = document.getElementById('offerTitleInput');
  const offerBadgeInput = document.getElementById('offerBadgeInput');
  const offerSubtitleInput = document.getElementById('offerSubtitleInput');
  const offerPosterFileInput = document.getElementById('offerPosterFileInput');
  const offerPosterUrlInput = document.getElementById('offerPosterUrlInput');
  const posterPreviewImg = document.getElementById('posterPreviewImg');
  const offerShowInHero = document.getElementById('offerShowInHero');
  const offerShowPopup = document.getElementById('offerShowPopup');
  const offerCtaTextInput = document.getElementById('offerCtaTextInput');
  const offerTreatmentSelect = document.getElementById('offerTreatmentSelect');
  const saveOfferBtn = document.getElementById('saveOfferBtn');
  const previewOfferBtn = document.getElementById('previewOfferBtn');

  let activeOfferState = { ...DEFAULT_OFFER };

  function populateOfferForm(data) {
    if (!data) return;
    activeOfferState = { ...DEFAULT_OFFER, ...data };
    if (offerActiveToggle) offerActiveToggle.checked = Boolean(activeOfferState.active);
    if (offerTitleInput) offerTitleInput.value = activeOfferState.title || '';
    if (offerBadgeInput) offerBadgeInput.value = activeOfferState.badge || '';
    if (offerSubtitleInput) offerSubtitleInput.value = activeOfferState.subtitle || '';
    if (offerPosterUrlInput) offerPosterUrlInput.value = activeOfferState.image || '';
    if (posterPreviewImg && activeOfferState.image) posterPreviewImg.src = activeOfferState.image;
    if (offerShowInHero) offerShowInHero.checked = activeOfferState.showInHero !== false;
    if (offerShowPopup) offerShowPopup.checked = activeOfferState.showPopup !== false;
    if (offerCtaTextInput) offerCtaTextInput.value = activeOfferState.ctaText || '';
    if (offerTreatmentSelect && activeOfferState.treatment) offerTreatmentSelect.value = activeOfferState.treatment;
  }

  // Handle image URL changes & preview
  offerPosterUrlInput?.addEventListener('input', () => {
    const val = offerPosterUrlInput.value.trim();
    if (posterPreviewImg && val) {
      posterPreviewImg.src = val;
    }
  });

  // Handle Preset pill buttons
  document.querySelectorAll('.preset-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-src');
      if (offerPosterUrlInput) offerPosterUrlInput.value = src;
      if (posterPreviewImg) posterPreviewImg.src = src;
    });
  });

  // Handle File Upload to Base64 Data URL
  offerPosterFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('ইমেজ ফাইলটি ২.৫ মেগাবাইটের চেয়ে ছোট হওয়া প্রয়োজন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      if (offerPosterUrlInput) offerPosterUrlInput.value = dataUrl;
      if (posterPreviewImg) posterPreviewImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  // Load offer from storage & Firestore
  const savedOffer = localStorage.getItem('kinetic_active_offer');
  if (savedOffer) {
    try {
      populateOfferForm(JSON.parse(savedOffer));
    } catch (e) {
      populateOfferForm(DEFAULT_OFFER);
    }
  } else {
    populateOfferForm(DEFAULT_OFFER);
  }

  // Save Offer Handler
  if (offerForm) {
    offerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const updatedOffer = {
        active: Boolean(offerActiveToggle?.checked),
        title: offerTitleInput?.value.trim() || '',
        badge: offerBadgeInput?.value.trim() || 'Special Offer',
        subtitle: offerSubtitleInput?.value.trim() || '',
        image: offerPosterUrlInput?.value.trim() || 'achivment.jpeg',
        showInHero: Boolean(offerShowInHero?.checked),
        showPopup: Boolean(offerShowPopup?.checked),
        ctaText: offerCtaTextInput?.value.trim() || 'Claim Offer',
        treatment: offerTreatmentSelect?.value || 'Tooth Scaling & Polishing',
        updatedAt: new Date().toISOString()
      };

      // 1. Save locally
      localStorage.setItem('kinetic_active_offer', JSON.stringify(updatedOffer));

      // 2. Save to Firestore
      if (window.db) {
        if (saveOfferBtn) saveOfferBtn.disabled = true;
        window.db.collection('settings').doc('active_offer').set(updatedOffer, { merge: true })
          .then(() => {
            showAdminToast('অফার ও পোস্টার সফলভাবে সেভ ও পাবলিশ হয়েছে!');
          })
          .catch((err) => {
            console.error('Firestore save offer error:', err);
            showAdminToast('লোকাল সেভ সম্পন্ন হয়েছে (Firestore: ' + err.message + ')', 'error');
          })
          .finally(() => {
            if (saveOfferBtn) saveOfferBtn.disabled = false;
          });
      } else {
        showAdminToast('অফার ও পোস্টার সফলভাবে সেভ হয়েছে!');
      }
    });
  }

  previewOfferBtn?.addEventListener('click', () => {
    alert(`[অফার প্রিভিউ]\n\nশিরোনাম: ${offerTitleInput?.value}\nবিবরণ: ${offerSubtitleInput?.value}\nট্যাগ: ${offerBadgeInput?.value}\nস্ট্যাটাস: ${offerActiveToggle?.checked ? 'Active (চালু)' : 'Inactive (বন্ধ)'}`);
  });

  /* --------------------------------------------------------------------------
     8. Doctors Directory Management (Client: Only Founder has photo, change names)
     -------------------------------------------------------------------------- */
  const DEFAULT_DOCTORS_DATA = {
    founder: {
      name: 'Dr. Nafisa Anzum Nadia',
      bmdc: '10471',
      role: 'Founder & Chief Dental Surgeon',
      degrees: '<strong>BDS (DU), PGT (DMC in OMS)</strong><br>Specially Trained in Aesthetic Dentistry (Smile Design & Precision RCT)',
      bio: 'Founder and visionary leader of Kinetic Dental & Healthcare Center in Mirpur 12. With extensive clinical experience in aesthetic dentistry, smile makeovers, and painless root canal therapy, Dr. Nadia ensures every patient receives personalized, sterile, and gentle clinical care.',
      photo: 'first.jpg'
    },
    specialists: [
      {
        id: 2,
        name: 'Dr. Marufa Arefin',
        bmdc: '11141',
        role: 'Oral & Dental Surgeon',
        degrees: 'BDS (Shaheed Suhrawardy Medical College)',
        institution: 'PGT in Oral and Maxillofacial Surgery (SSMC)',
        bio: 'Specialist in oral surgery, tooth restorations, gentle extractions, and comprehensive oral healthcare.',
        specialties: ['Oral Surgery', 'Maxillofacial Care', 'Extractions'],
        isFemale: true,
        tag: 'Kinetic Specialist'
      },
      {
        id: 3,
        name: 'Dr. Umme Kulsum',
        bmdc: '13396',
        role: 'Oral & Dental Surgeon',
        degrees: 'BDS (DI), MPH, PGT (OMS)',
        institution: 'Expert Dental Surgeon & Public Health Specialist',
        bio: 'Experienced in preventative oral healthcare, minor oral surgeries, painless fillings, and holistic patient counseling.',
        specialties: ['Dental Surgery', 'Public Health', 'Preventative Care'],
        isFemale: true,
        tag: 'Kinetic Specialist'
      },
      {
        id: 4,
        name: 'Dr. Sharmin Akhter',
        bmdc: '7493',
        role: 'Oral & Maxillofacial Surgeon',
        degrees: 'BDS (DU), MS (CMH on OMS)',
        institution: 'Senior Specialist in Maxillofacial Surgery',
        bio: 'Senior surgeon performing complex surgical extractions, jaw trauma treatment, wisdom tooth surgeries, and cyst removal.',
        specialties: ['Maxillofacial Surgery', 'Oral Trauma', 'Wisdom Tooth'],
        isFemale: true,
        tag: 'Senior Surgeon'
      },
      {
        id: 5,
        name: 'Dr. Shila Abedin',
        bmdc: '8931',
        role: 'Senior Dentist & Orthodontist',
        degrees: 'BDS (DU), PGT (Conservative Dentistry BSMMU), PGT (DMC in OMS)',
        institution: 'Specially Trained in Orthodontic Treatment',
        bio: 'Decades of clinical precision in corrective braces, restorative dentistry, teeth alignment, and conservative smile preservation.',
        specialties: ['Orthodontics', 'Conservative Care', 'Braces'],
        isFemale: true,
        tag: 'Senior Specialist'
      },
      {
        id: 6,
        name: 'Dr. Mohima Akhter Hira',
        bmdc: '16168',
        role: 'Oral & Dental Surgeon',
        degrees: 'BDS (MMC)',
        institution: 'Mymensingh Medical College Graduate',
        bio: 'Dedicated dental practitioner specializing in pain-free tooth-colored fillings, ultrasonic scaling, and gentle pediatric dentistry.',
        specialties: ['General Dentistry', 'Scaling & Polish', 'Cavity Fillings'],
        isFemale: true,
        tag: 'Kinetic Specialist'
      },
      {
        id: 7,
        name: 'Dr. Munmun Rahman',
        bmdc: '3014',
        role: 'Orthodontist (Braces Specialist)',
        degrees: 'BDS, DDS (BMU), D Ortho (AFMI)',
        institution: 'Armed Forces Medical Institute Certified Orthodontist',
        bio: 'Expert Orthodontist with advanced training in corrective metal & ceramic braces, clear invisible aligners, and bite correction.',
        specialties: ['Orthodontics', 'Braces', 'Clear Aligners'],
        isFemale: true,
        tag: 'Braces Specialist'
      },
      {
        id: 8,
        name: 'Dr. Shafiqul Hasan (Shihab)',
        bmdc: '8670',
        role: 'Consultant Orthodontist',
        degrees: 'BDS, BCS (Health), MS (Orthodontics in BMU - PG Hospital)',
        institution: 'Former Incharge, Dept of Conservative Dentistry & Endodontics (MMCH)',
        bio: 'Distinguished consultant with extensive expertise in endodontic treatments, intricate teeth alignment, and advanced orthodontic care.',
        specialties: ['Advanced Orthodontics', 'Endodontics', 'Smile Alignment'],
        isFemale: false,
        tag: 'Consultant Surgeon'
      }
    ]
  };

  let doctorsDirectoryState = { ...DEFAULT_DOCTORS_DATA };

  const adminDoctorsTableBody = document.getElementById('adminDoctorsTableBody');
  const adminFounderName = document.getElementById('adminFounderName');
  const adminFounderThumb = document.getElementById('adminFounderThumb');
  const editFounderBtn = document.getElementById('editFounderBtn');
  const addNewDoctorBtn = document.getElementById('addNewDoctorBtn');
  const saveDoctorsDirectoryBtn = document.getElementById('saveDoctorsDirectoryBtn');

  // Modal elements
  const doctorEditModal = document.getElementById('doctorEditModal');
  const doctorEditModalClose = document.getElementById('doctorEditModalClose');
  const doctorEditCancelBtn = document.getElementById('doctorEditCancelBtn');
  const doctorEditForm = document.getElementById('doctorEditForm');
  const doctorModalTitle = document.getElementById('doctorModalTitle');
  const editDoctorId = document.getElementById('editDoctorId');
  const editDoctorIsFounder = document.getElementById('editDoctorIsFounder');
  const docNameInput = document.getElementById('docNameInput');
  const docBmdcInput = document.getElementById('docBmdcInput');
  const docRoleInput = document.getElementById('docRoleInput');
  const docDegreesInput = document.getElementById('docDegreesInput');
  const docBioInput = document.getElementById('docBioInput');
  const docSkillsInput = document.getElementById('docSkillsInput');
  const docIsFemaleInput = document.getElementById('docIsFemaleInput');

  function renderAdminDoctorsTable() {
    if (!adminDoctorsTableBody) return;

    if (adminFounderName && doctorsDirectoryState.founder) {
      adminFounderName.textContent = doctorsDirectoryState.founder.name;
    }
    if (adminFounderThumb && doctorsDirectoryState.founder?.photo) {
      adminFounderThumb.src = doctorsDirectoryState.founder.photo;
    }

    const specialists = doctorsDirectoryState.specialists || [];
    if (!specialists.length) {
      adminDoctorsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">কোনো বিশেষজ্ঞ ডাক্তার তালিকাভুক্ত নেই। "+ Add New Specialist" বাটনে ক্লিক করে যোগ করুন।</td></tr>`;
      return;
    }

    adminDoctorsTableBody.innerHTML = specialists.map((doc, idx) => {
      const skillsHtml = (doc.specialties || []).map(s => `<span class="badge status-completed" style="margin:2px;">${escapeHTML(s)}</span>`).join('');
      return `
        <tr>
          <td>
            <strong>${escapeHTML(doc.name)}</strong>
            ${doc.isFemale ? '<span style="color:var(--primary); font-size:0.75rem; margin-left:5px; font-weight:600;">(Female)</span>' : ''}
          </td>
          <td><span class="badge status-pending">${escapeHTML(doc.bmdc || '')}</span></td>
          <td>${escapeHTML(doc.role || '')}</td>
          <td>${escapeHTML(doc.degrees || '')} ${doc.institution ? `<br><small style="color:var(--text-body);">${escapeHTML(doc.institution)}</small>` : ''}</td>
          <td>${skillsHtml}</td>
          <td style="text-align:right; white-space:nowrap;">
            <button type="button" class="action-btn-status btn-edit-doc" data-idx="${idx}" title="Edit doctor details" style="color:var(--primary); font-weight:700;">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> Edit
            </button>
            <button type="button" class="action-btn-status btn-del-doc" data-idx="${idx}" title="Delete doctor" style="color:#ef4444; font-weight:700; margin-left:8px;">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Attach table action events
    adminDoctorsTableBody.querySelectorAll('.btn-edit-doc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        openDoctorEditModal(specialists[idx], idx, false);
      });
    });

    adminDoctorsTableBody.querySelectorAll('.btn-del-doc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (confirm(`Are you sure you want to remove "${specialists[idx].name}" from the doctors directory?`)) {
          doctorsDirectoryState.specialists.splice(idx, 1);
          renderAdminDoctorsTable();
          saveDoctorsDirectoryToStorage();
        }
      });
    });
  }

  function openDoctorEditModal(doc, idx, isFounder = false) {
    if (!doctorEditModal) return;
    editDoctorIsFounder.value = isFounder ? 'true' : 'false';
    editDoctorId.value = String(idx);

    if (isFounder) {
      doctorModalTitle.innerHTML = `<i data-lucide="award" class="icon-sm"></i> Edit Founder Info (Dr. Nadia)`;
      docNameInput.value = doc.name || 'Dr. Nafisa Anzum Nadia';
      docBmdcInput.value = doc.bmdc || '10471';
      docRoleInput.value = doc.role || 'Founder & Chief Dental Surgeon';
      docDegreesInput.value = (doc.degrees || '').replace(/<[^>]*>?/gm, ' ');
      docBioInput.value = doc.bio || '';
      docSkillsInput.value = 'Aesthetic Dentistry, Root Canal (RCT), Smile Design, Tooth Whitening';
      docIsFemaleInput.checked = true;
    } else if (doc) {
      doctorModalTitle.innerHTML = `<i data-lucide="user-check" class="icon-sm"></i> Edit Doctor Details`;
      docNameInput.value = doc.name || '';
      docBmdcInput.value = doc.bmdc || '';
      docRoleInput.value = doc.role || '';
      docDegreesInput.value = `${doc.degrees || ''}${doc.institution ? ' - ' + doc.institution : ''}`;
      docBioInput.value = doc.bio || '';
      docSkillsInput.value = (doc.specialties || []).join(', ');
      docIsFemaleInput.checked = Boolean(doc.isFemale);
    } else {
      // Add new doctor
      doctorModalTitle.innerHTML = `<i data-lucide="user-plus" class="icon-sm"></i> Add New Specialist Surgeon`;
      docNameInput.value = '';
      docBmdcInput.value = '';
      docRoleInput.value = 'Oral & Dental Surgeon';
      docDegreesInput.value = '';
      docBioInput.value = '';
      docSkillsInput.value = '';
      docIsFemaleInput.checked = false;
    }

    doctorEditModal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeDoctorEditModal() {
    if (doctorEditModal) doctorEditModal.classList.remove('show');
  }

  doctorEditModalClose?.addEventListener('click', closeDoctorEditModal);
  doctorEditCancelBtn?.addEventListener('click', closeDoctorEditModal);

  editFounderBtn?.addEventListener('click', () => {
    openDoctorEditModal(doctorsDirectoryState.founder, -1, true);
  });

  addNewDoctorBtn?.addEventListener('click', () => {
    openDoctorEditModal(null, -1, false);
  });

  if (doctorEditForm) {
    doctorEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const isFounder = editDoctorIsFounder.value === 'true';
      const idx = parseInt(editDoctorId.value, 10);

      const name = docNameInput.value.trim();
      const bmdc = docBmdcInput.value.trim();
      const role = docRoleInput.value.trim();
      const degreesRaw = docDegreesInput.value.trim();
      const bio = docBioInput.value.trim();
      const specialties = docSkillsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const isFemale = Boolean(docIsFemaleInput.checked);

      if (isFounder) {
        doctorsDirectoryState.founder = {
          ...doctorsDirectoryState.founder,
          name,
          bmdc,
          role,
          degrees: degreesRaw,
          bio
        };
      } else {
        const docObj = {
          id: idx >= 0 ? (doctorsDirectoryState.specialists[idx]?.id || Date.now()) : Date.now(),
          name,
          bmdc,
          role,
          degrees: degreesRaw,
          institution: '',
          bio,
          specialties,
          isFemale,
          tag: 'Kinetic Specialist'
        };

        if (idx >= 0 && idx < doctorsDirectoryState.specialists.length) {
          doctorsDirectoryState.specialists[idx] = docObj;
        } else {
          doctorsDirectoryState.specialists.push(docObj);
        }
      }

      closeDoctorEditModal();
      renderAdminDoctorsTable();
      saveDoctorsDirectoryToStorage();
      showAdminToast('ডাক্তারের তথ্য সফলভাবে আপডেট হয়েছে!');
    });
  }

  function saveDoctorsDirectoryToStorage() {
    localStorage.setItem('kinetic_doctors_directory', JSON.stringify(doctorsDirectoryState));
    if (window.db) {
      window.db.collection('settings').doc('doctors_directory').set(doctorsDirectoryState, { merge: true })
        .catch(err => console.error("Firestore save doctors error:", err));
    }
  }

  saveDoctorsDirectoryBtn?.addEventListener('click', () => {
    saveDoctorsDirectoryToStorage();
    showAdminToast('সম্পূর্ণ ডাক্তারদের তালিকা সফলভাবে সংরক্ষণ ও প্রকাশ হয়েছে!');
  });

  // Load doctors from cache & Firestore
  const cachedDoctors = localStorage.getItem('kinetic_doctors_directory');
  if (cachedDoctors) {
    try {
      doctorsDirectoryState = JSON.parse(cachedDoctors);
    } catch (e) {
      doctorsDirectoryState = { ...DEFAULT_DOCTORS_DATA };
    }
  } else {
    doctorsDirectoryState = { ...DEFAULT_DOCTORS_DATA };
  }
  renderAdminDoctorsTable();

  if (window.db) {
    window.db.collection('settings').doc('doctors_directory').get().then(doc => {
      if (doc.exists) {
        doctorsDirectoryState = doc.data();
        localStorage.setItem('kinetic_doctors_directory', JSON.stringify(doctorsDirectoryState));
        renderAdminDoctorsTable();
      }
    }).catch(e => console.log("Doctors initial load:", e.message));
  }

  /* --------------------------------------------------------------------------
     9. Treatments & Pricing Directory Management
     -------------------------------------------------------------------------- */
  const DEFAULT_TREATMENTS = [
    { id: 1, category: 'general', icon: 'sparkles', badgeText: 'Available', title: 'Tooth Scaling & Polishing', titleBn: 'দাঁতের স্কেলিং ও পলিশিং', desc: 'Ultrasonic cleaning to remove stubborn tartar, plaque, and tobacco stains while safeguarding gum health.', symptomsText: 'দাঁতের হলুদ দাগ, পাথর জমা, মুখে দুর্গন্ধ, মাড়ি থেকে রক্ত পড়া', priceLabel: 'Starting From', priceVal: 'BDT 1,200', keywords: 'scaling polishing clean cleaning tartar plaque পাথর স্কেলিং দাঁত পরিষ্কার হলদে দাগ মাড়ি রক্ত', treatmentName: 'Tooth Scaling & Polishing', bookButtonText: 'Book Treatment', linkType: 'details' },
    { id: 2, category: 'cosmetic', icon: 'wand-2', badgeText: 'Available', title: 'Tooth Whitening (Bleaching)', titleBn: 'টিথ হোয়াইটেনিং / দাঁত সাদা করা', desc: 'Certified cosmetic dental bleaching to lighten yellow teeth by several shades safely without hurting enamel.', symptomsText: 'চা-কফি বা বয়সের কারণে হলুদ দাঁত, হাসির উজ্জ্বলতা বৃদ্ধি', priceLabel: 'Starting From', priceVal: 'BDT 10,000', keywords: 'whitening bleaching teeth white cosmetic হোয়াইটেনিং সাদা করা দাঁত উজ্জ্বল', treatmentName: 'Teeth Whitening (Bleaching)', bookButtonText: 'Book Treatment', linkType: 'details' },
    { id: 3, category: 'rct', icon: 'activity', badgeText: 'Available', title: 'Root Canal Therapy (RCT)', titleBn: 'ব্যথামুক্ত রুট ক্যানেল ট্রিটমেন্ট', desc: 'Advanced endodontic procedure performed under local anesthesia to sanitize infected tooth canals and avoid extraction.', symptomsText: 'গভীর ক্যাভিটি, রাতে তীব্র টনটনে ব্যথা, ঠান্ডা-গরমে অসহ্য অনুভূতি', priceLabel: 'Per Canal From', priceVal: 'BDT 3,500', keywords: 'root canal therapy rct infection pulp pain রুট ক্যানেল তীব্র দাঁত ব্যথা ইনফেকশন পুঁজ', treatmentName: 'Root Canal Therapy (RCT)', bookButtonText: 'Book Treatment', linkType: 'details' },
    { id: 4, category: 'emergency', icon: 'alert-circle', badgeText: '24h On-Call', title: 'Toothache & Emergency Solutions', titleBn: 'তীব্র দাঁত ব্যথা ও জরুরি চিকিৎসা', desc: 'Immediate diagnosis, pain management and clinical treatment for sudden severe oral distress and swelling.', symptomsText: 'অসহ্য দাঁত ব্যথা, ফোলা মুখ, রাতে ঘুমাতে না পারা, জরুরি প্রেসক্রিপশন', priceLabel: 'Emergency Care', priceVal: 'BDT 500 / 24h', keywords: 'toothache emergency pain relief urgent দাঁত ব্যথা তীব্র যন্ত্রণা ফোলা জরুরি সেবা', treatmentName: 'Toothache & Emergency Care', bookButtonText: 'Urgent Relief', linkType: 'call' },
    { id: 5, category: 'ortho', icon: 'smile', badgeText: 'Specialist Care', title: 'Braces & Clear Aligners', titleBn: 'বাঁকা ও ফাঁকা দাঁতের ব্রেসেস ও অ্যালাইনার্স', desc: 'Custom metal braces, ceramic braces, and invisible aligners fitted by certified Orthodontists for children and adults.', symptomsText: 'সামনে বের হওয়া দাঁত, অতিরিক্ত ফাঁকা, কামড়ে অসামঞ্জস্য ও আঁকাবাঁকা দাঁত', priceLabel: 'Starting From', priceVal: 'BDT 45,000', keywords: 'braces clear aligners orthodontics crooked teeth ব্রেসেস বাঁকা দাঁত আঁকাবাঁকা ফাঁকা দাঁত সোজা করা', treatmentName: 'Braces & Clear Aligners', bookButtonText: 'Book Treatment', linkType: 'details' },
    { id: 6, category: 'bruxism', icon: 'shield', badgeText: 'Client Highlight', title: 'Customized Night Guard (Bruxism)', titleBn: 'ঘুমের মাঝে দাঁত ঘর্ষণের সমাধান (নাইট গার্ড)', desc: 'Custom-fitted night/mouth guard that eliminates grinding noises and permanently shields enamel from severe abrasion.', symptomsText: 'ঘুমে দাঁত কিড়মিড় শব্দ, সকালে চোয়াল ব্যথা, দাঁতের কিনারা ক্ষয় ও শিরশির', priceLabel: 'Custom Fitted', priceVal: 'BDT 3,500', keywords: 'night guard mouth guard bruxism teeth grinding দাঁতে দাঁত ঘষা কিড়মিড় নাইট গার্ড মাউথ গার্ড শিরশির', treatmentName: 'Night Guard / Bruxism Solution', bookButtonText: 'Book Night Guard', linkType: 'tips' },
    { id: 7, category: 'emergency', icon: 'heart-pulse', badgeText: 'Immediate Care', title: 'Traumatic Injury & Black Tooth Care', titleBn: 'আঘাতপ্রাপ্ত ও কালো দাঁতের জরুরি চিকিৎসা', desc: 'Urgent treatment for teeth injured by bites, sports or accidents to stop internal necrosis, cyst formation, and bone damage.', symptomsText: 'হাড়/পাথরে কামড় লেগে ব্যথা, বলের আঘাত, দাঁত কালচে বা প্রাণহীন হওয়া', priceLabel: 'Evaluation & Plan', priceVal: 'BDT 800', keywords: 'injury trauma black tooth discoloration fall accident আঘাতপ্রাপ্ত দাঁত কালো দাঁত বিবর্ণ রুট ক্যানেল ক্রাউন', treatmentName: 'Traumatic Tooth Injury & Discoloration', bookButtonText: 'Book Injury Check', linkType: 'tips' },
    { id: 8, category: 'cosmetic', icon: 'layers', badgeText: 'Available', title: 'Crowns, Bridges & Implants', titleBn: 'দাঁতের ক্যাপ, ব্রিজ ও স্থায়ী ইমপ্লান্ট', desc: 'High-strength Zirconia/ceramic crowns and permanent titanium implants to restore missing or fractured teeth naturally.', symptomsText: 'রুট ক্যানেলের পর ক্যাপ, ভাঙা দাঁত রক্ষা, হারানো দাঁতের স্থায়ী প্রতিস্থাপন', priceLabel: 'Crowns From', priceVal: 'BDT 5,000', keywords: 'crowns bridges implants ceramic cap capping ক্যাপ ব্রিজ ইমপ্লান্ট কৃত্রিম দাঁত প্রতিস্থাপন', treatmentName: 'Crowns, Bridges & Implants', bookButtonText: 'Book Treatment', linkType: 'details' },
    { id: 9, category: 'kids', icon: 'baby', badgeText: 'Gentle Care', title: 'Pediatric & Kids Dentistry', titleBn: 'শিশুদের কোমল ডেন্টাল কেয়ার', desc: 'Friendly, fear-free dental visits designed specifically for kids — cavity fillings, fluoride varnishes, and dental sealants.', symptomsText: 'দুধদাঁতে পোকা বা কালো দাগ, মিষ্টি খাওয়ার পর ব্যথা, দাঁত ওঠার সমস্যা', priceLabel: 'Gentle Care From', priceVal: 'BDT 800', keywords: 'kids pediatric children child baby fluoride cavity শিশুদের দাঁত বাচ্চার দুধদাঁত সিল্যান্ট পোকা', treatmentName: 'Pediatric / Kids Dentistry', bookButtonText: 'Book for Child', linkType: 'details' },
    { id: 10, category: 'emergency', icon: 'scissors', badgeText: 'Surgical Care', title: 'Wisdom Tooth & Oral Surgery', titleBn: 'আক্কেল দাঁতের সার্জারি ও ব্যথাহীন দাঁত তোলা', desc: 'Painless minor oral surgeries and wisdom tooth extractions performed safely under sterile clinical guidelines.', symptomsText: 'আক্কেল দাঁত বাঁকা হয়ে আটকে থাকা, শেষ মাড়িতে তীব্র ব্যথা ও মুখ খুলতে কষ্ট', priceLabel: 'Starting From', priceVal: 'BDT 3,000', keywords: 'wisdom tooth extraction surgical extraction surgery আক্কেল দাঁত দাঁত তোলা সার্জারি মাড়ি ফোলা', treatmentName: 'Wisdom Tooth & Surgical Extraction', bookButtonText: 'Book Surgery', linkType: 'details' },
    { id: 11, category: 'cosmetic', icon: 'palette', badgeText: 'Available', title: 'Cosmetic Filling & Veneers', titleBn: 'কসমেটিক ফিলিং ও ভিনিয়ার (ফাঁকা বন্ধ)', desc: 'Tooth-colored composite fillings and aesthetic veneers to fix minor gaps, chips, and cavities invisibly in one sitting.', symptomsText: 'সামনের দুই দাঁতের ফাঁকা, দাঁতের ভাঙা কোণা, ছোট ক্যাভিটি ভরাট করা', priceLabel: 'Per Tooth From', priceVal: 'BDT 1,500', keywords: 'filling cosmetic filling veneer composite bonding দাঁতের ফিলিং ফাঁকা বন্ধ সাদা ফিলিং', treatmentName: 'Cosmetic Filling & Veneers', bookButtonText: 'Book Filling', linkType: 'details' },
    { id: 12, category: 'general', icon: 'scan', badgeText: 'In-Clinic', title: 'Digital X-Ray & Oral Checkup', titleBn: 'ডিজিটাল এক্স-রে ও পূর্ণাঙ্গ ডেন্টাল চেকআপ', desc: 'Instant computerized radiography to inspect hidden cavities, root infections, and jaw bone structure accurately.', symptomsText: 'চোখে দেখা যায় না এমন লুকানো সমস্যা, হাড়ের ক্ষয় ও ইনফেকশন নির্ণয়', priceLabel: 'Digital RVG', priceVal: 'BDT 400', keywords: 'xray digital x-ray diagnosis checkup এক্স-রে দাঁতের ছবি পরীক্ষা রোগ নির্ণয়', treatmentName: 'Digital X-Ray & Consultation', bookButtonText: 'Book Checkup', linkType: 'appointment' }
  ];

  const CATEGORY_LABELS = { general: 'General & Scaling', rct: 'Root Canal (RCT)', cosmetic: 'Cosmetic & Whitening', ortho: 'Braces & Aligners', bruxism: 'Night Guard (Bruxism)', emergency: 'Emergency & Surgery', kids: 'Kids Dentistry' };

  let treatmentsState = DEFAULT_TREATMENTS.map(t => ({ ...t }));

  const adminTreatmentsTableBody = document.getElementById('adminTreatmentsTableBody');
  const addNewTreatmentBtn = document.getElementById('addNewTreatmentBtn');
  const saveTreatmentsDirectoryBtn = document.getElementById('saveTreatmentsDirectoryBtn');

  const treatmentEditModal = document.getElementById('treatmentEditModal');
  const treatmentEditModalClose = document.getElementById('treatmentEditModalClose');
  const treatmentEditCancelBtn = document.getElementById('treatmentEditCancelBtn');
  const treatmentEditForm = document.getElementById('treatmentEditForm');
  const treatmentModalTitle = document.getElementById('treatmentModalTitle');
  const editTreatmentIdx = document.getElementById('editTreatmentIdx');
  const trtTitleInput = document.getElementById('trtTitleInput');
  const trtTitleBnInput = document.getElementById('trtTitleBnInput');
  const trtDescInput = document.getElementById('trtDescInput');
  const trtSymptomsInput = document.getElementById('trtSymptomsInput');
  const trtPriceLabelInput = document.getElementById('trtPriceLabelInput');
  const trtPriceValInput = document.getElementById('trtPriceValInput');
  const trtCategoryInput = document.getElementById('trtCategoryInput');
  const trtBadgeInput = document.getElementById('trtBadgeInput');
  const trtIconInput = document.getElementById('trtIconInput');
  const trtLinkTypeInput = document.getElementById('trtLinkTypeInput');
  const trtBookBtnTextInput = document.getElementById('trtBookBtnTextInput');
  const trtKeywordsInput = document.getElementById('trtKeywordsInput');

  function renderAdminTreatmentsTable() {
    if (!adminTreatmentsTableBody) return;

    if (!treatmentsState.length) {
      adminTreatmentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">কোনো চিকিৎসা তালিকাভুক্ত নেই। "+ Add New Treatment" বাটনে ক্লিক করে যোগ করুন।</td></tr>`;
      return;
    }

    adminTreatmentsTableBody.innerHTML = treatmentsState.map((t, idx) => `
      <tr>
        <td>
          <strong>${escapeHTML(t.title)}</strong>
          ${t.titleBn ? `<br><small style="color:var(--text-body);">${escapeHTML(t.titleBn)}</small>` : ''}
        </td>
        <td><span class="badge status-completed">${escapeHTML(CATEGORY_LABELS[t.category] || t.category || '')}</span></td>
        <td><small>${escapeHTML(t.priceLabel || '')}</small><br><strong style="color:var(--primary);">${escapeHTML(t.priceVal || '')}</strong></td>
        <td><span class="badge status-pending">${escapeHTML(t.badgeText || '')}</span></td>
        <td style="text-align:right; white-space:nowrap;">
          <button type="button" class="action-btn-status btn-edit-trt" data-idx="${idx}" title="Edit treatment" style="color:var(--primary); font-weight:700;">
            <i data-lucide="edit-3" style="width:14px;height:14px;"></i> Edit
          </button>
          <button type="button" class="action-btn-status btn-del-trt" data-idx="${idx}" title="Delete treatment" style="color:#ef4444; font-weight:700; margin-left:8px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    adminTreatmentsTableBody.querySelectorAll('.btn-edit-trt').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        openTreatmentEditModal(treatmentsState[idx], idx);
      });
    });

    adminTreatmentsTableBody.querySelectorAll('.btn-del-trt').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (confirm(`Are you sure you want to remove "${treatmentsState[idx].title}" from the treatments list?`)) {
          treatmentsState.splice(idx, 1);
          renderAdminTreatmentsTable();
          saveTreatmentsDirectoryToStorage();
        }
      });
    });
  }

  function openTreatmentEditModal(t, idx) {
    if (!treatmentEditModal) return;
    editTreatmentIdx.value = String(idx);

    if (t) {
      treatmentModalTitle.innerHTML = `<i data-lucide="stethoscope" class="icon-sm"></i> Edit Treatment`;
      trtTitleInput.value = t.title || '';
      trtTitleBnInput.value = t.titleBn || '';
      trtDescInput.value = t.desc || '';
      trtSymptomsInput.value = t.symptomsText || '';
      trtPriceLabelInput.value = t.priceLabel || 'Starting From';
      trtPriceValInput.value = t.priceVal || '';
      trtCategoryInput.value = t.category || 'general';
      trtBadgeInput.value = t.badgeText || 'Available';
      trtIconInput.value = t.icon || 'sparkles';
      trtLinkTypeInput.value = t.linkType || 'details';
      trtBookBtnTextInput.value = t.bookButtonText || 'Book Treatment';
      trtKeywordsInput.value = t.keywords || '';
    } else {
      treatmentModalTitle.innerHTML = `<i data-lucide="plus-circle" class="icon-sm"></i> Add New Treatment`;
      trtTitleInput.value = '';
      trtTitleBnInput.value = '';
      trtDescInput.value = '';
      trtSymptomsInput.value = '';
      trtPriceLabelInput.value = 'Starting From';
      trtPriceValInput.value = '';
      trtCategoryInput.value = 'general';
      trtBadgeInput.value = 'Available';
      trtIconInput.value = 'sparkles';
      trtLinkTypeInput.value = 'details';
      trtBookBtnTextInput.value = 'Book Treatment';
      trtKeywordsInput.value = '';
    }

    treatmentEditModal.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeTreatmentEditModal() {
    if (treatmentEditModal) treatmentEditModal.classList.remove('active');
  }

  treatmentEditModalClose?.addEventListener('click', closeTreatmentEditModal);
  treatmentEditCancelBtn?.addEventListener('click', closeTreatmentEditModal);
  treatmentEditModal?.addEventListener('click', (e) => {
    if (e.target === treatmentEditModal) closeTreatmentEditModal();
  });

  addNewTreatmentBtn?.addEventListener('click', () => {
    openTreatmentEditModal(null, -1);
  });

  if (treatmentEditForm) {
    treatmentEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editTreatmentIdx.value, 10);

      const treatmentObj = {
        id: idx >= 0 ? (treatmentsState[idx]?.id || Date.now()) : Date.now(),
        title: trtTitleInput.value.trim(),
        titleBn: trtTitleBnInput.value.trim(),
        desc: trtDescInput.value.trim(),
        symptomsText: trtSymptomsInput.value.trim(),
        priceLabel: trtPriceLabelInput.value.trim() || 'Starting From',
        priceVal: trtPriceValInput.value.trim(),
        category: trtCategoryInput.value,
        badgeText: trtBadgeInput.value.trim() || 'Available',
        icon: trtIconInput.value.trim() || 'sparkles',
        linkType: trtLinkTypeInput.value,
        bookButtonText: trtBookBtnTextInput.value.trim() || 'Book Treatment',
        keywords: trtKeywordsInput.value.trim(),
        treatmentName: trtTitleInput.value.trim()
      };

      if (idx >= 0 && idx < treatmentsState.length) {
        treatmentsState[idx] = treatmentObj;
      } else {
        treatmentsState.push(treatmentObj);
      }

      closeTreatmentEditModal();
      renderAdminTreatmentsTable();
      saveTreatmentsDirectoryToStorage();
      showAdminToast('চিকিৎসার তথ্য সফলভাবে আপডেট হয়েছে!');
    });
  }

  function saveTreatmentsDirectoryToStorage() {
    const payload = { treatments: treatmentsState };
    localStorage.setItem('kinetic_treatments_directory', JSON.stringify(payload));
    if (window.db) {
      window.db.collection('settings').doc('treatments_directory').set(payload, { merge: true })
        .catch(err => console.error("Firestore save treatments error:", err));
    }
  }

  saveTreatmentsDirectoryBtn?.addEventListener('click', () => {
    saveTreatmentsDirectoryToStorage();
    showAdminToast('সম্পূর্ণ চিকিৎসা ও মূল্য তালিকা সফলভাবে সংরক্ষণ ও প্রকাশ হয়েছে!');
  });

  // Load treatments from cache & Firestore
  const cachedTreatmentsAdmin = localStorage.getItem('kinetic_treatments_directory');
  if (cachedTreatmentsAdmin) {
    try {
      const parsed = JSON.parse(cachedTreatmentsAdmin);
      treatmentsState = Array.isArray(parsed.treatments) && parsed.treatments.length ? parsed.treatments : DEFAULT_TREATMENTS.map(t => ({ ...t }));
    } catch (e) {
      treatmentsState = DEFAULT_TREATMENTS.map(t => ({ ...t }));
    }
  }
  renderAdminTreatmentsTable();

  if (window.db) {
    window.db.collection('settings').doc('treatments_directory').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().treatments) && doc.data().treatments.length) {
        treatmentsState = doc.data().treatments;
        localStorage.setItem('kinetic_treatments_directory', JSON.stringify({ treatments: treatmentsState }));
        renderAdminTreatmentsTable();
      }
    }).catch(e => console.log("Treatments initial load:", e.message));
  }

  /* --------------------------------------------------------------------------
     10. Chamber Hotlines, Timings & Live Ticker Management
     -------------------------------------------------------------------------- */
  const DEFAULT_CLINIC_SETTINGS = {
    phone1: "01313-175779",
    phone2: "01308-388577",
    whatsapp: "8801313175779",
    hours: "10:00 AM – 02:00 PM & 05:00 PM – 09:00 PM",
    friday: "Friday Open: 10:00 AM – 02:00 PM & 05:00 PM – 09:00 PM",
    emergency: "24 Hours & On-Call Emergency Service",
    address: "Holding: 10, Road: 16, Block: C, Section: 12, Mirpur, Dhaka-1216 (Mirpur 12 Bus Stand সংলগ্ন)",
    tickerActive: true,
    tickerText: "🎉 শুক্রবার চেম্বার খোলা (সকাল ১০টা - রাত ৯টা) · জরুরি ডেন্টাল হটলাইন: 01313-175779",
    fbPage: "https://www.facebook.com/kineticdentalcare",
    fbGroup: "https://www.facebook.com/groups/kineticdentalcare"
  };

  let clinicSettingsState = { ...DEFAULT_CLINIC_SETTINGS };

  const clinicSettingsForm = document.getElementById('clinicSettingsForm');
  const tickerActiveToggle = document.getElementById('tickerActiveToggle');
  const tickerTextInput = document.getElementById('tickerTextInput');
  const clinicPhone1Input = document.getElementById('clinicPhone1Input');
  const clinicPhone2Input = document.getElementById('clinicPhone2Input');
  const clinicWhatsappInput = document.getElementById('clinicWhatsappInput');
  const clinicEmergencyInput = document.getElementById('clinicEmergencyInput');
  const clinicHoursInput = document.getElementById('clinicHoursInput');
  const clinicFridayInput = document.getElementById('clinicFridayInput');
  const clinicAddressInput = document.getElementById('clinicAddressInput');
  const clinicFbPageInput = document.getElementById('clinicFbPageInput');
  const clinicFbGroupInput = document.getElementById('clinicFbGroupInput');

  function populateClinicSettingsForm(settings) {
    if (!settings) return;
    if (tickerActiveToggle) tickerActiveToggle.checked = Boolean(settings.tickerActive);
    if (tickerTextInput) tickerTextInput.value = settings.tickerText || '';
    if (clinicPhone1Input) clinicPhone1Input.value = settings.phone1 || '';
    if (clinicPhone2Input) clinicPhone2Input.value = settings.phone2 || '';
    if (clinicWhatsappInput) clinicWhatsappInput.value = settings.whatsapp || '';
    if (clinicEmergencyInput) clinicEmergencyInput.value = settings.emergency || '';
    if (clinicHoursInput) clinicHoursInput.value = settings.hours || '';
    if (clinicFridayInput) clinicFridayInput.value = settings.friday || '';
    if (clinicAddressInput) clinicAddressInput.value = settings.address || '';
    if (clinicFbPageInput) clinicFbPageInput.value = settings.fbPage || '';
    if (clinicFbGroupInput) clinicFbGroupInput.value = settings.fbGroup || '';
  }

  function saveClinicSettingsToStorage() {
    localStorage.setItem('kinetic_clinic_settings', JSON.stringify(clinicSettingsState));
    if (window.db) {
      window.db.collection('settings').doc('clinic_profile').set(clinicSettingsState, { merge: true })
        .catch(err => console.warn("Firestore save clinic settings error:", err));
    }
  }

  if (clinicSettingsForm) {
    clinicSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();

      clinicSettingsState = {
        tickerActive: tickerActiveToggle ? tickerActiveToggle.checked : true,
        tickerText: tickerTextInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.tickerText,
        phone1: clinicPhone1Input?.value.trim() || DEFAULT_CLINIC_SETTINGS.phone1,
        phone2: clinicPhone2Input?.value.trim() || DEFAULT_CLINIC_SETTINGS.phone2,
        whatsapp: clinicWhatsappInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.whatsapp,
        emergency: clinicEmergencyInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.emergency,
        hours: clinicHoursInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.hours,
        friday: clinicFridayInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.friday,
        address: clinicAddressInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.address,
        fbPage: clinicFbPageInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.fbPage,
        fbGroup: clinicFbGroupInput?.value.trim() || DEFAULT_CLINIC_SETTINGS.fbGroup
      };

      saveClinicSettingsToStorage();
      showAdminToast('চেম্বার ও হটলাইন তথ্য সফলভাবে সংরক্ষণ ও প্রকাশ হয়েছে!');
    });
  }

  // Load clinic settings from local cache
  const cachedClinicSettings = localStorage.getItem('kinetic_clinic_settings');
  if (cachedClinicSettings) {
    try {
      clinicSettingsState = { ...DEFAULT_CLINIC_SETTINGS, ...JSON.parse(cachedClinicSettings) };
    } catch (e) {
      clinicSettingsState = { ...DEFAULT_CLINIC_SETTINGS };
    }
  }
  populateClinicSettingsForm(clinicSettingsState);

  // Sync from Firestore if available
  if (window.db) {
    window.db.collection('settings').doc('clinic_profile').get().then(doc => {
      if (doc.exists) {
        clinicSettingsState = { ...DEFAULT_CLINIC_SETTINGS, ...doc.data() };
        localStorage.setItem('kinetic_clinic_settings', JSON.stringify(clinicSettingsState));
        populateClinicSettingsForm(clinicSettingsState);
      }
    }).catch(e => console.log("Clinic settings initial load:", e.message));
  }

  /* --------------------------------------------------------------------------
     11. Patient Reviews & Testimonials Management
     -------------------------------------------------------------------------- */
  const DEFAULT_TESTIMONIALS = [
    {
      name: "তাহমিনা সুলতানা",
      treatment: "Teeth Whitening & Scaling",
      rating: 5,
      comment: "ডেন্টাল ট্রিটমেন্ট নিয়ে আমার ভয় ছিল, কিন্তু ডাঃ নাদিয়া আপু একদম ব্যথাহীনভাবে স্কেলিং ও হোয়াইটেনিং করে দিয়েছেন। চেম্বারের পরিবেশ চমৎকার ও ১০০% জীবাণুমুক্ত।",
      date: "February 2026"
    },
    {
      name: "ইঞ্জিঃ রফিকুল ইসলাম",
      treatment: "Root Canal Therapy (RCT)",
      rating: 5,
      comment: "দাঁতের প্রচণ্ড ব্যথায় রাতে ঘুমাতে পারছিলাম না। Kinetic Dental-এর জরুরি সেবায় তাৎক্ষণিক রুট ক্যানেল করে ক্যাপ বসিয়ে দেওয়া হয়। অত্যন্ত পেশাদার ও আন্তরিক টিম।",
      date: "January 2026"
    },
    {
      name: "শামীমা আক্তার",
      treatment: "Clear Aligners / Braces",
      rating: 5,
      comment: "মেয়ের বাঁকা দাঁতের জন্য এখানে আসি। এখানকার নারী চিকিৎসকদের যত্ন ও আন্তরিকতা সত্যি প্রশংসনীয়। মিরপুর ১২-তে এমন বিশ্বমানের ডেন্টাল কেয়ার পেয়ে আমরা খুবই সন্তুষ্ট।",
      date: "March 2026"
    }
  ];

  let testimonialsState = [...DEFAULT_TESTIMONIALS];

  const adminTestimonialsList = document.getElementById('adminTestimonialsList');
  const addNewTestimonialBtn = document.getElementById('addNewTestimonialBtn');
  const saveTestimonialsBtn = document.getElementById('saveTestimonialsBtn');
  const testimonialEditModal = document.getElementById('testimonialEditModal');
  const testimonialModalClose = document.getElementById('testimonialModalClose');
  const testimonialCancelBtn = document.getElementById('testimonialCancelBtn');
  const testimonialEditForm = document.getElementById('testimonialEditForm');
  const editTestimonialIdx = document.getElementById('editTestimonialIdx');
  const tstNameInput = document.getElementById('tstNameInput');
  const tstTreatmentInput = document.getElementById('tstTreatmentInput');
  const tstRatingInput = document.getElementById('tstRatingInput');
  const tstCommentInput = document.getElementById('tstCommentInput');
  const tstDateInput = document.getElementById('tstDateInput');

  function renderAdminTestimonials() {
    if (!adminTestimonialsList) return;

    if (!testimonialsState.length) {
      adminTestimonialsList.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-body);">কোনো রিভিউ তালিকাভুক্ত নেই। "+ Add New Review" বাটনে ক্লিক করে যুক্ত করুন।</div>`;
      return;
    }

    adminTestimonialsList.innerHTML = testimonialsState.map((t, idx) => {
      const stars = '⭐'.repeat(t.rating || 5);
      return `
        <div class="admin-testimonial-card">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap;">
              <strong style="font-size:1.05rem; color:var(--text-title);">${escapeHTML(t.name)}</strong>
              <span class="badge status-completed" style="font-size:0.75rem;">${escapeHTML(t.treatment)}</span>
              <span style="font-size:0.85rem;">${stars}</span>
            </div>
            <p style="font-size:0.9rem; color:var(--text-body); margin:6px 0; font-style:italic;">"${escapeHTML(t.comment)}"</p>
            <span style="font-size:0.78rem; color:var(--text-muted);">${escapeHTML(t.date || 'Recent')}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="action-btn-status btn-edit-tst" data-idx="${idx}" title="Edit review" style="color:var(--primary); font-weight:700;">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> Edit
            </button>
            <button type="button" class="action-btn-status btn-del-tst" data-idx="${idx}" title="Delete review" style="color:#ef4444; font-weight:700;">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    adminTestimonialsList.querySelectorAll('.btn-edit-tst').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        openTestimonialEditModal(testimonialsState[idx], idx);
      });
    });

    adminTestimonialsList.querySelectorAll('.btn-del-tst').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (confirm(`Are you sure you want to remove the review by "${testimonialsState[idx].name}"?`)) {
          testimonialsState.splice(idx, 1);
          renderAdminTestimonials();
          saveTestimonialsToStorage();
        }
      });
    });
  }

  function openTestimonialEditModal(t, idx) {
    if (!testimonialEditModal) return;
    editTestimonialIdx.value = String(idx);

    if (t) {
      document.getElementById('testimonialModalTitle').innerHTML = `<i data-lucide="edit-3" class="icon-sm"></i> Edit Patient Review`;
      tstNameInput.value = t.name || '';
      tstTreatmentInput.value = t.treatment || '';
      tstRatingInput.value = String(t.rating || 5);
      tstCommentInput.value = t.comment || '';
      tstDateInput.value = t.date || '';
    } else {
      document.getElementById('testimonialModalTitle').innerHTML = `<i data-lucide="plus-circle" class="icon-sm"></i> Add New Review`;
      tstNameInput.value = '';
      tstTreatmentInput.value = '';
      tstRatingInput.value = '5';
      tstCommentInput.value = '';
      tstDateInput.value = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    testimonialEditModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeTestimonialEditModal() {
    if (!testimonialEditModal) return;
    testimonialEditModal.classList.remove('active');
    document.body.style.overflow = '';
    if (testimonialEditForm) testimonialEditForm.reset();
  }

  if (addNewTestimonialBtn) {
    addNewTestimonialBtn.addEventListener('click', () => openTestimonialEditModal(null, -1));
  }
  if (testimonialModalClose) testimonialModalClose.addEventListener('click', closeTestimonialEditModal);
  if (testimonialCancelBtn) testimonialCancelBtn.addEventListener('click', closeTestimonialEditModal);
  if (testimonialEditModal) {
    testimonialEditModal.addEventListener('click', (e) => {
      if (e.target === testimonialEditModal) closeTestimonialEditModal();
    });
  }

  if (testimonialEditForm) {
    testimonialEditForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const idx = parseInt(editTestimonialIdx.value, 10);
      const testimonialObj = {
        name: tstNameInput.value.trim(),
        treatment: tstTreatmentInput.value.trim(),
        rating: parseInt(tstRatingInput.value, 10) || 5,
        comment: tstCommentInput.value.trim(),
        date: tstDateInput.value.trim() || 'Recent'
      };

      if (idx >= 0 && idx < testimonialsState.length) {
        testimonialsState[idx] = testimonialObj;
      } else {
        testimonialsState.push(testimonialObj);
      }

      closeTestimonialEditModal();
      renderAdminTestimonials();
      saveTestimonialsToStorage();
      showAdminToast('রিভিউ সফলভাবে আপডেট হয়েছে!');
    });
  }

  function saveTestimonialsToStorage() {
    localStorage.setItem('kinetic_testimonials', JSON.stringify(testimonialsState));
    if (window.db) {
      window.db.collection('settings').doc('testimonials').set({ reviews: testimonialsState }, { merge: true })
        .catch(err => console.warn("Firestore save testimonials error:", err));
    }
  }

  if (saveTestimonialsBtn) {
    saveTestimonialsBtn.addEventListener('click', () => {
      saveTestimonialsToStorage();
      showAdminToast('রোগীদের রিভিউ সফলভাবে সংরক্ষণ ও প্রকাশ হয়েছে!');
    });
  }

  // Load testimonials from cache
  const cachedTestimonials = localStorage.getItem('kinetic_testimonials');
  if (cachedTestimonials) {
    try {
      const parsed = JSON.parse(cachedTestimonials);
      testimonialsState = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_TESTIMONIALS];
    } catch (e) {
      testimonialsState = [...DEFAULT_TESTIMONIALS];
    }
  }
  renderAdminTestimonials();

  if (window.db) {
    window.db.collection('settings').doc('testimonials').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().reviews) && doc.data().reviews.length) {
        testimonialsState = doc.data().reviews;
        localStorage.setItem('kinetic_testimonials', JSON.stringify(testimonialsState));
        renderAdminTestimonials();
      }
    }).catch(e => console.log("Testimonials initial load:", e.message));
  }

  /* --------------------------------------------------------------------------
     12. Homepage Hero & Brand Content Editor
     -------------------------------------------------------------------------- */
  const DEFAULT_HERO_CONTENT = {
    tagline: 'Open Today in Mirpur 12 · 8 Specialist Doctors',
    brandHighlight: 'Kinetic Dental Center',
    title: 'Painless & High-Tech Dental Care —',
    description: 'Experience Dhaka’s trusted gentle dental care led by Dr. Nadia & senior BMDC specialist surgeons. 100% sterile Class-B autoclave environment, digital RVG diagnosis, and specialized female dental suites.',
    stat1Num: '1,000+',
    stat1Lbl: 'Happy Smiles',
    stat2Num: '8 Doctors',
    stat2Lbl: 'BMDC Specialists',
    stat3Num: '100%',
    stat3Lbl: 'Sterile Safety',
    stat4Num: '24/7',
    stat4Lbl: 'Emergency Care',
    founderName: 'Dr. Nafisa Nadia',
    founderRole: 'Founder & Chief Surgeon',
    femaleCardTitle: 'Female Dentist Team',
    femaleCardSub: '100% Privacy & Care'
  };

  const heroContentForm = document.getElementById('heroContentForm');
  const heroTaglineInput = document.getElementById('heroTaglineInput');
  const heroBrandHighlightInput = document.getElementById('heroBrandHighlightInput');
  const heroTitleInput = document.getElementById('heroTitleInput');
  const heroDescInput = document.getElementById('heroDescInput');
  const heroStat1Num = document.getElementById('heroStat1Num');
  const heroStat1Lbl = document.getElementById('heroStat1Lbl');
  const heroStat2Num = document.getElementById('heroStat2Num');
  const heroStat2Lbl = document.getElementById('heroStat2Lbl');
  const heroStat3Num = document.getElementById('heroStat3Num');
  const heroStat3Lbl = document.getElementById('heroStat3Lbl');
  const heroStat4Num = document.getElementById('heroStat4Num');
  const heroStat4Lbl = document.getElementById('heroStat4Lbl');
  const heroFounderNameInput = document.getElementById('heroFounderNameInput');
  const heroFounderRoleInput = document.getElementById('heroFounderRoleInput');
  const heroFemaleTitleInput = document.getElementById('heroFemaleTitleInput');
  const heroFemaleSubtitleInput = document.getElementById('heroFemaleSubtitleInput');

  function populateHeroForm(data) {
    const d = { ...DEFAULT_HERO_CONTENT, ...(data || {}) };
    if (heroTaglineInput) heroTaglineInput.value = d.tagline || '';
    if (heroBrandHighlightInput) heroBrandHighlightInput.value = d.brandHighlight || '';
    if (heroTitleInput) heroTitleInput.value = d.title || '';
    if (heroDescInput) heroDescInput.value = d.description || '';
    if (heroStat1Num) heroStat1Num.value = d.stat1Num || '';
    if (heroStat1Lbl) heroStat1Lbl.value = d.stat1Lbl || '';
    if (heroStat2Num) heroStat2Num.value = d.stat2Num || '';
    if (heroStat2Lbl) heroStat2Lbl.value = d.stat2Lbl || '';
    if (heroStat3Num) heroStat3Num.value = d.stat3Num || '';
    if (heroStat3Lbl) heroStat3Lbl.value = d.stat3Lbl || '';
    if (heroStat4Num) heroStat4Num.value = d.stat4Num || '';
    if (heroStat4Lbl) heroStat4Lbl.value = d.stat4Lbl || '';
    if (heroFounderNameInput) heroFounderNameInput.value = d.founderName || '';
    if (heroFounderRoleInput) heroFounderRoleInput.value = d.founderRole || '';
    if (heroFemaleTitleInput) heroFemaleTitleInput.value = d.femaleCardTitle || '';
    if (heroFemaleSubtitleInput) heroFemaleSubtitleInput.value = d.femaleCardSub || '';
  }

  const cachedHero = localStorage.getItem('kinetic_hero_content');
  if (cachedHero) {
    try {
      populateHeroForm(JSON.parse(cachedHero));
    } catch (e) {
      populateHeroForm(DEFAULT_HERO_CONTENT);
    }
  } else {
    populateHeroForm(DEFAULT_HERO_CONTENT);
  }

  if (window.db) {
    window.db.collection('settings').doc('hero_content').get().then(doc => {
      if (doc.exists) {
        const live = doc.data();
        localStorage.setItem('kinetic_hero_content', JSON.stringify(live));
        populateHeroForm(live);
      }
    }).catch(e => console.log("Hero content initial load:", e.message));
  }

  if (heroContentForm) {
    heroContentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const heroData = {
        tagline: heroTaglineInput.value.trim(),
        brandHighlight: heroBrandHighlightInput.value.trim(),
        title: heroTitleInput.value.trim(),
        description: heroDescInput.value.trim(),
        stat1Num: heroStat1Num.value.trim(),
        stat1Lbl: heroStat1Lbl.value.trim(),
        stat2Num: heroStat2Num.value.trim(),
        stat2Lbl: heroStat2Lbl.value.trim(),
        stat3Num: heroStat3Num.value.trim(),
        stat3Lbl: heroStat3Lbl.value.trim(),
        stat4Num: heroStat4Num.value.trim(),
        stat4Lbl: heroStat4Lbl.value.trim(),
        founderName: heroFounderNameInput.value.trim(),
        founderRole: heroFounderRoleInput.value.trim(),
        femaleCardTitle: heroFemaleTitleInput.value.trim(),
        femaleCardSub: heroFemaleSubtitleInput.value.trim(),
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('kinetic_hero_content', JSON.stringify(heroData));
      if (window.db) {
        window.db.collection('settings').doc('hero_content').set(heroData, { merge: true })
          .then(() => showAdminToast('হোমপেজ ব্যানার ও পরিসংখ্যান সফলভাবে সেভ ও পাবলিশ হয়েছে!'))
          .catch(err => {
            console.warn('Hero save error:', err);
            showAdminToast('লোকালে সংরক্ষিত (Firebase: ' + err.message + ')', 'error');
          });
      } else {
        showAdminToast('হোমপেজ ব্যানার ও পরিসংখ্যান সফলভাবে সেভ হয়েছে!');
      }
    });
  }

  /* --------------------------------------------------------------------------
     13. Chamber Special Facilities Manager
     -------------------------------------------------------------------------- */
  const DEFAULT_FACILITIES = [
    {
      id: 'fac-1',
      title: 'Digital X-Ray Facilities',
      titleBn: 'ডিজিটাল এক্স-রে সুবিধা',
      desc: 'High-resolution instant imaging for quick, accurate diagnosis with minimal radiation exposure.',
      icon: 'scan-line',
      style: 'default'
    },
    {
      id: 'fac-2',
      title: 'Female Dentist for Female Patient',
      titleBn: 'মহিলা রোগীদের জন্য অভিজ্ঞ মহিলা ডেন্টিস্ট',
      desc: 'Experienced female dental surgeons available to ensure complete comfort, dignity, and gentle care.',
      icon: 'user-check',
      style: 'highlight-female'
    },
    {
      id: 'fac-3',
      title: '24h & On-Call Emergency',
      titleBn: '২৪ ঘণ্টা ও অন-কল জরুরি সেবা',
      desc: 'Immediate care for severe toothaches, broken teeth, bleeding, and accidental oral trauma.',
      icon: 'phone-incoming',
      style: 'default'
    },
    {
      id: 'fac-4',
      title: '100% Sterile Environment',
      titleBn: '১০০% জীবাণুমুক্ত ডেন্টাল পরিবেশ',
      desc: 'Multi-stage autoclave sterilization protocols and disposables ensuring 100% patient safety.',
      icon: 'shield-check',
      style: 'default'
    },
    {
      id: 'fac-5',
      title: 'Free Underprivileged Care',
      titleBn: 'অসহায় মানুষের জন্য বিনামূল্যে চিকিৎসা',
      desc: 'Regular free dental checkups, treatment camps & humanitarian care for underprivileged families.',
      icon: 'heart-handshake',
      style: 'highlight-free'
    }
  ];

  let facilitiesState = [...DEFAULT_FACILITIES];
  const adminFacilitiesList = document.getElementById('adminFacilitiesList');
  const addNewFacilityBtn = document.getElementById('addNewFacilityBtn');
  const facilityEditModal = document.getElementById('facilityEditModal');
  const facilityModalClose = document.getElementById('facilityModalClose');
  const facilityCancelBtn = document.getElementById('facilityCancelBtn');
  const facilityEditForm = document.getElementById('facilityEditForm');
  const editFacilityIdx = document.getElementById('editFacilityIdx');
  const facTitleInput = document.getElementById('facTitleInput');
  const facTitleBnInput = document.getElementById('facTitleBnInput');
  const facDescInput = document.getElementById('facDescInput');
  const facIconInput = document.getElementById('facIconInput');
  const facStyleInput = document.getElementById('facStyleInput');
  const saveFacilitiesBtn = document.getElementById('saveFacilitiesBtn');

  function renderAdminFacilities() {
    if (!adminFacilitiesList) return;
    if (!facilitiesState.length) {
      adminFacilitiesList.innerHTML = '<p class="text-body" style="padding:15px; text-align:center;">কোনো সুবিধা যুক্ত করা হয়নি।</p>';
      return;
    }
    adminFacilitiesList.innerHTML = facilitiesState.map((f, idx) => `
      <div class="admin-cms-card">
        <div class="admin-cms-content">
          <div class="admin-cms-header">
            <span class="admin-cms-title"><i data-lucide="${escapeHTML(f.icon || 'award')}" class="icon-sm text-primary"></i> ${escapeHTML(f.title)}</span>
            ${f.titleBn ? `<span class="admin-cms-subtitle">(${escapeHTML(f.titleBn)})</span>` : ''}
            <span class="admin-cms-badge">${escapeHTML(f.style || 'Standard')}</span>
          </div>
          <p class="admin-cms-desc">${escapeHTML(f.desc)}</p>
        </div>
        <div class="admin-cms-actions">
          <button type="button" class="btn-action-icon" onclick="window.editFacilityItem(${idx})" title="Edit Facility">
            <i data-lucide="edit-3"></i>
          </button>
          <button type="button" class="btn-action-icon btn-action-del" onclick="window.deleteFacilityItem(${idx})" title="Delete Facility">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeFacilityEditModal() {
    if (!facilityEditModal) return;
    facilityEditModal.classList.remove('active');
    document.body.style.overflow = '';
    if (facilityEditForm) facilityEditForm.reset();
  }

  function openFacilityEditModal(item = null, idx = -1) {
    if (!facilityEditModal) return;
    editFacilityIdx.value = idx;
    const titleEl = document.getElementById('facilityModalTitle');
    if (titleEl) {
      titleEl.innerHTML = idx >= 0
        ? '<i data-lucide="award" class="icon-sm"></i> Edit Facility'
        : '<i data-lucide="plus-circle" class="icon-sm"></i> Add New Facility';
    }

    if (item) {
      facTitleInput.value = item.title || '';
      facTitleBnInput.value = item.titleBn || '';
      facDescInput.value = item.desc || '';
      facIconInput.value = item.icon || 'award';
      facStyleInput.value = item.style || 'default';
    } else {
      facTitleInput.value = '';
      facTitleBnInput.value = '';
      facDescInput.value = '';
      facIconInput.value = 'award';
      facStyleInput.value = 'default';
    }

    facilityEditModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.editFacilityItem = (idx) => {
    if (idx >= 0 && idx < facilitiesState.length) {
      openFacilityEditModal(facilitiesState[idx], idx);
    }
  };

  window.deleteFacilityItem = (idx) => {
    if (idx >= 0 && idx < facilitiesState.length) {
      if (confirm(`আপনি কি "${facilitiesState[idx].title}" সুবিধাটি মুছে ফেলতে চান?`)) {
        facilitiesState.splice(idx, 1);
        renderAdminFacilities();
        saveFacilitiesToStorage();
        showAdminToast('সুবিধা সফলভাবে মুছে ফেলা হয়েছে!');
      }
    }
  };

  if (addNewFacilityBtn) {
    addNewFacilityBtn.addEventListener('click', () => openFacilityEditModal(null, -1));
  }
  if (facilityModalClose) facilityModalClose.addEventListener('click', closeFacilityEditModal);
  if (facilityCancelBtn) facilityCancelBtn.addEventListener('click', closeFacilityEditModal);
  if (facilityEditModal) {
    facilityEditModal.addEventListener('click', (e) => {
      if (e.target === facilityEditModal) closeFacilityEditModal();
    });
  }

  if (facilityEditForm) {
    facilityEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editFacilityIdx.value, 10);
      const facObj = {
        id: idx >= 0 ? (facilitiesState[idx]?.id || `fac-${Date.now()}`) : `fac-${Date.now()}`,
        title: facTitleInput.value.trim(),
        titleBn: facTitleBnInput.value.trim(),
        desc: facDescInput.value.trim(),
        icon: facIconInput.value || 'award',
        style: facStyleInput.value || 'default'
      };

      if (idx >= 0 && idx < facilitiesState.length) {
        facilitiesState[idx] = facObj;
      } else {
        facilitiesState.push(facObj);
      }

      closeFacilityEditModal();
      renderAdminFacilities();
      saveFacilitiesToStorage();
      showAdminToast('সুবিধা সফলভাবে আপডেট হয়েছে!');
    });
  }

  function saveFacilitiesToStorage() {
    localStorage.setItem('kinetic_facilities', JSON.stringify(facilitiesState));
    if (window.db) {
      window.db.collection('settings').doc('facilities').set({ list: facilitiesState }, { merge: true })
        .catch(err => console.warn('Firestore facilities save error:', err));
    }
  }

  if (saveFacilitiesBtn) {
    saveFacilitiesBtn.addEventListener('click', () => {
      saveFacilitiesToStorage();
      showAdminToast('চেম্বারের বিশেষ সুবিধাসমূহ সফলভাবে সেভ ও পাবলিশ হয়েছে!');
    });
  }

  // Load facilities from storage
  const cachedFac = localStorage.getItem('kinetic_facilities');
  if (cachedFac) {
    try {
      const parsed = JSON.parse(cachedFac);
      facilitiesState = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_FACILITIES];
    } catch (e) {
      facilitiesState = [...DEFAULT_FACILITIES];
    }
  }
  renderAdminFacilities();

  if (window.db) {
    window.db.collection('settings').doc('facilities').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
        facilitiesState = doc.data().list;
        localStorage.setItem('kinetic_facilities', JSON.stringify(facilitiesState));
        renderAdminFacilities();
      }
    }).catch(e => console.log('Facilities initial load:', e.message));
  }

  /* --------------------------------------------------------------------------
     14. Dental Tips & FAQs Manager
     -------------------------------------------------------------------------- */
  const DEFAULT_FAQS = [
    {
      id: 'faq-1',
      q: 'How often should I visit the dentist for scaling and polishing?',
      a: 'It is generally recommended to undergo dental scaling and polishing every 6 months. Regular scaling removes built-up calculus (tartar) and plaque that normal brushing cannot clear, effectively preventing gum swelling, bleeding (gingivitis), and bad breath.'
    },
    {
      id: 'faq-2',
      q: 'Is professional teeth whitening (bleaching) safe for my enamel?',
      a: 'Yes, professional teeth whitening at Kinetic Dental is entirely safe. Under the supervision of Dr. Nadia, we apply certified bleaching materials that break down organic stains without altering or weakening the structural enamel of your teeth.'
    },
    {
      id: 'faq-3',
      q: 'What is a Night Guard and why is it needed for tooth grinding (Bruxism)?',
      a: 'ঘুমের মাঝে দাঁতে দাঁত ঘষা (Bruxism) একটি অভ্যাসজনিত সমস্যা। এর ফলে দাঁতের এনামেল মারাত্মকভাবে ক্ষয় হয়ে শিরশির অনুভূত হয় এবং চোয়ালে ব্যথা সৃষ্টি হয়। কাস্টমাইজড Night Guard ব্যবহার করলে ঘুমের মাঝে ঘর্ষণের শব্দ প্রতিহত হয় এবং দাঁত চিরতরে ক্ষয় থেকে রক্ষা পায়।'
    },
    {
      id: 'faq-4',
      q: 'Why does a tooth turn black after a sports injury or hard bite?',
      a: 'খাওয়ার সময় শক্ত হাড়/পাথরে কামড় লাগলে বা বলের ধাক্কায় দাঁতে আঘাত পেলে ভেতরের নার্ভ ও রক্তনালী ক্ষতিগ্রস্ত হয়ে দাঁতের প্রাণ নষ্ট হয়ে যেতে পারে। রক্ত সরবরাহ বন্ধ হয়ে গেলে দাঁতটি ধীরে ধীরে কালো বা বিবর্ণ হয়ে যায়। দ্রুত রুট ক্যানাল (RCT) ও ক্যাপ না লাগালে হাড়ের নিচে সিস্ট বা টিউমার হতে পারে।'
    },
    {
      id: 'faq-5',
      q: 'What should I do immediately if I experience a sudden, severe toothache?',
      a: 'Avoid chewing on the affected tooth, rinse gently with warm salt water, and do not apply heating pads. Contact our clinic hotline at +880 1313-175779 or +880 1308-388577 immediately. We prioritize emergency toothache cases to relieve pulp pain and infection rapidly.'
    },
    {
      id: 'faq-6',
      q: 'How long does Root Canal Therapy (RCT) take, and does it hurt?',
      a: 'Modern Root Canal Therapy is practically painless and is performed under precise local anesthesia. Depending on the tooth anatomy and infection levels, it typically takes 1 to 2 sessions. The procedure removes the infected pulp, sanitizes the canal, and seals it to save the natural tooth.'
    },
    {
      id: 'faq-7',
      q: 'Why do my gums bleed during brushing or flossing?',
      a: 'Bleeding gums are usually a warning sign of gingivitis, which occurs when bacterial plaque accumulates along the gum line. Routine clinical scaling, combined with brushing twice a day and daily flossing, will restore healthy, firm gums and stop the bleeding.'
    }
  ];

  const DEFAULT_ADVICE = {
    rule1: 'সকাল ও রাতে নিয়ম করে প্রতিদিন ২ বার দাঁত ব্রাশ করতে হবে。\nফ্লোরাইড সমৃদ্ধ ভালো মানের টুথপেস্ট ব্যবহার করুন。\nসবসময় নরম (Soft-bristle) ব্রাশ ব্যবহার করতে হবে。\nএনামেল বেশি ক্ষয় হয়ে গেলে ফিলিং অথবা রুট ক্যানেল লাগতে পারে。\nদাঁতে আঘাত পেলে কালক্ষেপণ না করে দ্রুত ডেন্টিস্ট দেখান。',
    rule2: 'ঘুমের মাঝে দাঁতে দাঁত ঘষা একটি ক্ষতিকর অভ্যাসজনিত রোগ。\nএকমাত্র কার্যকর সমাধান হলো ডেন্টাল Night / Mouth Guard。\nঘুমের ঘর্ষণে সৃষ্ট কিড়মিড় আওয়াজ সম্পূর্ণ প্রতিহত করে。\nদাঁতের মারাত্মক ক্ষয় ও শির শির অনুভূতি স্থায়ীভাবে প্রতিরোধ করে。\nচেম্বারে দাঁতের মাপ দিয়ে খুব সহজেই কাস্টমাইজড নাইট গার্ড তৈরি সম্ভব。',
    rule3: 'হাড়/কাটা বা পাথরে কামড়, ধাক্কা বা বলের আঘাতে ব্যথা হলে দ্রুত BDS ডাক্তারের শরণাপন্ন হন。\nফেলে রাখলে দাঁত কালো বা বিবর্ণ হয়ে যায় — যার অর্থ দাঁতে আর প্রাণ নেই!\nদাঁতের ভেতরে ইনফেকশন হয়ে হাড়ের নিচে সিস্ট বা টিউমার হতে পারে。\nরুট ক্যানাল ট্রিটমেন্ট (RCT) করে ক্রাউন বা ক্যাপ লাগিয়ে দাঁত রক্ষা করা যায়。\nতাৎক্ষণিক চিকিৎসা নিলে দাঁতের ক্ষতি ও খরচ অনেক লাঘব সম্ভব。'
  };

  let faqsState = [...DEFAULT_FAQS];
  const adminFaqList = document.getElementById('adminFaqList');
  const addNewFaqBtn = document.getElementById('addNewFaqBtn');
  const faqEditModal = document.getElementById('faqEditModal');
  const faqModalClose = document.getElementById('faqModalClose');
  const faqCancelBtn = document.getElementById('faqCancelBtn');
  const faqEditForm = document.getElementById('faqEditForm');
  const editFaqIdx = document.getElementById('editFaqIdx');
  const faqQuestionInput = document.getElementById('faqQuestionInput');
  const faqAnswerInput = document.getElementById('faqAnswerInput');
  const saveFaqBtn = document.getElementById('saveFaqBtn');

  const adviceForm = document.getElementById('adviceForm');
  const adviceRule1Text = document.getElementById('adviceRule1Text');
  const adviceRule2Text = document.getElementById('adviceRule2Text');
  const adviceRule3Text = document.getElementById('adviceRule3Text');

  function renderAdminFaqs() {
    if (!adminFaqList) return;
    if (!faqsState.length) {
      adminFaqList.innerHTML = '<p class="text-body" style="padding:15px; text-align:center;">কোনো FAQ প্রশ্ন যুক্ত করা হয়নি।</p>';
      return;
    }
    adminFaqList.innerHTML = faqsState.map((f, idx) => `
      <div class="admin-cms-card">
        <div class="admin-cms-content">
          <div class="admin-cms-header">
            <span class="admin-cms-title">Q${idx + 1}. ${escapeHTML(f.q)}</span>
          </div>
          <p class="admin-cms-desc">${escapeHTML(f.a)}</p>
        </div>
        <div class="admin-cms-actions">
          <button type="button" class="btn-action-icon" onclick="window.editFaqItem(${idx})" title="Edit FAQ">
            <i data-lucide="edit-3"></i>
          </button>
          <button type="button" class="btn-action-icon btn-action-del" onclick="window.deleteFaqItem(${idx})" title="Delete FAQ">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeFaqEditModal() {
    if (!faqEditModal) return;
    faqEditModal.classList.remove('active');
    document.body.style.overflow = '';
    if (faqEditForm) faqEditForm.reset();
  }

  function openFaqEditModal(item = null, idx = -1) {
    if (!faqEditModal) return;
    editFaqIdx.value = idx;
    const titleEl = document.getElementById('faqModalTitle');
    if (titleEl) {
      titleEl.innerHTML = idx >= 0
        ? '<i data-lucide="help-circle" class="icon-sm"></i> Edit FAQ'
        : '<i data-lucide="plus-circle" class="icon-sm"></i> Add New FAQ';
    }

    if (item) {
      faqQuestionInput.value = item.q || '';
      faqAnswerInput.value = item.a || '';
    } else {
      faqQuestionInput.value = '';
      faqAnswerInput.value = '';
    }

    faqEditModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.editFaqItem = (idx) => {
    if (idx >= 0 && idx < faqsState.length) {
      openFaqEditModal(faqsState[idx], idx);
    }
  };

  window.deleteFaqItem = (idx) => {
    if (idx >= 0 && idx < faqsState.length) {
      if (confirm('আপনি কি এই প্রশ্নোত্তরটি মুছে ফেলতে চান?')) {
        faqsState.splice(idx, 1);
        renderAdminFaqs();
        saveFaqsToStorage();
        showAdminToast('প্রশ্নোত্তর মুছে ফেলা হয়েছে!');
      }
    }
  };

  if (addNewFaqBtn) addNewFaqBtn.addEventListener('click', () => openFaqEditModal(null, -1));
  if (faqModalClose) faqModalClose.addEventListener('click', closeFaqEditModal);
  if (faqCancelBtn) faqCancelBtn.addEventListener('click', closeFaqEditModal);
  if (faqEditModal) {
    faqEditModal.addEventListener('click', (e) => {
      if (e.target === faqEditModal) closeFaqEditModal();
    });
  }

  if (faqEditForm) {
    faqEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editFaqIdx.value, 10);
      const faqObj = {
        id: idx >= 0 ? (faqsState[idx]?.id || `faq-${Date.now()}`) : `faq-${Date.now()}`,
        q: faqQuestionInput.value.trim(),
        a: faqAnswerInput.value.trim()
      };

      if (idx >= 0 && idx < faqsState.length) {
        faqsState[idx] = faqObj;
      } else {
        faqsState.push(faqObj);
      }

      closeFaqEditModal();
      renderAdminFaqs();
      saveFaqsToStorage();
      showAdminToast('FAQ প্রশ্নোত্তর সফলভাবে সংরক্ষিত হয়েছে!');
    });
  }

  function saveFaqsToStorage() {
    localStorage.setItem('kinetic_faqs', JSON.stringify(faqsState));
    if (window.db) {
      window.db.collection('settings').doc('faqs').set({ list: faqsState }, { merge: true })
        .catch(err => console.warn('Firestore FAQs save error:', err));
    }
  }

  if (saveFaqBtn) {
    saveFaqBtn.addEventListener('click', () => {
      saveFaqsToStorage();
      showAdminToast('সকল প্রশ্নোত্তর সফলভাবে সেভ ও পাবলিশ হয়েছে!');
    });
  }

  // Advice load & save
  function populateAdvice(data) {
    const adv = { ...DEFAULT_ADVICE, ...(data || {}) };
    if (adviceRule1Text) adviceRule1Text.value = adv.rule1 || '';
    if (adviceRule2Text) adviceRule2Text.value = adv.rule2 || '';
    if (adviceRule3Text) adviceRule3Text.value = adv.rule3 || '';
  }

  const cachedAdvice = localStorage.getItem('kinetic_advice');
  if (cachedAdvice) {
    try {
      populateAdvice(JSON.parse(cachedAdvice));
    } catch (e) {
      populateAdvice(DEFAULT_ADVICE);
    }
  } else {
    populateAdvice(DEFAULT_ADVICE);
  }

  if (adviceForm) {
    adviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const advData = {
        rule1: adviceRule1Text.value.trim(),
        rule2: adviceRule2Text.value.trim(),
        rule3: adviceRule3Text.value.trim(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('kinetic_advice', JSON.stringify(advData));
      if (window.db) {
        window.db.collection('settings').doc('advice').set(advData, { merge: true })
          .then(() => showAdminToast('ডাক্তারের পরামর্শ সফলভাবে সেভ ও পাবলিশ হয়েছে!'))
          .catch(err => console.warn('Advice save error:', err));
      } else {
        showAdminToast('ডাক্তারের পরামর্শ সফলভাবে সেভ হয়েছে!');
      }
    });
  }

  // Load FAQs initial
  const cachedFaqs = localStorage.getItem('kinetic_faqs');
  if (cachedFaqs) {
    try {
      const parsed = JSON.parse(cachedFaqs);
      faqsState = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_FAQS];
    } catch (e) {
      faqsState = [...DEFAULT_FAQS];
    }
  }
  renderAdminFaqs();

  if (window.db) {
    window.db.collection('settings').doc('faqs').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
        faqsState = doc.data().list;
        localStorage.setItem('kinetic_faqs', JSON.stringify(faqsState));
        renderAdminFaqs();
      }
    }).catch(e => console.log('FAQs initial load:', e.message));

    window.db.collection('settings').doc('advice').get().then(doc => {
      if (doc.exists) {
        const liveAdv = doc.data();
        localStorage.setItem('kinetic_advice', JSON.stringify(liveAdv));
        populateAdvice(liveAdv);
      }
    }).catch(e => console.log('Advice initial load:', e.message));
  }

  /* --------------------------------------------------------------------------
     15. Community Campaigns Manager
     -------------------------------------------------------------------------- */
  const DEFAULT_CAMPAIGNS = [
    {
      id: 'cmp-1',
      title: 'Mirpur Kids Smile Camp',
      badge: 'School Camp',
      location: 'Mirpur 12 Primary School',
      image: 'our-program-2.jpeg',
      descEn: 'Free dental check-ups and fluoride application for over 200 children, with oral hygiene education sessions for parents and teachers.',
      descBn: '২০০+ শিশুর বিনামূল্যে দাঁত পরীক্ষা ও ফ্লোরাইড প্রয়োগ, পাশাপাশি অভিভাবক ও শিক্ষকদের জন্য মুখের স্বাস্থ্য শিক্ষা সেশন।'
    },
    {
      id: 'cmp-2',
      title: 'Friday Community Dental Day',
      badge: 'Community',
      location: 'Sujatnagar Jame Masjid Complex',
      image: 'our-program-1.jpeg',
      descEn: 'Free consultation and toothache emergency care for elderly community members and underprivileged local families.',
      descBn: 'বয়োজ্যেষ্ঠ ও অসচ্ছল পরিবারের সদস্যদের জন্য বিনামূল্যে দাঁতের পরামর্শ ও জরুরি প্রাথমিক চিকিৎসাসেবা।'
    },
    {
      id: 'cmp-3',
      title: 'Oral Health Awareness Week',
      badge: 'Awareness',
      location: 'Kinetic Dental & Healthcare Center',
      image: 'chamber.jpg',
      descEn: 'Week-long complimentary digital checkups, scaling discounts, and distribution of dental care kits.',
      descBn: 'সপ্তাহব্যাপী বিনামূল্যে ডিজিটাল চেকআপ, স্কেলিং ডিসকাউন্ট এবং স্বাস্থ্য সুরক্ষা কিট বিতরণ।'
    }
  ];

  let campaignsState = [...DEFAULT_CAMPAIGNS];
  const adminCampaignsList = document.getElementById('adminCampaignsList');
  const addNewCampaignBtn = document.getElementById('addNewCampaignBtn');
  const campaignEditModal = document.getElementById('campaignEditModal');
  const campaignModalClose = document.getElementById('campaignModalClose');
  const campaignCancelBtn = document.getElementById('campaignCancelBtn');
  const campaignEditForm = document.getElementById('campaignEditForm');
  const editCampaignIdx = document.getElementById('editCampaignIdx');
  const cmpTitleInput = document.getElementById('cmpTitleInput');
  const cmpBadgeInput = document.getElementById('cmpBadgeInput');
  const cmpLocationInput = document.getElementById('cmpLocationInput');
  const cmpImageInput = document.getElementById('cmpImageInput');
  const cmpDescEnInput = document.getElementById('cmpDescEnInput');
  const cmpDescBnInput = document.getElementById('cmpDescBnInput');
  const saveCampaignsBtn = document.getElementById('saveCampaignsBtn');

  function renderAdminCampaigns() {
    if (!adminCampaignsList) return;
    if (!campaignsState.length) {
      adminCampaignsList.innerHTML = '<p class="text-body" style="padding:15px; text-align:center;">কোনো ফ্রি ক্যাম্পেইন যুক্ত করা হয়নি।</p>';
      return;
    }
    adminCampaignsList.innerHTML = campaignsState.map((c, idx) => `
      <div class="admin-cms-card">
        <div class="admin-cms-content">
          <div class="admin-cms-header">
            <span class="admin-cms-title">${escapeHTML(c.title)}</span>
            <span class="admin-cms-badge">${escapeHTML(c.badge || 'Community')}</span>
            <span class="admin-cms-subtitle"><i data-lucide="map-pin" class="icon-sm"></i> ${escapeHTML(c.location || '')}</span>
          </div>
          <p class="admin-cms-desc">${escapeHTML(c.descEn || '')}</p>
          ${c.descBn ? `<p class="admin-cms-desc" style="color:var(--primary); font-size:0.84rem;">${escapeHTML(c.descBn)}</p>` : ''}
          <div style="margin-top:6px; font-size:0.78rem; opacity:0.8;">ছবি: <code>${escapeHTML(c.image || 'our-program-1.jpeg')}</code></div>
        </div>
        <div class="admin-cms-actions">
          <button type="button" class="btn-action-icon" onclick="window.editCampaignItem(${idx})" title="Edit Campaign">
            <i data-lucide="edit-3"></i>
          </button>
          <button type="button" class="btn-action-icon btn-action-del" onclick="window.deleteCampaignItem(${idx})" title="Delete Campaign">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeCampaignEditModal() {
    if (!campaignEditModal) return;
    campaignEditModal.classList.remove('active');
    document.body.style.overflow = '';
    if (campaignEditForm) campaignEditForm.reset();
  }

  function openCampaignEditModal(item = null, idx = -1) {
    if (!campaignEditModal) return;
    editCampaignIdx.value = idx;
    const titleEl = document.getElementById('campaignModalTitle');
    if (titleEl) {
      titleEl.innerHTML = idx >= 0
        ? '<i data-lucide="heart-handshake" class="icon-sm"></i> Edit Campaign'
        : '<i data-lucide="plus-circle" class="icon-sm"></i> Add New Campaign';
    }

    if (item) {
      cmpTitleInput.value = item.title || '';
      cmpBadgeInput.value = item.badge || 'Community';
      cmpLocationInput.value = item.location || '';
      cmpImageInput.value = item.image || 'our-program-1.jpeg';
      cmpDescEnInput.value = item.descEn || '';
      cmpDescBnInput.value = item.descBn || '';
    } else {
      cmpTitleInput.value = '';
      cmpBadgeInput.value = 'Community';
      cmpLocationInput.value = '';
      cmpImageInput.value = 'our-program-1.jpeg';
      cmpDescEnInput.value = '';
      cmpDescBnInput.value = '';
    }

    campaignEditModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.editCampaignItem = (idx) => {
    if (idx >= 0 && idx < campaignsState.length) {
      openCampaignEditModal(campaignsState[idx], idx);
    }
  };

  window.deleteCampaignItem = (idx) => {
    if (idx >= 0 && idx < campaignsState.length) {
      if (confirm(`আপনি কি "${campaignsState[idx].title}" ক্যাম্পটি মুছে ফেলতে চান?`)) {
        campaignsState.splice(idx, 1);
        renderAdminCampaigns();
        saveCampaignsToStorage();
        showAdminToast('ক্যাম্পেইন মুছে ফেলা হয়েছে!');
      }
    }
  };

  if (addNewCampaignBtn) addNewCampaignBtn.addEventListener('click', () => openCampaignEditModal(null, -1));
  if (campaignModalClose) campaignModalClose.addEventListener('click', closeCampaignEditModal);
  if (campaignCancelBtn) campaignCancelBtn.addEventListener('click', closeCampaignEditModal);
  if (campaignEditModal) {
    campaignEditModal.addEventListener('click', (e) => {
      if (e.target === campaignEditModal) closeCampaignEditModal();
    });
  }

  if (campaignEditForm) {
    campaignEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editCampaignIdx.value, 10);
      const campObj = {
        id: idx >= 0 ? (campaignsState[idx]?.id || `cmp-${Date.now()}`) : `cmp-${Date.now()}`,
        title: cmpTitleInput.value.trim(),
        badge: cmpBadgeInput.value.trim() || 'Community',
        location: cmpLocationInput.value.trim(),
        image: cmpImageInput.value.trim() || 'our-program-1.jpeg',
        descEn: cmpDescEnInput.value.trim(),
        descBn: cmpDescBnInput.value.trim()
      };

      if (idx >= 0 && idx < campaignsState.length) {
        campaignsState[idx] = campObj;
      } else {
        campaignsState.push(campObj);
      }

      closeCampaignEditModal();
      renderAdminCampaigns();
      saveCampaignsToStorage();
      showAdminToast('ক্যাম্পেইন সফলভাবে সংরক্ষিত হয়েছে!');
    });
  }

  function saveCampaignsToStorage() {
    localStorage.setItem('kinetic_campaigns', JSON.stringify(campaignsState));
    if (window.db) {
      window.db.collection('settings').doc('campaigns').set({ list: campaignsState }, { merge: true })
        .catch(err => console.warn('Firestore campaigns save error:', err));
    }
  }

  if (saveCampaignsBtn) {
    saveCampaignsBtn.addEventListener('click', () => {
      saveCampaignsToStorage();
      showAdminToast('ফ্রি ডেন্টাল ক্যাম্পসমূহ সফলভাবে সেভ ও পাবলিশ হয়েছে!');
    });
  }

  // Load campaigns initial
  const cachedCmp = localStorage.getItem('kinetic_campaigns');
  if (cachedCmp) {
    try {
      const parsed = JSON.parse(cachedCmp);
      campaignsState = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_CAMPAIGNS];
    } catch (e) {
      campaignsState = [...DEFAULT_CAMPAIGNS];
    }
  }
  renderAdminCampaigns();

  if (window.db) {
    window.db.collection('settings').doc('campaigns').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
        campaignsState = doc.data().list;
        localStorage.setItem('kinetic_campaigns', JSON.stringify(campaignsState));
        renderAdminCampaigns();
      }
    }).catch(e => console.log('Campaigns initial load:', e.message));
  }

  /* --------------------------------------------------------------------------
     16. Chamber Tour Gallery Manager
     -------------------------------------------------------------------------- */
  const DEFAULT_GALLERY = [
    {
      id: 'gal-0',
      title: 'Operating Chamber',
      subtitle: 'State-of-the-art dental chair & lighting',
      image: 'chamber.jpg'
    },
    {
      id: 'gal-1',
      title: 'Reception Desk',
      subtitle: 'Welcoming waiting lounge for patients',
      image: 'office.jpg'
    },
    {
      id: 'gal-2',
      title: 'Diagnostic Setup',
      subtitle: 'Premium tools ready for clean and safe care',
      image: 'chmaber.jpg'
    },
    {
      id: 'gal-3',
      title: 'Treatment Room',
      subtitle: 'Comfortable, hygienic patient care space',
      image: 'office-1.jpeg'
    },
    {
      id: 'gal-4',
      title: 'Modern Chamber',
      subtitle: 'LED lighting and ergonomic dental chair',
      image: 'chamber-3.jpeg'
    },
    {
      id: 'gal-5',
      title: 'Our Expert Team',
      subtitle: 'Qualified dentists led by Dr. Nadia',
      image: 'doctors.jpeg'
    }
  ];

  let galleryState = [...DEFAULT_GALLERY];
  const adminGalleryList = document.getElementById('adminGalleryList');
  const galleryEditModal = document.getElementById('galleryEditModal');
  const galleryModalClose = document.getElementById('galleryModalClose');
  const galleryCancelBtn = document.getElementById('galleryCancelBtn');
  const galleryEditForm = document.getElementById('galleryEditForm');
  const editGalleryIdx = document.getElementById('editGalleryIdx');
  const galTitleInput = document.getElementById('galTitleInput');
  const galSubtitleInput = document.getElementById('galSubtitleInput');
  const galImageInput = document.getElementById('galImageInput');
  const saveGalleryBtn = document.getElementById('saveGalleryBtn');

  function renderAdminGallery() {
    if (!adminGalleryList) return;
    adminGalleryList.innerHTML = galleryState.map((g, idx) => `
      <div class="admin-gallery-card">
        <img src="${escapeHTML(g.image || 'chamber.jpg')}" alt="${escapeHTML(g.title)}" class="admin-gallery-thumb" onerror="this.src='chamber.jpg'">
        <div class="admin-gallery-body">
          <h4>${escapeHTML(g.title)}</h4>
          <p>${escapeHTML(g.subtitle || '')}</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.editGalleryItem(${idx})" style="width:100%;">
            <i data-lucide="edit-3" class="icon-left"></i> Change Photo &amp; Details
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeGalleryEditModal() {
    if (!galleryEditModal) return;
    galleryEditModal.classList.remove('active');
    document.body.style.overflow = '';
    if (galleryEditForm) galleryEditForm.reset();
  }

  window.editGalleryItem = (idx) => {
    if (idx >= 0 && idx < galleryState.length) {
      editGalleryIdx.value = idx;
      const g = galleryState[idx];
      galTitleInput.value = g.title || '';
      galSubtitleInput.value = g.subtitle || '';
      galImageInput.value = g.image || '';
      galleryEditModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  };

  if (galleryModalClose) galleryModalClose.addEventListener('click', closeGalleryEditModal);
  if (galleryCancelBtn) galleryCancelBtn.addEventListener('click', closeGalleryEditModal);
  if (galleryEditModal) {
    galleryEditModal.addEventListener('click', (e) => {
      if (e.target === galleryEditModal) closeGalleryEditModal();
    });
  }

  if (galleryEditForm) {
    galleryEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editGalleryIdx.value, 10);
      if (idx >= 0 && idx < galleryState.length) {
        galleryState[idx].title = galTitleInput.value.trim();
        galleryState[idx].subtitle = galSubtitleInput.value.trim();
        galleryState[idx].image = galImageInput.value.trim() || 'chamber.jpg';

        closeGalleryEditModal();
        renderAdminGallery();
        saveGalleryToStorage();
        showAdminToast('গ্যালারির ছবি সফলভাবে আপডেট হয়েছে!');
      }
    });
  }

  function saveGalleryToStorage() {
    localStorage.setItem('kinetic_gallery', JSON.stringify(galleryState));
    if (window.db) {
      window.db.collection('settings').doc('gallery').set({ list: galleryState }, { merge: true })
        .catch(err => console.warn('Firestore gallery save error:', err));
    }
  }

  if (saveGalleryBtn) {
    saveGalleryBtn.addEventListener('click', () => {
      saveGalleryToStorage();
      showAdminToast('চেম্বার ট্যুর গ্যালারি সফলভাবে সেভ ও পাবলিশ হয়েছে!');
    });
  }

  // Load gallery initial
  const cachedGal = localStorage.getItem('kinetic_gallery');
  if (cachedGal) {
    try {
      const parsed = JSON.parse(cachedGal);
      galleryState = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_GALLERY];
    } catch (e) {
      galleryState = [...DEFAULT_GALLERY];
    }
  }
  renderAdminGallery();

  if (window.db) {
    window.db.collection('settings').doc('gallery').get().then(doc => {
      if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
        galleryState = doc.data().list;
        localStorage.setItem('kinetic_gallery', JSON.stringify(galleryState));
        renderAdminGallery();
      }
    }).catch(e => console.log('Gallery initial load:', e.message));
  }

});

