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
     2. Authentication Listeners & State Toggles
     -------------------------------------------------------------------------- */
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const logoutBtnTop = document.getElementById('logoutBtnTop');
  const logoutBtnMain = document.getElementById('logoutBtnMain');
  const loginForm = document.getElementById('loginForm');
  const registerBtn = document.getElementById('registerBtn');
  
  const emailField = document.getElementById('adminEmail');
  const passwordField = document.getElementById('adminPassword');
  const authGeneralError = document.getElementById('authGeneralError');
  
  let unsubscribeFirestore = null;
  let appointmentsList = [];
  let currentFilter = 'all';
  let currentSearch = '';

  // Auth State observer
  window.auth.onAuthStateChanged((user) => {
    if (user) {
      // User is logged in
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      logoutBtnTop?.classList.remove('hidden');
      authGeneralError.style.display = 'none';
      
      // Start Realtime Database listener
      startFirestoreListener();
    } else {
      // User is logged out
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      logoutBtnTop?.classList.add('hidden');
      
      // Stop Realtime Listener
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
    }
  });

  // Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = emailField.value.trim();
      const password = passwordField.value;
      
      authGeneralError.style.display = 'none';

      window.auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
          console.error("Login failed:", err);
          if (err.code === 'auth/configuration-not-found') {
            authGeneralError.innerHTML = `<strong>Setup Required:</strong> Email/Password authentication is disabled in your Firebase console. Please go to <strong>Firebase Console &gt; Authentication &gt; Sign-in Method</strong> and enable <strong>Email/Password</strong>.`;
          } else {
            authGeneralError.textContent = `Login Failed: ${err.message}`;
          }
          authGeneralError.style.display = 'block';
        });
    });
  }

  // Register setup handler (First time admin registration helper)
  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      const email = emailField.value.trim();
      const password = passwordField.value;
      
      if (!email || password.length < 6) {
        alert("Please enter a valid email and password (minimum 6 characters) to register.");
        return;
      }

      authGeneralError.style.display = 'none';

      window.auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
          alert("Admin account registered successfully! You are now logged in.");
        })
        .catch(err => {
          console.error("Registration failed:", err);
          if (err.code === 'auth/configuration-not-found') {
            authGeneralError.innerHTML = `<strong>Setup Required:</strong> Email/Password authentication is disabled in your Firebase console. Please go to <strong>Firebase Console &gt; Authentication &gt; Sign-in Method</strong> and enable <strong>Email/Password</strong>.`;
          } else {
            authGeneralError.textContent = `Registration Failed: ${err.message}`;
          }
          authGeneralError.style.display = 'block';
        });
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
            <td colspan="7" class="loading-state" style="color: #e74c3c;">
              <i data-lucide="alert-triangle" style="width: 32px; height:32px; margin:0 auto 12px; display:block;"></i>
              <p>Failed to load appointments: Access Denied. Check your Firestore rules.</p>
            </td>
          </tr>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
  }

  function calculateMetrics() {
    const total = appointmentsList.length;
    const pending = appointmentsList.filter(a => a.status === 'Pending').length;
    const confirmed = appointmentsList.filter(a => a.status === 'Confirmed').length;
    const completed = appointmentsList.filter(a => a.status === 'Completed').length;

    if (metricTotal) metricTotal.textContent = total;
    if (metricPending) metricPending.textContent = pending;
    if (metricConfirmed) metricConfirmed.textContent = confirmed;
    if (metricCompleted) metricCompleted.textContent = completed;
  }

  function renderTable() {
    if (!tableBody) return;
    
    // Filter the items list
    let filtered = appointmentsList;

    // Filter by Tab Status
    if (currentFilter !== 'all') {
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
          <td colspan="7" class="loading-state">
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
            <div style="max-width:200px; font-size:0.82rem; max-height:60px; overflow-y:auto; word-break:break-word;">
              ${escapeHTML(item.notes || 'N/A')}
            </div>
          </td>
          <td>
            <div class="action-btn-group">
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
    if (!window.db) return;
    
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

    if (!window.db) return;

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
