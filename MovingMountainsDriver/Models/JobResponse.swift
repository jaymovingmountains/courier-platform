import Foundation

struct JobResponse: Codable {
    let message: String
    let status: String?
    let invoiceUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case message, status
        case invoiceUrl = "invoice_url"
    }
} 