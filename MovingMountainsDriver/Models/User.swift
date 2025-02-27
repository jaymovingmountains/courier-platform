import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let username: String
    let role: String
    
    enum CodingKeys: String, CodingKey {
        case id, username, role
    }
} 