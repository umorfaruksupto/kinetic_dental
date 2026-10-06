const fs = require('fs');
const path = require('path');

// Load .env or .env.local if present (zero external dependencies)
function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          const key = line.slice(0, eqIdx).trim();
          const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read ' + fileName, e.message);
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

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
