import Foundation
import CoreData

enum ShipmentStatus: String, Codable {
    case pending = "pending"
    case pickedUp = "picked_up"
    case inTransit = "in_transit"
    case delivered = "delivered"
    case failed = "failed"
    
    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .pickedUp: return "Picked Up"
        case .inTransit: return "In Transit"
        case .delivered: return "Delivered"
        case .failed: return "Failed"
        }
    }
}

struct ShipmentDTO: Identifiable, Codable {
    let id: String
    let trackingNumber: String
    let status: ShipmentStatus
    let description: String
    let weight: Double?
    let dimensions: Dimensions?
    let pickupAddress: Address
    let deliveryAddress: Address
    let createdAt: Date
    let updatedAt: Date
    let estimatedDeliveryTime: Date?
    
    // Optional properties that might not be present in all database responses
    let shipperId: Int?
    let driverId: Int?
    let vehicleId: Int?
    let vehicleName: String?
    let licensePlate: String?
    let shipmentType: String?
    let quoteAmount: Double?
    let province: String?
    
    enum CodingKeys: String, CodingKey {
        case id, description, status, weight, dimensions
        case trackingNumber = "tracking_number"
        case pickupAddress = "pickup_address"
        case deliveryAddress = "delivery_address"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case estimatedDeliveryTime = "estimated_delivery_time"
        case shipperId = "shipper_id"
        case driverId = "driver_id"
        case vehicleId = "vehicle_id"
        case vehicleName = "vehicle_name"
        case licensePlate = "license_plate"
        case shipmentType = "shipment_type"
        case quoteAmount = "quote_amount"
        case province
    }
}

struct Dimensions: Codable {
    let length: Double
    let width: Double
    let height: Double
    let unit: String
}

extension ShipmentDTO {
    var formattedWeight: String? {
        guard let weight = weight else { return nil }
        return "\(weight) kg"
    }
    
    var formattedDimensions: String? {
        guard let dimensions = dimensions else { return nil }
        return "\(dimensions.length) x \(dimensions.width) x \(dimensions.height) \(dimensions.unit)"
    }
    
    var statusColor: String {
        switch status {
        case .pending: return "yellow"
        case .pickedUp: return "blue"
        case .inTransit: return "orange"
        case .delivered: return "green"
        case .failed: return "red"
        }
    }
    
    var isDelivered: Bool {
        return status == .delivered
    }
    
    var canBePickedUp: Bool {
        return status == .pending
    }
}

// Helper extension for CoreDataManager integration
extension ShipmentDTO {
    // Simplified conversion for CoreDataManager compatibility
    func toManagedObject(context: NSManagedObjectContext) -> Shipment {
        let shipment = Shipment(context: context)
        
        // Convert String ID to Int64 if possible
        if let idInt = Int64(id) {
            shipment.id = idInt
        }
        
        shipment.status = status.rawValue
        
        // Parse pickup address into components
        shipment.pickupAddress = pickupAddress.street
        shipment.pickupCity = pickupAddress.city
        shipment.pickupPostalCode = pickupAddress.zipCode
        
        // Parse delivery address into components
        shipment.deliveryAddress = deliveryAddress.street
        shipment.deliveryCity = deliveryAddress.city
        shipment.deliveryPostalCode = deliveryAddress.zipCode
        
        shipment.createdAt = createdAt
        
        // Set additional fields if they're available in the Core Data model
        // We'll need to check if these fields exist in Core Data
        if let shipperId = shipperId {
            shipment.shipperId = Int64(shipperId)
        }
        
        if let driverId = driverId {
            shipment.driverId = Int64(driverId)
        }
        
        if let vehicleId = vehicleId {
            shipment.vehicleId = Int64(vehicleId)
        }
        
        if let shipmentType = shipmentType {
            shipment.shipmentType = shipmentType
        }
        
        if let quoteAmount = quoteAmount {
            shipment.quoteAmount = quoteAmount
        }
        
        // Do not set weight, trackingNumber, descript, or updatedAt since they don't exist in the Core Data model
        
        return shipment
    }
    
    // Static method to convert from CoreData Shipment to ShipmentDTO
    static func fromManagedObject(_ shipment: Shipment) -> ShipmentDTO {
        // Default addresses if data is incomplete
        let pickupAddress = Address(
            street: shipment.pickupAddress ?? "",
            city: shipment.pickupCity ?? "",
            state: "",
            zipCode: shipment.pickupPostalCode ?? "",
            country: "",
            latitude: nil,
            longitude: nil
        )
        
        let deliveryAddress = Address(
            street: shipment.deliveryAddress ?? "",
            city: shipment.deliveryCity ?? "",
            state: "",
            zipCode: shipment.deliveryPostalCode ?? "",
            country: "",
            latitude: nil,
            longitude: nil
        )
        
        // Parse status string to ShipmentStatus enum
        let statusValue = shipment.status ?? "pending"
        let status = ShipmentStatus(rawValue: statusValue) ?? .pending
        
        return ShipmentDTO(
            id: String(shipment.id),
            trackingNumber: "", // Default empty string as it doesn't exist in Core Data
            status: status,
            description: "", // Default empty string as it doesn't exist in Core Data
            weight: nil, // Set to nil as it doesn't exist in Core Data
            dimensions: nil, // Dimensions would be constructed from separate fields if available
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            createdAt: shipment.createdAt ?? Date(),
            updatedAt: Date(), // Use current date as a fallback since it doesn't exist in Core Data
            estimatedDeliveryTime: nil,
            shipperId: Int(shipment.shipperId),
            driverId: shipment.driverId > 0 ? Int(shipment.driverId) : nil,
            vehicleId: shipment.vehicleId > 0 ? Int(shipment.vehicleId) : nil,
            vehicleName: shipment.vehicle?.vehicleName,
            licensePlate: shipment.vehicle?.licensePlate,
            shipmentType: shipment.shipmentType,
            quoteAmount: shipment.quoteAmount,
            province: shipment.province
        )
    }
}