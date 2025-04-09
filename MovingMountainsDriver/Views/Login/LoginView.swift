import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isLoading = false
    
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            // Logo and title
            VStack(spacing: 10) {
                Image(systemName: "mountain.2.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                Text("Moving Mountains")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Driver App")
                    .font(.headline)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 40)
            
            // Login form
            VStack(spacing: 15) {
                TextField("Username", text: $username)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .overlay(
                        RoundedRectangle(cornerRadius: 5)
                            .stroke(Color.blue.opacity(0.5), lineWidth: 1)
                    )
                    .padding(.horizontal)
                
                // Password field with show/hide option
                HStack {
                    if showPassword {
                        TextField("Password", text: $password)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .disableAutocorrection(true)
                    } else {
                        SecureField("Password", text: $password)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                    
                    Button(action: {
                        showPassword.toggle()
                    }) {
                        Image(systemName: showPassword ? "eye.slash" : "eye")
                            .foregroundColor(.gray)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.blue.opacity(0.5), lineWidth: 1)
                )
                .padding(.horizontal)
                
                // Show error message if available
                if let errorMessage = authService.authError {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.horizontal)
                        .multilineTextAlignment(.center)
                        .transition(.opacity)
                }
                
                // Show connection status if available
                if let diagnosticMessage = authService.diagnosticMessage {
                    Text(diagnosticMessage)
                        .foregroundColor(.secondary)
                        .font(.caption)
                        .padding(.horizontal)
                        .multilineTextAlignment(.center)
                }
                
                // Login button
                Button(action: {
                    login()
                }) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.blue)
                            .cornerRadius(10)
                    } else {
                        Text("Login")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                }
                .disabled(username.isEmpty || password.isEmpty || isLoading)
                .padding(.horizontal)
                .padding(.top, 10)
                
                // Render server indicator
                HStack {
                    Image(systemName: "network")
                        .foregroundColor(.green)
                    Text("Connected to Render Server")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 10)
            }
            
            Spacer()
            
            // Footer with version info
            VStack(spacing: 8) {
                Text("Moving Mountains Driver App")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Version 1.0")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 20)
        }
        .padding()
        .onAppear {
            // Clear previous errors when view appears
            authService.authError = nil
            
            // Pre-populate test credentials for development
            #if DEBUG
            username = "Driver1"
            password = "password"
            #endif
        }
    }
    
    private func login() {
        // Clear previous errors
        authService.authError = nil
        
        // Show loading indicator
        isLoading = true
        
        // Attempt login
        Task {
            await authService.login(username: username, password: password)
            
            // Update loading state on main thread
            DispatchQueue.main.async {
                isLoading = false
            }
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
            .environmentObject(AuthService())
    }
} 