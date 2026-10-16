/* Shared Firebase bootstrap for the public site and clinic dashboard. */
(function initializeKineticFirebase() {
  const config = window.firebaseConfig || {};

  if (typeof firebase === 'undefined' || !config.projectId) {
    console.warn('Firebase is unavailable. The site will use its saved local content.');
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(config);
  window.db = firebase.firestore();
  window.auth = firebase.auth ? firebase.auth() : null;
  window.firebaseSyncState = 'connecting';

  // Cache public content for quick repeat visits. Keep the appointment dashboard
  // on Firestore's in-memory cache because its records contain patient details.
  if (document.getElementById('authSection')) {
    window.firebaseSyncState = 'live';
    return;
  }

  window.db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      window.firebaseSyncState = 'cached';
      window.dispatchEvent(new CustomEvent('firebase-cache-ready'));
    })
    .catch((error) => {
      // Another tab may already own persistence, or the browser may not support it.
      if (error.code !== 'failed-precondition' && error.code !== 'unimplemented') {
        console.info('Firestore cache is unavailable; live sync remains enabled.', error.message);
      }
      window.firebaseSyncState = 'live';
    });
})();
