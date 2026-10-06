const fs = require('fs');
const path = require('path');

// Extract Firebase credentials from environment variables (e.g. Vercel)
// If not present in env, uses existing project defaults for seamless local development
const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyAi_iJkiNZunOEcXxX2kuZg70q-xYqioBQ';
const authDomain = process.env.FIREBASE_AUTH_DOMAIN || 'kinetic-dental.firebaseapp.com';
const projectId = process.env.FIREBASE_PROJECT_ID || 'kinetic-dental';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'kinetic-dental.firebasestorage.app';
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || '523401059267';
const appId = process.env.FIREBASE_APP_ID || '1:523401059267:web:186d0b1b23405fea333b76';
const measurementId = process.env.FIREBASE_MEASUREMENT_ID || 'G-Z1C46B6GSF';

const configContent = `// Auto-generated configuration file
window.firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain}",
  projectId: "${projectId}",
  storageBucket: "${storageBucket}",
  messagingSenderId: "${messagingSenderId}",
  appId: "${appId}",
  measurementId: "${measurementId}"
};
`;

fs.writeFileSync(path.join(__dirname, 'firebase-config.js'), configContent, 'utf8');
console.log('firebase-config.js generated successfully.');
