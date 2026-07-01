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
          status: 'Pending'
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
          .then(() => {
            // Restore button
            if (submitBtnText) submitBtnText.textContent = 'Send Appointment Request';
            if (submitBtn) submitBtn.disabled = false;

            // Load values to success card
            modalSummary.innerHTML = `
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
            
            // Still display local popup warning
            alert("A network timeout occurred. If you do not receive a confirmation phone call within 2 hours, please call us directly at 01313-175779!");
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
     9. AI Chatbot ("KineticDental AI Helper") Logic with Markdown Links & Lists
     -------------------------------------------------------------------------- */
  const chatbotTrigger = document.getElementById('chatbotTrigger');
  const chatbotPanel = document.getElementById('chatbotPanel');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatBody = document.getElementById('chatBody');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  if (chatbotTrigger && chatbotPanel) {
    chatbotTrigger.addEventListener('click', () => {
      const isOpen = chatbotPanel.classList.toggle('open');
      
      const iconOpen = chatbotTrigger.querySelector('.trigger-icon-open');
      const iconClose = chatbotTrigger.querySelector('.trigger-icon-close');
      
      if (isOpen) {
        iconOpen?.classList.add('hidden');
        iconClose?.classList.remove('hidden');
        chatBody.scrollTop = chatBody.scrollHeight;
        chatInput.focus();
      } else {
        iconOpen?.classList.remove('hidden');
        iconClose?.classList.add('hidden');
      }
    });
  }

  if (chatCloseBtn && chatbotPanel && chatbotTrigger) {
    chatCloseBtn.addEventListener('click', () => {
      chatbotPanel.classList.remove('open');
      chatbotTrigger.querySelector('.trigger-icon-open')?.classList.remove('hidden');
      chatbotTrigger.querySelector('.trigger-icon-close')?.classList.add('hidden');
    });
  }

  const SYSTEM_PROMPT = `You are "KineticDental AI Helper", the friendly digital assistant at Kinetic Dental & Healthcare Center (Mirpur 12, Dhaka).

Clinic Context:
- Dentist/Founder: Dr. Nadia (email: drnadiakineticdental@gmail.com)
- Location: House no: 16, Road: 3, Sujatnagar, Mirpur 12, Dhaka, Bangladesh. (Walking distance from Mirpur 12 metro/bus station).
- Hotline Numbers: +880 1313-175779 or 01313175779 (Dialer link: tel:+8801313175779).
- Web links: Website [oidcard.com/Kineticdental](https://oidcard.com/Kineticdental), Google Map directions [Open Directions](https://maps.app.goo.gl/1kL5wwBY6asheCxeA?g_st=ipc), Facebook page [Facebook Page](https://www.facebook.com/share/1Dj9PJN149/?mibextid=wwXIfr), Facebook group [Facebook Group](https://www.facebook.com/share/g/1AFfpMzWcu/?mibextid=wwXIfr).
- Timing: Saturday-Thursday 10am-9pm, Friday 3pm-9pm. Hotline is open 24/7 for urgent emergencies.
- Key Services: Tooth Scaling & Polishing, Teeth Whitening (Bleaching), Emergency Toothache Solutions, Root Canal Therapy (RCT), Pediatric Dentistry, Crowns/Bridges/Implants, Braces/Aligners.

Response Guidelines:
1. Speak warmly and directly.
2. DO NOT repeat long welcome greetings like "Hello! Welcome to Kinetic Dental... How can I assist you today?" in subsequent messages. If the user says hello, give a brief, friendly 1-sentence welcome. If they ask a question, answer it directly without preamble.
3. Keep answers concise (under 2 short paragraphs). Use markdown bold (**text**) for key details.
4. When providing links, ALWAYS format them as markdown links, e.g., [Google Maps Directions](https://maps.app.goo.gl/1kL5wwBY6asheCxeA?g_st=ipc) or [Facebook Page](https://www.facebook.com/share/1Dj9PJN149/?mibextid=wwXIfr).
5. For lists, format them using standard markdown bullet points (e.g. "- Scaling" or "- Whitening").
6. Suggest booking via the "Appointment Booking Form" on the page or calling us at +880 1313-175779.
`;

  const chatHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userText = chatInput.value.trim();
      if (!userText) return;

      appendMessage('user', userText);
      chatInput.value = '';

      chatHistory.push({ role: 'user', content: userText });
      
      if (chatHistory.length > 11) {
        chatHistory.splice(1, 2);
      }

      const groqApiKey = window.APP_CONFIG?.groqApiKey;
      if (!groqApiKey) {
        appendMessage('ai', "The chat assistant is not configured yet. Please call us at **01313-175779** or email **drnadiakineticdental@gmail.com** and we'll be happy to help.");
        return;
      }

      const typingIndicator = showTypingIndicator();
      
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: chatHistory,
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();
        const assistantText = data.choices[0].message.content;

        typingIndicator.remove();

        appendMessage('ai', assistantText);
        chatHistory.push({ role: 'assistant', content: assistantText });

      } catch (err) {
        console.error('Chatbot API Error:', err);
        typingIndicator.remove();
        appendMessage('ai', "I apologize, but I am currently having trouble connecting to my servers. 🌐<br><br>Please feel free to call our reception directly at **01313-175779** or email us at **drnadiakineticdental@gmail.com**. You can also visit our clinic at **House 16, Road 3, Sujatnagar, Mirpur 12**! We are here to help.");
      }
    });
  }

  function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg msg-${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = formatMarkdownToHTML(text);
    
    msgDiv.appendChild(bubble);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'msg msg-ai';
    indicatorDiv.id = 'typingIndicator';
    
    indicatorDiv.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    
    chatBody.appendChild(indicatorDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return indicatorDiv;
  }

  // Improved markdown link, list, and bold tag parser
  function formatMarkdownToHTML(text) {
    let escaped = escapeHTML(text);
    
    // Convert markdown links: [link text](url) -> <a href="url" target="_blank" class="chat-link">link text ↗</a>
    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="chat-link">$1 ↗</a>');
    
    // Remove raw angle brackets around links inside markdown (like <http...>)
    escaped = escaped.replace(/&lt;(https?:\/\/.*?)&gt;/g, '<a href="$1" target="_blank" class="chat-link">$1 ↗</a>');

    // Convert double asterisks to strong tags
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format bullet list items line-by-line
    const lines = escaped.split('\n');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Matches lines starting with "- " or "* " or "• "
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ') || line.startsWith('<li>')) {
        let cleanText = line;
        if (line.startsWith('- ')) cleanText = line.substring(2);
        else if (line.startsWith('* ')) cleanText = line.substring(2);
        else if (line.startsWith('• ')) cleanText = line.substring(2);
        
        const li = `<li>${cleanText}</li>`;
        
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(li);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }
    if (inList) {
      result.push('</ul>');
    }
    
    escaped = result.join('<br>');
    
    // Clean trailing line-breaks around lists
    escaped = escaped.replace(/<\/ul><br>/g, '</ul>');
    escaped = escaped.replace(/<br><ul>/g, '<ul>');
    
    return escaped;
  }

  function escapeHTML(str) {
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
