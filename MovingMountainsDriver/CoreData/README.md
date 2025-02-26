# Core Data Implementation for Moving Mountains Driver App

This directory contains the Core Data implementation for offline storage in the Moving Mountains Driver app.

## Overview

The Core Data implementation provides offline storage capabilities for the app, allowing users to view and interact with their data even when they don't have an internet connection. Changes made while offline are queued and synchronized when the connection is restored.

## Components

### Core Data Model

The Core Data model (`MovingMountainsDriver.xcdatamodeld`) contains the following entities:

1. **JobEntity**
   - `id`: Int64
   - `shipmentId`: Int64
   - `driverId`: Int64
   - `status`: String
   - `assignedAt`: Date (optional)
   - `completedAt`: Date (optional)
   - `province`: String (optional)

2. **ShipmentEntity**
   - `id`: Int64
   - `shipperId`: Int64
   - `driverId`: Int64 (optional)
   - `vehicleId`: Int64 (optional)
   - `shipmentType`: String
   - `pickupAddress`: String
   - `pickupCity`: String
   - `pickupPostalCode`: String
   - `deliveryAddress`: String
   - `deliveryCity`: String
   - `deliveryPostalCode`: String
   - `status`: String
   - `quoteAmount`: Double
   - `createdAt`: Date
   - `province`: String (optional)
   - `invoiceUrl`: String (optional)

3. **VehicleEntity**
   - `id`: Int64
   - `vehicleName`: String
   - `licensePlate`: String

### Services

1. **PersistenceService**
   - Manages the Core Data stack
   - Provides methods for saving and fetching entities
   - Handles conversion between Core Data entities and domain models

2. **SyncService**
   - Synchronizes data between the API and local storage
   - Queues changes made while offline
   - Processes pending updates when the connection is restored
   - Provides methods for fetching data with offline fallback

## Usage

### Setting Up Core Data

1. Create the Core Data model file in Xcode:
   - File > New > File...
   - Select "Data Model" under the "Core Data" section
   - Name it "MovingMountainsDriver" and save it in the CoreData folder
   - Add the entities and attributes as described in the model section

2. Initialize the PersistenceService in your app:
   ```swift
   let persistenceService = PersistenceService.shared
   ```

3. Initialize the SyncService with your API client:
   ```swift
   let syncService = SyncService(apiClient: apiClient)
   ```

### Working with Offline Data

1. Fetch data with offline support:
   ```swift
   let jobs = await syncService.getJobs()
   ```

2. Queue updates for when the connection is restored:
   ```swift
   syncService.queueJobStatusUpdate(jobId: jobId, status: "completed", notes: "Job completed successfully")
   ```

3. Start monitoring for network changes:
   ```swift
   syncService.startNetworkMonitoring()
   ```

## Implementation Notes

- The NetworkMonitor class has been updated to post notifications when connectivity status changes
- ViewModels have been updated to handle offline scenarios
- The app shows appropriate UI feedback when in offline mode
- Changes made while offline are applied optimistically to the UI and queued for later synchronization 