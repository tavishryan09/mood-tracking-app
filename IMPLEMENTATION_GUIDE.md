# Implementation Guide - React Best Practices Improvements

This guide documents the improvements made to align the codebase with React best practices.

## ✅ Completed Implementations

### 1. Error Boundary Component ✓

**File:** `/client/src/components/ErrorBoundary.tsx`

**Purpose:** Catch and handle runtime errors gracefully, preventing app crashes.

**Features:**
- Catches JavaScript errors anywhere in the component tree
- Logs errors to console (ready for integration with Sentry/LogRocket)
- Displays user-friendly error message
- Provides "Try Again" functionality
- Shows detailed error stack in development mode

**Usage:**
```tsx
import ErrorBoundary from './src/components/ErrorBoundary';

// Wrap entire app or specific sections
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to monitoring service
    Sentry.captureException(error);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

**Implementation Status:** ✅ Complete
- Root error boundary added to `App.tsx`
- Ready for feature-level error boundaries

---

### 2. Logger Utility ✓

**File:** `/client/src/utils/logger.ts`

**Purpose:** Centralized logging with development/production awareness.

**Features:**
- Different log levels: `debug`, `info`, `warn`, `error`
- Development-only logging for debug/info/warn
- Always logs errors (even in production)
- In-memory log buffer (last 100 entries)
- Ready for integration with monitoring services

**Usage:**
```tsx
import { logger } from './utils/logger';

// Replace console.log calls with:
logger.log('User logged in', { userId: user.id }, 'AuthContext');
logger.error('API call failed', error, 'ProjectsScreen');
logger.warn('Deprecated API usage', null, 'OldComponent');
logger.debug('State updated', newState, 'Dashboard');
```

**Migration Required:**
- Search for `console.log` throughout codebase
- Replace with appropriate logger method
- Estimated: 169 occurrences across 37 files

---

### 3. TypeScript Navigation Types ✓

**File:** `/client/src/types/navigation.ts`

**Purpose:** Strong typing for React Navigation, eliminating `any` types.

**Features:**
- Complete type definitions for all navigation stacks
- Typed screen props for all screens
- Composite types for nested navigators
- Global type declarations for `useNavigation` hook

**Usage:**
```tsx
import { DashboardScreenProps } from '../../types/navigation';

// Before:
const DashboardScreen = ({ navigation }: any) => { ... }

// After:
const DashboardScreen = ({ navigation, route }: DashboardScreenProps) => {
  // navigation and route are now fully typed!
  navigation.navigate('Projects'); // TypeScript autocomplete works!
}
```

**Migration Required:**
- Update all screen components to use typed props
- Estimated: 24 screen files

---

### 4. API Response Types ✓

**File:** `/client/src/types/api.ts`

**Purpose:** Strong typing for all API requests and responses.

**Features:**
- Complete type definitions for all entities (User, Project, Client, Event, etc.)
- Request/Response interfaces
- Query parameter types
- Generic API response wrappers

**Usage:**
```tsx
import { Project, CreateProjectRequest } from '../../types/api';

// Typed API calls
const { data: projects } = useQuery<Project[]>({
  queryKey: ['projects'],
  queryFn: async () => {
    const response = await projectsAPI.getAll();
    return response.data;
  },
});

// Typed mutations
const createProject = async (data: CreateProjectRequest) => {
  await projectsAPI.create(data);
};
```

**Migration Required:**
- Add type parameters to all `useQuery` and `useMutation` calls
- Type API service functions
- Estimated: 50+ API calls

---

### 5. Input Sanitization Utility ✓

**File:** `/client/src/utils/sanitize.ts`

**Purpose:** XSS protection and input validation.

**Features:**
- HTML tag removal
- Dangerous character sanitization
- Email, phone, URL, number, date sanitizers
- Object sanitization (recursive)
- Form validation with error messages
- Common validation patterns (email, password, etc.)

**Usage:**
```tsx
import { sanitizeInput, validateAndSanitize, ValidationPatterns } from './utils/sanitize';

// Simple sanitization
const cleanName = sanitizeInput(userInput);

// Form validation
const { isValid, errors, sanitizedData } = validateAndSanitize(formData, {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, pattern: ValidationPatterns.email },
  password: { required: true, pattern: ValidationPatterns.password },
});

if (!isValid) {
  setFormErrors(errors);
  return;
}

// Use sanitizedData for API call
await api.create(sanitizedData);
```

**Migration Required:**
- Add sanitization to all form submissions
- Update CreateProject, EditProject, CreateClient, etc.
- Estimated: 15+ forms

---

### 6. Testing Infrastructure ✓

**Files:**
- `/client/jest.config.js` - Jest configuration
- `/client/jest-setup.ts` - Test setup and mocks
- `/client/src/contexts/__tests__/AuthContext.test.tsx` - Example tests

**Purpose:** Unit and integration testing setup.

**Features:**
- Jest with React Native Testing Library
- Mock setup for AsyncStorage, React Navigation, Expo modules
- Coverage thresholds (50% minimum)
- Example test suite for AuthContext

**Running Tests:**
```bash
cd client

# Install test dependencies first (one time)
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

**Next Steps:**
- Write tests for critical components
- Aim for 70% coverage
- Add E2E tests with Detox

---

## 📋 Installation Steps

### 1. Install Test Dependencies

```bash
cd client
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest-expo \
  @types/jest
```

### 2. Verify TypeScript Compilation

```bash
cd client
npx tsc --noEmit
```

This will check for any type errors with the new type definitions.

---

## 🚀 Next Implementation Steps

### High Priority (Week 1-2)

