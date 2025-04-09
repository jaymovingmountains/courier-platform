import SwiftUI

struct GlassBackground: View {
    var body: some View {
        ZStack {
            // Blurred background with noise effect for glass look
            Color.white.opacity(0.15)
            
            // Light gradient overlay for shine effect
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white.opacity(0.6),
                    Color.white.opacity(0.2)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Subtle noise texture for glass effect
            Color.white.opacity(0.05)
                .overlay(
                    Rectangle()
                        .fill(
                            Color.white.opacity(0.1)
                        )
                        .blendMode(.overlay)
                )
        }
        // Apply blur for glass effect
        .background(Color.white.opacity(0.4))
        .background(
            VisualEffectView(effect: UIBlurEffect(style: .systemThinMaterialLight))
        )
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.white.opacity(0.8),
                            Color.white.opacity(0.2)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
        )
        .shadow(color: Color.black.opacity(0.07), radius: 10, x: 0, y: 5)
    }
}

// Helper view to use UIKit's blur effect
struct VisualEffectView: UIViewRepresentable {
    var effect: UIVisualEffect?
    
    func makeUIView(context: UIViewRepresentableContext<Self>) -> UIVisualEffectView {
        return UIVisualEffectView(effect: effect)
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: UIViewRepresentableContext<Self>) {
        uiView.effect = effect
    }
}

struct VibrantButton: View {
    var text: String
    var isLoading: Bool
    var action: () -> Void
    var disabled: Bool
    
    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 15)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color(red: 0.1, green: 0.4, blue: 0.9),
                                Color(red: 0.2, green: 0.6, blue: 1.0)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 55)
                    .shadow(color: Color(red: 0.1, green: 0.4, blue: 0.9).opacity(0.5), radius: 8, x: 0, y: 5)
                
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.2)
                } else {
                    Text(text)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .opacity(disabled ? 0.6 : 1.0)
        }
        .disabled(disabled)
    }
}

struct LoginView: View {
    @StateObject private var authService = AuthService()
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var isLoggingIn: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var animateGradient: Bool = false
    
    var body: some View {
        ZStack {
            // Dynamic animated background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.2, green: 0.5, blue: 0.9),
                    Color(red: 0.4, green: 0.7, blue: 1.0),
                    Color(red: 0.6, green: 0.8, blue: 0.9)
                ]),
                startPoint: animateGradient ? .topLeading : .bottomLeading,
                endPoint: animateGradient ? .bottomTrailing : .topTrailing
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(Animation.linear(duration: 5.0).repeatForever(autoreverses: true)) {
                    animateGradient.toggle()
                }
            }
            
            // Decorative mountain silhouettes
            VStack {
                Spacer()
                
                Image(systemName: "mountain.2.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 120)
                    .foregroundColor(.white.opacity(0.1))
                    .offset(y: 20)
            }
            .ignoresSafeArea()
            
            // Content
            ScrollView {
                VStack(spacing: 35) {
                    // Logo section with animation
                    LargeLogoView()
                        .padding(.top, 50)
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    
                    // Login form with glass effect
                    ZStack {
                        GlassBackground()
                        
                        VStack(spacing: 25) {
                            // Title
                            Text("Driver Login")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.8))
                                .padding(.bottom, 10)
                            
                            // Username field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Username")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Image(systemName: "person")
                                        .foregroundColor(.gray)
                                        .frame(width: 20)
                                    
                                    TextField("", text: $username)
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                }
                                .padding()
                                .background(Color.white.opacity(0.8))
                                .cornerRadius(12)
                            }
                            
                            // Password field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Image(systemName: "lock")
                                        .foregroundColor(.gray)
                                        .frame(width: 20)
                                    
                                    SecureField("", text: $password)
                                }
                                .padding()
                                .background(Color.white.opacity(0.8))
                                .cornerRadius(12)
                            }
                            
                            // Login button
                            VibrantButton(
                                text: "Sign In",
                                isLoading: isLoggingIn,
                                action: login,
                                disabled: isLoggingIn || username.isEmpty || password.isEmpty
                            )
                            .padding(.top, 10)
                            
                            // Help text
                            VStack(spacing: 10) {
                                Text("Need help?")
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                
                                Button(action: {
                                    // Open support contact options
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: "envelope.fill")
                                        Text("Contact Support")
                                    }
                                    .font(.callout)
                                    .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.8))
                                }
                            }
                            .padding(.top, 10)
                        }
                        .padding(.horizontal, 30)
                        .padding(.vertical, 35)
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer(minLength: 40)
                    
                    // Footer
                    VStack(spacing: 5) {
                        Text("© Moving Mountains Logistics")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                        
                        Text("Version 1.0")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.bottom, 20)
                }
                .padding()
            }
            
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
                        ZStack {
                            Color.white
                            VisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
                                .opacity(0.8)
                        }
                        .cornerRadius(15)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                    )
                    .padding()
                }
                .transition(.move(edge: .bottom))
                .animation(.spring(), value: showError)
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