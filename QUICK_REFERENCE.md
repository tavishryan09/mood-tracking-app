# Quick Reference - React Best Practices

## 🚀 One-Page Cheat Sheet

### Installation

```bash
cd client
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo @types/jest
```

### Error Boundary

```tsx
import ErrorBoundary from './src/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Logger (Replace console.log)

```tsx
import { logger } from './utils/logger';

logger.log('message', data, 'ComponentName');      // Dev only
logger.error('error', errorObj, 'ComponentName');  // Always
logger.warn('warning', null, 'ComponentName');     // Dev only
logger.debug('debug info', obj, 'ComponentName');  // Dev only
```

### Typed Navigation

```tsx
import { DashboardScreenProps } from '../../types/navigation';

const DashboardScreen = ({ navigation, route }: DashboardScreenProps) => {
  navigation.navigate('Projects'); // Autocomplete works!
};
```

### Typed API

```tsx
import { Project } from '../../types/api';

const { data: projects } = useQuery<Project[]>({
  queryKey: ['projects'],
  queryFn: async () => (await projectsAPI.getAll()).data,
});
```

### Input Sanitization

```tsx
import { validateAndSanitize, ValidationPatterns } from './utils/sanitize';

const { isValid, errors, sanitizedData } = validateAndSanitize(formData, {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, pattern: ValidationPatterns.email },
  password: { required: true, pattern: ValidationPatterns.password },
});

if (!isValid) {
  setFormErrors(errors);
  return;
}

await api.create(sanitizedData); // XSS-safe!
```

### Testing

```tsx
import { renderHook, render, screen, fireEvent } from '@testing-library/react-native';

// Test hooks
const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
expect(result.current.user).toBeNull();

// Test components
render(<MyComponent />);
expect(screen.getByText('Hello')).toBeTruthy();
fireEvent.press(screen.getByText('Button'));
```

### Run Tests

```bash
npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:ci           # CI mode
```

### TypeScript Check

```bash
npx tsc --noEmit  # Check for type errors
```

### Find Migration Targets

```bash
grep -r "console.log" client/src           # Find logger migrations
grep -r "navigation.*any" client/src       # Find navigation type migrations
grep -r ": any" client/src/screens         # Find any types
```

---

## 📁 Key Files

| Purpose | File | Status |
|---------|------|--------|
| Error Handling | `client/src/components/ErrorBoundary.tsx` | ✅ Complete |
| Logging | `client/src/utils/logger.ts` | ✅ Complete |
| Sanitization | `client/src/utils/sanitize.ts` | ✅ Complete |
| Nav Types | `client/src/types/navigation.ts` | ✅ Complete |
| API Types | `client/src/types/api.ts` | ✅ Complete |
| Test Config | `client/jest.config.js` | ✅ Complete |
| Test Setup | `client/jest-setup.ts` | ✅ Complete |
| Example Screen | `client/src/screens/auth/LoginScreen.example.tsx` | ✅ Complete |

---

## 🎯 Common Patterns

### Form with Validation
```tsx
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});

const handleSubmit = async () => {
  const { isValid, errors, sanitizedData } = validateAndSanitize(formData, {
    name: { required: true, maxLength: 100 },
    email: { required: true, pattern: ValidationPatterns.email },
  });

  if (!isValid) {
    setErrors(errors);
    return;
  }

  try {
    await api.create(sanitizedData);
    logger.log('Created successfully', null, 'MyScreen');
    navigation.goBack();
  } catch (error: any) {
    logger.error('Create failed', error, 'MyScreen');
    setApiError(error.message);
  }
};
```

### Screen with Error Boundary
```tsx
const MyScreenContent = ({ navigation, route }: MyScreenProps) => {
  // Screen logic here
};

const MyScreen = (props: MyScreenProps) => (
  <ErrorBoundary
    fallback={(error, reset) => (
      <View><Text>Error: {error.message}</Text><Button onPress={reset}>Retry</Button></View>
    )}
  >
    <MyScreenContent {...props} />
  </ErrorBoundary>
);

export default MyScreen;
```

### API Call with Types
```tsx
import { Project, CreateProjectRequest } from '../../types/api';

const createMutation = useMutation<Project, Error, CreateProjectRequest>({
  mutationFn: async (data) => {
    const response = await projectsAPI.create(data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    logger.log('Project created', null, 'CreateProjectScreen');
  },
  onError: (error) => {
    logger.error('Failed to create project', error, 'CreateProjectScreen');
  },
});
```

---

## ⚡ Quick Wins (30 min each)

1. **Update DashboardScreen with typed props**
2. **Replace console.log in AuthContext with logger**
3. **Add sanitization to CreateProjectScreen**
4. **Write test for useAppColors hook**
5. **Add error boundary to ProjectsScreen**

---

## 🔥 Hot Tips

- **Always sanitize user input** before API calls
- **Use logger instead of console.log** for better production control
- **Run `npx tsc --noEmit`** frequently to catch type errors early
- **Write tests alongside features**, not after
- **Check the example screen** (`LoginScreen.example.tsx`) when stuck

---

## 📊 Progress Tracker

```
Error Boundaries:    [█░░░░] 1/5   (20%)
Logger Migration:    [░░░░░] 0/169 (0%)
Typed Navigation:    [░░░░░] 0/24  (0%)
Typed API Calls:     [░░░░░] 0/50  (0%)
Input Sanitization:  [░░░░░] 0/15  (0%)
Test Coverage:       [░░░░░] 0/70% (0%)
```

Update as you migrate!

---

**See IMPLEMENTATION_GUIDE.md for detailed examples**
**See IMPLEMENTATION_SUMMARY.md for full overview**
