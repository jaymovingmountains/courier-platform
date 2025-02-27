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

extension JobDTO {
    var statusColor: String {
        switch status {
        case .pending: return "yellow"
        case .accepted: return "blue"
        case .inProgress: return "orange"
        case .completed: return "green"
        case .cancelled: return "red"
        }
    }
    
    var formattedCreatedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdAt)
    }
    
    var isActive: Bool {
        return status == .accepted || status == .inProgress
    }
    
    var canBeAccepted: Bool {
        return status == .pending
    }
} 