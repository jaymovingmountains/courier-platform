import Foundation

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
    
    enum CodingKeys: String, CodingKey {
        case id, description, status, weight, dimensions
        case trackingNumber = "tracking_number"
        case pickupAddress = "pickup_address"
        case deliveryAddress = "delivery_address"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case estimatedDeliveryTime = "estimated_delivery_time"
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