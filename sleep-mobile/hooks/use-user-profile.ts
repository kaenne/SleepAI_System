import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { StorageKeys } from '@/constants/storage';

const PROFILE_KEY = StorageKeys.USER_PROFILE;

export type UserProfile = {
  age: number | null;       // 1-100
  gender: number | null;    // 0 = female, 1 = male
  bmiCategory: number | null; // 0 = normal, 1 = overweight, 2 = obese
};

const DEFAULT_PROFILE: UserProfile = { age: null, gender: null, bmiCategory: null };

export function useUserProfile() {
  const [profile, setProfile] = React.useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch { /* ignore */ }
      }
      setLoading(false);
    });
  }, []);

  const saveProfile = React.useCallback(async (data: Partial<UserProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  }, [profile]);

  return { profile, saveProfile, loading };
}

export async function getStoredProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
}
