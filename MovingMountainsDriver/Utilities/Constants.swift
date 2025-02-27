import Foundation

struct APIConstants {
    static let baseURL = "http://localhost:3001"
    static let loginEndpoint = "/login"
    static let jobsEndpoint = "/jobs"
    static let shipmentsEndpoint = "/shipments"
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