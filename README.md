# Moving Mountains Logistics Platform

## System Overview

Moving Mountains is a comprehensive logistics and shipping management platform that connects shippers with drivers to facilitate efficient shipment management and delivery tracking. The platform consists of four main components:

1. **Shipper Web Portal** - A React-based web application for shippers to create, manage, and track shipments
2. **Admin Web Portal** - A React-based web application for administrators to manage the entire system
3. **Driver Mobile App** - A Swift/iOS native application for drivers to accept and manage deliveries
4. **Backend Server** - A Node.js/Express server with a SQLite database that powers all applications

## Architecture

The system follows a client-server architecture with RESTful API communication:

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │          │                 │
│  Shipper Portal │          │  Admin Portal   │          │   Driver App    │
│  (React.js)     │          │  (React.js)     │          │   (Swift/iOS)   │
│                 │          │                 │          │                 │
└────────┬────────┘          └────────┬────────┘          └────────┬────────┘
         │                            │                            │
         │                            │                            │
         │                            ▼                            │
         │                   ┌─────────────────┐                   │
         └──────────────────►│                 │◄──────────────────┘
                             │  Express Server │    
                             │  (Node.js)      │    
                             │                 │    
                             └────────┬────────┘    
                                      │
                                      │
                                      ▼
                             ┌─────────────────┐
                             │                 │
                             │     SQLite      │
                             │    Database     │
                             │                 │
                             └─────────────────┘
```

## Shipper Web Portal

The shipper web portal is built with React and uses modern web technologies to provide a comprehensive shipment management interface.

### Key Features

- **User Authentication**: Secure login/logout with role-based access control
- **Dashboard**: Overview of shipment activities with real-time statistics
- **Shipment Management**: Create, view, update, and track shipments
- **Client Management**: Maintain a database of clients for rapid shipment creation
- **Notification System**: Real-time updates about shipment status changes
- **Invoice Generation**: Generate and manage invoices for completed shipments

### Tech Stack

- **Frontend Framework**: React.js
- **State Management**: React Hooks and Context API
- **Routing**: React Router
- **UI Components**: Bootstrap with custom styling
- **API Communication**: Fetch API with custom service layer
- **Notification**: Real-time polling system with optimized fetch

## Admin Web Portal

The Admin Portal is a comprehensive management interface allowing administrators to oversee the entire logistics platform, manage users, and monitor system activities.

### Key Features

- **User Management**: Create, modify, and deactivate user accounts (shippers and drivers)
- **System Configuration**: Adjust system settings and parameters
- **Vehicle Management**: Manage the fleet of delivery vehicles
- **Activity Monitoring**: View system logs and monitor user actions
- **Reports Generation**: Generate and export operational reports
- **Rate Management**: Set and adjust pricing models and shipping rates
- **Content Management**: Update help documentation and system announcements

### Tech Stack

- **Frontend Framework**: React.js (shared codebase with Shipper Portal)
- **State Management**: React Hooks and Context API
- **Routing**: React Router with protected admin routes
- **UI Components**: Bootstrap with admin-specific styling
- **Data Visualization**: Chart.js for analytics and reporting
- **Role-Based Access Control**: Advanced permission system for administrative functions

### Admin-Specific Workflows

1. **User Provisioning**: Create shipper accounts and assign initial credentials
2. **Driver Onboarding**: Register new drivers and assign vehicles
3. **System Monitoring**: Track system performance metrics
4. **Dispute Resolution**: Handle issues between shippers and drivers
5. **Global Notifications**: Send system-wide announcements to users

## Driver Mobile App

The driver application is a native iOS app built with Swift that allows drivers to manage their assigned deliveries efficiently.

### Key Features

- **Authentication**: Driver-specific login and secure session management
- **Job Dashboard**: View active and available jobs
- **Job Acceptance**: Accept available shipments based on location and preferences
- **Status Updates**: Update shipment statuses (picked up, in transit, delivered)
- **Navigation**: Integrated maps for route planning and navigation
- **Photo Documentation**: Capture delivery proof and document conditions
- **History**: Track completed deliveries and maintain delivery records

### Tech Stack

- **Language**: Swift
- **Architecture**: MVVM (Model-View-ViewModel)
- **State Management**: Combine framework
- **UI Framework**: SwiftUI and UIKit
- **Maps**: MapKit integration
- **Networking**: URLSession with custom APIClient
- **Error Handling**: Comprehensive error hierarchy with user-friendly messages

## Backend Server

The backend is built with Node.js and Express, providing RESTful APIs for both the web portal and mobile app.

### Key Features

- **Authentication & Authorization**: JWT-based auth with role validation
- **API Endpoints**: Comprehensive RESTful API for all system functions
- **Database Operations**: CRUD operations for all entities
- **Business Logic**: Validation, status transitions, notifications
- **Error Handling**: Standardized error responses with useful messages

### Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite with custom query utilities
- **Authentication**: JSON Web Tokens (JWT)
- **Password Security**: bcrypt for password hashing

## Database Structure

The system uses a SQLite database with the following key tables:

### Tables

1. **users**
   - id, username, password, role, name

2. **vehicles**
   - id, vehicle_name, license_plate

3. **shipments**
   - id, shipper_id, driver_id, vehicle_id, shipment_type, pickup_address, pickup_city, pickup_postal_code, delivery_address, delivery_city, delivery_postal_code, status, quote_amount, created_at, province, invoiceUrl

4. **jobs**
   - id, shipment_id, driver_id, status, assigned_at, completed_at

5. **notifications**
   - id, shipper_id, shipment_id, title, message, type, created_at, is_read

6. **clients**
   - id, shipper_id, name, email, phone, company, address, city, postal_code, notes, created_at

7. **system_logs**
   - id, user_id, action, details, ip_address, created_at

8. **settings**
   - key, value, description, updated_at, updated_by

## API Endpoints

The server exposes the following key API endpoints:

### Authentication

- `POST /login` - User login with role validation
- `POST /driver/login` - Driver-specific login
- `POST /refresh-token` - Refresh authentication token

### Shipments

- `GET /shipments` - List shipments with filtering
- `GET /shipments/:id` - Get shipment details
- `POST /shipments` - Create new shipment
- `PUT /shipments/:id` - Update shipment
- `PUT /shipments/:id/status` - Update shipment status
- `GET /shipments/:id/label` - Generate shipping label

### Jobs

- `GET /jobs` - List jobs with filtering
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/accept` - Driver accepts a job
- `PUT /jobs/:id/status` - Update job status

