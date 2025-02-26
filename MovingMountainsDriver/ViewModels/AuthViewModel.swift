import Foundation
import Combine

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var currentUser: User? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let authService: AuthService
    
    init(authService: AuthService = AuthService()) {
        self.authService = authService
        checkCurrentSession()
    }
    
    func login(email: String, password: String) {
        isLoading = true
        error = nil
        
        authService.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                
                if case .failure(let error) = completion {
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .unauthorized:
                            self?.error = "Invalid username or password"
                        case .forbidden(let message):
                            self?.error = message
                        default:
                            self?.error = apiError.localizedDescription
                        }
                    } else {
                        self?.error = error.localizedDescription
                    }
                }
            } receiveValue: { [weak self] user in
                self?.currentUser = user
                self?.isAuthenticated = true
            }
            .store(in: &cancellables)
    }
    
    // Async/await login method
    func loginAsync(username: String, password: String) async {
        isLoading = true
        error = nil
        
        do {
            let user = try await authService.login(username: username, password: password)
            
            DispatchQueue.main.async {
                self.currentUser = user
                self.isAuthenticated = true
                self.isLoading = false
            }
        } catch {
            DispatchQueue.main.async {
                self.isLoading = false
                
                if let apiError = error as? APIError {
                    switch apiError {
                    case .unauthorized:
                        self.error = "Invalid username or password"
                    case .forbidden(let message):
                        self.error = message
                    default:
                        self.error = apiError.localizedDescription
                    }
                } else {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    func logout() {
        authService.logout()
        
        DispatchQueue.main.async {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
    
    private func checkCurrentSession() {
        // Check if user is already logged in
        if authService.isLoggedIn() {
            authService.getCurrentUser()
                .receive(on: DispatchQueue.main)
                .sink { [weak self] completion in
                    if case .failure = completion {
                        self?.isAuthenticated = false
                        self?.currentUser = nil
                    }
                } receiveValue: { [weak self] user in
                    self?.currentUser = user
                    self?.isAuthenticated = true
                }
                .store(in: &cancellables)
        }
    }
} 