#### 1. Replace console.log with logger

```bash
# Find all console.log usage
grep -r "console.log" client/src

# Replace manually or with sed
# Review each instance and choose appropriate log level
```

#### 2. Update Screen Components with Typed Props

Start with frequently used screens:

```tsx
// DashboardScreen.tsx
import { DashboardScreenProps } from '../../types/navigation';

const DashboardScreen = ({ navigation, route }: DashboardScreenProps) => {
  // ...
};
```

#### 3. Add Sanitization to Forms

```tsx
// Example: CreateProjectScreen
import { sanitizeInput, validateAndSanitize } from '../../utils/sanitize';

const handleSubmit = async () => {
  const { isValid, errors, sanitizedData } = validateAndSanitize(formData, {
    name: { required: true, minLength: 1, maxLength: 200 },
    description: { maxLength: 1000 },
    projectValue: { custom: (val) => val === null || val > 0 },
  });

  if (!isValid) {
    setFormErrors(errors);
    return;
  }

  await projectsAPI.create(sanitizedData);
};
```

#### 4. Write Critical Tests

Priority test files to create:
- `src/hooks/__tests__/useAppColors.test.ts`
- `src/screens/projects/__tests__/ProjectsScreen.test.tsx`
- `src/services/__tests__/api.test.ts`
- `src/utils/__tests__/logger.test.ts`

### Medium Priority (Week 3-4)

#### 5. Add Feature-Level Error Boundaries

```tsx
// In AppNavigator or screen-level
<ErrorBoundary
  fallback={(error, reset) => (
    <View style={styles.error}>
      <Text>Failed to load {featureName}</Text>
      <Button onPress={reset}>Retry</Button>
    </View>
  )}
>
  <FeatureScreen />
</ErrorBoundary>
```

#### 6. Integrate Error Monitoring

Add Sentry or similar service:

```bash
npm install @sentry/react-native
```

```tsx
// App.tsx or ErrorBoundary.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: __DEV__ ? 'development' : 'production',
});

// In ErrorBoundary onError:
onError={(error, errorInfo) => {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}}
```

#### 7. Type API Service

```tsx
// src/services/api.ts
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types/api';

export const projectsAPI = {
  getAll: (): Promise<{ data: Project[] }> => api.get('/projects'),
  getById: (id: string): Promise<{ data: Project }> => api.get(`/projects/${id}`),
  create: (data: CreateProjectRequest): Promise<{ data: Project }> => api.post('/projects', data),
  update: (id: string, data: UpdateProjectRequest): Promise<{ data: Project }> =>
    api.put(`/projects/${id}`, data),
  // ...
};
```

---

## 📝 Testing Guide

### Writing a Unit Test

```tsx
// Example: Testing a custom hook
import { renderHook } from '@testing-library/react-native';
import { useAppColors } from '../useAppColors';
import { ThemeProvider } from '../../contexts/ThemeContext';

describe('useAppColors', () => {
  it('should return current colors', () => {
    const { result } = renderHook(() => useAppColors(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.primary).toBeDefined();
    expect(result.current.background).toBeDefined();
  });
});
```

### Writing a Component Test

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProjectCard from '../ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: '1',
    name: 'Test Project',
    status: 'ACTIVE',
    client: { name: 'Test Client' },
  };

  it('should render project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    render(<ProjectCard project={mockProject} onPress={onPress} />);

    fireEvent.press(screen.getByText('Test Project'));
    expect(onPress).toHaveBeenCalledWith(mockProject);
  });
});
```

---

## 🔍 Verification Checklist

After implementing changes, verify:

- [ ] App starts without TypeScript errors
- [ ] Tests run successfully (`npm test`)
- [ ] Error boundary catches thrown errors
- [ ] Logger outputs correctly in dev mode
- [ ] Form submissions sanitize input
- [ ] Navigation typing works (autocomplete)
- [ ] API calls are typed
- [ ] No `any` types in screen components

---

## 📊 Success Metrics

Track these improvements:

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Test Coverage | 0% | 70% | _Run `npm run test:coverage`_ |
| TypeScript `any` Usage | ~20 | 0 | _Check manually_ |
| Error Boundaries | 0 | 5+ | 1 (root) |
| Typed Navigation Props | 0 | 24 | 0 (need migration) |
| Input Sanitization | 0% | 100% | 0% (need migration) |

---

## 🆘 Troubleshooting

### Tests Won't Run

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check what's wrong
npx tsc --noEmit

# Often related to navigation types - ensure imports are correct
```

### Import Errors

```bash
# Make sure paths are correct
# Use absolute imports from src/
import { logger } from '../utils/logger'; // Relative
import { logger } from '@/utils/logger';  // Absolute (requires tsconfig alias)
```

---

## 📚 Additional Resources

- [React Testing Library](https://callstack.github.io/react-native-testing-library/)
- [TypeScript React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Navigation TypeScript](https://reactnavigation.org/docs/typescript/)
- [TanStack Query TypeScript](https://tanstack.com/query/latest/docs/react/typescript)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

## 🎯 Quick Start Checklist

To start using these improvements today:

1. **Install test dependencies**: `npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo`
2. **Start using logger**: Replace one `console.log` with `logger.log`
3. **Add sanitization to one form**: Use `validateAndSanitize` in CreateProjectScreen
4. **Write one test**: Start with AuthContext tests
5. **Type one screen**: Add `DashboardScreenProps` to DashboardScreen

Each small step improves code quality immediately!

---

**Last Updated:** 2025-01-17
**Status:** ✅ Foundation Complete - Ready for Migration