### Notifications

- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/count` - Get unread notification count
- `PUT /api/notifications/read` - Mark specific notifications as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

### Clients

- `GET /clients` - List clients for a shipper
- `POST /clients` - Create new client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete client

### Users

- `GET /users` - Admin only: list users
- `POST /users` - Admin only: create user
- `PUT /users/:id` - Update user or profile

### Admin Endpoints

- `GET /admin/logs` - Get system activity logs
- `GET /admin/stats` - Get system performance statistics
- `GET /admin/users/audit` - Get user activity audit trail
- `POST /admin/announcements` - Create system-wide announcement
- `PUT /admin/settings` - Update system settings

## Notification System

The platform includes a comprehensive notification system that:

1. **Generates notifications** for various events:
   - Shipment status changes
   - Driver assignments
   - Quote updates
   - Payment confirmations
   - System announcements (admin-triggered)

2. **Delivers notifications** to relevant parties:
   - Shippers receive updates about their shipments
   - Drivers receive job assignments and updates
   - Admins receive system alerts and reports

3. **Manages notification state**:
   - Tracks read/unread status
   - Provides real-time unread count
   - Allows batch marking as read

4. **Optimizes performance**:
   - Background polling with debouncing
   - Pause/resume mechanism during user interaction
   - Efficient state updates to prevent unnecessary re-renders

## Authentication and Authorization

The system implements a secure authentication and authorization mechanism:

1. **Authentication**:
   - JWT-based authentication
   - Secure password hashing with bcrypt
   - Token expiration and refresh
   - Portal-specific validation (shipper vs. driver vs. admin)

2. **Authorization**:
   - Role-based access control (shipper, admin, driver)
   - Resource-level permissions
   - Route protection in both frontend and backend
   - Admin-specific permission levels

## Key Workflows

### Shipment Lifecycle

1. **Creation**: Shipper creates a new shipment
2. **Quote**: System generates a quote (or manual quote is provided)
3. **Approval**: Shipper approves the quote
4. **Assignment**: Driver accepts the job
5. **Pickup**: Driver picks up the shipment
6. **Transit**: Shipment is in transit
7. **Delivery**: Driver delivers and documents delivery
8. **Completion**: Shipment is marked as complete
9. **Invoicing**: System generates an invoice

### Notification Workflow

1. **Generation**: Events trigger notification creation in the database
2. **Delivery**: Notifications are fetched by clients via polling
3. **Display**: Unread count is shown in the UI
4. **Reading**: User views notifications and they are marked as read

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Xcode 13+ (for iOS app)
- SQLite 3

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-org/moving-mountains.git
cd moving-mountains

# Install dependencies
npm install

# Setup database (creates tables if they don't exist)
node setup-db.js

# Start the server
npm start
```

### Web Portals Setup (Shipper and Admin)

```bash
# Navigate to web portal directory
cd shipper-web

# Install dependencies
npm install

# Start development server
npm start

# For admin portal (if separate build)
cd ../admin-web
npm install
npm start
```

### iOS App Setup

```bash
# Open the Xcode project
open MovingMountainsDriver/MovingMountainsDriver.xcodeproj

# Configure the API endpoint in APIConstants.swift
# Build and run in Xcode simulator or device
```

## Troubleshooting

Common issues and solutions:

1. **Authentication failures**:
   - Check token expiration
   - Verify user role matches the portal being accessed

2. **Missing notifications**:
   - Ensure the server can correctly identify the user from the token
   - Check database permissions

3. **Status transition errors**:
   - Follow the proper status sequence: pending → approved → assigned → picked_up → in_transit → delivered
   - Some transitions require specific role permissions

## Contributing

Please follow our development guidelines:

1. Branch naming: `feature/feature-name` or `fix/issue-name`
2. Commit messages should be descriptive and reference issues
3. Include tests for new features
4. Update documentation for API changes

## Project Structure

```
moving-mountains/
├── server.js              # Main Express server entry point
├── database.js            # Database connection and utilities
├── courier.db             # SQLite database file
├── migrations/            # Database migrations
├── shipper-web/           # React frontend for shippers
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service classes
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── context/       # React context providers
├── admin-web/             # React frontend for administrators
│   ├── src/
│   │   ├── components/    # Admin-specific components
│   │   ├── pages/         # Admin pages and dashboards
│   │   ├── services/      # Admin API services
│   │   ├── hooks/         # Admin custom hooks
│   │   ├── utils/         # Admin utilities
│   │   └── context/       # Admin context providers
├── MovingMountainsDriver/ # iOS driver app
│   ├── ViewModels/        # ViewModels (MVVM architecture)
│   ├── Views/             # SwiftUI views
│   ├── Models/            # Data models and DTOs
│   ├── Services/          # API and business logic services
│   └── Utilities/         # Helper functions and extensions
└── test/                  # Server tests
``` 