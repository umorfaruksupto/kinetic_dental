# Kinetic Dental Care — Website

Static website for **Kinetic Dental & Healthcare Center** (also known as **Kinetic Dental Care**), serving patients in Mirpur 12, Dhaka.

**Primary domain:** [https://kineticdentalcare.com/](https://kineticdentalcare.com/)

## Local development

Open `index.html` in a browser or serve the folder with any static file server.

## Deployment & DNS

Point your domain to the hosting provider where these files are published:

| Record | Value |
|--------|-------|
| **A** (apex `@`) | Your host's IP address |
| **CNAME** (`www`) | Your host's hostname (if supported) |

### HTTPS

Enable a free TLS certificate (e.g. Let's Encrypt) on your host. All canonical URLs in this project use `https://kineticdentalcare.com/`.

### www vs non-www (recommended)

Choose **one** canonical hostname and redirect the other permanently (HTTP 301):

- **Preferred:** `https://kineticdentalcare.com/` (non-www) — matches `index.html` canonical tags and `sitemap.xml`.
- Redirect `https://www.kineticdentalcare.com/*` → `https://kineticdentalcare.com/$1`

**Nginx example:**

```nginx
server {
    listen 443 ssl;
    server_name www.kineticdentalcare.com;
    return 301 https://kineticdentalcare.com$request_uri;
}
```

**Apache example (`.htaccess`):**

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.kineticdentalcare\.com [NC]
RewriteRule ^(.*)$ https://kineticdentalcare.com/$1 [L,R=301]
```

**Cloudflare:** Page Rule or Redirect Rule from `www.kineticdentalcare.com/*` to `https://kineticdentalcare.com/$1`.

### Legacy URL redirect

If the site was previously served at `oidcard.com/Kineticdental`, add a 301 redirect on that host:

```
https://oidcard.com/Kineticdental → https://kineticdentalcare.com/
```

This preserves search rankings and ensures old bookmarks reach the new domain.

### Post-deploy checklist

1. Verify `https://kineticdentalcare.com/robots.txt` and `https://kineticdentalcare.com/sitemap.xml` are reachable.
2. Submit the sitemap in [Google Search Console](https://search.google.com/search-console) for `kineticdentalcare.com`.
3. Confirm Open Graph preview (Facebook Sharing Debugger) shows the correct title and image.
4. Update Google Business Profile and social links to `kineticdentalcare.com`.

## SEO files

| File | Purpose |
|------|---------|
| `index.html` | Canonical URL, Open Graph, Twitter cards, JSON-LD (`Dentist` / `LocalBusiness` / `MedicalBusiness`) |
| `robots.txt` | Crawl rules; blocks `admin.html` |
| `sitemap.xml` | Single-page sitemap for the homepage |

## Admin access

Authorized clinic emails can create an account at `admin.html` via **Sign Up**, then use **Sign In** on future visits. Enable **Email/Password** in Firebase Authentication and publish the clinic-admin Firestore rules shown in the dashboard's **Admin & security** section. Appointment data stays out of persistent browser storage.

## Website content and sync

Clinic details, offers, doctors, treatments, homepage copy, FAQs, campaigns, success stories, facilities, and gallery items are managed from the matching section in `admin.html` and stored in Cloud Firestore. Public pages keep their live Firestore listeners, so saved content updates across open pages without a manual refresh. The shared Firebase bootstrap enables Firestore's multi-tab IndexedDB cache where supported, allowing repeat visits to render the last synchronized content while the live listener reconnects. If browser persistence is unavailable, Firebase realtime sync and the existing local content cache continue to work.

### Images

The site ships no photos. Every image comes from a Google Drive link set in `admin.html`. In Drive, share the file as *Anyone with the link* and paste the link; it is converted to a direct image URL automatically.

- **Site images** tab (`settings/site_images`): homepage hero, About photo, founder photo, and homepage before/after results.
- Chamber gallery, offer poster, success stories, dental tips and campaigns keep their photo fields in their own tabs.

An empty field hides that photo (the hero and founder photo show a branded placeholder instead). `first.jpg` is kept only as the social-share (Open Graph) image, and `tooth-mark.svg` is the logo.

### Publish Firestore rules

The repository now includes [firestore.rules](firestore.rules) and [firebase.json](firebase.json). Install the Firebase CLI, log in to the `kinetic-dental` Firebase project, then run `firebase deploy --only firestore:rules` from this folder. This must be done once in the Firebase project before the restricted rules take effect.
