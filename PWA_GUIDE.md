# Progressive Web App (PWA) Guide

This guide explains the PWA features implemented in the Time Tracker application and how to use them.

## What is a PWA?

A Progressive Web App (PWA) is a web application that uses modern web capabilities to provide an app-like experience to users. Key features include:

- **Installable**: Users can install the app on their device
- **Offline Support**: Works without internet connection
- **Fast Loading**: Cached assets load instantly
- **Push Notifications**: Can receive notifications
- **App-like Experience**: Runs in standalone mode without browser UI

## Features Implemented

### 1. Service Worker

**Location**: `client/public/service-worker.js`

The service worker provides:
- **Offline Functionality**: Caches assets and API responses
- **Cache Management**: Automatically updates caches
- **Network Strategies**:
  - Cache-first for static assets
  - Network-first for API calls with cache fallback
- **Background Sync**: Syncs data when connection is restored
- **Push Notifications**: Handles notification display

### 2. Web App Manifest

**Location**: `client/public/manifest.json`

Defines app metadata:
- App name and short name
- Icons for different sizes
- Theme colors
- Display mode (standalone)
- App shortcuts
- Categories

### 3. Install Prompt

**Component**: `client/src/components/InstallPrompt.tsx`

- Appears for users who haven't installed the app
- Shows banner with install button
- Can be dismissed (won't show again for 7 days)
- Automatically hides once app is installed

### 4. Offline Indicator

**Component**: `client/src/components/OfflineIndicator.tsx`

- Shows red banner when internet connection is lost
- Shows green banner when connection is restored
- Automatically detects online/offline status
- Can be dismissed

### 5. Service Worker Registration

**Utility**: `client/src/utils/serviceWorkerRegistration.ts`

Provides functions for:
- Registering/unregistering service worker
- Handling updates
- Requesting notification permissions
- Showing notifications
- Detecting if app is installed
- Managing install prompts

## Setup Instructions

### 1. Generate App Icons

You need to create icons in multiple sizes. See `client/public/icons/README.md` for detailed instructions.

**Quick Method using PWA Asset Generator**:

```bash
cd client
npx @pwa/asset-generator ./assets/icon.png ./public/icons --icon-only --padding "10%" --background "#ffffff"
```

**Required sizes**:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### 2. Test Locally

```bash
cd client
npm run web
```

Open http://localhost:19006 in your browser (Chrome recommended for best PWA support).

### 3. Test PWA Features

#### Install Prompt
1. Open Chrome DevTools (F12)
2. Go to Application tab → Manifest
3. Verify manifest loads correctly
4. Click "Add to Home Screen" to test installation

#### Service Worker
1. Open Chrome DevTools (F12)
2. Go to Application tab → Service Workers
3. Verify service worker is registered and activated
4. Check "Offline" checkbox to test offline mode
5. Try navigating the app while offline

#### Caching
1. Open Chrome DevTools (F12)
2. Go to Application tab → Cache Storage
3. Verify assets are being cached
4. Check Network tab to see cache hits (from ServiceWorker)

### 4. Test Offline Functionality

1. With app open, open DevTools
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Try using the app
5. Should see offline indicator banner
6. Previously loaded content should still work

## Building for Production

### 1. Export Web Build

```bash
cd client
npx expo export --platform web
```

This creates an optimized build in the `dist` folder.

### 2. Deploy to Web Host

You can deploy to various services:

#### Vercel
```bash
npm i -g vercel
vercel
```

#### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Firebase Hosting
```bash
npm i -g firebase-tools
firebase init hosting
firebase deploy
```

### 3. Configure Headers (Important!)

Your hosting service needs to serve the service worker with proper headers:

**For Vercel** - create `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

**For Netlify** - create `netlify.toml`:
```toml
[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "public, max-age=0, must-revalidate"
```

### 4. HTTPS Required

PWAs require HTTPS in production. Most hosting services provide this automatically.

## Testing PWA in Production

### Chrome (Desktop)
1. Visit your deployed URL
2. Look for install icon in address bar
3. Click to install
4. App opens in standalone window

### Chrome (Android)
1. Visit your deployed URL
2. Tap menu → "Add to Home screen"
3. App installs like native app
4. Opens without browser UI

### Safari (iOS)
1. Visit your deployed URL
2. Tap Share button
3. Select "Add to Home Screen"
4. App installs to home screen

## Lighthouse Audit

Test your PWA score:

1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Aim for score of 90+

Common issues that reduce score:
- Missing icons
- No HTTPS
- Service worker not registered
- Manifest missing required fields

## Customization

### Update App Name and Colors

Edit `client/public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "YourApp",
  "theme_color": "#your-color",
  "background_color": "#your-color"
}
```

Also update in `client/app.json`:
```json
{
  "expo": {
    "web": {
      "themeColor": "#your-color",
      "backgroundColor": "#your-color"
    }
  }
}
```

### Customize Caching Strategy

Edit `client/public/service-worker.js`:

- Modify `PRECACHE_ASSETS` to add files to cache immediately
- Change caching strategies in fetch event handler
- Add custom cache names

### Customize Install Prompt

Edit `client/src/components/InstallPrompt.tsx`:

- Change banner text
- Modify styling
- Change dismissal duration
- Add custom install button elsewhere in app

### Add Push Notifications

1. Set up notification backend (Firebase Cloud Messaging, etc.)
2. Request permission:
```typescript
import { requestNotificationPermission } from '../utils/serviceWorkerRegistration';

const permission = await requestNotificationPermission();
```

3. Show notifications:
```typescript
import { showNotification } from '../utils/serviceWorkerRegistration';

await showNotification('Event Reminder', {
  body: 'Your meeting starts in 10 minutes',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  vibrate: [200, 100, 200],
  data: { eventId: '123' },
  actions: [
    { action: 'view', title: 'View' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
});
```

## Troubleshooting

### Service Worker Not Registering

**Issue**: Service worker fails to register

**Solutions**:
- Check browser console for errors
- Verify file is at `/service-worker.js` (root of public folder)
- Ensure HTTPS in production (or localhost for development)
- Check file syntax for JavaScript errors

### Install Prompt Not Showing

**Issue**: Install banner doesn't appear

**Solutions**:
- PWA criteria must be met (manifest, service worker, HTTPS)
- User must visit site at least twice over 5 minutes
- User hasn't already dismissed or installed
- Check browser console for PWA audit errors
- Only works on Chrome/Edge (not Firefox/Safari)

### Caching Issues

**Issue**: Old content showing after updates

**Solutions**:
- Increment cache version in service worker: `CACHE_NAME = 'time-tracker-v2'`
- Clear application cache: DevTools → Application → Clear storage
- Update service worker: close all tabs and reopen
- Use "Update on reload" in DevTools while developing

### Offline Mode Not Working

**Issue**: App doesn't work offline

**Solutions**:
- Verify service worker is active: DevTools → Application → Service Workers
- Check that files are being cached: DevTools → Application → Cache Storage
- Ensure API responses are being cached
- Check network tab shows "(from ServiceWorker)"

### Icons Not Displaying

**Issue**: Default icons showing instead of custom ones

**Solutions**:
- Verify icons exist in `client/public/icons/` directory
- Check manifest.json paths are correct
- Icons must be PNG format
- Try hard refresh (Ctrl+Shift+R)
- Clear application cache

## Browser Support

### Excellent Support
- Chrome (all platforms)
- Edge (Chromium-based)
- Samsung Internet

### Good Support
- Safari (iOS/macOS) - limited service worker features
- Firefox - most features work

### Limited Support
- Safari (older versions)
- Internet Explorer - no support

## Best Practices

1. **Always test offline functionality** before deploying
2. **Keep service worker cache size reasonable** (< 50MB)
3. **Update cache version** when deploying new versions
4. **Provide fallback UI** for offline state
5. **Test on real devices** not just desktop
6. **Monitor service worker errors** in production
7. **Implement update notification** for new versions
8. **Use HTTPS** in production (required for PWA)
9. **Optimize icons** for performance
10. **Test installation flow** on all target platforms

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox (Advanced SW)](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Course](https://web.dev/learn/pwa/)

## Next Steps

1. **Generate icons** in all required sizes
2. **Test installation** on different devices and browsers
3. **Test offline mode** thoroughly
4. **Run Lighthouse audit** and fix any issues
5. **Deploy to production** with HTTPS
6. **Add push notifications** (optional)
7. **Implement background sync** for offline actions (optional)
8. **Add app shortcuts** for common tasks (optional)

---

Your Time Tracker app is now a fully functional Progressive Web App! Users can install it on their devices and use it offline.
