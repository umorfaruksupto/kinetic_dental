/**
 * Hide cards/sections when image is missing or fails to load.
 */
function hideCardsWithoutImages(cardSelector) {
  document.querySelectorAll(cardSelector).forEach((card) => {
    const imgs = [...card.querySelectorAll('img')];
    const removeCard = () => card.remove();

    if (!imgs.length) {
      removeCard();
      return;
    }

    let pending = imgs.length;
    let shouldRemove = false;

    const finalize = () => {
      pending -= 1;
      if (pending <= 0 && shouldRemove) removeCard();
    };

    imgs.forEach((img) => {
      const src = img.getAttribute('src')?.trim();
      if (!src) {
        shouldRemove = true;
        finalize();
        return;
      }

      const checkImage = () => {
        if (!img.naturalWidth) shouldRemove = true;
        finalize();
      };

      img.addEventListener('error', () => {
        shouldRemove = true;
        finalize();
      }, { once: true });

      if (img.complete) {
        checkImage();
      } else {
        img.addEventListener('load', checkImage, { once: true });
      }
    });
  });
}

/**
 * Scroll-reveal animations via Intersection Observer.
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.scroll-reveal');
  if (!revealElements.length) return;

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    // threshold: 0 so tall containers still reveal — a percentage-based threshold
    // can never be satisfied once content is taller than the viewport.
    threshold: 0,
    rootMargin: '0px 0px -50px 0px',
  });

  revealElements.forEach((el) => revealObserver.observe(el));
}

/**
 * FAQ accordion (single open at a time).
 */
function initFaqAccordion() {
  document.querySelectorAll('.faq-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const faqCard = trigger.closest('.faq-card');
      const faqContent = faqCard.querySelector('.faq-content');
      const isActive = faqCard.classList.contains('active');

      document.querySelectorAll('.faq-card.active').forEach((openCard) => {
        openCard.classList.remove('active');
        openCard.querySelector('.faq-content').style.maxHeight = '0px';
      });

      if (!isActive) {
        faqCard.classList.add('active');
        faqContent.style.maxHeight = faqContent.scrollHeight + 'px';
      }
    });
  });
}

/**
 * Global Clinic Settings (Hotlines, WhatsApp, Live Ticker, Hours)
 * Dynamically binds admin settings to all pages across the website.
 */
function applyGlobalClinicSettings(settings) {
  if (!settings) return;

  // 1. Hotlines
  if (settings.hotline1) {
    const cleanH1 = settings.hotline1.replace(/[^0-9+]/g, '');
    const tel1 = cleanH1.startsWith('+') ? cleanH1 : (cleanH1.startsWith('88') ? `+${cleanH1}` : `+88${cleanH1}`);
    document.querySelectorAll('a[href*="01313175779"], a[href*="01313-175779"], #topHotline1, #apptHotline1, #contactHotline1, #footerHotline1').forEach(node => {
      node.setAttribute('href', `tel:${tel1}`);
      const span = node.querySelector('.hotline1-text');
      if (span) {
        span.textContent = settings.hotline1;
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
    document.querySelectorAll('a[href*="01308388577"], a[href*="01308-388577"], #topHotline2, #apptHotline2, #contactHotline2, #footerHotline2').forEach(node => {
      node.setAttribute('href', `tel:${tel2}`);
      const span = node.querySelector('.hotline2-text');
      if (span) {
        span.textContent = settings.hotline2;
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

function initGlobalClinicSettings() {
  const cached = localStorage.getItem('kinetic_clinic_settings');
  if (cached) {
    try {
      applyGlobalClinicSettings(JSON.parse(cached));
    } catch (e) {
      console.error("Clinic settings parse error", e);
    }
  }
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalClinicSettings);
} else {
  initGlobalClinicSettings();
}

