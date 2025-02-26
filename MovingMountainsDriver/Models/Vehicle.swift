import Foundation

struct Vehicle: Identifiable, Codable {
    let id: String
    let make: String
    let model: String
    let year: Int
    let licensePlate: String
    let vin: String
    let type: VehicleType
    let capacity: Double // in cubic feet
    let maxWeight: Double // in pounds
    let currentStatus: VehicleStatus
    let maintenanceHistory: [MaintenanceRecord]
    
    enum VehicleType: String, Codable {
        case box = "box_truck"
        case van = "cargo_van"
        case semi = "semi_truck"
        case flatbed = "flatbed"
    }
    
    enum VehicleStatus: String, Codable {
        case available = "available"
        case inUse = "in_use"
        case maintenance = "in_maintenance"
        case outOfService = "out_of_service"
    }
    
    struct MaintenanceRecord: Codable {
        let date: Date
        let description: String
        let cost: Double
        let mileage: Int
    }
} 