import Foundation

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case forbidden(String)
    case networkError(Error)
    case decodingError(Error)
    case httpError(Int)
    case unknown
    case notFound
    case serverError(Int)
    
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Authentication required"
        case .forbidden(let message):
            return message
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .unknown:
            return "An unknown error occurred"
        case .notFound:
            return "Resource not found"
        case .serverError(let statusCode):
            return "Server error: \(statusCode)"
        }
    }
} 