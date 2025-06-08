# Cloud Database Demo Generator - Complete Application Requirements

## Application Overview

A comprehensive web platform that generates complete GitHub repositories for AWS relational database demonstrations, specifically designed for Sales Engineers conducting customer presentations and proof-of-concepts.

## Core Functionality

### Repository Generation Engine
- **Purpose**: Generate complete, functional PostgreSQL demonstration repositories
- **Output**: Downloadable ZIP packages containing CloudFormation infrastructure, application code, and documentation
- **Target Use Cases**: 
  - Real Estate/Property Search (with PostGIS)
  - Time-Series Analytics (with native partitioning)
  - Logistics Route Optimization
  - E-commerce Analytics
  - Financial Data Processing

### Authentication System
- **Provider**: Firebase Authentication
- **Method**: Google OAuth integration
- **User Management**: Profile tracking, session management
- **Access Control**: User-specific repository access and download tracking

### Admin Analytics Dashboard
- **Download Statistics**: Track repository downloads by user, use case, and language
- **User Analytics**: Monitor signed-in users, engagement metrics
- **Feedback Management**: Review and manage custom demo requests
- **Real-time Metrics**: Live dashboard with usage statistics

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **UI Components**: shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React icons

### Backend Stack
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **File Generation**: Archiver for ZIP creation
- **Authentication**: Passport.js with OpenID Connect

### Database Schema
- **Users Table**: Firebase user profiles with metadata
- **Sessions Table**: Secure session storage
- **Download Logs**: Track all repository downloads
- **Feedback Requests**: Custom demo request management

## Generated Repository Specifications

### Infrastructure Components
- **CloudFormation Templates**: Complete AWS infrastructure as code
- **VPC Configuration**: Isolated networking with public/private subnets
- **Database Options**: 
  - Amazon RDS PostgreSQL (Multi-AZ)
  - Aurora PostgreSQL (Cluster with auto-scaling)
- **Bastion Host**: Ubuntu EC2 instance for secure database access
- **Security Groups**: Least privilege access rules
- **Monitoring**: CloudWatch dashboards and alerting

### Application Code Structure
```
repository-name/
├── README.md                     # Comprehensive setup guide
├── LICENSE                       # MIT license
├── install-dependencies.sh       # System dependency installer
├── requirements.txt              # Python dependencies
├── app.py                        # Main Flask application
├── setup.sh                      # Database setup script
├── deploy.sh                     # AWS deployment automation
├── .env.example                  # Environment configuration template
├── cloudformation/
│   ├── main.yaml                 # Primary infrastructure template
│   └── parameters.json           # CloudFormation parameters
├── modules/
│   ├── module_01/                # PostgreSQL fundamentals
│   ├── module_02/                # PostGIS spatial data
│   ├── module_03/                # Advanced indexing
│   ├── module_04/                # Performance optimization
│   ├── module_05/                # Time-series partitioning
│   ├── module_06/                # Spatial queries
│   ├── module_07/                # Connection pooling
│   ├── module_08/                # Monitoring setup
│   ├── module_09/                # Backup strategies
│   ├── module_10/                # Security configuration
│   ├── module_11/                # Multi-AZ deployment
│   └── module_12/                # Production optimization
├── scripts/
│   └── bastion-setup.sh          # Ubuntu bastion configuration
├── data/
│   └── sample_data.csv           # Sample datasets
├── demo/
│   ├── demo_script.md            # Presentation script
│   ├── presentation_guide.md     # Demo guidelines
│   └── customer_talking_points.md # Sales talking points
└── docs/
    └── ubuntu-deployment.md      # Deployment documentation
```

### Programming Language Support
- **Python**: Flask applications with psycopg2
- **JavaScript/Node.js**: Express applications with pg library
- **Comprehensive Dependencies**: Complete requirements.txt/package.json

### Database Configuration Options
- **PostgreSQL Versions**: 13.x, 14.x, 15.x, 16.x
- **Aurora Support**: Aurora PostgreSQL with serverless v2
- **Extensions**: PostGIS for spatial data, TimescaleDB concepts
- **Instance Types**: t3.medium to r6g.xlarge options
- **AWS Regions**: us-west-2, us-east-1, eu-west-1, ap-southeast-1

## System Dependencies

