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

  const savedTheme = localStorage.getItem('kinetic-dental-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
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

    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('active');
    } else {
      scrollTopBtn.classList.remove('active');
    }

    highlightActiveNavLink();
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

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
    threshold: 0.15,
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

});
