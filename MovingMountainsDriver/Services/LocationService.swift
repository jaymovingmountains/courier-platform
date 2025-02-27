import Foundation
import CoreLocation
import Combine

// Add LocationConstants struct with minUpdateInterval
struct LocationConstants {
    static let minUpdateInterval: TimeInterval = 60 // 1 minute between updates
}

@MainActor
final class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationService()
    
    private let locationManager = CLLocationManager()
    private let apiClient: APIClient
    
    @Published var currentLocation: CLLocation?
    @Published var locationStatus: CLAuthorizationStatus?
    @Published var isTrackingEnabled = false
    @Published var lastUpdateSent: Date?
    @Published var trackingError: String?
    
    private let updateInterval: TimeInterval = 5 * 60  // 5 minutes
    private var updateTimer: Timer?
    
    init(apiClient: APIClient? = nil) {
        self.apiClient = apiClient ?? APIClient(authService: AuthService())
        super.init()
        self.locationManager.delegate = self
        self.locationManager.desiredAccuracy = kCLLocationAccuracyBest
        self.locationManager.requestWhenInUseAuthorization()
    }
    
    func startTracking() {
        isTrackingEnabled = true
        locationManager.startUpdatingLocation()
        
        // Setup timer for periodic location updates to server
        updateTimer = Timer.scheduledTimer(
            timeInterval: updateInterval,
            target: self,
            selector: #selector(sendLocationUpdate),
            userInfo: nil,
            repeats: true
        )
    }
    
    func stopTracking() {
        isTrackingEnabled = false
        locationManager.stopUpdatingLocation()
        updateTimer?.invalidate()
        updateTimer = nil
    }
    
    func requestAlwaysAuthorization() {
        locationManager.requestAlwaysAuthorization()
    }
    
    @objc private func sendLocationUpdate() {
        guard let location = currentLocation, isTrackingEnabled else { return }
        
        // Send location update to server
        Task {
            await sendLocationUpdate(location: location)
        }
    }
    
    private func sendLocationUpdate(location: CLLocation) async {
        // Check if we've updated recently to avoid excessive updates
        if let lastUpdate = lastUpdateSent, 
           Date().timeIntervalSince(lastUpdate) < LocationConstants.minUpdateInterval {
            return
        }
        
        do {
            let success = try await apiClient.updateLocation(
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            )
            
            if success {
                self.lastUpdateSent = Date()
            }
        } catch {
            print("Failed to send location update: \(error.localizedDescription)")
        }
    }
    
    // Method to update location directly (non-async wrapper)
    func updateDriverLocation(latitude: Double, longitude: Double, completion: @escaping (Bool, Error?) -> Void) {
        Task {
            do {
                let success = try await apiClient.updateLocation(
                    latitude: latitude,
                    longitude: longitude
                )
                completion(success, nil)
            } catch {
                completion(false, error)
            }
        }
    }
}

// Remove redundant protocol conformance
extension LocationService {
    @objc nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        // Update UI on the main actor
        Task { @MainActor in
            self.locationStatus = manager.authorizationStatus
            
            // If authorization status changes to authorized and tracking is enabled, restart tracking
            if (manager.authorizationStatus == .authorizedWhenInUse || 
                manager.authorizationStatus == .authorizedAlways) && 
                self.isTrackingEnabled {
                manager.startUpdatingLocation()
            } else {
                manager.stopUpdatingLocation()
            }
        }
    }
    
    @objc nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Update UI and handle location on the main actor
        Task { @MainActor in
            self.currentLocation = location
            
            // If significant movement detected, send update immediately
            if shouldSendImmediateUpdate(location) {
                sendLocationUpdate()
            }
        }
    }
    
    @objc nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager error: \(error.localizedDescription)")
    }
    
    private func shouldSendImmediateUpdate(_ newLocation: CLLocation) -> Bool {
        // Logic to determine if an immediate update is needed
        // For example, if moved more than 500 meters
        guard let lastLocation = currentLocation else { return true }
        
        // Also send update if it's been more than 15 minutes since the last one
        if let lastUpdate = lastUpdateSent, 
           Date().timeIntervalSince(lastUpdate) > 15 * 60 {
            return true
        }
        
        return newLocation.distance(from: lastLocation) > 500
    }
}

// Note: Removed the duplicate APIClient extension as it's likely defined elsewhere 