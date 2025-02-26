# Moving Mountains Driver App

A SwiftUI iOS application for moving company drivers to manage job assignments, update delivery status, and track shipments.

## Features

- **Authentication**: Secure login for authorized drivers
- **Dashboard**: View upcoming and current job assignments
- **Job Details**: View comprehensive details about a job including client info, shipments, and directions
- **Status Updates**: Update job status with photos and notes from the field
- **History**: View past jobs with filtering options
- **Settings**: Configure app preferences and view profile information

## Requirements

- iOS 15.0+
- Xcode 13.0+
- Swift 5.5+

## Installation

1. Clone the repository
2. Open `MovingMountainsDriver.xcodeproj` in Xcode
3. Choose your target device/simulator
4. Build and Run the project (⌘+R)

## Project Structure

```
/MovingMountainsDriver
  /App
    - MovingMountainsDriverApp.swift (entry point)
    - AppDelegate.swift
    - SceneDelegate.swift
  /Views
    /Authentication
      - LoginView.swift
    /Dashboard
      - DashboardView.swift
    /JobDetails
      - JobDetailsView.swift
    /StatusUpdate
      - UpdateStatusView.swift
    /History
      - JobHistoryView.swift
    /Settings
      - SettingsView.swift
    /Components (reusable UI components)
      - PrimaryButton.swift
      - JobCard.swift
  /Models
    - Job.swift
    - Shipment.swift
    - Vehicle.swift
    - User.swift
  /ViewModels
    - AuthViewModel.swift
    - DashboardViewModel.swift
    - JobDetailsViewModel.swift
    - UpdateStatusViewModel.swift
  /Services
    - AuthService.swift
    - APIClient.swift
    - LocationService.swift
    - PersistenceService.swift
  /Utilities
    - Constants.swift
    - Extensions.swift
    - Formatters.swift
    - NetworkMonitor.swift
  /Resources
    - Assets.xcassets
    - Colors.xcassets
    - LaunchScreen.storyboard
    - Info.plist
```

## API Integration

The app is configured to connect to a backend API. In the development environment, it points to:

```
Base URL: http://localhost:3001
```

To point to a different API environment, update the `baseURL` in `Constants.swift`.

## Location Services

The app uses Core Location for:
- Tracking driver location
- Providing turn-by-turn directions to job sites
- Geotagging status updates and photos

Users will be prompted for location permissions during first use.

## Camera & Photo Library Integration

The app integrates with the device camera and photo library to:
- Take photos of deliveries
- Document job progress
- Upload evidence of completed jobs

Users will be prompted for camera and photo library permissions when these features are accessed.

## Persistence

The app uses:
- UserDefaults for general preferences
- Keychain for secure storage of authentication token
- Local caching for offline access to job data

## License

This project is proprietary and confidential. Unauthorized use is prohibited. 