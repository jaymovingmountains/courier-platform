import Foundation

struct VehicleDTO: Identifiable, Codable {
    let id: Int
    let vehicleName: String
    let licensePlate: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case vehicleName = "vehicle_name"
        case licensePlate = "license_plate"
    }
} 