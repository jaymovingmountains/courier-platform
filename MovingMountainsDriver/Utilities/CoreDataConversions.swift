import Foundation
import CoreData

// Extension to convert between JobDTO and Core Data Job entity
extension JobDTO {
    // Convert from DTO to CoreData entity
    func toManagedObject(context: NSManagedObjectContext) -> Job {
        let job = Job(context: context)
        job.id = Int64(id)
        job.shipperId = Int64(shipperId)
        if let driverId = driverId {
            job.driverId = Int64(driverId)
        }
        job.status = status
        job.province = province
        return job
    }
    
    // Convert from CoreData entity to DTO
    static func fromManagedObject(_ job: Job) -> JobDTO {
        return JobDTO(
            id: Int(job.id),
            shipperId: Int(job.shipperId),
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
            licensePlate: job.shipment?.vehicle?.licensePlate,
            assignedAt: job.assignedAt?.description,
            completedAt: job.completedAt?.description
        )
    }
}

// Extension to convert between ShipmentDTO and Core Data Shipment entity
extension ShipmentDTO {
    func toManagedObject(context: NSManagedObjectContext) -> Shipment {
        let shipment = Shipment(context: context)
        shipment.id = id
        shipment.trackingNumber = trackingNumber
        shipment.status = status.rawValue
        shipment.descript = description
        
        if let weight = weight {
            shipment.weight = weight
        }
        
        // Handle dimensions if present
        if let dimensions = dimensions {
            shipment.length = dimensions.length
            shipment.width = dimensions.width
            shipment.height = dimensions.height
            shipment.dimensionUnit = dimensions.unit
        }
        
        // Handle addresses
        // For pickup address, we'll create a string representation
        let pickupAddressStr = [
            pickupAddress.street,
            pickupAddress.city,
            pickupAddress.state,
            pickupAddress.zipCode
        ].joined(separator: ", ")
        
        shipment.pickupAddress = pickupAddressStr
        shipment.pickupCity = pickupAddress.city
        shipment.pickupPostalCode = pickupAddress.zipCode
        
        // For delivery address, we'll create a string representation
        let deliveryAddressStr = [
            deliveryAddress.street,
            deliveryAddress.city,
            deliveryAddress.state,
            deliveryAddress.zipCode
        ].joined(separator: ", ")
        
        shipment.deliveryAddress = deliveryAddressStr
        shipment.deliveryCity = deliveryAddress.city
        shipment.deliveryPostalCode = deliveryAddress.zipCode
        
        // Handle dates
        shipment.createdAt = createdAt
        shipment.updatedAt = updatedAt
        if let estimatedDeliveryTime = estimatedDeliveryTime {
            shipment.estimatedDeliveryTime = estimatedDeliveryTime
        }
        
        return shipment
    }
    
    static func fromManagedObject(_ shipment: Shipment) -> ShipmentDTO? {
        // Create pickup address
        let pickupAddressParts = (shipment.pickupAddress ?? "").components(separatedBy: ", ")
        var pickupStreet = ""
        var pickupState = ""
        
        if pickupAddressParts.count >= 1 {
            pickupStreet = pickupAddressParts[0]
        }
        if pickupAddressParts.count >= 3 {
            pickupState = pickupAddressParts[2]
        }
        
        let pickupAddress = Address(
            street: pickupStreet,
            city: shipment.pickupCity ?? "",
            state: pickupState,
            zipCode: shipment.pickupPostalCode ?? "",
            country: "USA",
            latitude: nil,
            longitude: nil
        )
        
        // Create delivery address
        let deliveryAddressParts = (shipment.deliveryAddress ?? "").components(separatedBy: ", ")
        var deliveryStreet = ""
        var deliveryState = ""
        
        if deliveryAddressParts.count >= 1 {
            deliveryStreet = deliveryAddressParts[0]
        }
        if deliveryAddressParts.count >= 3 {
            deliveryState = deliveryAddressParts[2]
        }
        
        let deliveryAddress = Address(
            street: deliveryStreet,
            city: shipment.deliveryCity ?? "",
            state: deliveryState,
            zipCode: shipment.deliveryPostalCode ?? "",
            country: "USA",
            latitude: nil,
            longitude: nil
        )
        
        // Create dimensions if all dimension fields are present
        var dimensions: Dimensions? = nil
        if let length = shipment.length,
           let width = shipment.width,
           let height = shipment.height,
           let unit = shipment.dimensionUnit {
            dimensions = Dimensions(
                length: length,
                width: width,
                height: height,
                unit: unit
            )
        }
        
        // Create ShipmentStatus from string
        let status: ShipmentStatus
        if let statusString = shipment.status,
           let parsedStatus = ShipmentStatus(rawValue: statusString) {
            status = parsedStatus
        } else {
            status = .pending // Default status
        }
        
        return ShipmentDTO(
            id: shipment.id,
            trackingNumber: shipment.trackingNumber ?? "",
            status: status,
            description: shipment.descript ?? "",
            weight: shipment.weight,
            dimensions: dimensions,
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            createdAt: shipment.createdAt ?? Date(),
            updatedAt: shipment.updatedAt ?? Date(),
            estimatedDeliveryTime: shipment.estimatedDeliveryTime
        )
    }
}

// VehicleDTO definition and conversion methods
struct VehicleDTO: Identifiable, Codable {
    let id: Int
    let vehicleName: String
    let licensePlate: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case vehicleName = "vehicle_name"
        case licensePlate = "license_plate"
    }
    
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