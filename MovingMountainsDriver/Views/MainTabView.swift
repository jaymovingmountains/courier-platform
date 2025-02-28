import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var authService: AuthService
    @StateObject private var apiClient: APIClient
    
    init() {
        _apiClient = StateObject(wrappedValue: APIClient(authService: AuthService()))
    }
    
    var body: some View {
        TabView {
            DashboardView(apiClient: apiClient)
                .tabItem {
                    Label("Jobs", systemImage: "list.bullet")
                }
            
            HistoryView(apiClient: apiClient)
                .tabItem {
                    Label("History", systemImage: "clock.arrow.circlepath")
                }
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
        .onAppear {
            apiClient.updateAuthService(authService)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthService())
} 