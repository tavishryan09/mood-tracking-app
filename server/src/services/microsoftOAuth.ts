import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    // Use 'common' for multitenant + personal accounts, or specific tenant ID for single tenant
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);
const cryptoProvider = new CryptoProvider();

export interface MicrosoftUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photo?: string;
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export const getMicrosoftAuthUrl = async (state?: string): Promise<string> => {
  const authCodeUrlParameters = {
    scopes: [
      'openid',
      'profile',
      'email',
      'User.Read',
      'Calendars.ReadWrite',
      'offline_access',
    ],
    redirectUri: `${process.env.API_URL}/api/auth/microsoft/callback`,
    state: state || (await cryptoProvider.generatePkceCodes()).verifier,
  };

  return await msalClient.getAuthCodeUrl(authCodeUrlParameters);
};

/**
 * Exchange authorization code for tokens
 */
export const getMicrosoftTokens = async (code: string) => {
  const tokenRequest = {
    code,
    scopes: [
      'openid',
      'profile',
      'email',
      'User.Read',
      'Calendars.ReadWrite',
      'offline_access',
    ],
    redirectUri: `${process.env.API_URL}/api/auth/microsoft/callback`,
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);
  return response;
};

/**
 * Get user profile from Microsoft Graph API
 */
export const getMicrosoftUserProfile = async (
  accessToken: string
): Promise<MicrosoftUserProfile> => {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  const user = await client.api('/me').get();

  return {
    id: user.id,
    email: user.mail || user.userPrincipalName,
    firstName: user.givenName || '',
    lastName: user.surname || '',
    displayName: user.displayName,
    photo: undefined, // We can fetch this separately if needed
  };
};

/**
 * Refresh Microsoft access token
 */
export const refreshMicrosoftToken = async (refreshToken: string) => {
  const refreshTokenRequest = {
    refreshToken,
    scopes: [
      'openid',
      'profile',
      'email',
      'User.Read',
      'Calendars.ReadWrite',
      'offline_access',
    ],
  };

  const response = await msalClient.acquireTokenByRefreshToken(
    refreshTokenRequest
  );
  return response;
};
