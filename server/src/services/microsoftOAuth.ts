// Temporary stub to fix TypeScript compilation
// Actual Microsoft OAuth temporarily disabled

export const getMicrosoftAuthUrl = (redirectUri: string): string => {
  console.log('[Microsoft OAuth] Auth URL disabled');
  return 'https://disabled';
};

export const getMicrosoftTokens = async (code: string, redirectUri?: string): Promise<any> => {
  console.log('[Microsoft OAuth] Get tokens disabled');
  return { accessToken: 'disabled', refreshToken: 'disabled' };
};

export const getMicrosoftUserProfile = async (accessToken: string): Promise<any> => {
  console.log('[Microsoft OAuth] Get profile disabled');
  return { id: 'disabled', mail: 'disabled@example.com' };
};
