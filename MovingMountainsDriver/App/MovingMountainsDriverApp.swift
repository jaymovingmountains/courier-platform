import SwiftUI

@main
struct MovingMountainsDriverApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    // Create services and view models
    private let authService = AuthService()
    private lazy var apiClient: APIClient = {
        let client = APIClient(authService: authService)
        authService.setAPIClient(client)
        return client
    }()
    private lazy var syncService = SyncService(apiClient: apiClient)
    
    @StateObject private var authViewModel: AuthViewModel
    @StateObject private var networkMonitor = NetworkMonitor()
    
    init() {
        // Initialize view models
        let authVM = AuthViewModel(authService: authService)
        _authViewModel = StateObject(wrappedValue: authVM)
    }
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                if authViewModel.isAuthenticated {
                    MainTabView(
                        authViewModel: authViewModel,
                        apiClient: apiClient
                    )
                    .onAppear {
                        // Start sync service when authenticated
                        syncService.startNetworkMonitoring()
                        
                        // Initial sync of data
                        Task {
                            await syncService.syncJobs()
                        }
                    }
                } else {
                    // Use the new LoginView with the existing AuthViewModel
                    LoginView()
                        .environmentObject(authViewModel)
                }
                
                // Network connectivity banner
                VStack {
                    if !networkMonitor.isConnected {
                        HStack {
                            Image(systemName: "wifi.slash")
                            Text("No Internet Connection")
                            Spacer()
                        }
                        .font(.caption)
                        .padding(8)
                        .background(Color.red)
                        .foregroundColor(.white)
                        .transition(.move(edge: .top))
                    }
                    
                    Spacer()
                }
                .animation(.default, value: networkMonitor.isConnected)
            }
        }
    }
} 