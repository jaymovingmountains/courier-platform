import Foundation
import CoreData

// MARK: - JobEntity Extensions

extension JobEntity {
    // Convert from Core Data entity to domain model
    func toDomainModel() -> Job? {
        // This is a simplified conversion - you'll need to adapt it to your Job model
        // Create a Job instance from the entity properties
        return nil // Placeholder - implement based on your Job model
    }
    
    // Update entity from domain model
    func update(from job: Job, context: NSManagedObjectContext) {
        self.id = Int64(job.id)
        self.status = job.status
        self.driverId = Int64(job.assignedTo)
        
        // Convert dates
        if let createdAt = job.createdAt {
            self.assignedAt = createdAt
        }
        
        if job.isCompleted, let updatedAt = job.updatedAt {
            self.completedAt = updatedAt
        }
        
        // Extract province from address if available
        let addressComponents = job.address.components(separatedBy: ",")
        if addressComponents.count >= 2 {
            let trimmedProvince = addressComponents[addressComponents.count - 2].trimmingCharacters(in: .whitespacesAndNewlines)
            self.province = trimmedProvince
        }
    }
}

// MARK: - ShipmentEntity Extensions

extension ShipmentEntity {
    // Convert from Core Data entity to domain model
    func toDomainModel() -> Shipment? {
        // Create a Shipment instance from the entity properties
        return nil // Placeholder - implement based on your Shipment model
    }
    
    // Update entity from domain model
    func update(from shipment: Shipment, context: NSManagedObjectContext) {
        self.id = Int64(shipment.id)
        self.shipperId = Int64(shipment.shipperId)
        self.driverId = shipment.driverId != nil ? Int64(shipment.driverId!) : nil
        self.vehicleId = shipment.vehicleId != nil ? Int64(shipment.vehicleId!) : nil
        self.shipmentType = shipment.shipmentType
        self.pickupAddress = shipment.pickupAddress
        self.pickupCity = shipment.pickupCity
        self.pickupPostalCode = shipment.pickupPostalCode
        self.deliveryAddress = shipment.deliveryAddress
        self.deliveryCity = shipment.deliveryCity
        self.deliveryPostalCode = shipment.deliveryPostalCode
        self.status = shipment.status
        self.quoteAmount = shipment.quoteAmount
        self.createdAt = shipment.createdAt
        self.province = shipment.province
        self.invoiceUrl = shipment.invoiceUrl
    }
}

// MARK: - VehicleEntity Extensions

extension VehicleEntity {
    // Convert from Core Data entity to domain model
    func toDomainModel() -> Vehicle? {
        // Create a Vehicle instance from the entity properties
        return Vehicle(
            id: Int(self.id),
            vehicleName: self.vehicleName ?? "",
            licensePlate: self.licensePlate ?? ""
        )
    }
    
    // Update entity from domain model
    func update(from vehicle: Vehicle, context: NSManagedObjectContext) {
        self.id = Int64(vehicle.id)
        self.vehicleName = vehicle.vehicleName
        self.licensePlate = vehicle.licensePlate
    }
}

// MARK: - Domain Models

// Vehicle domain model
struct Vehicle: Identifiable, Codable {
    let id: Int
    let vehicleName: String
    let licensePlate: String
}

// Shipment domain model (placeholder - implement based on your needs)
struct Shipment: Identifiable, Codable {
    let id: Int
    let shipperId: Int
    let driverId: Int?
    let vehicleId: Int?
    let shipmentType: String
    let pickupAddress: String
    let pickupCity: String
    let pickupPostalCode: String
    let deliveryAddress: String
    let deliveryCity: String
    let deliveryPostalCode: String
    let status: String
    let quoteAmount: Double
    let createdAt: Date
    let province: String?
    let invoiceUrl: String?
} 