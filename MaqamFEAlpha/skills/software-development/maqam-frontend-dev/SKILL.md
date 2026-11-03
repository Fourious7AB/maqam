---
name: maqam-frontend-dev
description: Maqam Travel CRM frontend development workflows and patterns.
version: 1.0.0
author: Maqam Development Team, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [react, vite, travel-crm, authentication, admin-panel, zustand]
    related_skills: [react-auth-implementation, systematic-debugging]
---

# Maqam Frontend Development Skill

Maqam is a travel CRM platform with distinct user roles (admin, sales_agent, finance, hotelier) and separate UIs for each. This skill documents the project structure, authentication patterns, and development workflows.

## When to Use

Use this skill when:
- Working on the Maqam Frontend React/Vite project
- Implementing authentication or authorization features
- Adding new admin CRM features or routes
- Debugging role-based access control issues
- Understanding the project architecture and patterns

Don't use for:
- Backend API development (separate repository)
- General React questions (use general knowledge)
- UI design from scratch (use claude-design skill)

## Project Structure

```
Maqam-Frontend/
├── src/
│   ├── admin/                    # Admin CRM application
│   │   ├── components/          # Reusable admin components
│   │   ├── features/            # Feature-based modules
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Layout components
│   │   ├── pages/              # Page components (AdminLogin, ProfilePage)
│   │   ├── routes/             # Route configuration (ProtectedRoute, RoleRoute)
│   │   ├── services/           # API clients (apiClient, axios, tokenService)
│   │   ├── store/              # Zustand state management (authStore)
│   │   └── utils/              # Utilities (permissions, validators, formatters)
│   ├── assets/                  # Images, fonts, static files
│   ├── components/              # Shared components
│   ├── pages/                   # Public-facing pages
│   ├── services/                # Shared services
│   └── App.jsx                  # Main application entry
├── public/                      # Static assets
├── skills/                      # Project-specific Hermes skills (this directory)
└── vite.config.js              # Vite configuration
```

## Tech Stack

- **Framework:** React 18.x with Vite
- **State Management:** Zustand
- **Routing:** React Router v6
- **UI Library:** Tailwind CSS + Lucide Icons
- **HTTP Client:** Axios
- **Form Handling:** React Hook Form (in some components)
- **Notifications:** React Toastify

## Authentication Architecture

### API Endpoints

Base URL: `https://server2.vais.co.in/maqam`

