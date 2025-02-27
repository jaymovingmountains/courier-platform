import Foundation
import Security

class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var authError: String?
    
    private let keychainTokenKey = "driver_app_token"
    
    func login(username: String, password: String) async {
        let loginURL = URL(string: "\(APIConstants.baseURL)\(APIConstants.loginEndpoint)")!
        
        var request = URLRequest(url: loginURL)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("driver", forHTTPHeaderField: "x-portal")
        
        // Request body structure
        struct LoginRequest: Codable {
            let username: String
            let password: String
        }
        
        // Response structure
        struct LoginResponse: Codable {
            let token: String
        }
        
        do {
            let requestBody = LoginRequest(username: username, password: password)
            request.httpBody = try JSONEncoder().encode(requestBody)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, 
                  httpResponse.statusCode == 200 else {
                DispatchQueue.main.async {
                    self.authError = "Login failed. Please check your credentials."
                }
                return
            }
            
            let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
            storeToken(loginResponse.token)
            decodeUserFromToken(loginResponse.token)
            
            DispatchQueue.main.async {
                self.isAuthenticated = true
                self.authError = nil
            }
        } catch {
            DispatchQueue.main.async {
                self.authError = "Login failed: \(error.localizedDescription)"
            }
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
    }
    
    // Retrieve JWT token from Keychain
    func retrieveToken() -> String? {
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
        
        return nil
    }
    
    // Decode user information from JWT token
    private func decodeUserFromToken(_ token: String) {
        // Extract payload from JWT (middle part between dots)
        let segments = token.components(separatedBy: ".")
        guard segments.count > 1 else { return }
        
        var base64 = segments[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Pad base64 string if needed
        while base64.count % 4 != 0 {
            base64 += "="
        }
        
        guard let data = Data(base64Encoded: base64) else { return }
        
        do {
            // Decode JWT payload, assuming it contains user information
            // You might need to adjust the struct based on your JWT payload structure
            struct JWTPayload: Codable {
                let sub: String
                let id: Int
                let username: String
                let role: String
            }
            
            let payload = try JSONDecoder().decode(JWTPayload.self, from: data)
            
            DispatchQueue.main.async {
                self.currentUser = User(id: payload.id, username: payload.username, role: payload.role)
            }
        } catch {
            print("Failed to decode token: \(error)")
        }
    }
    
    // Check if user is authenticated
    func checkAuthentication() {
        if let token = retrieveToken() {
            decodeUserFromToken(token)
            DispatchQueue.main.async {
                self.isAuthenticated = true
            }
        }
    }
    
    // Logout - remove token and reset state
    func logout() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainTokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
        
        DispatchQueue.main.async {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
} 