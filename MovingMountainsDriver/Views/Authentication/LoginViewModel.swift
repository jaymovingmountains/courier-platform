import Foundation
import Combine

class LoginViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage = ""
    @Published var isAuthenticated = false
    
    private var cancellables = Set<AnyCancellable>()
    private var authViewModel: AuthViewModel?
    
    init(authViewModel: AuthViewModel? = nil) {
        self.authViewModel = authViewModel
        setupObservers()
    }
    
    func updateAuthViewModel(_ authViewModel: AuthViewModel) {
        // Clear existing cancellables
        cancellables.removeAll()
        
        // Set the new authViewModel
        self.authViewModel = authViewModel
        
        // Setup observers again
        setupObservers()
    }
    
    private func setupObservers() {
        guard let authViewModel = authViewModel else { return }
        
        // Observe authentication state changes from AuthViewModel
        authViewModel.$isAuthenticated
            .sink { [weak self] isAuthenticated in
                self?.isAuthenticated = isAuthenticated
            }
            .store(in: &cancellables)
        
        // Observe loading state changes from AuthViewModel
        authViewModel.$isLoading
            .sink { [weak self] isLoading in
                self?.isLoading = isLoading
            }
            .store(in: &cancellables)
        
        // Observe error changes from AuthViewModel
        authViewModel.$error
            .compactMap { $0 } // Filter out nil values
            .sink { [weak self] error in
                self?.errorMessage = error
            }
            .store(in: &cancellables)
    }
    
    func login(username: String, password: String) {
        // Validate inputs
        guard !username.isEmpty else {
            errorMessage = "Username is required"
            return
        }
        
        guard !password.isEmpty else {
            errorMessage = "Password is required"
            return
        }
        
        // Clear any previous error
        errorMessage = ""
        
        // Delegate to AuthViewModel
        guard let authViewModel = authViewModel else {
            errorMessage = "Authentication service not available"
            return
        }
        
        Task {
            await authViewModel.loginAsync(username: username, password: password)
        }
    }
    
    func resetError() {
        errorMessage = ""
    }
} 