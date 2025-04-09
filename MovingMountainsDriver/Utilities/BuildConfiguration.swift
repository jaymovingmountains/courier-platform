import Foundation

enum Environment {
    case development
    case staging
    case production
}

class BuildConfiguration {
    static let shared = BuildConfiguration()
    
    #if DEBUG
    private let environment: Environment = .development
    #else
    private let environment: Environment = .production
    #endif
    
    var baseURL: String {
        switch self.environment {
        case .development:
            return "http://localhost:3001"
        case .staging:
            return "http://localhost:3001"
        case .production:
            return "http://localhost:3001"
        }
    }
    
    var isDebugMode: Bool {
        return environment == .development
    }
    
    // API endpoints
    struct API {
        static let login = "/login"
        static let jobs = "/jobs"
        static let shipments = "/shipments"
        static let vehicles = "/vehicles"
    }
    
    // App-wide settings
    struct Settings {
        static let locationUpdateInterval: TimeInterval = 300 // 5 minutes
        static let sessionTimeout: TimeInterval = 3600 // 1 hour
    }
}

// Usage example:
// let loginURL = "\(BuildConfiguration.shared.baseURL)\(BuildConfiguration.API.login)" 