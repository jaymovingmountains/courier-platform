import SwiftUI

struct MainTabView: View {
    @ObservedObject var authViewModel: AuthViewModel
    let apiClient: APIClient
    
    @StateObject private var dashboardViewModel: DashboardViewModel
    @State private var selectedTab = 0
    @State private var showJobDetails = false
    @State private var selectedJobId: Int?
    
    init(authViewModel: AuthViewModel, apiClient: APIClient) {
        self.authViewModel = authViewModel
        self.apiClient = apiClient
        
        // Initialize view models with API client
        _dashboardViewModel = StateObject(wrappedValue: DashboardViewModel(apiClient: apiClient))
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Dashboard Tab
            NavigationView {
                DashboardView(viewModel: dashboardViewModel, authViewModel: authViewModel)
            }
            .tabItem {
                Image(systemName: "house.fill")
                Text("Dashboard")
            }
            .tag(0)
            
            // History Tab
            NavigationView {
                JobHistoryView()
            }
            .tabItem {
                Image(systemName: "clock.fill")
                Text("History")
            }
            .tag(1)
            
            // Settings Tab
            NavigationView {
                SettingsView(authViewModel: authViewModel)
            }
            .tabItem {
                Image(systemName: "gear")
                Text("Settings")
            }
            .tag(2)
        }
        .accentColor(.blue)
        .onAppear {
            // Configure tab bar appearance
            let tabBarAppearance = UITabBarAppearance()
            tabBarAppearance.configureWithOpaqueBackground()
            UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
            UITabBar.appearance().standardAppearance = tabBarAppearance
            
            // Configure navigation bar appearance
            let navigationBarAppearance = UINavigationBarAppearance()
            navigationBarAppearance.configureWithOpaqueBackground()
            UINavigationBar.appearance().scrollEdgeAppearance = navigationBarAppearance
            UINavigationBar.appearance().standardAppearance = navigationBarAppearance
        }
        .sheet(isPresented: $showJobDetails) {
            if let jobId = selectedJobId {
                let viewModel = JobDetailsViewModel(apiClient: apiClient)
                JobDetailsView(
                    jobId: jobId,
                    viewModel: viewModel,
                    onBackTapped: {
                        showJobDetails = false
                    }
                )
            }
        }
        .onChange(of: dashboardViewModel.selectedJob) { newSelectedJob in
            if let job = newSelectedJob {
                selectedJobId = job.id
                showJobDetails = true
                dashboardViewModel.selectedJob = nil
            }
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        let authService = AuthService()
        let apiClient = APIClient(authService: authService)
        authService.setAPIClient(apiClient)
        
        let authViewModel = AuthViewModel(authService: authService)
        
        return MainTabView(authViewModel: authViewModel, apiClient: apiClient)
    }
} 