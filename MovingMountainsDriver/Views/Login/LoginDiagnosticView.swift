import SwiftUI

struct LoginDiagnosticView: View {
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var result: String = ""
    @State private var isLoading: Bool = false
    @State private var showPassword: Bool = false
    @State private var showTestOptions: Bool = false
    
    @EnvironmentObject private var authService: AuthService
    
    // Predefined test accounts for quick testing
    private let testAccounts = [
        ("driver1", "password1"),
        ("driver2", "password2"),
        ("Driver1", "password"),
        ("Driver2", "password")
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Heading
                    Text("🔍 Authentication Diagnostic")
                        .font(.title)
                        .fontWeight(.bold)
                        .padding(.top)
                    
                    // Connection info
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Server Connection")
                            .font(.headline)
                            .padding(.bottom, 2)
                        
                        Text("Base URL: \(APIConstants.baseURL)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Text("Health Endpoint: \(APIConstants.baseURL)/health")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Text("Login Endpoint: \(APIConstants.baseURL)/login")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Divider()
                            .padding(.vertical, 4)
                        
                        // Quick test buttons
                        DisclosureGroup("Quick Test Options", isExpanded: $showTestOptions) {
                            VStack(spacing: 10) {
                                Button("Test Server Connection") {
                                    testServerConnection()
                                }
                                .buttonStyle(PrimaryButtonStyle())
                                
                                ForEach(testAccounts, id: \.0) { account in
                                    Button("Test \(account.0)") {
                                        runPresetTest(username: account.0, password: account.1)
                                    }
                                    .buttonStyle(SecondaryButtonStyle())
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    
                    // Manual test form
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Manual Authentication Test")
                            .font(.headline)
                        
                        TextField("Username", text: $username)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                        
                        HStack {
                            if showPassword {
                                TextField("Password", text: $password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
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
                        
                        Button(action: {
                            testAuthentication()
                        }) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                            } else {
                                Text("Test Authentication")
                                    .fontWeight(.medium)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .disabled(username.isEmpty || password.isEmpty || isLoading)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    
                    // Results section
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Test Results")
                            .font(.headline)
                        
                        if result.isEmpty && !isLoading {
                            Text("No test results yet. Run a test to see diagnostic information.")
                                .foregroundColor(.secondary)
                                .font(.subheadline)
                        } else if isLoading {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                Text("Testing...")
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text(result)
                                .font(.system(.body, design: .monospaced))
                                .padding()
                                .background(
                                    result.contains("SUCCESS") ? Color.green.opacity(0.1) :
                                    result.contains("WARNING") ? Color.yellow.opacity(0.1) :
                                    Color.red.opacity(0.1)
                                )
                                .cornerRadius(8)
                        }
                        
                        // Diagnostic messages from auth service
                        if let diagnosticMessage = authService.diagnosticMessage {
                            Text("Diagnostic Log:")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .padding(.top, 6)
                            
                            Text(diagnosticMessage)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    
                    // User defaults info
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Stored Authentication Data")
                            .font(.headline)
                        
                        if let userId = UserDefaults.standard.object(forKey: UserDefaultsKeys.userId) {
                            Text("UserID: \(userId as? Int ?? 0)")
                                .font(.system(.body, design: .monospaced))
                        } else {
                            Text("UserID: Not set")
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        
                        if let username = UserDefaults.standard.string(forKey: UserDefaultsKeys.username) {
                            Text("Username: \(username)")
                                .font(.system(.body, design: .monospaced))
                        } else {
                            Text("Username: Not set")
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        
                        if let token = UserDefaults.standard.string(forKey: UserDefaultsKeys.authToken) {
                            let maskedToken = String(token.prefix(10)) + "..." + String(token.suffix(5))
                            Text("Token: \(maskedToken)")
                                .font(.system(.body, design: .monospaced))
                        } else {
                            Text("Token: Not set")
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        
                        Button("Clear Stored Auth Data") {
                            clearStoredAuthData()
                        }
                        .foregroundColor(.red)
                        .padding(.top, 8)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                .padding()
            }
            .navigationTitle("Authentication Diagnostics")
        }
    }
    
    // Test server connection
    private func testServerConnection() {
        isLoading = true
        result = ""
        
        Task {
            do {
                if let url = URL(string: "\(APIConstants.baseURL)/health") {
                    let request = URLRequest(url: url)
                    let (_, response) = try await URLSession.shared.data(for: request)
                    
                    if let httpResponse = response as? HTTPURLResponse {
                        await MainActor.run {
                            result = "Server Connection Result:\nStatus Code: \(httpResponse.statusCode)\n"
                            
                            if httpResponse.statusCode == 200 {
                                result += "✅ Server is online and responding."
                            } else {
                                result += "⚠️ Server returned unexpected status code."
                            }
                            
                            isLoading = false
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    result = "❌ Connection Error: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
    
    // Test authentication with entered credentials
    private func testAuthentication() {
        isLoading = true
        result = ""
        
        Task {
            let testResult = await authService.testAuthentication(username: username, password: password)
            
            await MainActor.run {
                result = testResult
                isLoading = false
            }
        }
    }
    
    // Run a preset test
    private func runPresetTest(username: String, password: String) {
        self.username = username
        self.password = password
        testAuthentication()
    }
    
    // Clear stored authentication data
    private func clearStoredAuthData() {
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.userId)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.username)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.authToken)
        
        // Force refresh
        self.objectWillChange.send()
    }
}

// Button styles for consistency
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.blue.opacity(configuration.isPressed ? 0.8 : 1))
            .foregroundColor(.white)
            .cornerRadius(8)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.gray.opacity(configuration.isPressed ? 0.6 : 0.3))
            .foregroundColor(.primary)
            .cornerRadius(8)
    }
}

struct LoginDiagnosticView_Previews: PreviewProvider {
    static var previews: some View {
        LoginDiagnosticView()
            .environmentObject(AuthService())
    }
} 