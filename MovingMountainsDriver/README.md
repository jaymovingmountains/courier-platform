# Moving Mountains Driver App

A SwiftUI iOS application for delivery drivers to manage and track deliveries.

## Features

- Driver authentication and profile management
- Real-time job tracking and updates
- Turn-by-turn navigation to delivery locations
- Shipment management and status updates
- Push notifications for new jobs and updates
- Offline support with Core Data persistence

## Requirements

- iOS 15.0+
- Xcode 13.0+
- Swift 5.5+

## Installation

1. Clone the repository
2. Open `MovingMountainsDriver.xcodeproj` in Xcode
3. Build and run the project on a simulator or device

## Project Structure

```
/MovingMountainsDriver
  /App - Main application files
  /Views - UI components and screens
    /Authentication - Login and registration screens
    /Dashboard - Main driver dashboard
    /JobDetails - Job details and management
    /Status - Status update screens
    /Settings - App settings and preferences
  /Models - Data models
  /ViewModels - View models for the MVVM pattern
  /Services - Network and data services
  /Utilities - Helper functions and extensions
  /CoreData - Core Data models and persistence
  /Resources - Assets and resources
```

## Configuration

The app is configured to connect to a local backend by default. Update the `APIConstants` in `Utilities/Constants.swift` to point to your backend server.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For questions or support, contact support@movingmountains.com 