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
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
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
    'drnafisanadiaanzum@gmail.com'
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

  // Auth State observer
  window.auth.onAuthStateChanged((user) => {
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
    window.auth.signOut().catch(err => console.error("Signout error:", err));
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
  const tableBody = document.getElementById('appointmentsTableBody');
  const searchBar = document.getElementById('searchBar');
  const filterTabs = document.querySelectorAll('.tab-btn');

  function startFirestoreListener() {
    if (!window.db) return;

    // Listen to appointments collection sorted by creation timestamp (newest first)
    unsubscribeFirestore = window.db.collection('appointments')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        appointmentsList = [];
        snapshot.forEach((doc) => {
          appointmentsList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Compute Metric Totals
        calculateMetrics();

        // Render table list
        renderTable();
      }, (err) => {
        console.error("Firestore listener error:", err);
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="loading-state" style="color: #e74c3c;">
              <i data-lucide="alert-triangle" style="width: 32px; height:32px; margin:0 auto 12px; display:block;"></i>
              <p>Failed to load appointments: Access Denied. Check your Firestore rules.</p>
            </td>
          </tr>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
  }

  function getReplyStatus(item) {
    if (item.replyStatus === 'replied' || (Array.isArray(item.replies) && item.replies.length > 0)) {
      return 'replied';
    }
    return 'pending';
  }

  function calculateMetrics() {
    const total = appointmentsList.length;
    const pending = appointmentsList.filter(a => a.status === 'Pending').length;
    const confirmed = appointmentsList.filter(a => a.status === 'Confirmed').length;
    const completed = appointmentsList.filter(a => a.status === 'Completed').length;
    const replied = appointmentsList.filter(a => getReplyStatus(a) === 'replied').length;

    if (metricTotal) metricTotal.textContent = total;
    if (metricPending) metricPending.textContent = pending;
    if (metricConfirmed) metricConfirmed.textContent = confirmed;
    if (metricCompleted) metricCompleted.textContent = completed;
    if (metricReplied) metricReplied.textContent = replied;
  }

  function renderTable() {
    if (!tableBody) return;
    
    // Filter the items list
    let filtered = appointmentsList;

    // Filter by Tab Status
    if (currentFilter === 'reply-pending') {
      filtered = filtered.filter(a => getReplyStatus(a) === 'pending');
    } else if (currentFilter === 'reply-replied') {
      filtered = filtered.filter(a => getReplyStatus(a) === 'replied');
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(a => a.status === currentFilter);
    }

    // Filter by Search Bar (Name or Phone number)
    if (currentSearch) {
      const query = currentSearch.toLowerCase();
      filtered = filtered.filter(a => 
        (a.name && a.name.toLowerCase().includes(query)) || 
        (a.phone && a.phone.includes(query)) ||
        (a.treatment && a.treatment.toLowerCase().includes(query))
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
      const formattedDate = item.createdAt ? formatDate(item.createdAt.toDate()) : 'Pending Sync...';
      const replyStatus = getReplyStatus(item);
      const lastReply = Array.isArray(item.replies) && item.replies.length
        ? item.replies[item.replies.length - 1]
        : null;
      
      html += `
        <tr>
          <td>
            <span class="patient-info-name">${escapeHTML(item.name)}</span>
            <span class="patient-info-date">Requested: ${formattedDate}</span>
          </td>
          <td>
            <a href="tel:${item.phone}" class="text-underline" style="color: var(--primary); font-weight:700;">
              ${escapeHTML(item.phone)}
            </a>
          </td>
          <td>${escapeHTML(item.treatment)}</td>
          <td>
            <strong>${escapeHTML(item.date)}</strong>
            <br>
            <span style="font-size: 0.8rem; opacity: 0.8;">${escapeHTML(item.time)}</span>
          </td>
          <td>
            <span class="status-badge status-${item.status}">${item.status}</span>
          </td>
          <td>
            <span class="status-badge status-reply-${replyStatus}">${replyStatus === 'replied' ? 'Replied' : 'Awaiting'}</span>
            ${lastReply ? `<div class="reply-preview">${escapeHTML(truncateText(lastReply.message, 60))}</div>` : ''}
          </td>
          <td>
            <div style="max-width:200px; font-size:0.82rem; max-height:60px; overflow-y:auto; word-break:break-word;">
              ${escapeHTML(item.notes || 'N/A')}
            </div>
          </td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn btn-reply" onclick="openReplyModal('${item.id}')" title="Reply to Patient">
                <i data-lucide="message-square-reply"></i>
              </button>
              ${item.status === 'Pending' ? `
                <button class="action-btn btn-confirm" onclick="updateAppointmentStatus('${item.id}', 'Confirmed')" title="Confirm Booking">
                  <i data-lucide="check"></i>
                </button>
              ` : ''}
              ${item.status !== 'Completed' ? `
                <button class="action-btn btn-complete" onclick="updateAppointmentStatus('${item.id}', 'Completed')" title="Mark as Completed">
                  <i data-lucide="award"></i>
                </button>
              ` : ''}
              <button class="action-btn btn-delete" onclick="deleteAppointmentRecord('${item.id}')" title="Delete Entry">
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
    tab.addEventListener('click', (e) => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderTable();
    });
  });

  /* --------------------------------------------------------------------------
     4. Global Database Actions (Accessible globally from buttons)
     -------------------------------------------------------------------------- */
  window.updateAppointmentStatus = (id, status) => {
    if (!window.db || !window.auth.currentUser) return;
    if (!isAllowedAdminEmail(window.auth.currentUser.email || '')) {
      alert('Access denied.');
      return;
    }
    
    window.db.collection('appointments').doc(id).update({
      status: status
    })
    .then(() => {
      console.log(`Appointment ${id} status updated to ${status}`);
    })
    .catch(err => {
      console.error("Update failed:", err);
      alert("Error updating status: " + err.message);
    });
  };

  window.deleteAppointmentRecord = (id) => {
    if (!confirm("Are you sure you want to delete this appointment request? This action cannot be undone.")) {
      return;
    }

    if (!window.db || !window.auth.currentUser) return;
    if (!isAllowedAdminEmail(window.auth.currentUser.email || '')) {
      alert('Access denied.');
      return;
    }

    window.db.collection('appointments').doc(id).delete()
      .then(() => {
        console.log(`Appointment ${id} deleted.`);
      })
      .catch(err => {
        console.error("Delete failed:", err);
        alert("Error deleting appointment: " + err.message);
      });
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
     5. Helper Functions
     -------------------------------------------------------------------------- */
  function formatDate(date) {
    const options = { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  function formatReplyTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    return formatDate(timestamp.toDate());
  }

  function truncateText(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
});
