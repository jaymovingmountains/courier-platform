import Foundation

struct JWTDecoder {
    enum JWTError: Error {
        case invalidToken
        case decodingFailed
    }
    
    static func decode<T: Decodable>(token: String) throws -> T {
        // Split the JWT token into its components
        let segments = token.components(separatedBy: ".")
        guard segments.count >= 2 else {
            throw JWTError.invalidToken
        }
        
        // Get the payload segment (second part)
        let payloadSegment = segments[1]
        
        // Base64 decode the payload
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if needed
        while base64.count % 4 != 0 {
            base64 += "="
        }
        
        // Decode base64
        guard let payloadData = Data(base64Encoded: base64) else {
            throw JWTError.decodingFailed
        }
        
        // Decode JSON
        return try JSONDecoder().decode(T.self, from: payloadData)
    }
} 