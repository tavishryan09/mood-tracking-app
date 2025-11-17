// Note: @testing-library/jest-native is deprecated
// Matchers are now built into @testing-library/react-native v12.4+
// No need to import extend-expect

// Set test environment
process.env.NODE_ENV = 'test';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock Expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: () => true,
  isLoading: jest.fn(() => false),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: jest.fn(),
  setStatusBarStyle: jest.fn(),
}));

// Mock Expo constants
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
  },
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }: any) => children,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock useWindowDimensions
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
