import UIKit
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        print("📱 App launched with configuration: \(APIConstants.baseURL)")
        
        // Check backend server availability
        checkBackendCompatibility()
        
        return true
    }
    
    // Method to check backend compatibility
    private func checkBackendCompatibility() {
        // 1. Check if the server is reachable
        guard let healthURL = URL(string: "\(APIConstants.baseURL)/health") else {
            print("⚠️ Invalid health URL")
            return
        }
        
        print("🔍 Checking backend compatibility with \(healthURL.absoluteString)")
        
        let task = URLSession.shared.dataTask(with: healthURL) { data, response, error in
            // Handle network errors
            if let error = error {
                print("❌ Backend connectivity check failed: \(error.localizedDescription)")
                
                // Log additional error details
                let nsError = error as NSError
                print("❌ Error domain: \(nsError.domain), code: \(nsError.code)")
                
                // Show alert if needed
                if nsError.domain == NSURLErrorDomain && 
                    (nsError.code == NSURLErrorCannotConnectToHost || 
                     nsError.code == NSURLErrorNotConnectedToInternet) {
                    self.showBackendAlert(message: "Cannot connect to the backend server. Please check your internet connection and try again.")
                }
                return
            }
            
            // Check HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type")
                return
            }
            
            print("🔍 Backend health check status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode == 200 {
                print("✅ Backend server is online")
                self.checkDriverMappingEndpoint()
            } else {
                print("❌ Backend health check failed with status code: \(httpResponse.statusCode)")
                self.showBackendAlert(message: "Backend server returned unexpected status code: \(httpResponse.statusCode)")
            }
        }
        
        task.resume()
    }
    
    // Check if driver mapping endpoint exists on server
    private func checkDriverMappingEndpoint() {
        guard let mappingURL = URL(string: "\(APIConstants.baseURL)/driver-mapping") else {
            print("⚠️ Invalid driver mapping URL")
            return
        }
        
        print("🔍 Checking driver mapping endpoint: \(mappingURL.absoluteString)")
        
        let task = URLSession.shared.dataTask(with: mappingURL) { data, response, error in
            if let error = error {
                print("❌ Driver mapping check failed: \(error.localizedDescription)")
                return
            }
            
            // Check HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type for driver mapping check")
                return
            }
            
            print("🔍 Driver mapping endpoint status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode == 404 {
                print("⚠️ Driver mapping endpoint not implemented on server")
                print("⚠️ The app will use fallback driver mappings")
                
                // Store indicator that server doesn't support driver mappings
                UserDefaults.standard.set(false, forKey: "server_supports_driver_mapping")
            } else if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                print("ℹ️ Driver mapping endpoint requires authentication: \(httpResponse.statusCode)")
                
                // Store indicator that server supports driver mappings but requires auth
                UserDefaults.standard.set(true, forKey: "server_supports_driver_mapping")
            } else if (200...299).contains(httpResponse.statusCode) {
                print("✅ Driver mapping endpoint is available")
                
                // Store indicator that server supports driver mappings
                UserDefaults.standard.set(true, forKey: "server_supports_driver_mapping")
                
                // Try to parse the response if available
                if let data = data, let mappingString = String(data: data, encoding: .utf8) {
                    print("ℹ️ Driver mapping response: \(mappingString)")
                }
            } else {
                print("⚠️ Driver mapping endpoint check returned unexpected status: \(httpResponse.statusCode)")
                
                // Default to assuming the server doesn't support driver mappings
                UserDefaults.standard.set(false, forKey: "server_supports_driver_mapping")
            }
        }
        
        task.resume()
    }
    
    // Show alert for backend issues
    private func showBackendAlert(message: String) {
        // Show alert on main thread
        DispatchQueue.main.async {
            // Create a window to present the alert
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                
                let alert = UIAlertController(
                    title: "Backend Connection Issue",
                    message: message,
                    preferredStyle: .alert
                )
                
                alert.addAction(UIAlertAction(title: "OK", style: .default))
                rootViewController.present(alert, animated: true)
            }
        }
    }
} 