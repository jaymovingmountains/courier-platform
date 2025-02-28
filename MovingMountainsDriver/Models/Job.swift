import Foundation

// Define a proper job status enum that matches server values
enum JobStatus: String, Codable {
    // From the validStatuses in server.js and other sources
    case pending = "pending"
    case approved = "approved"
    case quoted = "quoted"
    case assigned = "assigned"
    case pickedUp = "picked_up"
    case inTransit = "in_transit"
    case delivered = "delivered"
    case completed = "completed"
    case cancelled = "cancelled"
    
    // Display-friendly names
    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .approved: return "Approved"
        case .quoted: return "Quoted"
        case .assigned: return "Assigned"
        case .pickedUp: return "Picked Up"
        case .inTransit: return "In Transit"
        case .delivered: return "Delivered"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
    
    // Color for status badges
    var color: String {
        switch self {
        case .pending, .approved, .quoted: return "yellow"
        case .assigned: return "blue"
        case .pickedUp, .inTransit: return "orange"
        case .delivered, .completed: return "green"
        case .cancelled: return "red"
        }
    }
}

struct JobDTO: Identifiable, Codable {
    let id: Int            // Primary identifier from "s.id" in query
    let jobId: Int?        // Secondary identifier from "j.id as job_id"
    let shipperId: Int
    let driverId: Int?
    let status: JobStatus
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
    let assignedAt: String?
    let completedAt: String?
    
    // Custom initializer to replace the default memberwise initializer
    init(
        id: Int,
        jobId: Int? = nil,
        shipperId: Int,
        driverId: Int? = nil,
        status: JobStatus,
        shipmentType: String? = nil,
        pickupAddress: String,
        pickupCity: String,
        pickupPostalCode: String,
        deliveryAddress: String,
        deliveryCity: String,
        deliveryPostalCode: String,
        quoteAmount: Double? = nil,
        createdAt: String,
        province: String? = nil,
        vehicleId: Int? = nil,
        vehicleName: String? = nil,
        licensePlate: String? = nil,
        assignedAt: String? = nil,
        completedAt: String? = nil
    ) {
        self.id = id
        self.jobId = jobId
        self.shipperId = shipperId
        self.driverId = driverId
        self.status = status
        self.shipmentType = shipmentType
        self.pickupAddress = pickupAddress
        self.pickupCity = pickupCity
        self.pickupPostalCode = pickupPostalCode
        self.deliveryAddress = deliveryAddress
        self.deliveryCity = deliveryCity
        self.deliveryPostalCode = deliveryPostalCode
        self.quoteAmount = quoteAmount
        self.createdAt = createdAt
        self.province = province
        self.vehicleId = vehicleId
        self.vehicleName = vehicleName
        self.licensePlate = licensePlate
        self.assignedAt = assignedAt
        self.completedAt = completedAt
    }
    
    enum CodingKeys: String, CodingKey {
        // The id from shipment table (s.id)
        case id
        // The id from job table (j.id as job_id)
        case jobId = "job_id"
        // Status field from shipment table (s.status)
        case status
        // Other fields directly from SQL query
        case shipperId = "shipper_id"
        case driverId = "driver_id"
        case vehicleId = "vehicle_id"
        case shipmentType = "shipment_type"
        case pickupAddress = "pickup_address"
        case pickupCity = "pickup_city"
        case pickupPostalCode = "pickup_postal_code"
        case deliveryAddress = "delivery_address"
        case deliveryCity = "delivery_city"
        case deliveryPostalCode = "delivery_postal_code"
        case quoteAmount = "quote_amount"
        case createdAt = "created_at"
        case province
        case vehicleName = "vehicle_name"
        case licensePlate = "license_plate"
        case assignedAt = "assigned_at"
        case completedAt = "completed_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic required fields
        id = try container.decode(Int.self, forKey: .id)
        jobId = try? container.decodeIfPresent(Int.self, forKey: .jobId)
        
        // Handle status with proper error handling
        let statusString = try container.decode(String.self, forKey: .status)
        if let parsedStatus = JobStatus(rawValue: statusString) {
            status = parsedStatus
        } else {
            // If status doesn't match any known value, default to pending
            print("⚠️ Warning: Unknown job status '\(statusString)' - defaulting to pending")
            status = .pending
        }
        
        // Required fields with potential fallbacks
        do {
            shipperId = try container.decode(Int.self, forKey: .shipperId)
        } catch {
            print("⚠️ Error decoding shipperId: \(error)")
            // Fallback value - in a real app you might want to throw or handle differently
            shipperId = 0
        }
        
        // Optional fields
        driverId = try? container.decodeIfPresent(Int.self, forKey: .driverId)
        vehicleId = try? container.decodeIfPresent(Int.self, forKey: .vehicleId)
        shipmentType = try? container.decodeIfPresent(String.self, forKey: .shipmentType)
        