### Runtime Environment
- **Node.js**: Version 18+ with npm package manager
- **PostgreSQL Client**: For database connectivity
- **Python**: Version 3.8+ for generated repositories

### Required Services
- **PostgreSQL Database**: Primary application database
- **Firebase Project**: Authentication provider
- **AWS Account**: For infrastructure deployment examples

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=demo_generator

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Session Management
SESSION_SECRET=secure_random_string
```

## Deployment Requirements

### Local Development
- **Dependencies**: All packages listed in package.json
- **Database Setup**: PostgreSQL instance with required extensions
- **Environment Configuration**: Properly configured .env file
- **Firebase Setup**: Configured Firebase project with authentication

### Production Deployment
- **Platform**: Replit Deployments (recommended)
- **Database**: Managed PostgreSQL service
- **Domain**: Custom domain support available
- **SSL/TLS**: Automatic certificate management
- **Monitoring**: Application performance monitoring

## Security Requirements

### Authentication Security
- **OAuth Integration**: Secure Firebase authentication flow
- **Session Management**: HttpOnly cookies with secure flags
- **CSRF Protection**: Built-in Express security middleware
- **Input Validation**: Zod schema validation on all inputs

### Data Protection
- **Database Encryption**: Connection encryption for all database traffic
- **Session Storage**: Encrypted session data in PostgreSQL
- **Environment Variables**: Secure secret management
- **User Privacy**: GDPR-compliant data handling

### Generated Repository Security
- **AWS IAM**: Least privilege access policies
- **VPC Isolation**: Private database subnets
- **Security Groups**: Restrictive firewall rules
- **Encryption**: RDS encryption at rest and in transit

## Performance Requirements

### Application Performance
- **Response Time**: < 200ms for API endpoints
- **Repository Generation**: < 30 seconds for complete ZIP creation
- **Concurrent Users**: Support for 100+ simultaneous users
- **Database Queries**: Optimized with proper indexing

### Generated Repository Performance
- **Infrastructure Deployment**: 10-15 minutes for complete AWS stack
- **Application Startup**: < 30 seconds for Flask/Express applications
- **Database Performance**: Optimized queries with proper indexing
- **Monitoring**: Built-in CloudWatch metrics and alerting

## Compliance and Standards

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code style enforcement
- **Testing**: Unit and integration test framework
- **Documentation**: Comprehensive inline documentation

### Accessibility
- **WCAG 2.1**: AA compliance for web interface
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Compatible with assistive technologies
- **Color Contrast**: Meets accessibility standards

### License and Legal
- **MIT License**: Open source license for generated code
- **Attribution**: Proper attribution requirements
- **Disclaimer**: Clear cost and responsibility disclaimers
- **Terms of Use**: Explicit usage terms and limitations

## Monitoring and Analytics

### Application Monitoring
- **Error Tracking**: Comprehensive error logging and tracking
- **Performance Metrics**: Response time and throughput monitoring
- **User Analytics**: Usage patterns and engagement tracking
- **System Health**: Database and application health checks

### Business Metrics
- **Download Statistics**: Repository download tracking by use case
- **User Engagement**: Sign-in frequency and retention metrics
- **Demo Requests**: Custom demonstration request analytics
- **Conversion Tracking**: Lead generation and follow-up metrics

## Maintenance Requirements

### Regular Updates
- **Dependency Updates**: Monthly security and feature updates
- **Database Migrations**: Schema evolution management
- **CloudFormation Updates**: AWS service and feature updates
- **Documentation Updates**: Keep deployment guides current

### Backup and Recovery
- **Database Backups**: Automated daily backups with retention
- **Code Repository**: Version control with Git
- **Configuration Backup**: Environment and secret backup procedures
- **Disaster Recovery**: Recovery time objective < 4 hours

## Integration Requirements

### External Services
- **Firebase Authentication**: OAuth provider integration
- **AWS Services**: CloudFormation template compatibility
- **Email Services**: Optional notification system
- **Analytics Services**: Usage tracking integration

### API Compatibility
- **RESTful APIs**: Standard HTTP methods and status codes
- **JSON Responses**: Consistent response format
- **Error Handling**: Standardized error response format
- **Rate Limiting**: Protection against abuse

This comprehensive requirements document serves as the complete specification for the Cloud Database Demo Generator application, covering all technical, functional, and operational requirements necessary for successful deployment and maintenance.