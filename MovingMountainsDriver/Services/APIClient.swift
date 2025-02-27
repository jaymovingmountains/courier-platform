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
    
    // MARK: - Logging
    
    /// Comprehensive logger for API requests and responses
    private func logRequest(_ request: URLRequest, endpoint: String) {
        print("📡 API REQUEST: \(endpoint)")
        print("📡 URL: \(request.url?.absoluteString ?? "nil")")
        print("📡 Method: \(request.httpMethod ?? "unknown")")
        
        // Log request headers
        print("📡 Request Headers:")
        if let headers = request.allHTTPHeaderFields {
            for (key, value) in headers {
                // Mask token value partially for security
                if key == "Authorization", value.hasPrefix("Bearer ") {
                    let token = value.replacingOccurrences(of: "Bearer ", with: "")
                    let maskedToken = String(token.prefix(10)) + "..." + String(token.suffix(5))
                    print("📡   \(key): Bearer \(maskedToken)")
                } else {
                    print("📡   \(key): \(value)")
                }
            }
        } else {
            print("📡   No headers")
        }
        
        // Log request body
        if let body = request.httpBody, let bodyString = String(data: body, encoding: .utf8) {
            print("📡 Request Body: \(bodyString)")
        } else if request.httpBody != nil {
            print("📡 Request Body: <binary data>")
        } else {
            print("📡 Request Body: None")
        }
    }
    
    private func logResponse(_ response: HTTPURLResponse?, data: Data?, error: Error?) {
        print("📡 API RESPONSE:")
        
        // Log status code
        if let response = response {
            print("📡 Status Code: \(response.statusCode)")
            
            // Log response headers
            print("📡 Response Headers:")
            for (key, value) in response.allHeaderFields {
                print("📡   \(key): \(value)")
            }
        } else {
            print("📡 Status Code: None (No HTTP response)")
        }
        
        // Log error if any
        if let error = error {
            print("📡 Error: \(error.localizedDescription)")
            if let nsError = error as NSError? {
                print("📡 Error Code: \(nsError.code)")
                print("📡 Error Domain: \(nsError.domain)")
                if !nsError.userInfo.isEmpty {
                    print("📡 Error Info: \(nsError.userInfo)")
                }
            }
        }
        
        // Log response body
        if let data = data, !data.isEmpty {
            if let jsonObject = try? JSONSerialization.jsonObject(with: data),
               let jsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: .prettyPrinted),
               let prettyString = String(data: jsonData, encoding: .utf8) {
                print("📡 Response Body (Pretty JSON):")
                print("📡 \(prettyString)")
            } else if let string = String(data: data, encoding: .utf8) {
                print("📡 Response Body:")
                print("📡 \(string)")
            } else {
                print("📡 Response Body: <binary data, size: \(data.count) bytes>")
            }
        } else {
            print("📡 Response Body: None or empty")
        }
        
        print("📡 END OF API CALL")
        print("") // Empty line for better readability
    }
    
    func fetch<T: Decodable>(endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let url = URL(string: "\(APIConstants.baseURL)\(endpoint)") else {
            print("📡 ERROR: Invalid URL: \(APIConstants.baseURL)\(endpoint)")
            throw APIError.invalidURL
        }
        
        // Token retrieval - no await needed for nonisolated method
        guard let token = authService.retrieveToken() else {
            print("📡 ERROR: No auth token available")
            throw APIError.unauthorized
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = body
        }
        
        // Log the request
        logRequest(request, endpoint: endpoint)
        
        do {
            let (data, response) = try await session.data(for: request)
            
            // Log the response
            logResponse(response as? HTTPURLResponse, data: data, error: nil)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("📡 ERROR: Response was not HTTPURLResponse")
                throw APIError.unknown
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    // Try to decode with more detailed error handling
                    let decoder = JSONDecoder()
                    do {
                        return try decoder.decode(T.self, from: data)
                    } catch let decodingError as DecodingError {
                        // Provide detailed information about the decoding error
                        print("📡 DECODING ERROR:")
                        switch decodingError {
                        case .typeMismatch(let type, let context):
                            print("📡 Type mismatch: \(type)")
                            print("📡 Context: \(context.debugDescription)")
                            print("📡 Coding path: \(context.codingPath)")
                        case .valueNotFound(let type, let context):
                            print("📡 Value not found: \(type)")
                            print("📡 Context: \(context.debugDescription)")
                            print("📡 Coding path: \(context.codingPath)")
                        case .keyNotFound(let key, let context):
                            print("📡 Key not found: \(key)")
                            print("📡 Context: \(context.debugDescription)")
                            print("📡 Coding path: \(context.codingPath)")
                        case .dataCorrupted(let context):
                            print("📡 Data corrupted")
                            print("📡 Context: \(context.debugDescription)")
                            print("📡 Coding path: \(context.codingPath)")
                        @unknown default:
                            print("📡 Unknown decoding error: \(decodingError)")
                        }
                        
                        // Try to extract field information from the response
                        if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                            print("📡 Fields in response: \(json.keys)")
                            
                            // Print a sample of each field's value type and structure
                            for (key, value) in json {
                                let type = type(of: value)
                                let preview: String
                                
                                if let array = value as? [Any] {
                                    preview = "Array with \(array.count) items"
                                    if !array.isEmpty {
                                        print("📡   Sample of first item in '\(key)': \(array[0])")
                                    }
                                } else if let dict = value as? [String: Any] {
                                    preview = "Dictionary with \(dict.count) keys"
                                    if let firstKey = dict.keys.first, let firstValue = dict[firstKey] {
                                        print("📡   Sample key-value in '\(key)': \(firstKey): \(firstValue)")
                                    }
                                } else {
                                    preview = "\(value)"
                                }
                                
                                print("📡   Field '\(key)': \(type) - \(preview)")
                            }
                        }
                        
                        throw APIError.decodingError
                    }
                } catch {
                    print("📡 ERROR: Decoding error: \(error)")
                    throw APIError.decodingError
                }
            case 401:
                // Handle token expiration - call logout immediately
                print("📡 ERROR: 401 Unauthorized - logging out")
                
                // Update UI on main thread
                Task { @MainActor in
                    // Call logout synchronously to ensure token is removed
                    authService.logout()
                }
                
                throw APIError.unauthorized
            default:
                // Try to decode any error message from the response
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorJson["error"] as? String {
                    print("📡 ERROR: Server error message: \(errorMessage)")
                }
                
                throw APIError.serverError(httpResponse.statusCode)
            }
        } catch let error as APIError {
            throw error
        } catch {
            print("📡 ERROR: Network error: \(error)")
            
            // Log more error details
            if let nsError = error as NSError? {
                print("📡 Error domain: \(nsError.domain)")
                print("📡 Error code: \(nsError.code)")
            }
            
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Job Operations
    
    /// Fetch all jobs assigned to the driver
    func getJobs() async throws -> [JobDTO] {
        return try await fetch(endpoint: APIConstants.jobsEndpoint)
    }
    
    /// Fetch details for a specific job
    func getJobDetails(jobId: String) async throws -> JobDTO {
        return try await fetch(endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)")
    }
    
    /// Update the status of a job
    func updateJobStatus(jobId: String, status: String) async throws -> JobDTO {
        struct StatusUpdateRequest: Codable {
            let status: String
        }
        
        let updateRequest = StatusUpdateRequest(status: status)
        let body = try JSONEncoder().encode(updateRequest)
        
        return try await fetch(
            endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/status",
            method: "PUT",
            body: body
        )
    }
    
    /// Accept a job assignment
    func acceptJob(jobId: String) async throws -> JobDTO {
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
    func getShipments() async throws -> [ShipmentDTO] {
        return try await fetch(endpoint: APIConstants.shipmentsEndpoint)
    }
    
    /// Fetch details for a specific shipment
    func getShipmentDetails(shipmentId: String) async throws -> ShipmentDTO {
        return try await fetch(endpoint: "\(APIConstants.shipmentsEndpoint)/\(shipmentId)")
    }
    
    /// Update shipment status (e.g., picked up, delivered)
    func updateShipmentStatus(shipmentId: String, status: ShipmentStatus) async throws -> ShipmentDTO {
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
    
    // MARK: - Debug Methods
    
    /// Debug method to fetch jobs with explicit URL construction
    func debugFetchJobs() async -> Result<[JobDTO], APIError> {
        // Try using URL components for more reliable parameter encoding
        var components = URLComponents(string: "\(APIConstants.baseURL)/jobs")
        components?.queryItems = [
            URLQueryItem(name: "assigned", value: "false")
        ]
        
        guard let url = components?.url else {
            print("📡 ERROR: Failed to construct URL")
            return .failure(.invalidURL)
        }
        
        print("📡 API REQUEST: Debug Fetch Jobs")
        print("📡 URL: \(url.absoluteString)")
        
        // Token retrieval
        guard let token = authService.retrieveToken() else {
            print("📡 ERROR: No auth token available")
            return .failure(.unauthorized)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        // Log the request
        logRequest(request, endpoint: "/jobs?assigned=false")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            // Log the response
            logResponse(response as? HTTPURLResponse, data: data, error: nil)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.unknown)
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                do {
                    let jobs = try JSONDecoder().decode([JobDTO].self, from: data)
                    return .success(jobs)
                } catch let error {
                    print("📡 DECODING ERROR: \(error)")
                    
                    if let decodingError = error as? DecodingError {
                        switch decodingError {
                        case .typeMismatch(let type, let context):
                            print("📡 Type mismatch: \(type), context: \(context.debugDescription), path: \(context.codingPath)")
                        case .valueNotFound(let type, let context):
                            print("📡 Value not found: \(type), context: \(context.debugDescription), path: \(context.codingPath)")
                        case .keyNotFound(let key, let context):
                            print("📡 Key not found: \(key), context: \(context.debugDescription), path: \(context.codingPath)")
                        case .dataCorrupted(let context):
                            print("📡 Data corrupted: \(context.debugDescription), path: \(context.codingPath)")
                        @unknown default:
                            print("📡 Unknown decoding error: \(decodingError)")
                        }
                    }
                    
                    // Print the raw JSON for inspection
                    if let json = String(data: data, encoding: .utf8) {
                        print("📡 Raw JSON: \(json)")
                    }
                    
                    return .failure(.decodingError)
                }
            } else if httpResponse.statusCode == 401 {
                // Handle unauthorized error
                print("📡 ERROR: 401 Unauthorized in debug method - logging out")
                
                // Update UI on main thread
                Task { @MainActor in
                    authService.logout()
                }
                
                return .failure(.unauthorized)
            } else {
                // Try to extract error message
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorJson["error"] as? String {
                    print("📡 ERROR: Server error message: \(errorMessage)")
                }
                
                return .failure(.serverError(httpResponse.statusCode))
            }
        } catch {
            print("📡 ERROR: Network error in debug method: \(error)")
            return .failure(.networkError(error))
        }
    }
    
    /// Debug method to accept a job
    func debugAcceptJob(jobId: Int) async -> Result<JobDTO, APIError> {
        let urlString = "\(APIConstants.baseURL)/jobs/\(jobId)/accept"
        
        guard let url = URL(string: urlString) else {
            print("📡 ERROR: Invalid URL: \(urlString)")
            return .failure(.invalidURL)
        }
        
        print("📡 API REQUEST: Debug Accept Job")
        print("📡 URL: \(url.absoluteString)")
        
        // Token retrieval
        guard let token = authService.retrieveToken() else {
            print("📡 ERROR: No auth token available")
            return .failure(.unauthorized)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Log the request
        logRequest(request, endpoint: "/jobs/\(jobId)/accept")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            // Log the response
            logResponse(response as? HTTPURLResponse, data: data, error: nil)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.unknown)
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                do {
                    let job = try JSONDecoder().decode(JobDTO.self, from: data)
                    return .success(job)
                } catch let error {
                    print("📡 DECODING ERROR: \(error)")
                    
                    // Try to help with debugging by printing the raw response
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📡 Raw response data: \(responseString)")
                    }
                    
                    return .failure(.decodingError)
                }
            } else if httpResponse.statusCode == 401 {
                // Handle unauthorized error
                print("📡 ERROR: 401 Unauthorized in accept job debug method - logging out")
                
                // Update UI on main thread
                Task { @MainActor in
                    authService.logout()
                }
                
                return .failure(.unauthorized)
            } else {
                // Try to extract error message
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorJson["error"] as? String {
                    print("📡 ERROR: Server error message: \(errorMessage)")
                }
                
                return .failure(.serverError(httpResponse.statusCode))
            }
        } catch {
            print("📡 ERROR: Network error in accept job debug method: \(error)")
            return .failure(.networkError(error))
        }
    }
} 