import Foundation

struct DriverProfile: Codable, Identifiable {
    let id: Int
    let userId: Int
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let licenseNumber: String
    let licenseExpiryDate: Date
    let vehicleType: String
    let vehicleMake: String
    let vehicleModel: String
    let vehiclePlate: String
    let profileImageUrl: String?
    let rating: Double?
    let completedJobs: Int
    let status: DriverStatus
    
    enum CodingKeys: String, CodingKey {
        case id, email, phone, rating, status
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case licenseNumber = "license_number"
        case licenseExpiryDate = "license_expiry_date"
        case vehicleType = "vehicle_type"
        case vehicleMake = "vehicle_make"
        case vehicleModel = "vehicle_model"
        case vehiclePlate = "vehicle_plate"
        case profileImageUrl = "profile_image_url"
        case completedJobs = "completed_jobs"
    }
}

enum DriverStatus: String, Codable {
    case available = "available"
    case busy = "busy"
    case offline = "offline"
    
    var displayName: String {
        switch self {
        case .available: return "Available"
        case .busy: return "Busy"
        case .offline: return "Offline"
        }
    }
}

struct DriverProfileUpdate: Codable {
    var firstName: String?
    var lastName: String?
    var email: String?
    var phone: String?
    var vehicleType: String?
    var vehicleMake: String?
    var vehicleModel: String?
    var vehiclePlate: String?
    var profileImageUrl: String?
    var status: DriverStatus?
    
    enum CodingKeys: String, CodingKey {
        case email, phone, status
        case firstName = "first_name"
        case lastName = "last_name"
        case vehicleType = "vehicle_type"
        case vehicleMake = "vehicle_make"
        case vehicleModel = "vehicle_model"
        case vehiclePlate = "vehicle_plate"
        case profileImageUrl = "profile_image_url"
    }
}

extension DriverProfile {
    var fullName: String {
        return "\(firstName) \(lastName)"
    }
    
    var formattedLicenseExpiry: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: licenseExpiryDate)
    }
    
    var formattedRating: String {
        guard let rating = rating else { return "N/A" }
        return String(format: "%.1f", rating)
    }
    
    var vehicle: String {
        return "\(vehicleMake) \(vehicleModel) (\(vehiclePlate))"
    }
    
    var statusColor: String {
        switch status {
        case .available: return "green"
        case .busy: return "orange"
        case .offline: return "gray"
        }
    }
} 