import Foundation

struct JobDTO: Identifiable, Codable {
    let id: Int
    let shipmentId: Int
    let driverId: Int?
    let status: String
    let shipmentType: String?
    let pickupAddress: String
    let pickupCity: String
    let pickupPostalCode: String
    let deliveryAddress: String
    let deliveryCity: String
    let deliveryPostalCode: String
    let quoteAmount: Double?
    let createdAt: String
    let province: String?
    let vehicleId: Int?
    let vehicleName: String?
    let licensePlate: String?
    
    enum CodingKeys: String, CodingKey {
        case id, status, province
        case shipmentId = "shipment_id"
        case driverId = "driver_id"
        case shipmentType = "shipment_type"
        case pickupAddress = "pickup_address"
        case pickupCity = "pickup_city"
        case pickupPostalCode = "pickup_postal_code"
        case deliveryAddress = "delivery_address"
        case deliveryCity = "delivery_city"
        case deliveryPostalCode = "delivery_postal_code"
        case quoteAmount = "quote_amount"
        case createdAt = "created_at"
        case vehicleId = "vehicle_id"
        case vehicleName = "vehicle_name"
        case licensePlate = "license_plate"
    }
}

// Job status constants
struct JobStatusConstants {
    static let pending = "pending"
    static let accepted = "accepted" 
    static let inProgress = "in_progress"
    static let completed = "completed"
    static let cancelled = "cancelled"
}

extension JobDTO {
    var statusColor: String {
        switch status {
        case JobStatusConstants.pending: return "yellow"
        case JobStatusConstants.accepted: return "blue"
        case JobStatusConstants.inProgress: return "orange"
        case JobStatusConstants.completed: return "green"
        case JobStatusConstants.cancelled: return "red"
        default: return "gray"
        }
    }
    
    var formattedCreatedDate: String {
        // Simply return the createdAt string as is
        return createdAt
    }
    
    var isActive: Bool {
        return status == JobStatusConstants.accepted || status == JobStatusConstants.inProgress
    }
    
    var canBeAccepted: Bool {
        return status == JobStatusConstants.pending
    }
}