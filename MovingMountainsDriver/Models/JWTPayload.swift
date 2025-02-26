import Foundation

struct JWTPayload: Codable {
    let sub: String
    let id: Int
    let username: String
    let role: String
    let name: String?
    let exp: TimeInterval
    
    var isExpired: Bool {
        return Date().timeIntervalSince1970 > exp
    }
    
    func toUser() -> User {
        return User(
            id: id,
            username: username,
            role: role,
            name: name,
            email: nil,
            phone: nil,
            profileImageURL: nil,
            hireDate: nil,
            assignedVehicleId: nil,
            licenseNumber: nil,
            licenseExpiryDate: nil
        )
    }
} 