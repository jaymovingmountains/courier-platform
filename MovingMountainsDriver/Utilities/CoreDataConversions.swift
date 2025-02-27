import Foundation
import CoreData

// Extension to convert between JobDTO and Core Data Job entity
extension JobDTO {
    // Convert from DTO to CoreData entity
    func toManagedObject(context: NSManagedObjectContext) -> Job {
        let job = Job(context: context)
        job.id = Int64(id)
        job.shipmentId = Int64(shipmentId)
        if let driverId = driverId {
            job.driverId = Int64(driverId)
        }
        job.status = status
        job.province = province
        // Add other properties as needed
        return job
    }
    
    // Convert from CoreData entity to DTO
    static func fromManagedObject(_ job: Job) -> JobDTO {
        return JobDTO(
            id: Int(job.id),
            shipmentId: Int(job.shipmentId),
            driverId: job.driverId != 0 ? Int(job.driverId) : nil,
            status: job.status ?? "",
            shipmentType: job.shipment?.shipmentType,
            pickupAddress: job.shipment?.pickupAddress ?? "",
            pickupCity: job.shipment?.pickupCity ?? "",
            pickupPostalCode: job.shipment?.pickupPostalCode ?? "",
            deliveryAddress: job.shipment?.deliveryAddress ?? "",
            deliveryCity: job.shipment?.deliveryCity ?? "",
            deliveryPostalCode: job.shipment?.deliveryPostalCode ?? "",
            quoteAmount: job.shipment?.quoteAmount,
            createdAt: job.shipment?.createdAt?.description ?? "",
            province: job.province,
            vehicleId: job.shipment?.vehicle?.id != 0 ? Int(job.shipment?.vehicle?.id ?? 0) : nil,
            vehicleName: job.shipment?.vehicle?.vehicleName,
            licensePlate: job.shipment?.vehicle?.licensePlate
        )
    }
}

// Add similar extensions for ShipmentDTO and VehicleDTO
extension ShipmentDTO {
    func toManagedObject(context: NSManagedObjectContext) -> Shipment {
        let shipment = Shipment(context: context)
        shipment.id = Int64(id)
        shipment.shipperId = Int64(shipperId)
        if let driverId = driverId {
            shipment.driverId = Int64(driverId)
        }
        // Set other properties
        return shipment
    }
    
    static func fromManagedObject(_ shipment: Shipment) -> ShipmentDTO {
        // Create a ShipmentDTO from the managed object
        return ShipmentDTO(
            id: Int(shipment.id),
            shipperId: Int(shipment.shipperId),
            driverId: shipment.driverId != 0 ? Int(shipment.driverId) : nil,
            // Map other properties
        )
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