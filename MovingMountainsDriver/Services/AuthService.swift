import Foundation
import Security

// MARK: - Authentication Response Structures

// Define the LoginResponse struct 
struct LoginResponse: Codable {
    let token: String
    let user: User?
}

// Define error response structure
struct ErrorResponse: Codable {
    let error: String
}

// Define refresh token response
struct RefreshTokenResponse: Codable {
    let token: String
}

// Token validation error types
enum TokenError: Error {
    case invalidFormat
    case expired
    case decodingFailed
    case missingExpiration
    case refreshFailed(String)
    
    var message: String {
        switch self {
        case .invalidFormat:
            return "Invalid token format"
        case .expired:
            return "Token has expired"
        case .decodingFailed:
            return "Failed to decode token data"
        case .missingExpiration:
            return "Token missing expiration date"
        case .refreshFailed(let reason):
            return "Token refresh failed: \(reason)"
        }
    }
}

// Remove the duplicate User struct as it's already defined in Models/User.swift

// Make the class conform to Sendable
@MainActor
final class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var authError: String?
    @Published var tokenExpirationDate: Date?
    @Published var diagnosticMessage: String? // Add diagnostic message for debugging
    
    private let keychainTokenKey = "com.movingmountains.driverapp.token"
    private var isRefreshing = false
    private let tokenRefreshThreshold: TimeInterval = 5 * 60 // 5 minutes
    
    init() {
        // Check for token on init
        if let token = retrieveToken() {
            do {
                try validateToken(token)
                decodeUserFromToken(token)
                isAuthenticated = true
                print("🔐 Valid token found during initialization")
            } catch let error as TokenError {
                print("🔐 Token validation failed on init: \(error.message)")
                if case .expired = error {
                    // Try to refresh on startup if token is expired
                    Task {
                        await refreshToken()
                    }
                }
            } catch {
                print("🔐 Unknown error during token validation: \(error)")
            }
        } else {
            print("🔐 No token found during initialization")
        }
    }
    
    // MARK: - Authentication Methods
    
    // Function renamed to make it clear we're using username, not email
    func login(username: String, password: String) async {
        authError = nil // Clear previous errors
        diagnosticMessage = nil // Clear diagnostic messages
        
        print("🔐 Starting login process for username: \(username)")
        print("🔐 Using server URL: \(APIConstants.baseURL)")
        
        // Add diagnostic output
        diagnosticMessage = "Attempting login with username: \(username)"
        
        // STEP 1: Get a token from the main login endpoint
        guard let loginUrl = URL(string: "\(APIConstants.baseURL)/login") else {
            authError = "Invalid URL configuration"
            diagnosticMessage = "❌ Error: Invalid URL configuration for \(APIConstants.baseURL)/login"
            return
        }
        
        // Prepare login credentials with the correct field names
        let credentials: [String: String] = [
            "username": username,
            "password": password
        ]
        
        diagnosticMessage = "Connecting to \(loginUrl.absoluteString)..."
        
        do {
            // Convert credentials to JSON data
            let jsonData = try JSONSerialization.data(withJSONObject: credentials)
            
            // Log the exact JSON being sent for debugging
            let jsonString = String(data: jsonData, encoding: .utf8) ?? "Unable to decode"
            print("🔐 LOGIN REQUEST JSON: \(jsonString)")
            
            // Create and configure the request
            var request = URLRequest(url: loginUrl)
            request.httpMethod = "POST"
            request.httpBody = jsonData
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.addValue("driver", forHTTPHeaderField: "x-portal")
            
            // Add request timeout - increasing from default to handle slower connections
            request.timeoutInterval = 30
            
            print("🔐 Attempting login to: \(loginUrl)")
            diagnosticMessage = "Sending login request to server..."
            
            // Perform the network request
            let (data, response) = try await URLSession.shared.data(for: request)
            
            // Get the response as string for debugging
            let responseString = String(data: data, encoding: .utf8) ?? "No response data"
            print("🔐 Login response: \(responseString)")
            diagnosticMessage = "Received response from server"
            
            // Get HTTP status code
            guard let httpResponse = response as? HTTPURLResponse else {
                authError = "Invalid server response"
                diagnosticMessage = "❌ Error: Server returned invalid response format"
                return
            }
            
            print("🔐 Login response status code: \(httpResponse.statusCode)")
            diagnosticMessage = "Server returned status code: \(httpResponse.statusCode)"
            
            // If login successful, proceed to driver validation
            if httpResponse.statusCode == 200 {
                do {
                    // Try to decode successful login response
                    let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
                    
                    // Store the token and update authentication state
                    let token = loginResponse.token
                    diagnosticMessage = "✅ Successfully received authentication token"
                    
                    // Validate the token before storing
                    do {
                        try validateToken(token)
                        storeToken(token)
                        
                        if let user = loginResponse.user {
                            self.currentUser = user
                            print("🔐 User information received in login response: ID \(user.id), username: \(user.username)")
                            diagnosticMessage = "✅ Authentication successful for user ID: \(user.id), username: \(user.username)"
                            
                            // Store username in UserDefaults for retrieval by DashboardViewModel
                            UserDefaults.standard.set(user.id, forKey: UserDefaultsKeys.userId)
                            UserDefaults.standard.set(user.username, forKey: UserDefaultsKeys.username)
                        } else {
                            // If user not in response, try to decode from token
                            print("🔐 No user information in response, decoding from token")
                            decodeUserFromToken(token)
                            
                            if let currentUser = self.currentUser {
                                diagnosticMessage = "✅ Authentication successful, user extracted from token: \(currentUser.username)"
                                
                                // Store username in UserDefaults for retrieval by DashboardViewModel
                                UserDefaults.standard.set(currentUser.id, forKey: UserDefaultsKeys.userId)
                                UserDefaults.standard.set(currentUser.username, forKey: UserDefaultsKeys.username)
                            } else {
                                diagnosticMessage = "⚠️ Authentication successful but couldn't extract user details"
                            }
                        }
                        
                        isAuthenticated = true
                        authError = nil
                    } catch let error as TokenError {
                        print("🔐 Received invalid token during login: \(error.message)")
                        authError = "Authentication failed: \(error.message)"
                        diagnosticMessage = "❌ Error: \(error.message)"
                    }
                } catch {
                    print("🔐 Failed to decode login response: \(error)")
                    authError = "Server returned invalid data. Please try again."
                    diagnosticMessage = "❌ Error: Failed to decode server response: \(error.localizedDescription)"
                }
            } else {
                // Try to decode error message
                do {
                    let errorResponse = try JSONDecoder().decode(ErrorResponse.self, from: data)
                    authError = errorResponse.error
                    print("🔐 Login failed with error: \(errorResponse.error)")
                    diagnosticMessage = "❌ Error: \(errorResponse.error)"
                } catch {
                    // Fallback error message if we can't parse the server response
                    let errorMessage = "Login failed with status code: \(httpResponse.statusCode)"
                    authError = errorMessage
                    print("🔐 \(errorMessage)")
                    diagnosticMessage = "❌ Error: \(errorMessage)"
                }
            }
        } catch {
            print("🔐 Login network error: \(error)")
            authError = "Connection error: \(error.localizedDescription)"
            diagnosticMessage = "❌ Network error: \(error.localizedDescription)"
        }
    }
    
    // Add a diagnostic authentication function that can be called directly to test credentials
    func testAuthentication(username: String, password: String) async -> String {
        diagnosticMessage = nil // Clear diagnostic messages
        
        print("🧪 TESTING: Authentication test starting for username: \(username)")
        diagnosticMessage = "🧪 Starting authentication test"
        
        // STEP 1: Attempt to connect to the health endpoint to verify server availability
        guard let healthUrl = URL(string: "\(APIConstants.baseURL)/health") else {
            return "❌ ERROR: Invalid health URL configuration"
        }
        
        diagnosticMessage = "Testing server connection..."
        
        do {
            let (_, healthResponse) = try await URLSession.shared.data(for: URLRequest(url: healthUrl))
            
            guard let httpHealthResponse = healthResponse as? HTTPURLResponse else {
                return "❌ ERROR: Invalid health check response format"
            }
            
            if httpHealthResponse.statusCode == 200 {
                diagnosticMessage = "✅ Server is reachable (health check passed)"
            } else {
                return "❌ ERROR: Server health check failed with status code: \(httpHealthResponse.statusCode)"
            }
        } catch {
            return "❌ ERROR: Server connection test failed: \(error.localizedDescription)"
        }
        
        // STEP 2: Test authentication with provided credentials
        guard let loginUrl = URL(string: "\(APIConstants.baseURL)/login") else {
            return "❌ ERROR: Invalid login URL configuration"
        }
        
        diagnosticMessage = "Testing authentication with username: \(username)..."
        
        let credentials: [String: String] = [
            "username": username,
            "password": password
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: credentials)
            
            var request = URLRequest(url: loginUrl)
            request.httpMethod = "POST"
            request.httpBody = jsonData
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.addValue("driver", forHTTPHeaderField: "x-portal")
            request.timeoutInterval = 30
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return "❌ ERROR: Invalid authentication response format"
            }
            
            // Get response as string for detailed debugging
            let responseString = String(data: data, encoding: .utf8) ?? "No response data"
            
            // Process response
            if httpResponse.statusCode == 200 {
                // Success path
                do {
                    let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
                    
                    try validateToken(loginResponse.token)
                    storeToken(loginResponse.token)
                    
                    if let user = loginResponse.user {
                        self.currentUser = user
                        UserDefaults.standard.set(user.id, forKey: UserDefaultsKeys.userId)
                        UserDefaults.standard.set(user.username, forKey: UserDefaultsKeys.username)
                        isAuthenticated = true
                        
                        return "✅ SUCCESS: Authentication successful for user ID: \(user.id), username: \(user.username)"
                    } else {
                        decodeUserFromToken(loginResponse.token)
                        
                        if let currentUser = self.currentUser {
                            UserDefaults.standard.set(currentUser.id, forKey: UserDefaultsKeys.userId)
                            UserDefaults.standard.set(currentUser.username, forKey: UserDefaultsKeys.username)
                            isAuthenticated = true
                            
                            return "✅ SUCCESS: Authentication successful, user extracted from token: \(currentUser.username)"
                        } else {
                            return "⚠️ WARNING: Authentication succeeded but no user details were found in token"
                        }
                    }
                } catch {
                    return "❌ ERROR: Authentication succeeded but token processing failed: \(error.localizedDescription)\nRaw Response: \(responseString)"
                }
            } else {
                // Error path
                do {
                    let errorResponse = try JSONDecoder().decode(ErrorResponse.self, from: data)
                    return "❌ ERROR: Authentication failed: \(errorResponse.error)\nStatus Code: \(httpResponse.statusCode)"
                } catch {
                    return "❌ ERROR: Authentication failed with status code: \(httpResponse.statusCode)\nRaw Response: \(responseString)"
                }
            }
        } catch {
            return "❌ ERROR: Network error during authentication test: \(error.localizedDescription)"
        }
    }
    
    // New method to validate a token with the driver endpoint
    private func validateDriverToken(token: String) async {
        guard let driverUrl = URL(string: "\(APIConstants.baseURL)/driver/login") else {
            authError = "Invalid driver URL configuration"
            return
        }
        
        print("🔐 Validating driver token at: \(driverUrl)")
        print("🔐 Token (first 10 chars): \(String(token.prefix(10)))...")
        
        var request = URLRequest(url: driverUrl)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        // Print request headers for debugging
        print("🔐 Request headers:")
        request.allHTTPHeaderFields?.forEach { key, value in
            if key == "Authorization" {
                print("🔐   \(key): Bearer \(String(value.dropFirst(7).prefix(10)))...")
            } else {
                print("🔐   \(key): \(value)")
            }
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            // Get the response as string for debugging
            let responseString = String(data: data, encoding: .utf8) ?? "No response data"
            print("🔐 Driver validation response: \(responseString)")
            
            guard let httpResponse = response as? HTTPURLResponse else {
                authError = "Invalid server response"
                return
            }
            
            print("🔐 Driver validation response status: \(httpResponse.statusCode)")
            
            // Print response headers for debugging
            print("🔐 Response headers:")
            httpResponse.allHeaderFields.forEach { key, value in
                print("🔐   \(key): \(value)")
            }
            
            if httpResponse.statusCode == 200 {
                // Successfully validated as a driver
                storeToken(token)
                decodeUserFromToken(token)
                isAuthenticated = true
                authError = nil
                print("🔐 Driver token successfully validated")
            } else {
                // Process error
                do {
                    let errorResponse = try JSONDecoder().decode(ErrorResponse.self, from: data)
                    let errorMessage = "Driver validation failed: \(errorResponse.error)"
                    authError = errorMessage
                    print("🔐 \(errorMessage)")
                } catch {
                    let errorMessage = "Driver validation failed with status code: \(httpResponse.statusCode)"
                    authError = errorMessage
                    print("🔐 \(errorMessage)")
                }
            }
        } catch {
            print("🔐 Driver validation error: \(error)")
            authError = "Connection error during driver validation: \(error.localizedDescription)"
        }
    }
    
    // New method to refresh the token when it's near expiration
    func refreshToken() async -> Bool {
        // Guard against multiple simultaneous refresh attempts
        guard !isRefreshing else {
            print("🔐 Token refresh already in progress")
            return false
        }
        
        isRefreshing = true
        
        guard let currentToken = retrieveToken() else {
            print("🔐 No token available to refresh")
            isRefreshing = false
            return false
        }
        
        print("🔐 Starting token refresh")
        
        // Construct refresh token URL
        guard let refreshUrl = URL(string: "\(APIConstants.baseURL)/refresh-token") else {
            print("🔐 Invalid refresh token URL")
            isRefreshing = false
            return false
        }
        
        var request = URLRequest(url: refreshUrl)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer \(currentToken)", forHTTPHeaderField: "Authorization")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("🔐 Invalid server response during token refresh")
                isRefreshing = false
                return false
            }
            
            if httpResponse.statusCode == 200 {
                do {
                    let refreshResponse = try JSONDecoder().decode(RefreshTokenResponse.self, from: data)
                    let newToken = refreshResponse.token
                    
                    try validateToken(newToken)
                    storeToken(newToken)
                    decodeUserFromToken(newToken)
                    
                    print("🔐 Token successfully refreshed")
                    isRefreshing = false
                    return true
                } catch {
                    print("🔐 Failed to decode refresh token response: \(error)")
                }
            } else {
                // Failed to refresh token, user needs to re-authenticate
                print("🔐 Token refresh failed with status code: \(httpResponse.statusCode)")
                
                // If unauthorized, clear token and authentication state
                if httpResponse.statusCode == 401 {
                    logout()
                }
            }
        } catch {
            print("🔐 Network error during token refresh: \(error)")
        }
        
        isRefreshing = false
        return false
    }
    
    // Check if token needs refresh, and refresh if necessary
    func ensureValidToken() async -> Bool {
        guard let token = retrieveToken() else {
            print("🔐 No token available")
            return false
        }
        
        do {
            // Check if token is valid but close to expiration
            try validateToken(token)
            
            // If token is valid but close to expiration, refresh it
            if let expDate = tokenExpirationDate, 
               Date().addingTimeInterval(tokenRefreshThreshold) > expDate {
                print("🔐 Token will expire soon, refreshing")
                return await refreshToken()
            }
            
            // Token is valid and not close to expiration
            return true
        } catch let error as TokenError {
            print("🔐 Token validation failed: \(error.message)")
            
            if case .expired = error {
                // Try to refresh if token is expired
                return await refreshToken()
            } else {
                // Other token errors require re-login
                logout()
                return false
            }
        } catch {
            print("🔐 Unknown error during token validation: \(error)")
            return false
        }
    }
    
    // Method to validate token and extract expiration date
    func validateToken(_ token: String) throws {
        // Extract payload from JWT (middle part between dots)
        let segments = token.components(separatedBy: ".")
        guard segments.count > 1 else {
            print("🔐 Invalid token format - doesn't have expected segments")
            throw TokenError.invalidFormat
        }
        
        var base64 = segments[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Pad base64 string if needed
        while base64.count % 4 != 0 {
            base64 += "="
        }
        
        guard let data = Data(base64Encoded: base64) else {
            print("🔐 Failed to decode base64 token data")
            throw TokenError.decodingFailed
        }
        
        // Structure to decode JWT payload with expiration
        struct JWTPayload: Codable {
            let exp: TimeInterval?
            let iat: TimeInterval?
            let id: Int?
            let username: String?
            let role: String?
        }
        
        do {
            let payload = try JSONDecoder().decode(JWTPayload.self, from: data)
            
            guard let expiration = payload.exp else {
                print("🔐 Token missing expiration claim")
                throw TokenError.missingExpiration
            }
            
            // Convert exp to Date
            let expirationDate = Date(timeIntervalSince1970: expiration)
            tokenExpirationDate = expirationDate
            
            // Log token details
            print("🔐 Token details:")
            print("🔐 - User ID: \(payload.id ?? -1)")
            print("🔐 - Username: \(payload.username ?? "unknown")")
            print("🔐 - Role: \(payload.role ?? "unknown")")
            if let issuedAt = payload.iat {
                let issuedDate = Date(timeIntervalSince1970: issuedAt)
                print("🔐 - Issued at: \(issuedDate)")
            }
            print("🔐 - Expires at: \(expirationDate)")
            
            // Token validity check
            let currentDate = Date()
            if currentDate >= expirationDate {
                print("🔐 Token has expired at \(expirationDate), current time is \(currentDate)")
                throw TokenError.expired
            }
            
            // Calculate time until expiration
            let timeRemaining = expirationDate.timeIntervalSince(currentDate)
            print("🔐 Token valid for \(Int(timeRemaining)) more seconds")
            
        } catch let error as TokenError {
            throw error
        } catch {
            print("🔐 Failed to decode token: \(error)")
            throw TokenError.decodingFailed
        }
    }
    
    // Store JWT token in Keychain
    private func storeToken(_ token: String) {
        let data = token.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainTokenKey,
            kSecValueData as String: data
        ]
        
        // Delete any existing item
        SecItemDelete(query as CFDictionary)
        
        // Add the new item
        SecItemAdd(query as CFDictionary, nil)
        
        print("🔐 Token stored in keychain")
        
        // Also store in UserDefaults for easy access
        UserDefaults.standard.set(token, forKey: UserDefaultsKeys.authToken)
    }
    
    // Retrieve JWT token from Keychain
    nonisolated func retrieveToken() -> String? {
        // First try from Keychain
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainTokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess {
            if let retrievedData = dataTypeRef as? Data,
               let token = String(data: retrievedData, encoding: .utf8) {
                return token
            }
        }
        
        // Fallback to UserDefaults if keychain fails
        return UserDefaults.standard.string(forKey: UserDefaultsKeys.authToken)
    }
    
    // Decode user information from JWT token
    private func decodeUserFromToken(_ token: String) {
        // Extract payload from JWT (middle part between dots)
        let segments = token.components(separatedBy: ".")
        guard segments.count > 1 else { 
            print("🔐 Invalid token format during user decode")
            return 
        }
        
        var base64 = segments[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Pad base64 string if needed
        while base64.count % 4 != 0 {
            base64 += "="
        }
        
        guard let data = Data(base64Encoded: base64) else { 
            print("🔐 Failed to decode base64 token data during user decode")
            return 
        }
        
        // Print the JSON string for debugging
        if let jsonString = String(data: data, encoding: .utf8) {
            print("🔐 Token payload: \(jsonString)")
        }
        
        do {
            // Updated JWT payload structure based on the actual token
            struct JWTPayload: Codable {
                let id: Int
                let username: String
                let role: String
                let iat: TimeInterval?
                let exp: TimeInterval?
            }
            
            let payload = try JSONDecoder().decode(JWTPayload.self, from: data)
            
            // Create user from token data
            self.currentUser = User(id: payload.id, username: payload.username, role: payload.role)
            print("🔐 Successfully decoded token for user ID: \(payload.id), username: \(payload.username), role: \(payload.role)")
            
            // Update expiration date if available
            if let exp = payload.exp {
                tokenExpirationDate = Date(timeIntervalSince1970: exp)
                print("🔐 Token expires at: \(tokenExpirationDate!)")
            }
        } catch {
            print("🔐 Failed to decode token for user data: \(error)")
        }
    }
    
    // Check if user is authenticated
    func checkAuthentication() {
        if let token = retrieveToken() {
            do {
                try validateToken(token)
                decodeUserFromToken(token)
                self.isAuthenticated = true
                print("🔐 Authentication verified: token is valid")
            } catch let error as TokenError {
                print("🔐 Authentication check failed: \(error.message)")
                // If token is expired, attempt refresh in background
                if case .expired = error {
                    Task {
                        _ = await refreshToken()
                    }
                }
            } catch {
                print("🔐 Unknown error during authentication check: \(error)")
            }
        } else {
            print("🔐 No token found during authentication check")
            self.isAuthenticated = false
        }
    }
    
    // Logout - remove token and reset state
    nonisolated func logout() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainTokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
        
        // Remove from UserDefaults too
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.authToken)
        
        // Update UI on main actor
        Task { @MainActor in
            print("🔐 User logged out, token removed")
            self.isAuthenticated = false
            self.currentUser = nil
            self.tokenExpirationDate = nil
            
            // Clear user ID and username from UserDefaults
            UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.userId)
            UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.username)
        }
    }
} 