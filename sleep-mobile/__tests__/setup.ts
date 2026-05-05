// Replace ALL lazy getters installed by expo/src/winter/installGlobal.ts
// These getters fire during test execution and fail with "outside scope of test code"
// because require() cannot be called from a getter context in Jest's module sandbox.
// Node.js already provides native implementations for most of these.
const EXPO_WINTER_GLOBALS = [
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  '__ExpoImportMetaRegistry',
  'structuredClone',
];

for (const name of EXPO_WINTER_GLOBALS) {
  const desc = Object.getOwnPropertyDescriptor(global, name);
  if (desc?.get) {
    // Use Node.js's native value if available, otherwise provide a stub
    const nativeValue = (globalThis as Record<string, unknown>)[name] ?? null;
    Object.defineProperty(global, name, {
      value: nativeValue,
      configurable: true,
      writable: true,
      enumerable: false,
    });
  }
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
}));

// Mock the services/api module to prevent native module chain loading
jest.mock('@/services/api', () => ({
  api: {
    getBaseUrl: jest.fn(() => null),
    sendChatMessage: jest.fn(),
    getChatHistory: jest.fn(),
    getUserSettings: jest.fn(),
    updateUserSettings: jest.fn(),
    exportUserData: jest.fn(),
    deleteUserData: jest.fn(),
  },
}));

// Mock services/auth to prevent expo-secure-store native chain
jest.mock('@/services/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn(),
  },
  getAccessToken: jest.fn(() => Promise.resolve(null)),
}));
