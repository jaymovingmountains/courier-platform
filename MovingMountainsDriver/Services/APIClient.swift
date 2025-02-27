import Foundation
import Combine

enum APIError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(Int)
    case networkError(Error)
    case unauthorized
    case unknown
    
    var message: String {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noData: return "No data received"
        case .decodingError: return "Failed to decode response"
        case .serverError(let code): return "Server error: \(code)"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        case .unauthorized: return "Unauthorized access"
        case .unknown: return "Unknown error occurred"
        }
    }
}

class APIClient {
    private let authService: AuthService
    private let session: URLSession
    
    init(authService: AuthService, session: URLSession = .shared) {
        self.authService = authService
        self.session = session
    }
    
    func fetch<T: Decodable>(endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let url = URL(string: "\(APIConstants.baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        // Token retrieval and request creation 
        guard let token = authService.retrieveToken() else {
            throw APIError.unauthorized
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = body
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    return try JSONDecoder().decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError
                }
            case 401:
                // Handle token expiration
                authService.logout()
                throw APIError.unauthorized
            default:
                throw APIError.serverError(httpResponse.statusCode)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Job Operations
    
    /// Fetch all jobs assigned to the driver
    func getJobs() async throws -> [Job] {
        return try await fetch(endpoint: APIConstants.jobsEndpoint)
    }
    
    /// Fetch details for a specific job
    func getJobDetails(jobId: String) async throws -> Job {
        return try await fetch(endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)")
    }
    
    /// Update the status of a job
    func updateJobStatus(jobId: String, status: JobStatus) async throws -> Job {
        struct StatusUpdateRequest: Codable {
            let status: String
        }
        
        let updateRequest = StatusUpdateRequest(status: status.rawValue)
        let body = try JSONEncoder().encode(updateRequest)
        
        return try await fetch(
            endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/status",
            method: "PUT",
            body: body
        )
    }
    
    /// Accept a job assignment
    func acceptJob(jobId: String) async throws -> Job {
        return try await fetch(
            endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/accept",
            method: "POST"
        )
    }
    
    /// Decline a job assignment
    func declineJob(jobId: String, reason: String) async throws -> Bool {
        struct DeclineRequest: Codable {
            let reason: String
        }
        
        let declineRequest = DeclineRequest(reason: reason)
        let body = try JSONEncoder().encode(declineRequest)
        
        struct DeclineResponse: Codable {
            let success: Bool
        }
        
        let response: DeclineResponse = try await fetch(
            endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/decline",
            method: "POST",
            body: body
        )
        
        return response.success
    }
    
    // MARK: - Shipment Operations
    
    /// Fetch all shipments for the driver
    func getShipments() async throws -> [Shipment] {
        return try await fetch(endpoint: APIConstants.shipmentsEndpoint)
    }
    
    /// Fetch details for a specific shipment
    func getShipmentDetails(shipmentId: String) async throws -> Shipment {
        return try await fetch(endpoint: "\(APIConstants.shipmentsEndpoint)/\(shipmentId)")
    }
    
    /// Update shipment status (e.g., picked up, delivered)
    func updateShipmentStatus(shipmentId: String, status: ShipmentStatus) async throws -> Shipment {
        struct ShipmentStatusUpdateRequest: Codable {
            let status: String
        }
        
        let updateRequest = ShipmentStatusUpdateRequest(status: status.rawValue)
        let body = try JSONEncoder().encode(updateRequest)
        
        return try await fetch(
            endpoint: "\(APIConstants.shipmentsEndpoint)/\(shipmentId)/status",
            method: "PUT",
            body: body
        )
    }
    
    // MARK: - Profile Operations
    
    /// Fetch the driver profile
    func getDriverProfile() async throws -> DriverProfile {
        return try await fetch(endpoint: "/driver/profile")
    }
    
    /// Update driver profile information
    func updateDriverProfile(profile: DriverProfileUpdate) async throws -> DriverProfile {
        let body = try JSONEncoder().encode(profile)
        return try await fetch(
            endpoint: "/driver/profile",
            method: "PUT",
            body: body
        )
    }
    
    // MARK: - Location Tracking
    
    /// Update the driver's current location
    func updateLocation(latitude: Double, longitude: Double) async throws -> Bool {
        struct LocationUpdate: Codable {
            let latitude: Double
            let longitude: Double
            let timestamp: Date
        }
        
        let locationUpdate = LocationUpdate(
            latitude: latitude,
            longitude: longitude,
            timestamp: Date()
        )
        
        let body = try JSONEncoder().encode(locationUpdate)
        
        struct LocationUpdateResponse: Codable {
            let success: Bool
        }
        
        let response: LocationUpdateResponse = try await fetch(
            endpoint: "/driver/location",
            method: "POST",
            body: body
        )
        
        return response.success
    }
} 