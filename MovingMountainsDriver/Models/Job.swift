import Foundation

struct Job: Identifiable, Codable {
    let id: Int
    let title: String
    let description: String
    let address: String
    let status: String
    let assignedTo: Int
    let clientName: String
    let clientPhone: String
    let scheduledDate: Date
    let estimatedDuration: TimeInterval
    let shipments: [String] // IDs of related shipments
    let createdAt: Date?
    let updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, address, status
        case assignedTo = "assigned_to"
        case clientName = "client_name"
        case clientPhone = "client_phone"
        case scheduledDate = "scheduled_date"
        case estimatedDuration = "estimated_duration"
        case shipments
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // Helper computed properties
    var isCompleted: Bool {
        return status == "completed"
    }
    
    var isPending: Bool {
        return status == "pending"
    }
    
    var isInProgress: Bool {
        return status == "in_progress"
    }
    
    var isCancelled: Bool {
        return status == "cancelled"
    }
    
    var statusColor: String {
        switch status {
        case "pending":
            return "orange"
        case "in_progress":
            return "blue"
        case "completed":
            return "green"
        case "cancelled":
            return "red"
        default:
            return "gray"
        }
    }
    
    var formattedDuration: String {
        let hours = Int(estimatedDuration) / 3600
        let minutes = (Int(estimatedDuration) % 3600) / 60
        
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
} 