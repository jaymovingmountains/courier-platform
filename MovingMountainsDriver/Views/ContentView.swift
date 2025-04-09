import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authService: AuthService
    
    // Add state variable for diagnostic view
    @State private var showDiagnostics = false
    
    var body: some View {
        Group {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
                    // Add diagnostic button overlay
                    .overlay(
                        VStack {
                            Spacer()
                            Button(action: {
                                showDiagnostics = true
                            }) {
                                Text("Diagnostic Tools")
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.gray.opacity(0.3))
                                    .cornerRadius(20)
                            }
                            .padding(.bottom, 20)
                        }
                    )
                    // Add sheet presentation for diagnostic view
                    .sheet(isPresented: $showDiagnostics) {
                        LoginDiagnosticView()
                            .environmentObject(authService)
                    }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AuthService())
    }
} 