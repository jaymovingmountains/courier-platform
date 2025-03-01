import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @EnvironmentObject private var authService: AuthService
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Logo section
                VStack {
                    // Use the AppLogo directly
                    Image("AppLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)
                    
                    Text("Driver Portal")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Log in to access your shipments")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.bottom, 20)
                
                // Form fields
                VStack(spacing: 15) {
                    TextField("Username", text: $viewModel.username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    SecureField("Password", text: $viewModel.password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if let error = authService.authError {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                            .padding(.top, 5)
                    }
                    
                    Button(action: {
                        viewModel.login(authService: authService)
                    }) {
                        Text(viewModel.isLoggingIn ? "Logging in..." : "Log In")
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor)
                            .cornerRadius(8)
                    }
                    .disabled(viewModel.isLoggingIn || !viewModel.isFormValid)
                    .opacity(viewModel.isFormValid ? 1.0 : 0.6)
                }
                .padding(.horizontal, 30)
                
                Spacer()
            }
            .padding(.top, 50)
            .background(Color(.systemGroupedBackground))
            .edgesIgnoringSafeArea(.all)
        }
    }
}

// Create LoginViewModel
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var username = ""
    @Published var password = ""
    @Published var isLoggingIn = false
    
    var isFormValid: Bool {
        !username.isEmpty && password.count >= 4
    }
    
    func login(authService: AuthService) {
        guard isFormValid else { return }
        
        isLoggingIn = true
        
        Task {
            await authService.login(username: username, password: password)
            
            self.isLoggingIn = false
        }
    }
} 