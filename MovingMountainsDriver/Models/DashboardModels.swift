import Foundation
import CoreLocation

// MARK: - Dashboard Stats
struct DashboardStats {
    struct DeliveryStats {
        let total: Int
        let completed: Int
        let pending: Int
        let trend: Double // Percentage change
    }
    
    let deliveries: DeliveryStats
    let rating: Double
    let totalDistance: Double // in miles
}

// MARK: - Earnings
struct Earnings {
    let day: String
    let week: String
    let month: String
    let trend: Double // Percentage change
}

// MARK: - FAB Item
struct FABItem {
    let icon: String
    let color: Color
    let action: () -> Void
}

// MARK: - Location
extension CLLocationCoordinate2D {
    static var defaultLocation: CLLocationCoordinate2D {
        return CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194) // San Francisco
    }
} 