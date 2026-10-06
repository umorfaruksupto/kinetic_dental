/* ==========================================================================
   Kinetic Dental & Healthcare Center - Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  /* --------------------------------------------------------------------------
     Firebase Integration
     -------------------------------------------------------------------------- */
  const firebaseConfig = {
    apiKey: "AIzaSyAi_iJkiNZunOEcXxX2kuZg70q-xYqioBQ",
    authDomain: "kinetic-dental.firebaseapp.com",
    projectId: "kinetic-dental",
    storageBucket: "kinetic-dental.firebasestorage.app",
    messagingSenderId: "523401059267",
    appId: "1:523401059267:web:186d0b1b23405fea333b76",
    measurementId: "G-Z1C46B6GSF"
  };

  // Initialize Firebase Compat
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.db = firebase.firestore();
  } else {
    console.error("Firebase library not loaded.");
  }

  /* --------------------------------------------------------------------------
     1. Theme Management (Light / Dark Mode)
     -------------------------------------------------------------------------- */
  const themeToggleBtns = [
    document.getElementById('themeToggleBtn'),
    document.getElementById('themeToggleBtnMobile')
  ];

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kinetic-dental-theme', theme);
    
    // Update icons
    themeToggleBtns.forEach(btn => {
      if (!btn) return;
      const moonIcon = btn.querySelector('.theme-icon-dark');
      const sunIcon = btn.querySelector('.theme-icon-light');
      
      if (theme === 'dark') {
        moonIcon?.classList.add('hidden');
        sunIcon?.classList.remove('hidden');
      } else {
        moonIcon?.classList.remove('hidden');
        sunIcon?.classList.add('hidden');
      }
    });
  };

  // Default new visitors to the clean light theme (clinical/trustworthy branding);
  // the OS dark-mode preference is not auto-applied, but the manual toggle still works and is remembered.
  const savedTheme = localStorage.getItem('kinetic-dental-theme');
  const initialTheme = savedTheme || 'light';
  setTheme(initialTheme);

  themeToggleBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  });

  /* --------------------------------------------------------------------------
     2. Navigation and Header Shrink
     -------------------------------------------------------------------------- */
  const header = document.querySelector('.main-header');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('shrink');
    } else {
      header.classList.remove('shrink');
    }

    if (scrollTopBtn) {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('active');
      } else {
        scrollTopBtn.classList.remove('active');
      }
    }

    highlightActiveNavLink();
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.desktop-nav .nav-item');

  function highlightActiveNavLink() {
    let scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120; // offset for sticky header
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navItems.forEach(item => {
          item.classList.remove('active');
          if (item.getAttribute('href') === `#${sectionId}`) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  /* --------------------------------------------------------------------------
     3. Mobile Navigation Drawer
     -------------------------------------------------------------------------- */
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-item');

  const toggleDrawer = () => {
    const isOpen = mobileDrawer.classList.toggle('open');
    drawerOverlay.classList.toggle('active');
    
    const menuIcon = menuToggleBtn.querySelector('.menu-icon');
    const closeIcon = menuToggleBtn.querySelector('.close-icon');
    
    if (isOpen) {
      menuIcon?.classList.add('hidden');
      closeIcon?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      menuIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  };

  if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', toggleDrawer);

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileDrawer.classList.contains('open')) {
        toggleDrawer();
      }
    });
  });

  /* --------------------------------------------------------------------------
     3b. Desktop Nav "More" Dropdown
     -------------------------------------------------------------------------- */
  const navMoreDropdown = document.getElementById('navMoreDropdown');
  const navMoreBtn = document.getElementById('navMoreBtn');

  if (navMoreBtn && navMoreDropdown) {
    navMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMoreDropdown.classList.toggle('open');
      navMoreBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!navMoreDropdown.contains(e.target)) {
        navMoreDropdown.classList.remove('open');
        navMoreBtn.setAttribute('aria-expanded', 'false');
      }
    });

    navMoreDropdown.querySelectorAll('.nav-dropdown-menu a').forEach((link) => {
      link.addEventListener('click', () => {
        navMoreDropdown.classList.remove('open');
        navMoreBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --------------------------------------------------------------------------
     3c. Hide cards with missing/broken images
     -------------------------------------------------------------------------- */
  if (typeof hideCardsWithoutImages === 'function') {
    hideCardsWithoutImages('.home-link-card');
    hideCardsWithoutImages('.program-card');
    hideCardsWithoutImages('.ft-card');
    hideCardsWithoutImages('.gallery-item');
  }

  /* --------------------------------------------------------------------------
     4. Scroll Reveal Animations (Intersection Observer)
     -------------------------------------------------------------------------- */
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
        observer.unobserve(entry.target);
      }
    });
  };

  const revealObserver = new IntersectionObserver(revealCallback, {
    root: null,
    // threshold: 0 so tall containers (e.g. the treatments grid) still reveal —
    // a percentage-based threshold can never be satisfied once content is taller than the viewport.
    threshold: 0,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });

  /* --------------------------------------------------------------------------
     5. Date Restrictions for Appointment Form
     -------------------------------------------------------------------------- */
  const dateInput = document.getElementById('bookingDate');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();

    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;

    const formattedToday = `${yyyy}-${mm}-${dd}`;
    dateInput.setAttribute('min', formattedToday);
  }

  /* --------------------------------------------------------------------------
     6. Appointment Form Validation & Dual Firebase + Formspree Post
     -------------------------------------------------------------------------- */
  const bookingForm = document.getElementById('bookingForm');
  const successModal = document.getElementById('successModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalSummary = document.getElementById('modalSummary');

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isValid = true;
      const nameField = document.getElementById('fullName');
      const phoneField = document.getElementById('phoneNum');
      const treatmentField = document.getElementById('treatmentType');
      const dateField = document.getElementById('bookingDate');
      const timeField = document.getElementById('bookingTime');
      const notesField = document.getElementById('notes');

      if (!nameField.value.trim()) {
        nameField.closest('.form-group').classList.add('invalid');
        isValid = false;
      } else {
        nameField.closest('.form-group').classList.remove('invalid');
      }

      const bdPhoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
      const cleanedPhone = phoneField.value.trim().replace(/[-\s]/g, '');
      if (!bdPhoneRegex.test(cleanedPhone)) {
        phoneField.closest('.form-group').classList.add('invalid');
        isValid = false;
      } else {
        phoneField.closest('.form-group').classList.remove('invalid');
      }

      if (!treatmentField.value) {
        treatmentField.closest('.form-group').classList.add('invalid');
        isValid = false;
      } else {
        treatmentField.closest('.form-group').classList.remove('invalid');
      }

      if (!dateField.value) {
        dateField.closest('.form-group').classList.add('invalid');
        isValid = false;
      } else {
        dateField.closest('.form-group').classList.remove('invalid');
      }

      if (!timeField.value) {
        timeField.closest('.form-group').classList.add('invalid');
        isValid = false;
      } else {
        timeField.closest('.form-group').classList.remove('invalid');
      }

      if (isValid && window.db) {
        // Change submit buttons to loading
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtn = document.getElementById('submitBtn');
        
        if (submitBtnText) submitBtnText.textContent = 'Submitting Request...';
        if (submitBtn) submitBtn.disabled = true;

        const bookingData = {
          name: nameField.value.trim(),
          phone: phoneField.value.trim(),
          treatment: treatmentField.value,
          date: dateField.value,
          time: timeField.value,
          notes: notesField.value.trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'Pending',
          replyStatus: 'pending',
          replies: []
        };

        // 1. Post to Formspree API
        const formspreePromise = fetch('https://formspree.io/f/xjgdaagw', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: bookingData.name,
            phone: bookingData.phone,
            treatment: bookingData.treatment,
            date: bookingData.date,
            time: bookingData.time,
            message: bookingData.notes
          })
        });

        // 2. Post to Firebase Firestore
        const firestorePromise = window.db.collection('appointments').add(bookingData);

        Promise.all([formspreePromise, firestorePromise])
          .then(([, docRef]) => {
            const bookingId = docRef.id;
            try {
              localStorage.setItem('kinetic-last-booking-ref', bookingId);
            } catch (e) { /* ignore storage errors */ }

            // Restore button
            if (submitBtnText) submitBtnText.textContent = 'Send Appointment Request';
            if (submitBtn) submitBtn.disabled = false;

            // Load values to success card
            modalSummary.innerHTML = `
              <div class="modal-summary-item highlight-ref">
                <span>Booking Reference:</span>
                <span class="booking-ref-code">${escapeHTML(bookingId)}</span>
              </div>
              <div class="modal-summary-item">
                <span>Patient Name:</span>
                <span>${escapeHTML(bookingData.name)}</span>
              </div>
              <div class="modal-summary-item">
                <span>Contact Phone:</span>
                <span>${escapeHTML(bookingData.phone)}</span>
              </div>
              <div class="modal-summary-item">
                <span>Requested Care:</span>
                <span>${escapeHTML(bookingData.treatment)}</span>
              </div>
              <div class="modal-summary-item">
                <span>Appointment Date:</span>
                <span>${escapeHTML(bookingData.date)}</span>
              </div>
              <div class="modal-summary-item">
                <span>Preferred Time:</span>
                <span>${escapeHTML(bookingData.time)}</span>
              </div>
            `;

            successModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            bookingForm.reset();
          })
          .catch(err => {
            console.error('Submit promises failed:', err);
            if (submitBtnText) submitBtnText.textContent = 'Send Appointment Request';
            if (submitBtn) submitBtn.disabled = false;
            
            alert("A network timeout occurred. If you do not receive a confirmation phone call within 2 hours, please call us at 01313-175779 or 01308-388577!");
          });
      }
    });
  }

  if (modalCloseBtn && successModal) {
    modalCloseBtn.addEventListener('click', () => {
      successModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  /* --------------------------------------------------------------------------
     6b. Booking Status Check (by reference ID)
     -------------------------------------------------------------------------- */
  const statusCheckForm = document.getElementById('statusCheckForm');
  const bookingRefInput = document.getElementById('bookingRef');
  const statusResult = document.getElementById('statusResult');
  const statusResultSummary = document.getElementById('statusResultSummary');
  const statusResultBadge = document.getElementById('statusResultBadge');
  const adminRepliesPanel = document.getElementById('adminRepliesPanel');
  const adminRepliesList = document.getElementById('adminRepliesList');
  const statusResultNoReply = document.getElementById('statusResultNoReply');

  try {
    const savedRef = localStorage.getItem('kinetic-last-booking-ref');
    if (savedRef && bookingRefInput) bookingRefInput.value = savedRef;
  } catch (e) { /* ignore */ }

  function escapeHTML(str) {
    if (!str) return '';
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

  function formatReplyDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    return timestamp.toDate().toLocaleString('en-BD', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function renderStatusResult(data) {
    statusResult.classList.remove('hidden');
    statusResultBadge.textContent = data.status || 'Pending';
    statusResultBadge.className = `status-badge status-${data.status || 'Pending'}`;

    statusResultSummary.innerHTML = `
      <div class="modal-summary-item">
        <span>Patient Name:</span>
        <span>${escapeHTML(data.name)}</span>
      </div>
      <div class="modal-summary-item">
        <span>Contact Phone:</span>
        <span>${escapeHTML(data.phone)}</span>
      </div>
      <div class="modal-summary-item">
        <span>Requested Care:</span>
        <span>${escapeHTML(data.treatment)}</span>
      </div>
      <div class="modal-summary-item">
        <span>Preferred Slot:</span>
        <span>${escapeHTML(data.date)} — ${escapeHTML(data.time)}</span>
      </div>
    `;

    const replies = Array.isArray(data.replies) ? data.replies : [];
    if (replies.length > 0) {
      adminRepliesPanel.classList.remove('hidden');
      statusResultNoReply.classList.add('hidden');
      adminRepliesList.innerHTML = replies.map(reply => `
        <div class="admin-reply-bubble">
          <p>${escapeHTML(reply.message)}</p>
          <span class="reply-meta">${escapeHTML(reply.repliedBy || 'Clinic Team')} · ${formatReplyDate(reply.repliedAt)}</span>
        </div>
      `).join('');
    } else {
      adminRepliesPanel.classList.add('hidden');
      statusResultNoReply.classList.remove('hidden');
      adminRepliesList.innerHTML = '';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (statusCheckForm && window.db) {
    statusCheckForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = bookingRefInput.value.trim();
      const refGroup = bookingRefInput.closest('.form-group');
      const statusCheckBtn = document.getElementById('statusCheckBtn');
      const statusCheckBtnText = document.getElementById('statusCheckBtnText');

      if (!ref) {
        refGroup?.classList.add('invalid');
        return;
      }
      refGroup?.classList.remove('invalid');

      if (statusCheckBtn) statusCheckBtn.disabled = true;
      if (statusCheckBtnText) statusCheckBtnText.textContent = 'Checking...';
      statusResult.classList.add('hidden');

      window.db.collection('appointments').doc(ref).get()
        .then((doc) => {
          if (!doc.exists) {
            alert('No booking found for that reference. Please check the code from your confirmation and try again.');
            return;
          }
          renderStatusResult(doc.data());
        })
        .catch((err) => {
          console.error('Status check failed:', err);
          alert('Unable to load booking status. Please call us at 01313-175779 or 01308-388577.');
        })
        .finally(() => {
          if (statusCheckBtn) statusCheckBtn.disabled = false;
          if (statusCheckBtnText) statusCheckBtnText.textContent = 'Check Status';
        });
    });
  }

  /* --------------------------------------------------------------------------
     7. Interactive Gallery Lightbox
     -------------------------------------------------------------------------- */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCaption = document.getElementById('lightboxCaption');
  
  let currentGalleryIndex = 0;
  const galleryImages = [];

  galleryItems.forEach((item, index) => {
    const src = item.getAttribute('data-src');
    const captionTitle = item.querySelector('h4')?.textContent || '';
    const captionSub = item.querySelector('p')?.textContent || '';
    
    galleryImages.push({
      src: src,
      caption: `${captionTitle} - ${captionSub}`
    });

    item.addEventListener('click', () => {
      currentGalleryIndex = index;
      openLightbox();
    });
  });

  const openLightbox = () => {
    const item = galleryImages[currentGalleryIndex];
    if (!item) return;

    lightboxImg.src = item.src;
    lightboxCaption.textContent = item.caption;
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  const showNextImage = () => {
    currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
    openLightbox();
  };

  const showPrevImage = () => {
    currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
    openLightbox();
  };

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', showNextImage);
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevImage);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNextImage();
    if (e.key === 'ArrowLeft') showPrevImage();
  });

  /* --------------------------------------------------------------------------
     8. FAQ Accordion Functionality
     -------------------------------------------------------------------------- */
  const faqTriggers = document.querySelectorAll('.faq-trigger');

  faqTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const faqCard = trigger.closest('.faq-card');
      const faqContent = faqCard.querySelector('.faq-content');
      const isActive = faqCard.classList.contains('active');

      document.querySelectorAll('.faq-card.active').forEach(openCard => {
        openCard.classList.remove('active');
        openCard.querySelector('.faq-content').style.maxHeight = '0px';
      });

      if (!isActive) {
        faqCard.classList.add('active');
        faqContent.style.maxHeight = faqContent.scrollHeight + 'px';
      }
    });
  });

  /* --------------------------------------------------------------------------
     9. Instant Treatment Explorer (Search & Filter) + Auto-Select Booking
     -------------------------------------------------------------------------- */
  const treatmentSearchInput = document.getElementById('treatmentSearchInput');
  const explorerClearBtn = document.getElementById('explorerClearBtn');
  const filterChips = document.querySelectorAll('#treatmentFilterChips .filter-chip');
  const treatmentsGrid = document.getElementById('treatmentsGrid');
  const noTreatmentMatch = document.getElementById('noTreatmentMatch');
  const treatmentTypeSelect = document.getElementById('treatmentType');

  // Admin-editable treatment card rendering (Treatments & Pricing directory)
  const TREATMENT_LINK_MAP = {
    details: { href: 'treatments.html', icon: 'arrow-right' },
    appointment: { href: 'index.html#appointment', icon: 'arrow-right' },
    call: { href: 'tel:+8801313175779', icon: 'phone' },
    tips: { href: 'dental-problems.html', icon: 'book-open' }
  };

  function renderTreatmentCards(list) {
    if (!treatmentsGrid || !Array.isArray(list) || !list.length) return;

    treatmentsGrid.innerHTML = list.map(t => {
      const link = TREATMENT_LINK_MAP[t.linkType] || TREATMENT_LINK_MAP.details;
      return `
        <div class="treatment-quick-card" data-category="${escapeHTML(t.category || 'general')}" data-keywords="${escapeHTML(t.keywords || '')}">
          <div class="treatment-quick-top">
            <div class="treatment-icon-circle"><i data-lucide="${escapeHTML(t.icon || 'sparkles')}"></i></div>
            <span class="treatment-status-badge"><i data-lucide="check" style="width:12px;height:12px;"></i> ${escapeHTML(t.badgeText || 'Available')}</span>
          </div>
          <h3>${escapeHTML(t.title || '')}</h3>
          <div class="treatment-title-bn">${escapeHTML(t.titleBn || '')}</div>
          <p class="treatment-desc">${escapeHTML(t.desc || '')}</p>
          <div class="treatment-symptoms-list">
            <span class="treatment-symptoms-label">লক্ষণ / সমাধান:</span>
            <span class="treatment-symptoms-text">${escapeHTML(t.symptomsText || '')}</span>
          </div>
          <div class="treatment-price-bar">
            <span class="treatment-price-label">${escapeHTML(t.priceLabel || 'Starting From')}</span>
            <span class="treatment-price-val">${escapeHTML(t.priceVal || '')}</span>
          </div>
          <div class="treatment-quick-footer">
            <button type="button" class="btn-book-treatment" data-treatment="${escapeHTML(t.treatmentName || t.title || '')}">
              <i data-lucide="calendar" style="width:15px;height:15px;"></i> ${escapeHTML(t.bookButtonText || 'Book Treatment')}
            </button>
            <a href="${escapeHTML(link.href)}" class="btn-info-treatment" title="View details" aria-label="View ${escapeHTML(t.title || 'treatment')} details">
              <i data-lucide="${escapeHTML(link.icon)}" style="width:16px;height:16px;"></i>
            </a>
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  let currentCategory = 'all';
  let currentSearchQuery = '';

  const filterTreatments = () => {
    let visibleCount = 0;
    const query = currentSearchQuery.toLowerCase().trim();
    const treatmentCards = treatmentsGrid ? treatmentsGrid.querySelectorAll('.treatment-quick-card') : [];

    treatmentCards.forEach(card => {
      const category = card.getAttribute('data-category') || '';
      const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const titleBn = card.querySelector('.treatment-title-bn')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.treatment-desc')?.textContent.toLowerCase() || '';
      const symptoms = card.querySelector('.treatment-symptoms-text')?.textContent.toLowerCase() || '';

      const matchesCategory = currentCategory === 'all' || category.includes(currentCategory);
      const matchesSearch = !query || 
        title.includes(query) || 
        titleBn.includes(query) || 
        desc.includes(query) || 
        symptoms.includes(query) || 
        keywords.includes(query);

      if (matchesCategory && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (noTreatmentMatch) {
      if (visibleCount === 0) {
        noTreatmentMatch.classList.remove('hidden');
      } else {
        noTreatmentMatch.classList.add('hidden');
      }
    }
  };

  if (treatmentSearchInput) {
    treatmentSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      if (explorerClearBtn) {
        if (currentSearchQuery.length > 0) {
          explorerClearBtn.classList.remove('hidden');
        } else {
          explorerClearBtn.classList.add('hidden');
        }
      }
      filterTreatments();
    });
  }

  if (explorerClearBtn) {
    explorerClearBtn.addEventListener('click', () => {
      if (treatmentSearchInput) {
        treatmentSearchInput.value = '';
        treatmentSearchInput.focus();
      }
      currentSearchQuery = '';
      explorerClearBtn.classList.add('hidden');
      filterTreatments();
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-filter') || 'all';
      filterTreatments();
    });
  });

  // Auto-fill & Smooth Scroll on "Book Treatment" click (delegated so it survives dynamic re-renders)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-book-treatment');
    if (!btn) return;
    {
      const treatmentName = btn.getAttribute('data-treatment');
      if (treatmentTypeSelect && treatmentName) {
        let matched = false;
        for (let i = 0; i < treatmentTypeSelect.options.length; i++) {
          const opt = treatmentTypeSelect.options[i];
          if (!opt.value) continue;
          if (opt.value.toLowerCase().includes(treatmentName.toLowerCase()) ||
              treatmentName.toLowerCase().includes(opt.value.toLowerCase())) {
            treatmentTypeSelect.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          treatmentTypeSelect.value = treatmentName;
        }

        // Trigger change event
        treatmentTypeSelect.dispatchEvent(new Event('change'));
      }

      // Smooth scroll to appointment section
      const appointmentSec = document.getElementById('appointment');
      if (appointmentSec) {
        appointmentSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Briefly highlight the select field
        if (treatmentTypeSelect) {
          const wrapper = treatmentTypeSelect.closest('.input-wrapper');
          if (wrapper) {
            wrapper.style.boxShadow = '0 0 0 3px var(--primary)';
            setTimeout(() => {
              wrapper.style.boxShadow = '';
            }, 1800);
          }
        }
      }
    }
  });

  // Render admin-managed treatment cards (falls back to the static HTML above when no data is cached/synced yet)
  window.KineticTreatments = { render: renderTreatmentCards, refresh: filterTreatments };

  /* --------------------------------------------------------------------------
     Dynamic Special Offer & Announcement System (Client Promotion Control)
     -------------------------------------------------------------------------- */
  const activeOfferBanner = document.getElementById('activeOfferBanner');
  const offerBannerBadge = document.getElementById('offerBannerBadge');
  const offerBannerText = document.getElementById('offerBannerText');
  const offerBannerCta = document.getElementById('offerBannerCta');
  const closeOfferBannerBtn = document.getElementById('closeOfferBannerBtn');

  const offerPopupModal = document.getElementById('offerPopupModal');
  const closeOfferModalBtn = document.getElementById('closeOfferModalBtn');
  const dismissOfferModalBtn = document.getElementById('dismissOfferModalBtn');
  const offerModalPosterImg = document.getElementById('offerModalPosterImg');
  const offerModalBadge = document.getElementById('offerModalBadge');
  const offerModalTitle = document.getElementById('offerModalTitle');
  const offerModalDetails = document.getElementById('offerModalDetails');
  const offerModalCta = document.getElementById('offerModalCta');
  const offerModalCtaText = document.getElementById('offerModalCtaText');
  const floatingOfferBtn = document.getElementById('floatingOfferBtn');
  const heroMainImage = document.getElementById('heroMainImage');

  let currentOfferData = null;

  function applyOfferData(data) {
    if (!data || !data.active) {
      if (activeOfferBanner) activeOfferBanner.classList.add('hidden');
      if (floatingOfferBtn) floatingOfferBtn.classList.add('hidden');
      if (offerPopupModal) offerPopupModal.classList.remove('show');
      if (heroMainImage && heroMainImage.getAttribute('data-original-src')) {
        heroMainImage.src = heroMainImage.getAttribute('data-original-src');
      }
      return;
    }

    currentOfferData = data;

    // 1. Update Hero Image if offer poster should appear in hero
    if (heroMainImage) {
      if (!heroMainImage.getAttribute('data-original-src')) {
        heroMainImage.setAttribute('data-original-src', heroMainImage.src);
      }
      if (data.showInHero && data.image) {
        heroMainImage.src = data.image;
      } else {
        heroMainImage.src = heroMainImage.getAttribute('data-original-src');
      }
    }

    // 2. Update Top Offer Banner
    if (activeOfferBanner) {
      if (offerBannerBadge) offerBannerBadge.textContent = data.badge || 'Special Offer';
      if (offerBannerText) offerBannerText.textContent = `${data.title || ''} — ${data.subtitle || ''}`;
      if (offerBannerCta) offerBannerCta.textContent = data.ctaText || 'Claim Offer';
      activeOfferBanner.classList.remove('hidden');
    }

    // 3. Update Modal & Floating Button
    if (offerModalTitle) offerModalTitle.textContent = data.title || 'Exclusive Dental Care Offer';
    if (offerModalDetails) offerModalDetails.textContent = data.subtitle || 'Special discount available on modern clinical treatments. Book your slot today!';
    if (offerModalBadge) offerModalBadge.textContent = data.badge || 'Limited Time';
    if (offerModalCtaText) offerModalCtaText.textContent = data.ctaText || 'Book with Offer';

    if (offerModalPosterImg) {
      if (data.image) {
        offerModalPosterImg.src = data.image;
        offerModalPosterImg.parentElement.style.display = 'block';
      } else {
        offerModalPosterImg.parentElement.style.display = 'none';
      }
    }

    if (floatingOfferBtn) {
      floatingOfferBtn.classList.remove('hidden');
    }

    // 4. Auto-show popup if enabled and not dismissed in this session
    if (data.showPopup && !sessionStorage.getItem('kinetic_offer_dismissed')) {
      setTimeout(() => {
        if (offerPopupModal) offerPopupModal.classList.add('show');
      }, 1200);
    }
  }

  // Handle Offer Booking Action
  function handleOfferBooking() {
    if (offerPopupModal) offerPopupModal.classList.remove('show');
    if (currentOfferData && currentOfferData.treatment && treatmentTypeSelect) {
      for (let i = 0; i < treatmentTypeSelect.options.length; i++) {
        if (treatmentTypeSelect.options[i].value.toLowerCase().includes(currentOfferData.treatment.toLowerCase())) {
          treatmentTypeSelect.selectedIndex = i;
          break;
        }
      }
    }
    const notesField = document.getElementById('notes');
    if (notesField && currentOfferData && currentOfferData.title) {
      notesField.value = `[Claiming Offer: ${currentOfferData.title}] ${notesField.value || ''}`.trim();
    }
    const appointmentSec = document.getElementById('appointment');
    if (appointmentSec) {
      appointmentSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  offerBannerCta?.addEventListener('click', (e) => {
    e.preventDefault();
    handleOfferBooking();
  });

  offerModalCta?.addEventListener('click', (e) => {
    e.preventDefault();
    handleOfferBooking();
  });

  closeOfferBannerBtn?.addEventListener('click', () => {
    if (activeOfferBanner) activeOfferBanner.classList.add('hidden');
  });

  closeOfferModalBtn?.addEventListener('click', () => {
    if (offerPopupModal) offerPopupModal.classList.remove('show');
    sessionStorage.setItem('kinetic_offer_dismissed', 'true');
  });

  dismissOfferModalBtn?.addEventListener('click', () => {
    if (offerPopupModal) offerPopupModal.classList.remove('show');
    sessionStorage.setItem('kinetic_offer_dismissed', 'true');
  });

  floatingOfferBtn?.addEventListener('click', () => {
    if (offerPopupModal) offerPopupModal.classList.add('show');
  });

  // Load from local cache first
  const cachedOffer = localStorage.getItem('kinetic_active_offer');
  if (cachedOffer) {
    try {
      applyOfferData(JSON.parse(cachedOffer));
    } catch (e) {
      console.error("Local offer parse error", e);
    }
  }

  // Sync live from Firebase Firestore
  try {
    if (window.db) {
      window.db.collection('settings').doc('active_offer').onSnapshot((doc) => {
        if (doc.exists) {
          const offerData = doc.data();
          localStorage.setItem('kinetic_active_offer', JSON.stringify(offerData));
          applyOfferData(offerData);
        }
      }, (err) => {
        console.log("Firestore offer sync observer:", err.message);
      });
    }
  } catch (err) {
    console.log("Firestore offer init error:", err);
  }

  /* --------------------------------------------------------------------------
     Dynamic Treatments & Pricing Directory (Admin-managed, falls back to static HTML)
     -------------------------------------------------------------------------- */
  const cachedTreatments = localStorage.getItem('kinetic_treatments_directory');
  if (cachedTreatments) {
    try {
      const data = JSON.parse(cachedTreatments);
      renderTreatmentCards(data.treatments);
      filterTreatments();
    } catch (e) {
      console.error("Local treatments parse error", e);
    }
  }

  try {
    if (window.db) {
      window.db.collection('settings').doc('treatments_directory').onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          localStorage.setItem('kinetic_treatments_directory', JSON.stringify(data));
          renderTreatmentCards(data.treatments);
          filterTreatments();
        }
      }, (err) => {
        console.log("Firestore treatments sync observer:", err.message);
      });
    }
  } catch (err) {
    console.log("Firestore treatments init error:", err);
  }

  /* --------------------------------------------------------------------------
     Helper: Safe HTML Escaping
     -------------------------------------------------------------------------- */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* --------------------------------------------------------------------------
     Dynamic Chamber & Hotlines Settings (Admin-managed)
     -------------------------------------------------------------------------- */
  function applyClinicSettings(settings) {
    if (!settings) return;

    // 1. Hotlines
    if (settings.hotline1) {
      const cleanH1 = settings.hotline1.replace(/[^0-9+]/g, '');
      const tel1 = cleanH1.startsWith('+') ? cleanH1 : (cleanH1.startsWith('88') ? `+${cleanH1}` : `+88${cleanH1}`);
      const h1Nodes = document.querySelectorAll('#topHotline1, #apptHotline1, #contactHotline1, #footerHotline1');
      h1Nodes.forEach(node => {
        node.setAttribute('href', `tel:${tel1}`);
        const span = node.querySelector('.hotline1-text');
        if (span) {
          span.textContent = settings.hotline1;
        } else if (node.tagName.toLowerCase() === 'a' && !node.querySelector('span')) {
          node.textContent = settings.hotline1;
        }
      });

      const heroCallBtn = document.getElementById('heroCallBtn');
      const heroCallText = document.getElementById('heroCallText');
      if (heroCallBtn) heroCallBtn.setAttribute('href', `tel:${tel1}`);
      if (heroCallText) heroCallText.textContent = `Call: ${settings.hotline1}`;
    }

    if (settings.hotline2) {
      const cleanH2 = settings.hotline2.replace(/[^0-9+]/g, '');
      const tel2 = cleanH2.startsWith('+') ? cleanH2 : (cleanH2.startsWith('88') ? `+${cleanH2}` : `+88${cleanH2}`);
      const h2Nodes = document.querySelectorAll('#topHotline2, #apptHotline2, #contactHotline2, #footerHotline2');
      h2Nodes.forEach(node => {
        node.setAttribute('href', `tel:${tel2}`);
        const span = node.querySelector('.hotline2-text');
        if (span) {
          span.textContent = settings.hotline2;
        } else if (node.tagName.toLowerCase() === 'a' && !node.querySelector('span')) {
          node.textContent = settings.hotline2;
        }
      });
    }

    // 2. WhatsApp
    if (settings.whatsapp) {
      const cleanWa = settings.whatsapp.replace(/[^0-9]/g, '');
      const waNumber = cleanWa.startsWith('88') ? cleanWa : `88${cleanWa}`;
      const waBtn = document.getElementById('floatingWhatsappBtn');
      if (waBtn) {
        waBtn.setAttribute('href', `https://wa.me/${waNumber}?text=Hello%20Kinetic%20Dental%2C%20I%20would%20like%20to%20consult%20or%20book%20an%20appointment.`);
      }
    }

    // 3. Top Announcement Bar Live Ticker
    const tickerWrap = document.getElementById('topBarTickerWrap');
    const tickerText = document.getElementById('topBarTickerText');
    if (tickerWrap && tickerText) {
      if (settings.tickerActive && settings.tickerText && settings.tickerText.trim() !== '') {
        tickerText.textContent = settings.tickerText;
        tickerWrap.classList.remove('hidden');
      } else {
        tickerWrap.classList.add('hidden');
      }
    }

    // 4. Address
    if (settings.address) {
      const addrEl = document.querySelector('#topAddress .address-text');
      if (addrEl) addrEl.textContent = settings.address;
    }

    // 5. Social Links
    if (settings.facebookPage) {
      const fbPageEl = document.getElementById('topFbPage');
      if (fbPageEl) fbPageEl.href = settings.facebookPage;
    }
    if (settings.facebookGroup) {
      const fbGroupEl = document.getElementById('topFbGroup');
      if (fbGroupEl) fbGroupEl.href = settings.facebookGroup;
    }
  }

  // Load cached clinic settings
  const cachedClinic = localStorage.getItem('kinetic_clinic_settings');
  if (cachedClinic) {
    try {
      applyClinicSettings(JSON.parse(cachedClinic));
    } catch (e) {
      console.error("Local clinic settings parse error", e);
    }
  }

  // Firestore clinic settings observer
  try {
    if (window.db) {
      window.db.collection('settings').doc('clinic_profile').onSnapshot((doc) => {
        if (doc.exists) {
          const liveSettings = doc.data();
          localStorage.setItem('kinetic_clinic_settings', JSON.stringify(liveSettings));
          applyClinicSettings(liveSettings);
        }
      }, (err) => {
        console.log("Firestore clinic observer:", err.message);
      });
    }
  } catch (err) {
    console.log("Firestore clinic init error:", err);
  }

  /* --------------------------------------------------------------------------
     Dynamic Patient Reviews / Testimonials (Admin-managed)
     -------------------------------------------------------------------------- */
  const DEFAULT_TESTIMONIALS = [
    {
      id: 'rev-1',
      name: 'Tanvir Hossain',
      treatment: 'Root Canal & Zirconia Crown',
      rating: 5,
      comment: 'Dr. Nadia apur treatment khub shundor ebong painless. Chamber er poribesh 100% sterile. Mirpur 12 e er theke bhalo dental care pawa kothin.',
      date: 'September 2026',
      verified: true
    },
    {
      id: 'rev-2',
      name: 'Sadia Afrin',
      treatment: 'Teeth Whitening (Bleaching)',
      rating: 5,
      comment: 'Ekhane female doctor thakay khub comfortable legeche. 1 session e teeth whitening koralam, result ashar cheyeo onek bhalo hoyeche!',
      date: 'September 2026',
      verified: true
    },
    {
      id: 'rev-3',
      name: 'Mahmudul Hasan',
      treatment: 'Tooth Scaling & Polishing',
      rating: 5,
      comment: 'Digital RVG X-ray diye age problem bujhiechen tarpor scaling korechen. Dater shirshir bhab chole geche. Extremely satisfied.',
      date: 'August 2026',
      verified: true
    },
    {
      id: 'rev-4',
      name: 'Farzana Yesmin',
      treatment: 'Night Guard for Bruxism',
      rating: 5,
      comment: 'Raate dat ghoshar somoshar jonno customized night guard baniyechi. Ekhon r jaw pain hoy na. Khub helpful doctor & clinic staff.',
      date: 'August 2026',
      verified: true
    },
    {
      id: 'rev-5',
      name: 'Kawsar Ahmed',
      treatment: 'Toothache & Emergency Care',
      rating: 5,
      comment: 'Severe dater byathay hotline e phone diye 30 minute er moddhe treatment peyechi. Dr. Nadia and his team are life savers!',
      date: 'July 2026',
      verified: true
    },
    {
      id: 'rev-6',
      name: 'Nasrin Sultana',
      treatment: 'Cosmetic Filling & Veneers',
      rating: 5,
      comment: 'Samner dater gap bondho korechen. Ekdom natural dekhasse. Mirpur 12 bus stand er kache chamber howay jaoa o khub shohoj.',
      date: 'July 2026',
      verified: true
    }
  ];

  function renderPublicTestimonials(list) {
    const container = document.getElementById('publicTestimonialsContainer');
    if (!container) return;

    const items = (Array.isArray(list) && list.length > 0) ? list : DEFAULT_TESTIMONIALS;

    container.innerHTML = items.map(item => {
      const initial = (item.name || 'P').charAt(0).toUpperCase();
      const starsCount = Math.max(1, Math.min(5, parseInt(item.rating) || 5));
      const starsStr = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

      return `
        <div class="public-testimonial-card">
          <div class="testimonial-card-header">
            <div class="testimonial-avatar">${initial}</div>
            <div class="testimonial-user-info">
              <div class="testimonial-user-name">${escapeHTML(item.name || 'Anonymous Patient')}</div>
              <span class="testimonial-treatment-tag">${escapeHTML(item.treatment || 'Dental Consultation')}</span>
            </div>
          </div>
          <div class="testimonial-stars" aria-label="${starsCount} out of 5 stars">${starsStr}</div>
          <p class="testimonial-quote">"${escapeHTML(item.comment || '')}"</p>
          <div class="testimonial-footer">
            <span><i data-lucide="calendar" class="icon-sm" style="display:inline-block; vertical-align:middle; width:14px; height:14px;"></i> ${escapeHTML(item.date || 'Recent Visit')}</span>
            ${item.verified !== false ? '<span class="testimonial-verified-badge"><i data-lucide="check-circle" class="icon-sm" style="display:inline-block; vertical-align:middle; width:14px; height:14px;"></i> Verified Patient</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Load cached testimonials
  const cachedTestimonials = localStorage.getItem('kinetic_testimonials');
  if (cachedTestimonials) {
    try {
      renderPublicTestimonials(JSON.parse(cachedTestimonials));
    } catch (e) {
      renderPublicTestimonials(DEFAULT_TESTIMONIALS);
    }
  } else {
    renderPublicTestimonials(DEFAULT_TESTIMONIALS);
  }

  // Firestore testimonials observer
  try {
    if (window.db) {
      window.db.collection('settings').doc('testimonials').onSnapshot((doc) => {
        if (doc.exists) {
          const liveData = doc.data();
          if (liveData && Array.isArray(liveData.list)) {
            localStorage.setItem('kinetic_testimonials', JSON.stringify(liveData.list));
            renderPublicTestimonials(liveData.list);
          }
        }
      }, (err) => {
        console.log("Firestore testimonials observer:", err.message);
      });
    }
  } catch (err) {
    console.log("Firestore testimonials init error:", err);
  }

  /* --------------------------------------------------------------------------
     Dynamic Hero Content (Admin-managed)
     -------------------------------------------------------------------------- */
  function applyHeroContent(data) {
    if (!data) return;
    const taglineEl = document.getElementById('heroTagline');
    const titleMainEl = document.getElementById('heroTitleMain');
    const brandHighlightEl = document.getElementById('heroBrandHighlight');
    const descEl = document.getElementById('heroDescription');

    if (taglineEl && data.tagline) taglineEl.textContent = data.tagline;
    if (titleMainEl && data.title) titleMainEl.textContent = data.title + ' ';
    if (brandHighlightEl && data.brandHighlight) brandHighlightEl.textContent = data.brandHighlight;
    if (descEl && data.description) descEl.textContent = data.description;

    const s1Num = document.getElementById('heroStatNum1');
    const s1Lbl = document.getElementById('heroStatLbl1');
    const s2Num = document.getElementById('heroStatNum2');
    const s2Lbl = document.getElementById('heroStatLbl2');
    const s3Num = document.getElementById('heroStatNum3');
    const s3Lbl = document.getElementById('heroStatLbl3');
    const s4Num = document.getElementById('heroStatNum4');
    const s4Lbl = document.getElementById('heroStatLbl4');

    if (s1Num && data.stat1Num) s1Num.textContent = data.stat1Num;
    if (s1Lbl && data.stat1Lbl) s1Lbl.textContent = data.stat1Lbl;
    if (s2Num && data.stat2Num) s2Num.textContent = data.stat2Num;
    if (s2Lbl && data.stat2Lbl) s2Lbl.textContent = data.stat2Lbl;
    if (s3Num && data.stat3Num) s3Num.textContent = data.stat3Num;
    if (s3Lbl && data.stat3Lbl) s3Lbl.textContent = data.stat3Lbl;
    if (s4Num && data.stat4Num) s4Num.textContent = data.stat4Num;
    if (s4Lbl && data.stat4Lbl) s4Lbl.textContent = data.stat4Lbl;

    const founderNameEl = document.getElementById('founderCardName');
    const founderRoleEl = document.getElementById('founderCardRole');
    if (founderNameEl && data.founderName) founderNameEl.textContent = data.founderName;
    if (founderRoleEl && data.founderRole) founderRoleEl.textContent = data.founderRole;

    const femaleTitleEl = document.getElementById('femaleCardTitle');
    const femaleSubEl = document.getElementById('femaleCardSubtitle');
    if (femaleTitleEl && data.femaleCardTitle) femaleTitleEl.textContent = data.femaleCardTitle;
    if (femaleSubEl && data.femaleCardSub) femaleSubEl.textContent = data.femaleCardSub;
  }

  const cachedHeroPublic = localStorage.getItem('kinetic_hero_content');
  if (cachedHeroPublic) {
    try {
      applyHeroContent(JSON.parse(cachedHeroPublic));
    } catch (e) {}
  }

  if (window.db) {
    window.db.collection('settings').doc('hero_content').onSnapshot(doc => {
      if (doc.exists) {
        const liveHero = doc.data();
        localStorage.setItem('kinetic_hero_content', JSON.stringify(liveHero));
        applyHeroContent(liveHero);
      }
    }, err => console.log("Hero live observer:", err.message));
  }

  /* --------------------------------------------------------------------------
     Dynamic Special Facilities (Admin-managed)
     -------------------------------------------------------------------------- */
  function renderPublicFacilities(list) {
    const container = document.getElementById('facilitiesGrid');
    if (!container || !Array.isArray(list) || !list.length) return;

    container.innerHTML = list.map(f => `
      <div class="facility-card ${f.style === 'highlight-female' ? 'highlight-female' : (f.style === 'highlight-free' ? 'highlight-free' : '')}">
        <div class="facility-icon-wrap">
          <i data-lucide="${escapeHTML(f.icon || 'award')}"></i>
        </div>
        <h3>${escapeHTML(f.title)}</h3>
        ${f.titleBn ? `<span class="facility-bn">${escapeHTML(f.titleBn)}</span>` : ''}
        <p>${escapeHTML(f.desc)}</p>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const cachedFacilitiesPublic = localStorage.getItem('kinetic_facilities');
  if (cachedFacilitiesPublic) {
    try {
      renderPublicFacilities(JSON.parse(cachedFacilitiesPublic));
    } catch (e) {}
  }

  if (window.db) {
    window.db.collection('settings').doc('facilities').onSnapshot(doc => {
      if (doc.exists && Array.isArray(doc.data().list)) {
        localStorage.setItem('kinetic_facilities', JSON.stringify(doc.data().list));
        renderPublicFacilities(doc.data().list);
      }
    }, err => console.log("Facilities live observer:", err.message));
  }

  /* --------------------------------------------------------------------------
     Dynamic FAQs & Doctor's Advice (Admin-managed)
     -------------------------------------------------------------------------- */
  function renderPublicFaqs(list) {
    const container = document.getElementById('faqAccordionContainer');
    if (!container || !Array.isArray(list) || !list.length) return;

    container.innerHTML = list.map((f, i) => `
      <div class="faq-card">
        <button class="faq-trigger">
          <span>${escapeHTML(f.q)}</span>
          <i data-lucide="chevron-down" class="faq-arrow"></i>
        </button>
        <div class="faq-content">
          <p>${escapeHTML(f.a)}</p>
        </div>
      </div>
    `).join('');

    if (typeof initFaqAccordion === 'function') initFaqAccordion();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function applyDoctorAdvice(data) {
    if (!data) return;
    const container = document.getElementById('doctorAdviceGrid');
    if (!container) return;

    const parseLines = (text) => {
      if (!text) return [];
      return text.split('\n').map(l => l.trim()).filter(Boolean);
    };

    const r1Lines = parseLines(data.rule1);
    const r2Lines = parseLines(data.rule2);
    const r3Lines = parseLines(data.rule3);

    container.innerHTML = `
      <!-- Advice 1: Daily Rules -->
      <div class="advice-card">
        <div class="advice-card-header">
          <div class="advice-icon-wrap"><i data-lucide="check-square"></i></div>
          <div>
            <h3>দৈনন্দিন ডেন্টাল রুলস</h3>
            <span class="advice-subtitle-bn">Daily Oral Health Rules</span>
          </div>
        </div>
        <ul>
          ${r1Lines.map(l => `<li>${escapeHTML(l)}</li>`).join('')}
        </ul>
        <a href="dental-problems.html#daily-rules" class="advice-link">বিস্তারিত গাইড পড়ুন <i data-lucide="arrow-right" class="icon-sm"></i></a>
      </div>

      <!-- Advice 2: Night Guard / Bruxism -->
      <div class="advice-card">
        <div class="advice-card-header">
          <div class="advice-icon-wrap purple"><i data-lucide="moon"></i></div>
          <div>
            <h3>Tooth Grinding (Bruxism)</h3>
            <span class="advice-subtitle-bn">ঘুমের মাঝে দাঁতে দাঁত ঘর্ষনের সমাধান</span>
          </div>
        </div>
        <ul>
          ${r2Lines.map(l => `<li>${escapeHTML(l)}</li>`).join('')}
        </ul>
        <a href="dental-problems.html#bruxism" class="advice-link">নাইট গার্ড বিস্তারিত <i data-lucide="arrow-right" class="icon-sm"></i></a>
      </div>

      <!-- Advice 3: Traumatic Injury -->
      <div class="advice-card danger">
        <div class="advice-card-header">
          <div class="advice-icon-wrap danger"><i data-lucide="alert-triangle"></i></div>
          <div>
            <h3>আঘাতপ্রাপ্ত দাঁত কালো হওয়া</h3>
            <span class="advice-subtitle-bn">Tooth Injury &amp; Discoloration</span>
          </div>
        </div>
        <ul>
          ${r3Lines.map(l => `<li>${escapeHTML(l)}</li>`).join('')}
        </ul>
        <a href="dental-problems.html#traumatic-injury" class="advice-link">জরুরি পরামর্শ জানুন <i data-lucide="arrow-right" class="icon-sm"></i></a>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const cachedFaqsPublic = localStorage.getItem('kinetic_faqs');
  if (cachedFaqsPublic) {
    try {
      renderPublicFaqs(JSON.parse(cachedFaqsPublic));
    } catch (e) {}
  }

  const cachedAdvicePublic = localStorage.getItem('kinetic_advice');
  if (cachedAdvicePublic) {
    try {
      applyDoctorAdvice(JSON.parse(cachedAdvicePublic));
    } catch (e) {}
  }

  if (window.db) {
    window.db.collection('settings').doc('faqs').onSnapshot(doc => {
      if (doc.exists && Array.isArray(doc.data().list)) {
        localStorage.setItem('kinetic_faqs', JSON.stringify(doc.data().list));
        renderPublicFaqs(doc.data().list);
      }
    }, err => console.log("FAQs live observer:", err.message));

    window.db.collection('settings').doc('advice').onSnapshot(doc => {
      if (doc.exists) {
        localStorage.setItem('kinetic_advice', JSON.stringify(doc.data()));
        applyDoctorAdvice(doc.data());
      }
    }, err => console.log("Advice live observer:", err.message));
  }

  /* --------------------------------------------------------------------------
     Dynamic Chamber Tour Gallery (Admin-managed)
     -------------------------------------------------------------------------- */
  function renderPublicGallery(list) {
    const container = document.getElementById('chamberGalleryGrid');
    if (!container || !Array.isArray(list) || !list.length) return;

    galleryImages.length = 0; // Clear for lightbox sync

    container.innerHTML = list.map((g, idx) => {
      const src = g.image || 'chamber.jpg';
      const caption = `${g.title || 'Chamber'} - ${g.subtitle || ''}`;
      galleryImages.push({ src, caption });

      return `
        <div class="gallery-item" data-index="${idx}" data-src="${escapeHTML(src)}">
          <img src="${escapeHTML(src)}" alt="${escapeHTML(g.title || 'Chamber')}" class="gallery-img" onerror="this.src='chamber.jpg'">
          <div class="gallery-overlay">
            <div class="gallery-icon-box"><i data-lucide="maximize-2"></i></div>
            <h4>${escapeHTML(g.title || '')}</h4>
            <p>${escapeHTML(g.subtitle || '')}</p>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.gallery-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        currentGalleryIndex = index;
        openLightbox();
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const cachedGalleryPublic = localStorage.getItem('kinetic_gallery');
  if (cachedGalleryPublic) {
    try {
      renderPublicGallery(JSON.parse(cachedGalleryPublic));
    } catch (e) {}
  }

  if (window.db) {
    window.db.collection('settings').doc('gallery').onSnapshot(doc => {
      if (doc.exists && Array.isArray(doc.data().list)) {
        localStorage.setItem('kinetic_gallery', JSON.stringify(doc.data().list));
        renderPublicGallery(doc.data().list);
      }
    }, err => console.log("Gallery live observer:", err.message));
  }

});


