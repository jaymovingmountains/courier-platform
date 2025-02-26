import Foundation

class PersistenceService {
    private let userDefaults = UserDefaults.standard
    private let keychain = KeychainWrapper()
    
    private enum Keys {
        static let authToken = "auth_token"
        static let user = "user_data"
    }
    
    // MARK: - Auth Token
    
    func saveAuthToken(_ token: String) {
        keychain.set(token, forKey: Keys.authToken)
    }
    
    func getAuthToken() -> String? {
        return keychain.string(forKey: Keys.authToken)
    }
    
    func clearAuthToken() {
        keychain.delete(Keys.authToken)
    }
    
    // MARK: - User
    
    func saveUser(_ user: User) {
        if let encodedData = try? JSONEncoder().encode(user) {
            userDefaults.set(encodedData, forKey: Keys.user)
        }
    }
    
    func getUser() -> User? {
        guard let userData = userDefaults.data(forKey: Keys.user) else {
            return nil
        }
        
        return try? JSONDecoder().decode(User.self, from: userData)
    }
    
    func clearUser() {
        userDefaults.removeObject(forKey: Keys.user)
    }
    
    // MARK: - Settings
    
    func setDarkMode(_ enabled: Bool) {
        userDefaults.set(enabled, forKey: Constants.UserDefaultsKeys.isDarkMode)
    }
    
    func isDarkModeEnabled() -> Bool {
        return userDefaults.bool(forKey: Constants.UserDefaultsKeys.isDarkMode)
    }
    
    func setUserRole(_ role: String) {
        userDefaults.set(role, forKey: Constants.UserDefaultsKeys.userRole)
    }
    
    func getUserRole() -> String? {
        return userDefaults.string(forKey: Constants.UserDefaultsKeys.userRole)
    }
}

// Simple Keychain wrapper
// In a real app, use a more robust solution like Swift Keychain Wrapper (https://github.com/jrendel/SwiftKeychainWrapper)
private class KeychainWrapper {
    func set(_ value: String, forKey key: String) {
        if let data = value.data(using: .utf8) {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key,
                kSecValueData as String: data
            ]
            
            SecItemDelete(query as CFDictionary)
            SecItemAdd(query as CFDictionary, nil)
        }
    }
    
    func string(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == noErr {
            if let data = item as? Data {
                return String(data: data, encoding: .utf8)
            }
        }
        
        return nil
    }
    
    func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
} 