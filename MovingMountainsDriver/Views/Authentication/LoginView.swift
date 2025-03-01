import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @EnvironmentObject private var authService: AuthService
    @State private var debugMessage: String = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Logo section
                VStack {
                    // Logo image with system icon fallback
                    Group {
                        // Try UIImage to check if asset exists
                        if UIImage(named: "AppLogo") != nil {
                            Image("AppLogo")
                                .resizable()
                                .scaledToFit()
                                .onAppear {
                                    debugMessage = "Using AppLogo image"
                                    print("✅ Found and using AppLogo")
                                }
                        } else if UIImage(named: "moving-mountains-logo") != nil {
                            Image("moving-mountains-logo")
                                .resizable()
                                .scaledToFit()
                                .onAppear {
                                    debugMessage = "Using moving-mountains-logo image"
                                    print("✅ Found and using moving-mountains-logo")
                                }
                        } else {
                            // Fallback to system icon
                            Image(systemName: "mountain.2.fill")
                                .resizable()
                                .scaledToFit()
                                .foregroundColor(.blue)
                                .onAppear {
                                    debugMessage = "Using fallback system icon"
                                    print("⚠️ No logo assets found, using system icon")
                                    
                                    // Print bundle info for debugging
                                    if let bundlePath = Bundle.main.resourcePath {
                                        print("📦 Bundle path: \(bundlePath)")
                                    }
                                    
                                    // List all assets in main bundle
                                    let fileManager = FileManager.default
                                    if let bundleURL = Bundle.main.resourceURL {
                                        do {
                                            let contents = try fileManager.contentsOfDirectory(at: bundleURL, includingPropertiesForKeys: nil)
                                            print("📂 Bundle contents:")
                                            for item in contents {
                                                print("   - \(item.lastPathComponent)")
                                            }
                                        } catch {
                                            print("❌ Error listing bundle contents: \(error)")
                                        }
                                    }
                                    
                                    // Check assets catalog
                                    if let catalogPath = Bundle.main.path(forResource: "Assets", ofType: "car") {
                                        print("📚 Assets catalog found at: \(catalogPath)")
                                    } else {
                                        print("❌ No Assets.car found in bundle")
                                    }
                                }
                        }
                    }
                    .frame(width: 100, height: 100)
                    
                    // Show debug message in development only
                    #if DEBUG
                    if !debugMessage.isEmpty {
                        Text(debugMessage)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    #endif
                    
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