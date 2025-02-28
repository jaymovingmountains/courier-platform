import Foundation

struct APIConstants {
    // Base URL for API connections
    static let baseURL = "http://localhost:3001"
    
    // Authentication endpoints
    static let loginEndpoint = "/login"
    static let driverLoginEndpoint = "/driver/login"
    static let refreshTokenEndpoint = "/refresh-token"
    
    // Core resource endpoints matching server.js exactly
    static let jobsEndpoint = "/jobs"
    static let shipmentsEndpoint = "/shipments"
    static let driversEndpoint = "/drivers"
    static let driverLocationEndpoint = "/driver/location"
    
    // URL builder methods for job-related operations
    
    /// Returns job details endpoint with ID: /jobs/:id
    static func jobDetailsURL(id: Int) -> String {
        return "\(jobsEndpoint)/\(id)"
    }
    
    /// Returns job acceptance endpoint: /jobs/:id/accept
    static func jobAcceptURL(id: Int) -> String {
        return "\(jobsEndpoint)/\(id)/accept"
    }
    
    /// Returns job status update endpoint: /jobs/:id/status
    static func jobStatusUpdateURL(id: Int) -> String {
        return "\(jobsEndpoint)/\(id)/status"
    }
    
    // URL builder methods for shipment-related operations
    
    /// Returns shipment details endpoint with ID: /shipments/:id
    static func shipmentDetailsURL(id: Int) -> String {
        return "\(shipmentsEndpoint)/\(id)"
    }
    
    /// Returns vehicle assignment endpoint for a shipment: /shipments/:id/vehicle
    static func shipmentVehicleURL(id: Int) -> String {
        return "\(shipmentsEndpoint)/\(id)/vehicle"
    }
    
    /// Returns label endpoint for a shipment: /shipments/:id/label
    static func shipmentLabelURL(id: Int) -> String {
        return "\(shipmentsEndpoint)/\(id)/label"
    }
    
    /// Returns invoice endpoint for a shipment: /shipments/:id/invoice
    static func shipmentInvoiceURL(id: Int) -> String {
        return "\(shipmentsEndpoint)/\(id)/invoice"
    }
    
    /// Constructs query params for job filtering
    static func jobsWithParams(status: String? = nil, assigned: Bool? = nil) -> String {
        var params: [String] = []
        
        if let status = status {
            // Special case for "delivered" status - add explicit parameter to ensure server returns all delivered jobs
            if status == "delivered" {
                params.append("status=delivered")
                params.append("include_delivered=true")
            } else {
                params.append("status=\(status)")
            }
        }
        
        if let assigned = assigned {
            params.append("assigned=\(assigned)")
        }
        
        if params.isEmpty {
            return jobsEndpoint
        } else {
            return "\(jobsEndpoint)?\(params.joined(separator: "&"))"
        }
    }
    
    // Helper to build full URL strings
    static func fullURL(for endpoint: String) -> String {
        return "\(baseURL)\(endpoint)"
    }
}

struct NotificationConstants {
    static let newJobNotification = "com.movingmountains.driver.newjob"
    static let jobStatusUpdatedNotification = "com.movingmountains.driver.jobstatusupdate"
}

struct UserDefaultsKeys {
    static let authToken = "authToken"
    static let userId = "userId"
    static let username = "username"
    static let lastSyncTimestamp = "lastSyncTimestamp"
}

struct DeepLinkConstants {
    static let scheme = "movingmountains"
    static let jobDetailsPath = "jobs"
}

struct UIConstants {
    static let cornerRadius: CGFloat = 10
    static let standardPadding: CGFloat = 16
    static let buttonHeight: CGFloat = 50
    static let cardPadding: CGFloat = 12
} 