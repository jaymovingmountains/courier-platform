import SwiftUI

struct LoginView: View {
    @StateObject private var authService = AuthService()
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var isLoggingIn: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color.blue.opacity(0.6), Color.white]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Content
            VStack(spacing: 30) {
                // Logo section
                LargeLogoView()
                    .padding(.top, 40)
                
                // Login form
                VStack(spacing: 20) {
                    // Title
                    Text("Driver Login")
                        .font(.system(size: 24, weight: .bold))
                        .padding(.bottom, 10)
                    
                    // Username field
                    TextField("Username", text: $username)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(8)
                        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    // Password field
                    SecureField("Password", text: $password)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(8)
                        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                    
                    // Login button
                    Button(action: login) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.blue)
                                .frame(height: 50)
                            
                            if isLoggingIn {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Sign In")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                        }
                    }
                    .disabled(isLoggingIn || username.isEmpty || password.isEmpty)
                    .padding(.top, 10)
                    
                    // Help text
                    VStack(spacing: 8) {
                        Text("Need help?")
                            .font(.callout)
                            .foregroundColor(.secondary)
                        
                        Button("Contact Support") {
                            // Open support contact options
                            // This could open email, phone, or in-app messaging
                        }
                        .font(.callout)
                        .foregroundColor(.blue)
                    }
                    .padding(.top, 20)
                }
                .padding(.horizontal, 30)
                .padding(.vertical, 30)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.8))
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                )
                .padding(.horizontal, 20)
                
                Spacer()
                
                Text("© Moving Mountains Logistics")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 20)
            }
            .padding()
            
            // Error alert
            if showError {
                VStack {
                    Spacer()
                    
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        
                        Text(errorMessage)
                            .font(.callout)
                            .foregroundColor(.red)
                        
                        Spacer()
                        
                        Button(action: {
                            showError = false
                        }) {
                            Image(systemName: "xmark")
                                .foregroundColor(.gray)
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white)
                            .shadow(radius: 4)
                    )
                    .padding()
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: showError)
                .zIndex(1)
            }
        }
    }
    
    // Login function
    private func login() {
        // Validate inputs
        guard !username.isEmpty && !password.isEmpty else {
            errorMessage = "Please enter your username and password"
            showError = true
            return
        }
        
        isLoggingIn = true
        
        // Simulate API call with delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // In a real app, we would call the auth service to login
            if username == "driver1" && password == "password" {
                // Success - we would normally navigate to the main app here
                print("Login successful")
            } else {
                // Failed login
                errorMessage = "Invalid username or password"
                showError = true
            }
            
            isLoggingIn = false
        }
    }
}

// Preview for SwiftUI Canvas
struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
    }
} 