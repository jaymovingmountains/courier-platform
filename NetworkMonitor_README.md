# NetworkMonitor for Moving Mountains Driver App

## Overview

`NetworkMonitor` is a robust solution for handling network connectivity in the Moving Mountains Driver app. It provides real-time connectivity tracking, offline request caching, automatic retry of failed requests, and seamless UI updates to keep users informed about their connection status.

## Features

- **Real-time network status monitoring** using Apple's NWPathMonitor
- **Automatic request caching** when offline
- **Persistent request storage** between app sessions
- **Automatic retry** of failed requests when connectivity is restored
- **Exponential backoff** for retry attempts
- **Visual indicators** for offline status
- **Type-safe request handling** with request context

## How to Use

### Basic Usage

The NetworkMonitor is implemented as a singleton, making it easy to access throughout the app:

```swift
// Access the shared instance
let networkMonitor = NetworkMonitor.shared

// Check current connectivity status
if networkMonitor.isConnected {
    // We're online, proceed with network operations
} else {
    // We're offline, handle accordingly
}

// Check connection type
if networkMonitor.connectionType == .wifi {
    // We're on WiFi
}
```

### Making Network-Aware API Requests

Use the APIClient extension to make network-aware requests:

```swift
let job: JobDTO = try await apiClient.fetchWithOfflineSupport(
    endpoint: "/jobs/123",
    requestType: "job_details"
)
```

When offline, this method will:
1. Cache the request for later retry
2. Throw an appropriate network error that you can handle in your UI

### Adding Offline Indicators to Views

Add offline indicators to any view using the provided modifier:

```swift
struct MyView: View {
    var body: some View {
        VStack {
            // Your view content
        }
        .withOfflineIndicator()  // Adds the sliding offline banner
    }
}
```

### Observing Network Status Changes

Observe network status changes in your ViewModels:

```swift
class MyViewModel: ObservableObject {
    private var connectivityCancellable: AnyCancellable?
    
    init() {
        // Listen for connectivity restoration
        connectivityCancellable = NotificationCenter.default.publisher(
            for: NetworkMonitor.connectivityRestoredNotification
        )
        .receive(on: RunLoop.main)
        .sink { [weak self] _ in
            // Handle connectivity restored
            self?.retryOperations()
        }
    }
}
```

Or observe the published properties directly:

```swift
@ObservedObject private var networkMonitor = NetworkMonitor.shared

// In your view body
Text(networkMonitor.isConnected ? "Online" : "Offline")
```

### Managing Cached Requests

View and manage cached requests:

```swift
// Check pending requests
let pendingCount = networkMonitor.pendingRequests.count

// Clear all pending requests
networkMonitor.reset()

// Manually retry all pending requests
networkMonitor.forceTriggerRetry()

// Cancel a specific request
networkMonitor.cancelRequest(id: requestId)
```

## Implementation Details

### RetryableRequest

This structure represents a network request that can be cached and retried:

```swift
struct RetryableRequest: Identifiable, Codable {
    let id: UUID
    let endpoint: String
    let method: String
    let body: Data?
    let timestamp: Date
    let retryCount: Int
    let maxRetries: Int
    let requestType: String
    
    // Helper methods...
}
```

### NetworkStatus

An enumeration of different network connectivity states:

```swift
enum NetworkStatus {
    case connected
    case disconnected
    case requiresConnection
    case unsatisfied
    
    // Helper properties...
}
```

## Demo

The app includes a NetworkStatusDemoView that demonstrates the NetworkMonitor's capabilities:

1. Navigate to the "Network" tab
2. View real-time network status
3. Test offline functionality by enabling Airplane Mode
4. Observe how requests are cached and automatically retried when connectivity returns

## Best Practices

1. Always use `fetchWithOfflineSupport` for API requests that need offline support
2. Add `.withOfflineIndicator()` to user-facing views
3. Subscribe to notifications to react to connectivity changes
4. Use specific request types to properly handle retried requests
5. Consider the user experience when designing offline flows 