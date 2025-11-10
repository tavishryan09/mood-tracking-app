# Outlook Calendar Sync Setup Guide

This guide will walk you through setting up Microsoft Outlook Calendar integration for MoodTracker.

## Prerequisites

- An Azure account (free or paid)
- Admin access to your MoodTracker application

## Step 1: Create Microsoft App Registration

1. **Go to Azure Portal**
   - Navigate to https://portal.azure.com
   - Sign in with your Microsoft account

2. **Navigate to App Registrations**
   - Search for "App registrations" in the top search bar
   - Click on "App registrations"

3. **Create New Registration**
   - Click "+ New registration"
   - Fill in the details:
     - **Name**: `MoodTracker Calendar Sync`
     - **Supported account types**: Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"
     - **Redirect URI**:
       - Platform: Web
       - URI: `http://localhost:3000/api/outlook/callback` (for local development)
       - For production, add: `https://your-domain.com/api/outlook/callback`
   - Click "Register"

4. **Note Your Application IDs**
   - On the Overview page, copy the following values:
     - **Application (client) ID** → This is your `MICROSOFT_CLIENT_ID`
     - **Directory (tenant) ID** → This is your `MICROSOFT_TENANT_ID`

## Step 2: Create Client Secret

1. **Navigate to Certificates & secrets**
   - In the left menu, click "Certificates & secrets"

2. **Create New Client Secret**
   - Under "Client secrets", click "+ New client secret"
   - Description: `MoodTracker Calendar Sync Secret`
   - Expires: Choose your preferred expiration (6 months, 12 months, or 24 months recommended)
   - Click "Add"

3. **Copy the Secret Value**
   - **IMPORTANT**: Copy the "Value" immediately (not the "Secret ID")
   - This is your `MICROSOFT_CLIENT_SECRET`
   - You won't be able to see this value again!

## Step 3: Configure API Permissions

1. **Navigate to API permissions**
   - In the left menu, click "API permissions"

2. **Add Microsoft Graph Permissions**
   - Click "+ Add a permission"
   - Select "Microsoft Graph"
   - Select "Delegated permissions"
   - Add the following permissions:
     - `Calendars.ReadWrite` - Read and write user calendars
     - `offline_access` - Maintain access to data you have given it access to
   - Click "Add permissions"

3. **Grant Admin Consent** (Optional but recommended)
   - If you're an admin, click "Grant admin consent for [Your Organization]"
   - This step is optional but reduces user friction

## Step 4: Configure Environment Variables

Add the following environment variables to your `.env` file in the server directory:

```env
# Microsoft Azure AD / Outlook Calendar Integration
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
MICROSOFT_TENANT_ID=common

# API and Client URLs (adjust for production)
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:8081
```

**Notes:**
- For `MICROSOFT_TENANT_ID`, use `common` to support both personal and organizational Microsoft accounts
- For production, update `API_URL` and `CLIENT_URL` to your actual domain URLs

## Step 5: Add Production Redirect URIs (For Production Deployment)

1. **Go back to App Registration**
   - Navigate to your app registration in Azure Portal

2. **Add Production Redirect URI**
   - Go to "Authentication" in the left menu
   - Under "Web" platform, click "+ Add URI"
   - Add your production callback URL: `https://your-domain.com/api/outlook/callback`
   - Make sure "Access tokens" and "ID tokens" are NOT checked (we only need authorization codes)
   - Click "Save"

## Step 6: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Log into MoodTracker**
   - Open the app in your browser
   - Sign in with your account

3. **Connect Outlook Calendar**
   - Go to Profile/Settings
   - Look for "Outlook Calendar Integration"
   - Click "Connect to Outlook"
   - You'll be redirected to Microsoft login
   - Grant the requested permissions
   - You'll be redirected back to the app

4. **Create a test task**
   - Go to Planning screen
   - Create a new planning task
   - The task should automatically sync to your Outlook calendar

5. **Check your Outlook Calendar**
   - Open Outlook Calendar (web or app)
   - You should see the task with `[MoodTracker]` prefix

## How It Works

### For Users:
1. Each user connects their own Outlook account
2. Their planning tasks and deadlines sync only to their personal Outlook calendar
3. Other users cannot see or access their Outlook calendar
4. Users can disconnect at any time from the Profile screen

### Synced Items:
- **Planning Tasks**: Synced as calendar events at specific times based on block schedule
- **Deadline Tasks**: Synced as all-day events on the deadline date
- **Internal Deadlines**: Synced as all-day events
- **Milestones**: Synced as all-day events

### Event Details:
- All events are prefixed with `[MoodTracker]` for easy identification
- Planning tasks include project name and time slots
- Deadlines include client name, project name, and deadline type
- Updating a task in MoodTracker updates the Outlook event
- Deleting a task in MoodTracker deletes the Outlook event

## Troubleshooting

### "Failed to connect to Outlook"
- Verify your `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are correct
- Check that the redirect URI in Azure matches your environment
- Ensure API permissions are properly configured

### "Events not syncing"
- Check browser console for errors
- Verify user has Outlook calendar enabled in database
- Check server logs for sync errors
- Ensure `outlookCalendarEnabled` is true for the user

### "Token expired" errors
- Refresh tokens should automatically renew
- If issues persist, disconnect and reconnect Outlook

### Testing with Personal Microsoft Account
- Make sure `MICROSOFT_TENANT_ID` is set to `common`
- Personal accounts work with Outlook.com calendars

## Security Considerations

1. **Client Secrets**: Keep your client secret secure. Rotate it periodically.
2. **Refresh Tokens**: Stored encrypted in database. Never expose to client.
3. **Scopes**: Only request Calendar.ReadWrite scope (minimal permissions).
4. **User Consent**: Users must explicitly grant permission.
5. **Data Privacy**: Calendar events only contain task data, no sensitive information.

## Production Deployment Checklist

- [ ] Update `API_URL` and `CLIENT_URL` environment variables
- [ ] Add production redirect URI to Azure app registration
- [ ] Use HTTPS for all production URLs
- [ ] Set appropriate client secret expiration
- [ ] Test OAuth flow end-to-end in production
- [ ] Monitor token refresh success rates
- [ ] Set up alerting for API failures

## API Endpoints

- `GET /api/outlook/status` - Check if user has Outlook connected
- `POST /api/outlook/connect` - Initiate Outlook OAuth flow
- `GET /api/outlook/callback` - OAuth callback handler (internal)
- `POST /api/outlook/disconnect` - Disconnect Outlook calendar

## Support

For issues or questions:
1. Check Azure Portal logs for authentication errors
2. Check MoodTracker server logs for sync errors
3. Verify environment variables are set correctly
4. Review Microsoft Graph API documentation: https://docs.microsoft.com/en-us/graph/
