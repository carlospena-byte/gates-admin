# Quick Reference Guide

## 🔥 Most Common Patterns

### Fetch Data
```typescript
import { useResidentials } from "@/hooks";

function MyComponent() {
  const { residentials, isLoading, error, refetch } = useResidentials();

  if (isLoading) return <TableSkeleton />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return <div>{residentials.map(...)}</div>;
}
```

### Create/Update/Delete
```typescript
import { useUnitMutations } from "@/hooks";

function MyComponent() {
  const { createUnit, updateUnit, deleteUnit, isMutating } = useUnitMutations();

  const handleCreate = async () => {
    const result = await createUnit({ name: "Unit A", residential_id: "..." });
    if (result.success) {
      // Success
    }
  };
}
```

### Validate Input
```typescript
import { validateEmail, validateResidentialData } from "@/lib/validation";

try {
  const email = validateEmail(formData.email);
  const data = validateResidentialData(formData);
  // Data is valid and sanitized
} catch (error) {
  setError(error.message);
}
```

### Loading States
```typescript
import { TableSkeleton, Spinner } from "@/components/LoadingStates";

// Full table skeleton
{isLoading ? <TableSkeleton rows={5} /> : <Table>...</Table>}

// Inline spinner
<Button disabled={isLoading}>
  {isLoading && <Spinner size="sm" />}
  Save
</Button>
```

### Error Display
```typescript
import { Alert, AlertDescription } from "@/components/ui/alert";

{error && (
  <Alert variant="destructive">
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

---

## 📁 File Structure

```
src/
├── types/
│   └── database.types.ts          # Database TypeScript types
├── services/
│   ├── api.service.ts             # CRUD operations
│   ├── auth.service.ts            # Authentication
│   └── index.ts                   # Exports
├── hooks/
│   ├── useAsync.ts                # Generic async
│   ├── useQuery.ts                # Data fetching
│   ├── useResidentials.ts         # Residential hooks
│   ├── useUnits.ts                # Unit hooks
│   └── index.ts                   # Exports
├── lib/
│   ├── validation.ts              # Input validation
│   └── supabaseClient.ts          # Typed Supabase client
└── components/
    ├── ErrorBoundary.tsx          # Error boundary
    ├── LoadingStates.tsx          # Skeletons & spinners
    └── ui/
        ├── skeleton.tsx           # Skeleton base
        └── alert.tsx              # Alert component
```

---

## 🎯 Cheat Sheet

### Services

```typescript
import { residentialService, unitService, authService } from "@/services";

// Residentials
await residentialService.list()
await residentialService.getById(id)
await residentialService.create(data)
await residentialService.update(id, updates)
await residentialService.delete(id)

// Units
await unitService.listByResidential(residentialId)
await unitService.getById(id)
await unitService.create(data)
await unitService.update(id, updates)
await unitService.delete(id)

// Auth
await authService.getSession()
await authService.signInWithOtp({ email })
await authService.verifyOtp({ email, token })
await authService.signOut()
```

### Hooks

```typescript
import { useResidentials, useUnits, useQuery } from "@/hooks";

// Fetch residentials
const { residentials, isLoading, error, refetch } = useResidentials();

// Fetch units
const { units, isLoading, error } = useUnits(residentialId);

// Update residential
const { toggleActive, isUpdating } = useResidentialUpdate();

// Create/update/delete units
const { createUnit, updateUnit, deleteUnit } = useUnitMutations();

// Custom query
const { data, isLoading } = useQuery(() => myService.getData());
```

### Validation

```typescript
import { validateEmail, validateOtp, validateResidentialData } from "@/lib/validation";

validateEmail(email)                    // Validates & sanitizes email
validateOtp(otp)                        // Validates 6-digit OTP
validateRequiredString(val, "name")     // Required string field
validateOptionalString(val, "address")  // Optional string field
validatePhone(phone)                    // Phone number
validateUuid(id)                        // UUID format
validateCoordinates(lat, lng)           // Lat/lng pair
validateResidentialData(data)           // Complete residential object
validateUnitData(data)                  // Complete unit object
```

### Components

```typescript
import { TableSkeleton, Spinner, Alert } from "@/components/...";

<TableSkeleton rows={5} columns={6} />
<CardSkeleton />
<DashboardSkeleton />
<FormSkeleton />
<Spinner size="sm" | "md" | "lg" />
<FullPageLoading message="Loading..." />

<Alert variant="destructive" | "success" | "warning" | "info">
  <AlertTitle>Title</AlertTitle>
  <AlertDescription>Message</AlertDescription>
</Alert>
```

---

## 🔑 Key Rules

1. **Always use services** - Never call Supabase directly
2. **Always validate input** - Before sending to API
3. **Always use hooks** - For data fetching
4. **Always show loading states** - Use skeletons, not "Loading..."
5. **Always handle errors** - Use Alert component

---

## 🚦 Before/After Examples

### Data Fetching

```typescript
// ❌ Before
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  const fetch = async () => {
    const { data } = await supabase.from("residentials").select("*");
    setData(data);
    setLoading(false);
  };
  fetch();
}, []);

// ✅ After
const { residentials, isLoading } = useResidentials();
```

### Error Handling

```typescript
// ❌ Before
{error && <div className="text-red-500">{error}</div>}

// ✅ After
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

### Loading States

```typescript
// ❌ Before
{loading && <div>Loading...</div>}

// ✅ After
{isLoading ? <TableSkeleton /> : <Table>...</Table>}
```

### Input Validation

```typescript
// ❌ Before
if (!email || !email.includes("@")) {
  setError("Invalid email");
  return;
}

// ✅ After
try {
  const validEmail = validateEmail(email);
  // Use validEmail
} catch (error) {
  setError(error.message);
}
```

---

## 📖 Documentation Files

- `IMPROVEMENT_SUMMARY.md` - Overview of all changes
- `IMPROVEMENTS.md` - Detailed documentation
- `QUICK_REFERENCE.md` - This file
- `src/pages/PlatformDashboardPage.refactored.tsx` - Example component

---

## 💻 Commands

```bash
# Build (verify TypeScript)
npm run build

# Development
npm run dev

# Lint
npm run lint
```

---

## ✅ Checklist for New Components

When creating a new component:

- [ ] Import services, not supabase
- [ ] Use custom hooks (useResidentials, useUnits)
- [ ] Validate all user input
- [ ] Show loading skeletons
- [ ] Display errors with Alert component
- [ ] Use proper TypeScript types
- [ ] Handle loading/error states

---

## 🎓 Learn More

1. Read `IMPROVEMENTS.md` for complete documentation
2. Check `PlatformDashboardPage.refactored.tsx` for example
3. Review service code in `src/services/`
4. Study hooks in `src/hooks/`
