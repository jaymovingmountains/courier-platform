import Foundation

struct Constants {
    struct API {
        static let baseURL = "http://localhost:3001/api/v1"
        static let login = "\(baseURL)/auth/login"
        static let jobs = "\(baseURL)/jobs"
        static let shipments = "\(baseURL)/shipments"
        static let profile = "\(baseURL)/drivers/profile"
    }
    
    struct UserDefaultsKeys {
        static let isDarkMode = "isDarkMode"
        static let userRole = "userRole"
        static let language = "language"
        static let useMetricSystem = "useMetricSystem"
        static let notificationsEnabled = "notificationsEnabled"
        static let locationTrackingEnabled = "locationTrackingEnabled"
    }
    
    struct Headers {
        static let authorization = "Authorization"
        static let contentType = "Content-Type"
        static let accept = "Accept"
        static let portal = "x-portal"
    }
} 