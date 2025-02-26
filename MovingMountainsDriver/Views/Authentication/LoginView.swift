import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel: LoginViewModel
    @State private var username = ""
    @State private var password = ""
    @State private var isAnimating = false
    @State private var shakeAnimation = 0.0
    
    // Animation states
    @State private var cardOffset: CGFloat = 1000
    @State private var titleOpacity: Double = 0
    @State private var fieldsOpacity: Double = 0
    @State private var buttonOpacity: Double = 0
    
    init() {
        // We'll inject the authViewModel via environmentObject
        // This is just a placeholder that will be replaced
        _viewModel = StateObject(wrappedValue: LoginViewModel())
    }
    
    var body: some View {
        ZStack {
            // Animated gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.2, blue: 0.45),
                    Color(red: 0.15, green: 0.3, blue: 0.6)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)
            .hueRotation(.degrees(isAnimating ? 10 : 0))
            .animation(
                Animation.easeInOut(duration: 10)
                    .repeatForever(autoreverses: true),
                value: isAnimating
            )
            
            // Decorative circles
            FloatingCircle(
                size: 200,
                offset: CGPoint(x: -100, y: -200),
                color: Color.blue.opacity(0.5),
                blurRadius: 60
            )
            
            FloatingCircle(
                size: 250,
                offset: CGPoint(x: 150, y: 250),
                color: Color.purple.opacity(0.4),
                blurRadius: 70
            )
            
            FloatingCircle(
                size: 180,
                offset: CGPoint(x: 130, y: -250),
                color: Color.cyan.opacity(0.3),
                blurRadius: 50
            )
            
            // Main content
            VStack(spacing: 30) {
                // Logo and title
                VStack(spacing: 15) {
                    Image("TruckLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 100, height: 100)
                        .padding()
                        .background(
                            Circle()
                                .fill(Color.white.opacity(0.1))
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                )
                        )
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    
                    Text("Moving Mountains")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Driver App")
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.bottom, 20)
                .opacity(titleOpacity)
                
                // Login card
                GlassCard {
                    VStack(spacing: 25) {
                        // Username field
                        AnimatedTextField(
                            title: "Username",
                            icon: "person.fill",
                            text: $username
                        )
                        
                        // Password field
                        AnimatedTextField(
                            title: "Password",
                            icon: "lock.fill",
                            text: $password,
                            isSecure: true
                        )
                        
                        // Error message
                        if !viewModel.errorMessage.isEmpty {
                            Text(viewModel.errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 5)
                                .modifier(ShakeEffect(amount: 10, animatableData: shakeAnimation))
                                .onAppear {
                                    withAnimation(.default) {
                                        shakeAnimation = 1
                                    }
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                                        shakeAnimation = 0
                                    }
                                }
                        }
                        
                        // Login button
                        GradientButton(
                            title: "Sign In",
                            action: {
                                viewModel.login(username: username, password: password)
                            },
                            isLoading: viewModel.isLoading
                        )
                    }
                }
                .frame(width: 350)
                .offset(y: cardOffset)
                
                // Version info
                Text("v1.0.0")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                    .padding(.top, 30)
                    .opacity(buttonOpacity)
            }
            .padding(.horizontal, 20)
        }
        .onAppear {
            startAnimations()
            // Replace the viewModel with one that uses the injected authViewModel
            viewModel.updateAuthViewModel(authViewModel)
        }
        .onChange(of: viewModel.errorMessage) { newValue in
            if !newValue.isEmpty {
                withAnimation(.default) {
                    shakeAnimation = 1
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    shakeAnimation = 0
                }
            }
        }
    }
    
    private func startAnimations() {
        isAnimating = true
        
        // Animate card sliding in
        withAnimation(.spring(response: 0.8, dampingFraction: 0.7, blendDuration: 0)) {
            cardOffset = 0
        }
        
        // Animate title fading in
        withAnimation(.easeInOut(duration: 1.0).delay(0.3)) {
            titleOpacity = 1
        }
        
        // Animate fields fading in
        withAnimation(.easeInOut(duration: 1.0).delay(0.5)) {
            fieldsOpacity = 1
        }
        
        // Animate button fading in
        withAnimation(.easeInOut(duration: 1.0).delay(0.7)) {
            buttonOpacity = 1
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
            .environmentObject(AuthViewModel())
    }
} 