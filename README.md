# Cloud Database Demo Generator - Migration to Render

## Application Overview

This is a comprehensive PostgreSQL demo generator platform that creates downloadable repositories for AWS database demonstrations. The application generates complete CloudFormation infrastructure, application code, and documentation packages for Sales Engineers conducting customer presentations.

## Directory Structure

```
pg-demo-generator/
├── package.json                    # Node.js dependencies and scripts
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── vite.config.ts                 # Vite build configuration
├── components.json                # shadcn/ui component configuration
├── drizzle.config.ts              # Database ORM configuration
├── render.yaml                    # Render deployment configuration
├── start.js                       # Production server (legacy)
├── server/                        # Backend source code
│   ├── index.ts                   # Main server entry point
│   ├── routes.ts                  # API route definitions
│   ├── storage.ts                 # Repository generation logic
│   ├── db.ts                      # Database connection setup
│   ├── auth.ts                    # Authentication middleware
│   ├── firebaseAuth.ts            # Firebase auth integration
│   ├── replitAuth.ts              # Replit auth (legacy)
│   ├── vite.ts                    # Vite dev server integration
│   └── production.ts              # Production configuration
├── client/                        # Frontend React application
│   ├── index.html                 # HTML entry point
│   └── src/
│       ├── main.tsx               # React app entry point
│       ├── App.tsx                # Main application component
│       ├── index.css              # Global styles
│       ├── components/            # Reusable UI components
│       │   ├── ui/                # shadcn/ui components
│       │   ├── configuration-panel.tsx
│       │   ├── progress-tracker.tsx
│       │   ├── repository-structure.tsx
│       │   └── [other components]
│       ├── pages/                 # Application pages
│       │   ├── home.tsx           # Main dashboard
│       │   ├── admin.tsx          # Admin analytics
│       │   ├── auth.tsx           # Authentication page
│       │   ├── demo-request.tsx   # Custom demo requests
│       │   ├── landing.tsx        # Landing page
│       │   └── sql-optimizer.tsx  # SQL optimization tool
│       ├── hooks/                 # React hooks
│       │   ├── useAuth.ts         # Authentication hook
│       │   ├── useFirebaseAuth.ts # Firebase auth hook
│       │   └── use-toast.ts       # Toast notifications
│       └── lib/                   # Utility libraries
│           ├── firebase.ts        # Firebase configuration
│           ├── queryClient.ts     # TanStack Query setup
│           ├── authUtils.ts       # Auth utilities
│           └── utils.ts           # General utilities
├── shared/                        # Shared TypeScript types
│   └── schema.ts                  # Database schema and types
└── dist/                          # Built application (generated)
    ├── index.js                   # Built server
    └── public/                    # Built frontend assets
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth
- **Session Storage**: PostgreSQL sessions with connect-pg-simple
- **File Generation**: Archiver for ZIP creation
- **Build Tool**: esbuild for server bundling

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

## Required Environment Variables

### Firebase Configuration (Required)
```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### Database Configuration (Auto-configured by Render)
```bash
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=database_host
PGPORT=5432
PGUSER=database_user
PGPASSWORD=database_password
PGDATABASE=database_name
```

### Application Configuration
```bash
NODE_ENV=production
SESSION_SECRET=auto_generated_by_render
```

## Firebase Setup Instructions

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one

2. **Enable Authentication**:
   - Navigate to Authentication → Sign-in method
   - Enable Google sign-in provider
   - Add your Render domain to authorized domains

3. **Get Configuration**:
   - Go to Project Settings → General
   - Find "Your apps" section
   - Copy the config values for environment variables

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Git

### Installation Steps

1. **Clone and Install**:
```bash
git clone <repository-url>
cd pg-demo-generator
npm install
```

2. **Environment Configuration**:
```bash
cp .env.example .env
# Edit .env with your Firebase and database credentials
```

3. **Database Setup**:
```bash
# Start PostgreSQL locally
# Create database
createdb pg_demo_generator

# Run database migrations
npm run db:push
```

4. **Development Server**:
```bash
npm run dev
# Application available at http://localhost:5000
```

## Render Deployment Instructions

### Method 1: Using render.yaml (Recommended)

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Connect Repository**:
   - Link your GitHub repository to Render
   - Render will detect the `render.yaml` file automatically

3. **Configure Environment Variables**:
   - In Render dashboard, add Firebase environment variables:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_APP_ID`

4. **Deploy**:
   - Render will automatically create PostgreSQL database
   - Application will build and deploy automatically

### Method 2: Manual Setup

1. **Create Web Service**:
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: Starter (can upgrade later)

2. **Create PostgreSQL Database**:
   - Database Name: `pg_demo_generator`
   - Plan: Starter

3. **Configure Environment Variables**:
   - Add all required environment variables listed above
   - Database variables will auto-populate from created database

## Build Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Production
```bash
npm run build        # Build frontend and backend for production
npm run start        # Start production server
```

## Key Features and Functionality

### Repository Generation Engine
- **ZIP Creation**: Uses `archiver` library to create downloadable repositories
- **Template Generation**: Dynamic CloudFormation templates with 12+ learning modules
- **Multi-language Support**: Python and JavaScript/Node.js examples
- **Use Cases**: Real Estate/Property Search, Time-Series Analytics, Logistics optimization

### Authentication System
- **Firebase Integration**: Google OAuth sign-in
- **Session Management**: PostgreSQL-backed sessions for security
- **User Tracking**: Download analytics and user engagement metrics

### Admin Dashboard
- **Analytics**: Download statistics, user metrics, demo request management
- **Real-time Data**: Live usage tracking and engagement analytics
- **Export Functionality**: Repository download tracking by use case and language

## Critical Migration Notes

### Removed Replit Dependencies
- Removed `@replit/vite-plugin-cartographer` from production build
- Removed `@replit/vite-plugin-runtime-error-modal` for production
- Updated vite.config.ts to exclude Replit-specific plugins

### Database Schema
- Uses Drizzle ORM with PostgreSQL
- Auto-migrates schema on startup
- Includes users, sessions, repositories, download_logs, and feedback_requests tables

### File Generation Logic
The core ZIP generation logic is in `server/storage.ts`:
- Generates complete CloudFormation infrastructure
- Creates 12+ educational modules with working code examples
- Includes comprehensive dependency installation scripts
- Produces functional, deployable PostgreSQL demonstrations

### Security Considerations
- CSRF protection enabled
- Secure session cookies with PostgreSQL storage
- Environment variable validation
- Input sanitization with Zod schemas

## Troubleshooting

### Common Issues
1. **Firebase Auth Errors**: Ensure domains are whitelisted in Firebase console
2. **Database Connection**: Verify DATABASE_URL format and credentials
3. **Build Failures**: Check Node.js version (requires 20+)
4. **Missing Dependencies**: Run `npm install` to ensure all packages are installed

### Logs and Monitoring
- Render provides built-in logging
- Express middleware logs all API requests with response times
- Error handling middleware captures and logs application errors

## Performance Considerations

### Optimization Features
- Frontend assets are optimized with Vite
- Server-side bundling with esbuild
- PostgreSQL connection pooling
- Efficient ZIP generation with streaming

### Scaling
- Render autoscale configuration ready
- Stateless server design allows horizontal scaling
- Database pooling supports multiple concurrent connections

## License and Legal
- MIT License for generated code
- Clear cost disclaimers in generated repositories
- User responsibility acknowledgments for AWS charges
---
*Built with Kiro CLI (powered by Claude)*
