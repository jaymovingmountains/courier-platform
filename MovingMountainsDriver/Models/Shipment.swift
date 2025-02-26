import Foundation

struct Shipment: Identifiable, Codable {
    let id: String
    let jobId: String
    let description: String
    let weight: Double
    let dimensions: Dimensions
    let status: ShipmentStatus
    let trackingNumber: String
    let specialInstructions: String
    
    struct Dimensions: Codable {
        let length: Double
        let width: Double
        let height: Double
        
        var formattedDimensions: String {
            return "\(length)\" × \(width)\" × \(height)\""
        }
    }
    
    enum ShipmentStatus: String, Codable {
        case pending = "pending"
        case inTransit = "in_transit"
        case delivered = "delivered"
        case damaged = "damaged"
        case lost = "lost"
    }
} 