import Foundation
import CoreLocation

struct Address: Codable {
    let street: String
    let city: String
    let state: String
    let zipCode: String
    let country: String
    let latitude: Double?
    let longitude: Double?
    
    enum CodingKeys: String, CodingKey {
        case street, city, state, country
        case zipCode = "zip_code"
        case latitude, longitude
    }
}

extension Address {
    var formattedAddress: String {
        return [street, city, state, zipCode, country].joined(separator: ", ")
    }
    
    var coordinates: CLLocationCoordinate2D? {
        guard let latitude = latitude, 
              let longitude = longitude else {
            return nil
        }
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
} 