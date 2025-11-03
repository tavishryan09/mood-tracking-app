# Time Tracking & Scheduling App - Setup Guide

## Project Overview

This is a full-stack React Native application for time tracking, scheduling, and project management with the following features:

- User authentication with role-based permissions (Admin, Manager, User)
- Client and project management
- Time tracking with timer and manual entry
- Calendar view with drag-and-drop scheduling
- Meeting/event scheduling with recurring events and notifications
- Travel tracking
- Excel export functionality
- External calendar integration (Google Calendar, Outlook)
- Works on web, iOS, and Android

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: JWT with bcrypt
- **Validation**: express-validator

### Frontend
- **Framework**: React Native with Expo
- **Cross-platform**: React Native Web for browser support
- **Navigation**: React Navigation
- **State Management**: React Context API / Redux (TBD)
- **UI Components**: React Native Paper or NativeBase
- **Calendar**: react-native-calendars or @react-native-community/datetimepicker
- **Drag & Drop**: react-native-draggable or similar
- **Excel Export**: xlsx library

## Database Setup

### Step 1: Create Neon Database

1. Go to [https://neon.tech](https://neon.tech)
2. Create a new project
3. Copy your connection string (it will look like):
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Step 2: Configure Environment Variables

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Update the `.env` file with your Neon database connection string:
   ```
   DATABASE_URL="your-neon-connection-string"
   ```

3. Generate a secure JWT secret:
   ```bash
   # On Mac/Linux
   openssl rand -base64 32

   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. Update JWT_SECRET in `.env` file with the generated value

### Step 3: Run Database Migrations

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

This will create all the necessary tables in your Neon database.

## Backend Setup

### Installation

```bash
cd server
npm install
```

### Development

```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Frontend Setup

### Installation

```bash
cd client
npm install
```

### Install Required Dependencies

```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-paper react-native-vector-icons
npm install axios
npm install @react-native-async-storage/async-storage
npm install react-native-calendars
npm install expo-notifications
npm install xlsx
```

### Development

```bash
# Web
npm run web

# iOS (requires Mac)
npm run ios

# Android (requires Android Studio)
npm run android
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete (soft) client

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Archive project
- `POST /api/projects/:id/members` - Add project member
- `DELETE /api/projects/:id/members/:memberId` - Remove project member

### Time Entries
- `GET /api/time-entries` - Get all time entries (with filters)
- `GET /api/time-entries/:id` - Get time entry by ID
- `POST /api/time-entries` - Create time entry
- `PUT /api/time-entries/:id` - Update time entry
- `DELETE /api/time-entries/:id` - Delete time entry
- `POST /api/time-entries/:id/stop` - Stop running timer
- `GET /api/time-entries/running` - Get current running timer

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/attendees` - Add event attendee
- `DELETE /api/events/:id/attendees/:userId` - Remove event attendee

### Travel
- `GET /api/travel` - Get all travel entries
- `GET /api/travel/:id` - Get travel entry by ID
- `POST /api/travel` - Create travel entry
- `PUT /api/travel/:id` - Update travel entry
- `DELETE /api/travel/:id` - Delete travel entry

### Export
- `GET /api/export/time-report` - Export time report to Excel
- `GET /api/export/project-summary` - Export project summary
- `GET /api/export/travel-report` - Export travel report

## Deployment

### Backend Deployment Options

#### Option 1: Deploy to Railway
1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub repository
3. Add environment variables
4. Deploy

#### Option 2: Deploy to Render
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repository
4. Add environment variables
5. Deploy

#### Option 3: Deploy to DigitalOcean App Platform
1. Create account at [digitalocean.com](https://digitalocean.com)
2. Create new App
3. Connect repository
4. Configure build and run commands
5. Deploy

### WordPress Subdomain Setup

To host on a subdomain of your WordPress site:

1. **Check hosting capabilities**: Contact your hosting provider to confirm they support Node.js applications

2. **If supported**:
   - Set up subdomain (e.g., `app.yourdomain.com`)
   - Deploy backend to subdomain
   - Configure DNS settings
   - Set up SSL certificate (Let's Encrypt recommended)

3. **Alternative approach** (recommended):
   - Deploy backend to a service like Railway or Render
   - Use subdomain as a reverse proxy to the deployed service
   - This is more reliable and easier to manage

### Frontend Deployment

#### Web App
- Deploy to Vercel, Netlify, or similar
- Update API endpoint to your backend URL
- Configure subdomain DNS

#### Mobile Apps

**iOS**:
1. Enroll in Apple Developer Program
2. Configure app in App Store Connect
3. Build with `expo build:ios` or EAS Build
4. Submit to App Store

**Android**:
1. Create Google Play Developer account
2. Build APK/AAB with `expo build:android` or EAS Build
3. Submit to Google Play Store

## Database Schema

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for detailed schema documentation.

## Environment Variables Reference

### Server (.env)
```
DATABASE_URL - Neon PostgreSQL connection string
JWT_SECRET - Secret key for JWT token generation
JWT_EXPIRES_IN - JWT expiration time (default: 7d)
PORT - Server port (default: 5000)
NODE_ENV - Environment (development/production)
CORS_ORIGIN - Allowed origins for CORS
```

### Client (.env)
```
EXPO_PUBLIC_API_URL - Backend API URL
```

## Next Steps

1. ✅ Database schema created
2. ✅ Backend API structure created
3. ⏳ Complete remaining controllers and routes
4. ⏳ Set up React Native client
5. ⏳ Implement authentication flow
6. ⏳ Build UI components
7. ⏳ Implement time tracking features
8. ⏳ Implement calendar with drag-and-drop
9. ⏳ Add Excel export functionality
10. ⏳ Integrate external calendars
11. ⏳ Set up notifications
12. ⏳ Test and deploy

## Support

For issues or questions:
- Review database schema: `DATABASE_SCHEMA.md`
- Check API documentation above
- Review code comments in controllers and routes
