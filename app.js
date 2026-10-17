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
  const firebaseConfig = window.firebaseConfig || {};

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
     1. Active nav link on scroll
     (mobile drawer, header shadow and scroll-to-top live in page-utils.js)
     -------------------------------------------------------------------------- */
  window.addEventListener('scroll', () => highlightActiveNavLink(), { passive: true });

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
     2. Hide cards with missing/broken images + scroll reveal
     -------------------------------------------------------------------------- */
  if (typeof hideCardsWithoutImages === 'function') {
    hideCardsWithoutImages('.ft-card');
    hideCardsWithoutImages('.gallery-item');
  }

  initScrollReveal();

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

        // 1. Post to Formspree API (with graceful fallback if unverified/blocked)
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
        }).catch(err => {
          console.warn('Formspree dispatch notice (handled gracefully):', err);
          return { ok: false, unverifiedOrBlocked: true };
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
  initFaqAccordion();

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
          ${t.image ? `<div class="managed-media treatment-media" data-image-wrap><img alt="${escapeHTML(t.title || '')}" loading="lazy" src="${escapeHTML(formatDriveImageUrl(t.image))}" onload="this.parentNode.classList.remove('is-empty')" onerror="this.parentNode.classList.add('is-empty')"></div>` : ''}
          <h3>${escapeHTML(t.title || '')}</h3>
          <div class="treatment-title-bn">${escapeHTML(t.titleBn || '')}</div>
          <p class="treatment-desc">${escapeHTML(t.desc || '')}</p>
          ${t.details ? `<p class="treatment-details">${escapeHTML(t.details)}</p>` : ''}
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

    decorateTreatmentOffers();
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
     Dynamic Special Offer System (Client Promotion Control)
     -------------------------------------------------------------------------- */
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
  const heroSources = { site: '', legacy: '' };

  function refreshHeroImage() {
    const offer = currentOfferData;
    const offerSrc = offer && offer.active && offer.showInHero && offer.image ? offer.image : '';
    setManagedImage(heroMainImage, offerSrc || heroSources.site || heroSources.legacy);
  }

  /* Show struck-through main price + offer price + OFFER tag on matching treatment cards */
  function decorateTreatmentOffers() {
    const cards = document.querySelectorAll('.treatment-quick-card');
    const data = currentOfferData;
    const fmt = (v) => { const t = String(v).trim(); return /^(BDT|৳)/i.test(t) ? t : `BDT ${t}`; };
    const num = (v) => { const n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
    const targets = data ? ((Array.isArray(data.treatments) && data.treatments.length ? data.treatments : [data.treatment]).filter(Boolean).map(x => String(x).toLowerCase())) : [];
    const specific = targets.filter(x => x !== 'general consultation' && !x.includes('all treatments'));
    const appliesToAll = !specific.length;
    const pct = data ? parseFloat(String(data.discountPercent || data.discount || '').replace(/[^\d.]/g, '')) : NaN;

    cards.forEach(card => {
      const valEl = card.querySelector('.treatment-price-val');
      const top = card.querySelector('.treatment-quick-top');
      if (!valEl) return;
      if (valEl.dataset.orig === undefined) valEl.dataset.orig = valEl.textContent;
      valEl.textContent = valEl.dataset.orig;
      card.classList.remove('has-offer');
      card.querySelector('.treatment-offer-tag')?.remove();
      if (!data) return;

      const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
      const book = (card.querySelector('.btn-book-treatment')?.dataset.treatment || '').toLowerCase();
      const matched = appliesToAll || specific.some(t => name.includes(t) || t.includes(name) || (book && (book.includes(t) || t.includes(book))));
      if (!matched) return;

      let oldP = valEl.dataset.orig, newP = '';
      if (specific.length === 1 && data.offerPrice) {
        newP = fmt(data.offerPrice);
        if (data.originalPrice) oldP = fmt(data.originalPrice);
      } else if (!isNaN(pct) && pct > 0 && num(oldP) !== null) {
        newP = `BDT ${Math.round(num(oldP) * (1 - pct / 100)).toLocaleString('en-US')}`;
      }
      if (newP) {
        valEl.textContent = '';
        const oldEl = document.createElement('s');
        oldEl.className = 'treatment-price-old';
        oldEl.textContent = oldP;
        const newEl = document.createElement('strong');
        newEl.className = 'treatment-price-offer';
        newEl.textContent = newP;
        valEl.append(oldEl, ' ', newEl);
      }
      const tag = document.createElement('span');
      tag.className = 'treatment-offer-tag';
      tag.textContent = !isNaN(pct) && pct > 0 ? `OFFER · ${pct}% OFF` : 'OFFER';
      (top || card).appendChild(tag);
      card.classList.add('has-offer');
    });
  }

  function applyOfferData(data) {
    if (!data || !data.active) {
      currentOfferData = null;
      decorateTreatmentOffers();
      if (floatingOfferBtn) floatingOfferBtn.classList.add('hidden');
      if (offerPopupModal) offerPopupModal.classList.remove('show');
      refreshHeroImage();
      return;
    }

    currentOfferData = data;
    decorateTreatmentOffers();

    // 1. Update Hero Image if offer poster should appear in hero
    refreshHeroImage();

    // 3. Update Modal & Floating Button
    if (offerModalTitle) offerModalTitle.textContent = data.title || 'Exclusive Dental Care Offer';
    if (offerModalDetails) offerModalDetails.textContent = data.subtitle || 'Special discount available on modern clinical treatments. Book your slot today!';
    if (offerModalBadge) offerModalBadge.textContent = data.badge || (data.discountPercent ? `${data.discountPercent}% OFF` : 'Limited Time');
    if (offerModalCtaText) offerModalCtaText.textContent = data.ctaText || 'Book with Offer';

    // Target Treatment Badge
    const offerTreatmentBadge = document.getElementById('offerTreatmentBadge');
    const offerTreatmentName = document.getElementById('offerTreatmentName');
    if (offerTreatmentBadge && offerTreatmentName) {
      const targetTreatments = Array.isArray(data.treatments) && data.treatments.length ? data.treatments : [data.treatment].filter(Boolean);
      const targetLabel = targetTreatments.filter(treatment => treatment !== 'General Consultation' && !String(treatment).toLowerCase().includes('all treatments')).join(', ');
      if (targetLabel) {
        offerTreatmentName.textContent = targetLabel;
        offerTreatmentBadge.classList.remove('hidden');
      } else {
        offerTreatmentBadge.classList.add('hidden');
      }
    }

    // Strikethrough Price Row & Discount Badge
    const offerPriceRow = document.getElementById('offerPriceRow');
    const offerOldPrice = document.getElementById('offerOldPrice');
    const offerNewPrice = document.getElementById('offerNewPrice');
    const offerDiscountPill = document.getElementById('offerDiscountPill');

    if (offerPriceRow && offerOldPrice && offerNewPrice && offerDiscountPill) {
      const hasOld = data.originalPrice && String(data.originalPrice).trim() !== '';
      const hasNew = data.offerPrice && String(data.offerPrice).trim() !== '';
      const discountVal = data.discountPercent || data.discount;
      const hasDiscount = discountVal && String(discountVal).trim() !== '';

      if (hasOld || hasNew || hasDiscount) {
        offerPriceRow.classList.remove('hidden');

        if (hasOld) {
          const val = String(data.originalPrice).trim();
          offerOldPrice.textContent = val.startsWith('BDT') || val.startsWith('৳') ? val : `BDT ${val}`;
          offerOldPrice.style.display = '';
        } else {
          offerOldPrice.style.display = 'none';
        }

        if (hasNew) {
          const val = String(data.offerPrice).trim();
          offerNewPrice.textContent = val.startsWith('BDT') || val.startsWith('৳') ? val : `BDT ${val}`;
          offerNewPrice.style.display = '';
        } else {
          offerNewPrice.style.display = 'none';
        }

        if (hasDiscount) {
          const discText = String(discountVal).includes('%') ? String(discountVal) : `${discountVal}% OFF`;
          offerDiscountPill.textContent = discText.toUpperCase();
          offerDiscountPill.style.display = '';
        } else {
          offerDiscountPill.style.display = 'none';
        }
      } else {
        offerPriceRow.classList.add('hidden');
      }
    }

    if (offerModalPosterImg && offerModalPosterImg.parentElement) {
      if (data.image) {
        const posterSrc = typeof formatDriveImageUrl === 'function' ? formatDriveImageUrl(data.image) : data.image;
        offerModalPosterImg.src = posterSrc;
        offerModalPosterImg.parentElement.style.display = 'block';
        offerModalPosterImg.onerror = () => { offerModalPosterImg.parentElement.style.display = 'none'; };
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
    if (currentOfferData && treatmentTypeSelect) {
      const offeredTreatments = Array.isArray(currentOfferData.treatments) && currentOfferData.treatments.length
        ? currentOfferData.treatments
        : [currentOfferData.treatment].filter(Boolean);
      const matchedOption = Array.from(treatmentTypeSelect.options).find(option =>
        offeredTreatments.some(treatment => option.value.toLowerCase().includes(String(treatment).toLowerCase()))
      );
      if (matchedOption) treatmentTypeSelect.value = matchedOption.value;
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

  offerModalCta?.addEventListener('click', (e) => {
    e.preventDefault();
    handleOfferBooking();
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

  const DEFAULT_OFFER = {
    active: true,
    title: 'স্পেশাল ডেন্টাল কেয়ার অফার',
    subtitle: 'দাঁতের স্কেলিং ও পলিশিং এবং টিথ হোয়াইটেনিং-এ বিশেষ ছাড়! সাথে রয়েছে সম্পূর্ণ ফ্রি ডিজিটাল চেকআপ ও ওরাল হেলথ গাইড।',
    badge: 'Limited Period Offer',
    treatment: 'Tooth Scaling & Polishing',
    discountPercent: '25%',
    originalPrice: 'BDT 2,000',
    offerPrice: 'BDT 1,500',
    image: '',
    showInHero: false,
    // Fallback offer only shows the floating button; the popup is opt-in from the admin panel
    showPopup: false,
    ctaText: 'অফারটি গ্রহণ করুন / Book with Offer'
  };

  // Load from local cache first, or apply default offer
  const cachedOffer = localStorage.getItem('kinetic_active_offer');
  if (cachedOffer) {
    try {
      applyOfferData(JSON.parse(cachedOffer));
    } catch (e) {
      console.error("Local offer parse error", e);
      applyOfferData(DEFAULT_OFFER);
    }
  } else {
    applyOfferData(DEFAULT_OFFER);
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
     Live Clinic Profile Observer (delegates to shared applyGlobalClinicSettings in page-utils.js)
     -------------------------------------------------------------------------- */
  try {
    if (window.db) {
      window.db.collection('settings').doc('clinic_profile').onSnapshot((doc) => {
        if (doc.exists) {
          const liveSettings = doc.data();
          localStorage.setItem('kinetic_clinic_settings', JSON.stringify(liveSettings));
          if (typeof applyGlobalClinicSettings === 'function') {
            applyGlobalClinicSettings(liveSettings);
          }
        }
      }, (err) => {
        console.log("Firestore clinic observer:", err.message);
      });
    }
  } catch (err) {
    console.log("Firestore clinic init error:", err);
  }

  /* --------------------------------------------------------------------------
     Dynamic Hero Content & Upfront Medical Centre (Admin-managed)
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

    // Legacy hero image from the Homepage tab (Site images takes priority)
    heroSources.legacy = data.medicalCentreImage || data.heroImage || '';
    refreshHeroImage();

    // Upfront Medical Centre Badge
    const medBadgeEl = document.getElementById('heroMedicalBadge');
    const medTitleEl = document.getElementById('heroMedicalTitle');
    const medSubEl = document.getElementById('heroMedicalSubtitle');

    if (medTitleEl && data.medicalTitle) medTitleEl.textContent = data.medicalTitle;
    if (medSubEl && data.medicalSubtitle) medSubEl.textContent = data.medicalSubtitle;
    if (medBadgeEl && typeof data.showMedicalBadge !== 'undefined') {
      medBadgeEl.style.display = data.showMedicalBadge ? 'flex' : 'none';
    }

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
        ${f.image ? `<div class="managed-media facility-media" data-image-wrap><img alt="${escapeHTML(f.title || '')}" loading="lazy" src="${escapeHTML(formatDriveImageUrl(f.image))}" onload="this.parentNode.classList.remove('is-empty')" onerror="this.parentNode.classList.add('is-empty')"></div>` : ''}
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

  const cachedFaqsPublic = localStorage.getItem('kinetic_faqs');
  if (cachedFaqsPublic) {
    try {
      renderPublicFaqs(JSON.parse(cachedFaqsPublic));
    } catch (e) {}
  }

  if (window.db) {
    window.db.collection('settings').doc('faqs').onSnapshot(doc => {
      if (doc.exists && Array.isArray(doc.data().list)) {
        localStorage.setItem('kinetic_faqs', JSON.stringify(doc.data().list));
        renderPublicFaqs(doc.data().list);
      }
    }, err => console.log("FAQs live observer:", err.message));
  }

  /* --------------------------------------------------------------------------
     Dynamic Chamber Tour Gallery (Admin-managed)
     -------------------------------------------------------------------------- */
  function renderPublicGallery(list) {
    const container = document.getElementById('chamberGalleryGrid');
    if (!container || !Array.isArray(list)) return;
    list = list.filter(g => g && g.image);
    document.getElementById('gallery')?.classList.toggle('hidden', !list.length);

    galleryImages.length = 0; // Clear for lightbox sync

    container.innerHTML = list.map((g, idx) => {
      const rawSrc = g.image;
      const src = typeof formatDriveImageUrl === 'function' ? formatDriveImageUrl(rawSrc) : rawSrc;
      const caption = `${g.title || 'Chamber'} - ${g.subtitle || ''}`;
      galleryImages.push({ src, caption });

      return `
        <div class="gallery-item" data-index="${idx}" data-src="${escapeHTML(src)}">
          <img src="${escapeHTML(src)}" alt="${escapeHTML(g.title || 'Chamber')}" class="gallery-img" loading="lazy" onerror="this.closest('.gallery-item').remove()">
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

  /* --------------------------------------------------------------------------
     Admin-managed Site Images (hero, about photo, before/after results)
     -------------------------------------------------------------------------- */
  function renderResults(results) {
    const grid = document.getElementById('resultsGrid');
    const section = document.getElementById('chamber-treatments');
    if (!grid || !section) return;
    const list = (Array.isArray(results) ? results : []).filter(r => r && (r.before || r.after));
    section.classList.toggle('hidden', !list.length);
    grid.innerHTML = list.map(r => {
      const sides = [['before', 'Before'], ['after', 'After']]
        .filter(([key]) => r[key])
        .map(([key, label]) => `
          <div class="ft-ba-side"><img src="${escapeHTML(formatDriveImageUrl(r[key]))}" alt="${label} — ${escapeHTML(r.title || 'treatment')}" loading="lazy" onerror="this.parentElement.remove()"><span class="ft-ba-label ${key}">${label}</span></div>`)
        .join('');
      return `
        <div class="ft-card">
          <div class="ft-ba-pair${r.before && r.after ? '' : ' single'}">${sides}</div>
          <div class="ft-card-overlay">
            ${r.tag ? `<span class="ft-tag">${escapeHTML(r.tag)}</span>` : ''}
            ${r.title ? `<h3>${escapeHTML(r.title)}</h3>` : ''}
            ${r.desc ? `<p>${escapeHTML(r.desc)}</p>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function applySiteImages(images) {
    const data = images || {};
    heroSources.site = data.heroImage || '';
    refreshHeroImage();

    const aboutImg = document.getElementById('aboutImage');
    setManagedImage(aboutImg, data.aboutImage);
    document.getElementById('aboutContainer')?.classList.toggle('no-media', !data.aboutImage);

    renderResults(data.results);
  }

  refreshHeroImage();
  watchSiteImages(applySiteImages);

});
