# Time Tracking & Scheduling Application

A full-stack cross-platform (web, iOS, Android) time tracking and project management application built with React Native and Node.js.

## Features

- **User Authentication**: Secure login/registration with JWT and role-based permissions (Admin, Manager, User)
- **Client Management**: Create and manage client profiles
- **Project Management**: Create projects, assign team members, track budgets
- **Time Tracking**: Start/stop timer or manual time entry with billable/non-billable tracking
- **Calendar View**: Visual calendar with event scheduling
- **Event Scheduling**: Create meetings, appointments with recurring event support
- **Travel Tracking**: Log and track business travel with expenses
- **Excel Export**: Export time reports, project summaries, and travel reports to Excel
- **Cross-Platform**: Works on web browsers, iOS, and Android devices

## Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** - REST API framework
- **Prisma ORM** - Database management
- **PostgreSQL (Neon)** - Cloud database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **xlsx** - Excel export functionality

### Frontend
- **React Native** with Expo
- **React Native Web** - Web support
- **React Navigation** - Navigation
- **React Native Paper** - UI components
- **Axios** - API client
- **AsyncStorage** - Local data persistence
- **React Native Calendars** - Calendar UI

## Project Structure

```
mood-tracking-app/
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth & validation middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helper functions
│   │   └── index.ts       # Server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── .env               # Environment variables
│   └── package.json
│
├── client/                # React Native app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── navigation/    # Navigation configuration
│   │   ├── screens/       # App screens
│   │   ├── services/      # API services
│   │   └── utils/         # Helper functions
│   ├── App.tsx            # App entry point
│   ├── .env               # Environment variables
│   └── package.json
│
├── DATABASE_SCHEMA.md     # Database documentation
├── SETUP_GUIDE.md         # Setup instructions
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Neon PostgreSQL account (free tier available)
- Expo CLI (for mobile development)

### 1. Clone the Repository
```bash
cd mood-tracking-app
```

### 2. Backend Setup

```bash
cd server
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Neon database URL and JWT secret
```

**Configure .env file:**
- Get your Neon database connection string from [https://neon.tech](https://neon.tech)
- Generate a secure JWT secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

**Run database migrations:**
```bash
npm run prisma:generate
npm run prisma:migrate
```

**Start the server:**
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../client
npm install

# Set up environment variables
cp .env.example .env
# The default API URL (http://localhost:5000/api) should work for local development
```

**Start the app:**

```bash
# For web
npm run web

# For iOS (Mac only)
npm run ios

# For Android
npm run android
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-token>
```

### Endpoints

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get current user (requires auth)

#### Clients
- `GET /clients` - Get all clients
- `GET /clients/:id` - Get client by ID
- `POST /clients` - Create client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete client

#### Projects
- `GET /projects` - Get all projects
- `GET /projects/:id` - Get project details
- `POST /projects` - Create project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Archive project
- `POST /projects/:id/members` - Add team member
- `DELETE /projects/:id/members/:memberId` - Remove team member

#### Time Entries
- `GET /time-entries` - Get time entries (supports filters)
- `GET /time-entries/running` - Get active timer
- `GET /time-entries/:id` - Get time entry details
- `POST /time-entries` - Create time entry
- `PUT /time-entries/:id` - Update time entry
- `POST /time-entries/:id/stop` - Stop running timer
- `DELETE /time-entries/:id` - Delete time entry

#### Events
- `GET /events` - Get all events (supports filters)
- `GET /events/:id` - Get event details
- `POST /events` - Create event
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/attendees` - Add attendee
- `DELETE /events/:id/attendees/:userId` - Remove attendee
- `PUT /events/:id/attendee-status` - Update RSVP status

#### Travel
- `GET /travel` - Get travel entries (supports filters)
- `GET /travel/:id` - Get travel entry details
- `POST /travel` - Create travel entry
- `PUT /travel/:id` - Update travel entry
- `DELETE /travel/:id` - Delete travel entry

#### Export
- `GET /export/time-report` - Download time report Excel file
- `GET /export/project-summary` - Download project summary Excel file
- `GET /export/travel-report` - Download travel report Excel file

## Database Schema

The application uses PostgreSQL with the following main tables:
- **Users** - User accounts with role-based permissions
- **Clients** - Client/customer information
- **Projects** - Project details with budget tracking
- **ProjectMembers** - Team assignments
- **TimeEntries** - Time tracking records
- **Events** - Meetings and appointments
- **EventAttendees** - Event participants
- **TravelEntries** - Business travel records
- **Notifications** - User notifications
- **ExternalCalendarSync** - Calendar integration settings
- **AuditLogs** - Activity tracking

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for detailed schema documentation.

## Deployment

### Backend Deployment

Recommended platforms:
1. **Railway** - [railway.app](https://railway.app)
2. **Render** - [render.com](https://render.com)
3. **DigitalOcean App Platform**

**Environment variables needed:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `PORT` - Server port (usually auto-assigned)
- `NODE_ENV` - "production"
- `CORS_ORIGIN` - Your frontend URL

### Frontend Deployment

**Web:**
- Build: `expo build:web`
- Deploy to Vercel, Netlify, or similar

**Mobile Apps:**
- Use Expo Application Services (EAS) for building
- iOS: Submit to App Store Connect
- Android: Submit to Google Play Console

### Subdomain Setup

To host on a subdomain (e.g., `app.yourdomain.com`):

1. Deploy backend to a service like Railway or Render
2. Set up subdomain DNS to point to your deployment
3. Configure SSL certificate (Let's Encrypt recommended)
4. Update CORS_ORIGIN in backend .env
5. Update EXPO_PUBLIC_API_URL in frontend .env

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed deployment instructions.

## Development

### Backend Development
```bash
cd server
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript
npm run prisma:studio # Open database GUI
```

### Frontend Development
```bash
cd client
npm run web          # Start web dev server
npm run ios          # Start iOS simulator
npm run android      # Start Android emulator
```

## Features Roadmap

- ✅ User authentication & authorization
- ✅ Client management
- ✅ Project management with team assignments
- ✅ Time tracking (timer & manual entry)
- ✅ Calendar view
- ✅ Event scheduling
- ✅ Travel tracking
- ✅ Excel export functionality
- ⏳ Drag-and-drop calendar (in progress)
- ⏳ Push notifications
- ⏳ External calendar integration (Google, Outlook)
- ⏳ Mobile app builds
- ⏳ Advanced reporting & analytics
- ⏳ Invoice generation
- ⏳ User management admin panel

## Contributing

This is a private company application. If you need to add features or fix bugs:

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Support

For questions or issues:
- Check the [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Review the [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Check API endpoint documentation above

## License

Proprietary - All rights reserved.
