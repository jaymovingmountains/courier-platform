import SwiftUI

@main
struct MovingMountainsDriverApp: App {
    // Add app delegate to handle app lifecycle events
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    // Create an instance of AuthService to be shared throughout the app
    @StateObject private var authService = AuthService()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }
} 