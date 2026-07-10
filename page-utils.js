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
    threshold: 0.15,
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
