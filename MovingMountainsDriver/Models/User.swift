import Foundation

struct User: Identifiable, Codable {
    let id: Int
    let username: String
    let role: String
    let name: String?
    
    // Additional properties for the driver app
    let email: String?
    let phone: String?
    let profileImageURL: String?
    let hireDate: Date?
    let assignedVehicleId: String?
    let licenseNumber: String?
    let licenseExpiryDate: Date?
    
    var fullName: String {
        return name ?? username
    }
    
    enum CodingKeys: String, CodingKey {
        case id, username, role, name, email, phone
        case profileImageURL = "profile_image_url"
        case hireDate = "hire_date"
        case assignedVehicleId = "assigned_vehicle_id"
        case licenseNumber = "license_number"
        case licenseExpiryDate = "license_expiry_date"
    }
} 