        // Address fields with fallbacks
        pickupAddress = (try? container.decodeIfPresent(String.self, forKey: .pickupAddress)) ?? ""
        pickupCity = (try? container.decodeIfPresent(String.self, forKey: .pickupCity)) ?? ""
        pickupPostalCode = (try? container.decodeIfPresent(String.self, forKey: .pickupPostalCode)) ?? ""
        deliveryAddress = (try? container.decodeIfPresent(String.self, forKey: .deliveryAddress)) ?? ""
        deliveryCity = (try? container.decodeIfPresent(String.self, forKey: .deliveryCity)) ?? ""
        deliveryPostalCode = (try? container.decodeIfPresent(String.self, forKey: .deliveryPostalCode)) ?? ""
        
        // Numeric fields
        quoteAmount = try? container.decodeIfPresent(Double.self, forKey: .quoteAmount)
        
        // Other optional fields
        createdAt = (try? container.decodeIfPresent(String.self, forKey: .createdAt)) ?? ""
        province = try? container.decodeIfPresent(String.self, forKey: .province)
        vehicleName = try? container.decodeIfPresent(String.self, forKey: .vehicleName)
        licensePlate = try? container.decodeIfPresent(String.self, forKey: .licensePlate)
        assignedAt = try? container.decodeIfPresent(String.self, forKey: .assignedAt)
        completedAt = try? container.decodeIfPresent(String.self, forKey: .completedAt)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        // Encode all fields consistently using snake_case keys
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(jobId, forKey: .jobId)
        try container.encode(shipperId, forKey: .shipperId)
        try container.encode(status.rawValue, forKey: .status)
        
        // Encode optional fields
        try container.encodeIfPresent(driverId, forKey: .driverId)
        try container.encodeIfPresent(vehicleId, forKey: .vehicleId)
        try container.encodeIfPresent(shipmentType, forKey: .shipmentType)
        try container.encodeIfPresent(province, forKey: .province)
        try container.encodeIfPresent(vehicleName, forKey: .vehicleName)
        try container.encodeIfPresent(licensePlate, forKey: .licensePlate)
        try container.encodeIfPresent(quoteAmount, forKey: .quoteAmount)
        
        // Encode address fields
        try container.encode(pickupAddress, forKey: .pickupAddress)
        try container.encode(pickupCity, forKey: .pickupCity)
        try container.encode(pickupPostalCode, forKey: .pickupPostalCode)
        try container.encode(deliveryAddress, forKey: .deliveryAddress)
        try container.encode(deliveryCity, forKey: .deliveryCity)
        try container.encode(deliveryPostalCode, forKey: .deliveryPostalCode)
        
        // Encode date fields
        try container.encode(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(assignedAt, forKey: .assignedAt)
        try container.encodeIfPresent(completedAt, forKey: .completedAt)
    }
}

// Job status constants
struct JobStatusConstants {
    static let pending = "pending"
    static let approved = "approved"
    static let quoted = "quoted"
    static let assigned = "assigned"
    static let pickedUp = "picked_up"
    static let inTransit = "in_transit"
    static let delivered = "delivered"
    static let completed = "completed"
    static let cancelled = "cancelled"
    
    // Define valid transitions to help with UI logic
    static func nextStatus(for currentStatus: String) -> String? {
        switch currentStatus {
        case pending, approved, quoted:
            return assigned
        case assigned:
            return pickedUp
        case pickedUp:
            return inTransit
        case inTransit:
            return delivered
        case delivered:
            return completed
        default:
            return nil // No valid transition
        }
    }
}

extension JobDTO {
    var statusColor: String {
        return status.color
    }
    
    var formattedCreatedDate: String {
        // Simply return the createdAt string as is for now
        // In a real app, you might want to parse and format this date
        return createdAt
    }
    
    var isActive: Bool {
        return status == .assigned || status == .pickedUp || status == .inTransit
    }
    
    var canBeAccepted: Bool {
        return status == .pending || status == .approved || status == .quoted
    }
    
    var canBePickedUp: Bool {
        return status == .assigned
    }
    
    var canBeMarkedInTransit: Bool {
        return status == .pickedUp
    }
    
    var canBeMarkedDelivered: Bool {
        return status == .inTransit
    }
    
    var canBeMarkedCompleted: Bool {
        return status == .delivered
    }
    
    var statusDisplayName: String {
        return status.displayName
    }
    
    var nextStatus: JobStatus? {
        switch status {
        case .pending, .approved, .quoted:
            return .assigned
        case .assigned:
            return .pickedUp
        case .pickedUp:
            return .inTransit
        case .inTransit:
            return .delivered
        case .delivered:
            return .completed
        default:
            return nil // No transition from completed or cancelled
        }
    }
}