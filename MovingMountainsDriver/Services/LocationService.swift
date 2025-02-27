import Foundation
import CoreLocation
import Combine

class LocationService: NSObject, ObservableObject {
    static let shared = LocationService()
    
    private let locationManager = CLLocationManager()
    private let apiClient: APIClient
    
    @Published var currentLocation: CLLocation?
    @Published var locationStatus: CLAuthorizationStatus?
    @Published var isTrackingEnabled = false
    @Published var lastUpdateSent: Date?
    
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
            do {
                let success = try await apiClient.updateLocation(
                    latitude: location.coordinate.latitude, 
                    longitude: location.coordinate.longitude
                )
                
                if success {
                    DispatchQueue.main.async {
                        self.lastUpdateSent = Date()
                    }
                }
            } catch {
                print("Failed to send location update: \(error.localizedDescription)")
            }
        }
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async {
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
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        DispatchQueue.main.async {
            self.currentLocation = location
        }
        
        // If significant movement detected, send update immediately
        if shouldSendImmediateUpdate(location) {
            sendLocationUpdate()
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
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

// Add extension to APIClient for location updates
extension APIClient {
    func updateLocation(latitude: Double, longitude: Double) async throws -> Bool {
        struct LocationUpdate: Codable {
            let latitude: Double
            let longitude: Double
            let timestamp: Date
        }
        
        struct LocationUpdateResponse: Codable {
            let success: Bool
        }
        
        let locationUpdate = LocationUpdate(
            latitude: latitude,
            longitude: longitude,
            timestamp: Date()
        )
        
        let body = try JSONEncoder().encode(locationUpdate)
        
        let response: LocationUpdateResponse = try await fetch(
            endpoint: "/driver/location",
            method: "POST",
            body: body
        )
        
        return response.success
    }
} 