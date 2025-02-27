import SwiftUI
import Combine
import Foundation

// Direct import to get access to NetworkMonitor
import Network

@main
struct MovingMountainsDriverApp: App {
    @StateObject private var authService = AuthService()
    private let apiClient: APIClient
    
    init() {
        let authService = AuthService()
        self.apiClient = APIClient(authService: authService)
        self._authService = StateObject(wrappedValue: authService)
        
        // Initialize NetworkMonitor on app start
        let _ = NetworkMonitor.shared
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var authService: AuthService
    @State private var selectedTab = 0
    
    private let apiClient: APIClient
    
    init() {
        let authService = AuthService()
        self.apiClient = APIClient(authService: authService)
    }
    
    var body: some View {
        Group {
            if authService.isAuthenticated {
                TabView(selection: $selectedTab) {
                    DashboardView(apiClient: apiClient)
                        .tabItem {
                            Label("Dashboard", systemImage: "house.fill")
                        }
                        .tag(0)
                    
                    HistoryView(apiClient: apiClient)
                        .tabItem {
                            Label("History", systemImage: "clock.fill")
                        }
                        .tag(1)
                    
                    NetworkStatusDemoView()
                        .tabItem {
                            Label("Network", systemImage: "network")
                        }
                        .tag(2)
                    
                    SettingsView()
                        .tabItem {
                            Label("Settings", systemImage: "gear")
                        }
                        .tag(3)
                }
                .accentColor(.blue)
            } else {
                LoginView()
                    .environmentObject(authService)
            }
        }
        .onAppear {
            // Check if token exists and is valid
            authService.checkAuthentication()
        }
    }
}

// Placeholder for History View
struct HistoryView: View {
    private let apiClient: APIClient
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Job History")
                    .font(.headline)
                    .padding()
                
                List {
                    Text("This is where completed jobs will appear")
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("History")
        }
    }
}

// Placeholder for Settings View
struct SettingsView: View {
    @EnvironmentObject private var authService: AuthService
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Account")) {
                    Button(action: {
                        authService.logout()
                    }) {
                        HStack {
                            Text("Logout")
                                .foregroundColor(.red)
                            Spacer()
                            Image(systemName: "arrow.right.square")
                                .foregroundColor(.red)
                        }
                    }
                }
                
                Section(header: Text("App Information")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    ContentView()
}

// TEMPORARY NetworkMonitor class to resolve compilation errors
// You should remove this once you properly import the real NetworkMonitor
class NetworkMonitor {
    static let shared = NetworkMonitor()
    var isConnected: Bool = true
    static let connectivityRestoredNotification = Notification.Name("connectivityRestored")
    
    private init() {}
}

// TEMPORARY NetworkStatusDemoView to resolve compilation errors
// You should remove this once you properly import the real NetworkStatusDemoView
struct NetworkStatusDemoView: View {
    var body: some View {
        Text("Network Status Demo")
    }
}

// TEMPORARY extension to View for withOfflineIndicator
extension View {
    func withOfflineIndicator() -> some View {
        // Just return self - this is a stub
        return self
    }
}

// TEMPORARY APIClient extension
extension APIClient {
    func fetchWithOfflineSupport<T: Decodable>(
        endpoint: String, 
        method: String = "GET", 
        body: Data? = nil,
        requestType: String
    ) async throws -> T {
        // Simply call the normal fetch method since this is just a stub
        return try await fetch(endpoint: endpoint, method: method, body: body)
    }
} 