**Authentication Endpoints:**
- `POST /api/v1/auth/send-otp` - Send OTP to phone number
- `POST /api/v1/auth/verify-otp` - Verify OTP and login
- `POST /api/v1/auth/login` - Password-based login
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "user": {
      "id": "...",
      "phone": "...",
      "email": "...",
      "role": "admin",
      "firstName": "...",
      "lastName": "...",
      "fullName": "...",
      "avatar": "...",
      "isActive": true,
      "isVerified": true
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Auth Store (Zustand)

Location: `src/admin/store/authStore.js`

**Key Functions:**
- `initialize()` - Load and validate existing session
- `sendOtp(phone)` - Request OTP
- `verifyOtp(phone, otp)` - Verify OTP and login
- `login(credentials)` - Password login
- `logout()` - Clear session
- `validateUser()` - Verify current session

**State:**
```javascript
{
  accessToken: string,
  user: object | null,
  loading: boolean,
  initialized: boolean,
  error: string
}
```

### Role-Based Access Control

**Allowed Roles for Admin CRM:**
- `admin` - Full administrative access
- `super_admin` - Super administrator (if implemented)

**Other Roles (Denied Access):**
- `sales_agent` - Sales team members
- `finance` - Finance team members
- `hotelier` - Hotel partners
- `customer` - End users

**Implementation:**
1. User logs in via `AdminLogin.jsx`
2. Backend returns user with role
3. Frontend stores token + user in Zustand store
4. User navigates to admin dashboard
5. `ProtectedRoute.jsx` validates role:
   - If `admin` or `super_admin` → Access granted
   - If other role → Show access denied page, logout, redirect to login

### Authentication Flow

```
Login Page (AdminLogin.jsx)
    ↓
Backend Authentication
    ↓
Store Token + User (authStore.js)
    ↓
Navigate to Dashboard
    ↓
Protected Route Guard (ProtectedRoute.jsx)
    ↓
Check: Authenticated?
    ↓ No → Redirect to Login
    ↓ Yes
    ↓
Check: Allowed Role?
    ↓ No → Access Denied Page + Logout
    ↓ Yes
    ↓
Load Dashboard
```

## Key Files Reference

### Authentication

**`src/admin/pages/AdminLogin.jsx`**
- Modern, responsive login UI with OTP and password modes
- Glass-morphism design with animated backgrounds
- No role validation (happens in ProtectedRoute)

**`src/admin/routes/ProtectedRoute.jsx`**
- Validates authentication and authorization
- Shows access denied page for non-admin roles
- Auto-logout and redirect for unauthorized users

**`src/admin/store/authStore.js`**
- Zustand store for authentication state
- `normaliseUser()` - Extracts user data from API responses
- Token management with refresh logic

**`src/admin/services/tokenService.js`**
- Access token storage (localStorage)
- Refresh token (HttpOnly cookie, managed by backend)

**`src/admin/services/axios.js`**
- Axios interceptors for token injection
- Automatic token refresh on 401 responses

### Routing

**`src/admin/routes/AppRoutes.jsx`**
- Main route configuration
- Nested routes with layouts
- Feature-based route organization

**`src/admin/routes/RoleRoute.jsx`**
- Permission-based route guard (fine-grained)
- Used for specific permissions within admin area

### Configuration

**`src/admin/config/env.js`**
- Environment configuration
- API endpoints
- Feature flags

**`.env.development`, `.env.production`**
- Environment-specific variables
- API base URLs
- Feature toggles

## Development Workflows

### Adding a New Admin Feature

1. Create feature directory: `src/admin/features/feature-name/`
2. Add pages: `features/feature-name/pages/`
3. Add API service: `features/feature-name/featureApi.js`
4. Add routes to `AppRoutes.jsx`:
   ```jsx
   <Route path="/admin/feature-name" element={<FeaturePage />} />
   ```
5. Add navigation link in `components/layout/Sidebar.jsx`

### Debugging Authentication Issues

**Common Issues:**

1. **"Login successful but not reaching dashboard"**
   - Check: Is role validation happening in login handler? (WRONG)
   - Fix: Move role check to ProtectedRoute
   - Debug: Check console for `[Auth] Normalizing user data`

2. **"Access denied loop"**
   - Check: Is ProtectedRoute receiving correct user role?
   - Debug: `console.log(useAuthStore.getState())`

3. **"Token expired immediately"**
   - Check: JWT expiration time
   - Check: System clock vs server time
   - Debug: Decode token in browser console

4. **"Role not extracted from API"**
   - Check: `normaliseUser()` function in authStore
   - Verify: API response structure matches expected format
   - Debug: Console log in `normaliseUser()`

### Running the Project

**Development:**
```bash
npm install
npm run dev
```

**Build:**
```bash
npm run build
```

**Preview Production Build:**
```bash
npm run preview
```

### Code Style Guidelines

**Component Structure:**
```jsx
// 1. Imports (external, then internal)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// 2. Component definition
const MyComponent = () => {
  // 3. Hooks
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [state, setState] = useState(null);

  // 4. Effects
  useEffect(() => {
    // ...
  }, []);

  // 5. Handlers
  const handleAction = () => {
    // ...
  };

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default MyComponent;
```

**Naming Conventions:**
- Components: PascalCase (`AdminLogin.jsx`)
- Utilities: camelCase (`formatCurrency.js`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Hooks: camelCase with 'use' prefix (`useAuth.js`)

## Pitfalls

1. **Don't validate roles in login handlers** - Causes navigation blocking. Always validate in route guards.

2. **Don't call `logout()` before navigation** - Clears the state needed for the protected route.

3. **Don't trust client-side role checks alone** - Backend must also validate permissions on every API call.

4. **Don't hardcode API URLs** - Use environment variables via `src/admin/config/env.js`.

5. **Watch for nested API response structures** - Some endpoints return `{ data: { user: {...} } }`, others return `{ user: {...} }`.

6. **Refresh token is HttpOnly** - Frontend cannot read it. Backend manages refresh automatically via cookies.

7. **Session initialization is async** - ProtectedRoute must wait for `initialized: true` before making decisions.

## Verification

After implementing authentication features:

1. **Test admin login:**
   - [ ] Login with admin credentials (phone: 9567458632)
   - [ ] See success toast
   - [ ] Redirect to /admin/dashboard
   - [ ] Dashboard loads without errors

2. **Test non-admin rejection:**
   - [ ] Login with non-admin user
   - [ ] See access denied page
   - [ ] See toast with role name
   - [ ] Auto-logout after 1 second
   - [ ] Redirect back to /admin/login

3. **Test token refresh:**
   - [ ] Login successfully
   - [ ] Wait for token expiration (or manually clear)
   - [ ] Make API call
   - [ ] Token refreshes automatically
   - [ ] Request succeeds

4. **Test logout:**
   - [ ] Click logout button
   - [ ] Redirect to login page
   - [ ] Cannot access protected routes
   - [ ] localStorage cleared

## Quick Reference

**Import auth store:**
```javascript
import { useAuthStore } from '../store/authStore';
const { user, accessToken, loading, login, logout } = useAuthStore();
```

**Navigate programmatically:**
```javascript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/admin/dashboard');
```

**Show toast notification:**
```javascript
import { toast } from 'react-toastify';
toast.success('Success message');
toast.error('Error message');
```

**Check user role:**
```javascript
const { user } = useAuthStore();
if (['admin', 'super_admin'].includes(user?.role)) {
  // Allow access
}
```

**Make authenticated API call:**
```javascript
import { apiClient } from '../services/apiClient';
const response = await apiClient.get('/api/v1/endpoint');
// Token is automatically included in headers
```

## Session Context

**Latest Implementation (2026-09-04):**
- Implemented role-based access control for admin CRM
- Only `admin` and `super_admin` roles can access admin dashboard
- Enhanced `AdminLogin.jsx` with modern, responsive UI
- Fixed user normalization in `authStore.js` to handle nested API responses
- Moved role validation from login handler to `ProtectedRoute.jsx`

**Known Issues:**
- None at this time

**Future Enhancements:**
- Two-factor authentication (2FA)
- Session timeout warnings
- Multi-device session management
- Role hierarchy system
