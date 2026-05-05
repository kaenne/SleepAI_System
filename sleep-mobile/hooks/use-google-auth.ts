import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

// Required so the auth redirect completes when returning to the app
WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth client IDs — set these in your .env file.
 * Get them from https://console.cloud.google.com/
 *
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  — OAuth Android client
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      — OAuth iOS client
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      — OAuth Web/Expo client (required for all platforms)
 */
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const GOOGLE_CONFIGURED = !!(ANDROID_CLIENT_ID || IOS_CLIENT_ID || WEB_CLIENT_ID);

export function useGoogleAuth(onSuccess: (accessToken: string) => Promise<void>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || undefined,
    webClientId: WEB_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) {
        setError(null);
        setIsPending(true);
        onSuccess(token).catch((e) => {
          setError(e?.message ?? 'Google sign-in failed');
        }).finally(() => setIsPending(false));
      }
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in error');
    }
  }, [response]);

  return {
    /** Launch the Google OAuth browser flow */
    signIn: () => {
      setError(null);
      promptAsync();
    },
    /** True while the OAuth browser is open or we're waiting for the backend */
    isPending,
    /** Error message, if any */
    error,
    /** False until the request object is ready (usually instantaneous) */
    disabled: !request || !GOOGLE_CONFIGURED,
    /** Whether Google client IDs are configured in .env */
    isConfigured: GOOGLE_CONFIGURED,
  };
}
