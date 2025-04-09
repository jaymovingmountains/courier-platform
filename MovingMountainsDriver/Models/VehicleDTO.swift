import Foundation
import CoreData

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

extension VehicleDTO {
    func toManagedObject(context: NSManagedObjectContext) -> Vehicle {
        let vehicle = Vehicle(context: context)
        vehicle.id = Int64(id)
        vehicle.vehicleName = vehicleName
        vehicle.licensePlate = licensePlate
        return vehicle
    }
    
    static func fromManagedObject(_ vehicle: Vehicle) -> VehicleDTO {
        return VehicleDTO(
            id: Int(vehicle.id),
            vehicleName: vehicle.vehicleName ?? "",
            licensePlate: vehicle.licensePlate ?? ""
        )
    }
}