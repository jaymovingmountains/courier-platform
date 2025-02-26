import Foundation
import Combine
import KeychainSwift

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)
    case unauthorized
    case forbidden(String)
    case unknown
    case notFound
    case serverError(Int)
}

class APIClient {
    private let session: URLSession
    private let keychain = KeychainSwift()
    private let tokenKey = "auth_token"
    private let authService: AuthService?
    
    // Initialize with optional auth service for dependency injection
    init(session: URLSession = .shared, authService: AuthService? = nil) {
        self.session = session
        self.authService = authService
    }
    
    // MARK: - Combine-based API methods
    
    func request(endpoint: String, method: HTTPMethod, parameters: [String: Any]? = nil) -> AnyPublisher<Data, Error> {
        guard let url = URL(string: endpoint) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth token if available
        if let token = authService?.getToken() ?? keychain.get(tokenKey) {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add parameters
        if let parameters = parameters {
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
            } catch {
                return Fail(error: error).eraseToAnyPublisher()
            }
        }
        
        return session.dataTaskPublisher(for: request)
            .mapError { APIError.networkError($0) }
            .flatMap { data, response -> AnyPublisher<Data, Error> in
                guard let httpResponse = response as? HTTPURLResponse else {
                    return Fail(error: APIError.invalidResponse).eraseToAnyPublisher()
                }
                
                switch httpResponse.statusCode {
                case 200...299:
                    return Just(data)
                        .setFailureType(to: Error.self)
                        .eraseToAnyPublisher()
                case 401:
                    // Token expired or invalid - logout
                    self.authService?.logout()
                    return Fail(error: APIError.unauthorized).eraseToAnyPublisher()
                case 403:
                    return Fail(error: APIError.forbidden("Access denied")).eraseToAnyPublisher()
                case 404:
                    return Fail(error: APIError.notFound).eraseToAnyPublisher()
                default:
                    return Fail(error: APIError.serverError(httpResponse.statusCode)).eraseToAnyPublisher()
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Async/await API methods
    
    func request(endpoint: String, method: HTTPMethod, parameters: [String: Any]? = nil) async throws -> Data {
        guard let url = URL(string: endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth token if available
        if let token = authService?.getToken() ?? keychain.get(tokenKey) {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add parameters
        if let parameters = parameters {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return data
        case 401:
            // Token expired or invalid - logout
            authService?.logout()
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden("Access denied")
        case 404:
            throw APIError.notFound
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
    
    // MARK: - Generic fetch method
    
    func fetch<T: Decodable>(_ endpoint: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        guard let url = URL(string: "\(Constants.API.baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        // Add authentication header if we have a token
        if let token = authService?.getToken() ?? keychain.get(tokenKey) {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add body if needed
        if let body = body {
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            // Handle HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            // Handle errors based on status code
            switch httpResponse.statusCode {
            case 200...299:
                // Success - decode the data
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
            case 401:
                // Token expired or invalid - logout
                authService?.logout()
                throw APIError.unauthorized
            case 403:
                throw APIError.forbidden("Access denied")
            case 404:
                throw APIError.notFound
            default:
                throw APIError.serverError(httpResponse.statusCode)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Job-related API methods
    
    // Get all jobs assigned to the driver
    func getAssignedJobs() async throws -> [Job] {
        return try await fetch("/jobs?assigned=true")
    }
    
    // Get available jobs
    func getAvailableJobs() async throws -> [Job] {
        return try await fetch("/jobs?status=approved&assigned=false")
    }
    
    // Accept a job
    func acceptJob(id: Int) async throws -> JobResponse {
        return try await fetch("/jobs/\(id)/accept", method: "PUT")
    }
    
    // Update job status
    func updateJobStatus(id: Int, status: String, notes: String? = nil) async throws -> JobResponse {
        var body: [String: Any] = ["status": status]
        if let notes = notes {
            body["notes"] = notes
        }
        return try await fetch("/jobs/\(id)/status", method: "PUT", body: body)
    }
    
    // Complete a job
    func completeJob(id: Int, notes: String? = nil, photos: [URL]? = nil) async throws -> JobResponse {
        var body: [String: Any] = ["status": "completed"]
        
        if let notes = notes {
            body["notes"] = notes
        }
        
        if let photos = photos {
            body["photos"] = photos.map { $0.absoluteString }
        }
        
        return try await fetch("/jobs/\(id)/complete", method: "PUT", body: body)
    }
    
    // Get job details
    func getJobDetails(id: Int) async throws -> Job {
        return try await fetch("/jobs/\(id)")
    }
    
    // Get driver profile
    func getDriverProfile() async throws -> User {
        return try await fetch("/drivers/profile")
    }
    
    // Update driver profile
    func updateDriverProfile(profile: [String: Any]) async throws -> User {
        return try await fetch("/drivers/profile", method: "PUT", body: profile)
    }
    
    // Get shipment details
    func getShipmentDetails(id: String) async throws -> Shipment {
        return try await fetch("/shipments/\(id)")
    }
} 