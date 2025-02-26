import Foundation
import KeychainSwift
import Combine

class AuthService {
    private let keychain = KeychainSwift()
    private let tokenKey = "auth_token"
    private var apiClient: APIClient?
    
    init() {
        // Create APIClient without AuthService to avoid circular dependency
        // We'll set it later
    }
    
    func setAPIClient(_ apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    // Async/await login method
    func login(username: String, password: String) async throws -> User {
        guard let url = URL(string: Constants.API.login) else {
            throw APIError.invalidURL
        }
        
        // Create request body
        let body: [String: Any] = [
            "username": username,
            "password": password
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("driver", forHTTPHeaderField: "x-portal")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        // Example of request/response handling
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, 
              (200...299).contains(httpResponse.statusCode) else {
            // Handle specific error types based on status codes
            if let httpResponse = response as? HTTPURLResponse {
                switch httpResponse.statusCode {
                case 401: throw APIError.unauthorized
                case 403: throw APIError.forbidden("Only drivers can login")
                default: throw APIError.invalidResponse
                }
            }
            throw APIError.invalidResponse
        }
        
        // Decode token
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        
        // Save token to keychain
        keychain.set(authResponse.token, forKey: tokenKey)
        
        // Decode user from JWT
        return try getUserFromToken(authResponse.token)
    }
    
    // Combine-based login method for compatibility with existing code
    func login(email: String, password: String) -> AnyPublisher<User, Error> {
        return Future<User, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(APIError.unknown))
                return
            }
            
            Task {
                do {
                    let user = try await self.login(username: email, password: password)
                    promise(.success(user))
                } catch {
                    promise(.failure(error))
                }
            }
        }.eraseToAnyPublisher()
    }
    
    func isLoggedIn() -> Bool {
        if let token = getToken() {
            // Check if token is expired
            do {
                let payload: JWTPayload = try JWTDecoder.decode(token: token)
                return !payload.isExpired
            } catch {
                // If we can't decode the token, consider it invalid
                logout()
                return false
            }
        }
        return false
    }
    
    func getToken() -> String? {
        return keychain.get(tokenKey)
    }
    
    func logout() {
        keychain.delete(tokenKey)
    }
    
    func getCurrentUser() -> AnyPublisher<User, Error> {
        if let token = getToken() {
            do {
                let user = try getUserFromToken(token)
                return Just(user)
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            } catch {
                return Fail(error: error).eraseToAnyPublisher()
            }
        }
        
        return Fail(error: APIError.unauthorized).eraseToAnyPublisher()
    }
    
    // Async version of getCurrentUser
    func getCurrentUser() async throws -> User {
        if let token = getToken() {
            return try getUserFromToken(token)
        }
        
        throw APIError.unauthorized
    }
    
    // Refresh user profile from API
    func refreshUserProfile() async throws -> User {
        guard let apiClient = apiClient else {
            throw APIError.unknown
        }
        
        return try await apiClient.getDriverProfile()
    }
    
    private func getUserFromToken(_ token: String) throws -> User {
        // Decode JWT payload
        let payload: JWTPayload = try JWTDecoder.decode(token: token)
        
        // Check if token is expired
        if payload.isExpired {
            logout()
            throw APIError.unauthorized
        }
        
        return payload.toUser()
    }
} 