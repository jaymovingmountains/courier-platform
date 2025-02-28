import Foundation
import SwiftUI
import Combine

@MainActor
final class HistoryViewModel: ObservableObject {
    // Published properties
    @Published var historyJobs: [JobDTO] = []
    @Published var isLoading: Bool = false
    @Published var error: DashboardError? = nil
    @Published var showError: Bool = false
    
    // Dependencies
    private var apiClient: APIClient
    private var authService: AuthService
    private var historyCancellable: AnyCancellable?
    
    init(apiClient: APIClient, authService: AuthService) {
        self.apiClient = apiClient
        self.authService = authService
        
        // Set up notification observer for moving jobs to history
        historyCancellable = NotificationCenter.default.publisher(
            for: NSNotification.Name("MoveJobToHistory")
        )
        .receive(on: RunLoop.main)
        .sink { [weak self] notification in
            if let job = notification.userInfo?["job"] as? JobDTO {
                print("📚 HISTORY: Received job #\(job.id) with status \(job.status.rawValue) to add to history")
                self?.addJobToHistory(job)
                
                // Force a UI refresh
                DispatchQueue.main.async {
                    self?.objectWillChange.send()
                }
            } else {
                print("⚠️ HISTORY: Received MoveJobToHistory notification but could not extract job data")
                if let userInfo = notification.userInfo {
                    print("⚠️ HISTORY: UserInfo contents: \(userInfo)")
                }
            }
        }
        
        // Load history jobs from UserDefaults on initialization
        loadHistoryFromStorage()
        
        print("📚 HISTORY: ViewModel initialized with \(historyJobs.count) history jobs")
    }
    
    // Add a job to history
    func addJobToHistory(_ job: JobDTO) {
        print("📚 HISTORY: Processing job #\(job.id) for history with status \(job.status.rawValue)")
        
        // Only add delivered jobs to history
        guard job.status.rawValue == "delivered" else {
            print("📚 HISTORY: Job #\(job.id) has status \(job.status.rawValue), only 'delivered' jobs are added to history")
            return
        }
        
        // Check if job already exists in history
        if !historyJobs.contains(where: { $0.id == job.id }) {
            print("📚 HISTORY: Adding job #\(job.id) to history")
            historyJobs.append(job)
            
            // Sort history jobs by date (newest first)
            historyJobs.sort { 
                // Parse dates and compare
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
                
                let date1 = dateFormatter.date(from: $0.createdAt) ?? Date.distantPast
                let date2 = dateFormatter.date(from: $1.createdAt) ?? Date.distantPast
                
                return date1 > date2
            }
            
            // Save to UserDefaults
            saveHistoryToStorage()
            
            // Notify UI to update
            objectWillChange.send()
            print("📚 HISTORY: History now contains \(historyJobs.count) jobs")
        } else {
            print("📚 HISTORY: Job #\(job.id) already exists in history, skipping")
        }
    }
    
    // Fetch history jobs from the server
    func fetchHistoryJobs() {
        isLoading = true
        print("📚 HISTORY: Fetching delivered jobs from server")
        
        Task {
            do {
                // Fetch only jobs with delivered status
                let deliveredJobs: [JobDTO] = try await apiClient.fetch(
                    endpoint: APIConstants.jobsWithParams(status: "delivered", assigned: true)
                )
                
                print("📚 HISTORY: Found \(deliveredJobs.count) delivered jobs on server")
                
                // Filter by current user ID
                if let currentUserId = getCurrentUserId() {
                    let userDeliveredJobs = deliveredJobs.filter { $0.driverId == currentUserId }
                    
                    print("📚 HISTORY: \(userDeliveredJobs.count) delivered jobs belong to current user #\(currentUserId)")
                    
                    // Add each job to history
                    for job in userDeliveredJobs {
                        addJobToHistory(job)
                    }
                } else {
                    print("⚠️ HISTORY: Could not determine current user ID")
                }
                
                // Also check for jobs without status filter to catch any that might have been missed
                let allJobs: [JobDTO] = try await apiClient.fetch(
                    endpoint: APIConstants.jobsWithParams(assigned: true)
                )
                
                // Process any delivered jobs that might have been missed
                if let currentUserId = getCurrentUserId() {
                    let additionalDeliveredJobs = allJobs.filter { 
                        $0.status.rawValue == "delivered" && $0.driverId == currentUserId 
                    }
                    
                    print("📚 HISTORY: Found \(additionalDeliveredJobs.count) additional delivered jobs for user #\(currentUserId)")
                    
                    for job in additionalDeliveredJobs {
                        addJobToHistory(job)
                    }
                }
                
                isLoading = false
            } catch {
                print("🚨 HISTORY ERROR: Failed to fetch history jobs: \(error.localizedDescription)")
                isLoading = false
                
                if let apiError = error as? APIError {
                    self.error = DashboardError.from(apiError)
                } else {
                    self.error = .unknown(error)
                }
                self.showError = true
            }
        }
    }
    
    // Save history jobs to UserDefaults
    private func saveHistoryToStorage() {
        do {
            // Convert jobs to Data
            let encoder = JSONEncoder()
            let data = try encoder.encode(historyJobs)
            
            // Save to UserDefaults
            UserDefaults.standard.set(data, forKey: "historyJobs")
            print("📚 HISTORY: Saved \(historyJobs.count) jobs to storage")
        } catch {
            print("🚨 HISTORY ERROR: Failed to save history jobs: \(error.localizedDescription)")
        }
    }
    
    // Load history jobs from UserDefaults
    private func loadHistoryFromStorage() {
        if let data = UserDefaults.standard.data(forKey: "historyJobs") {
            do {
                // Convert Data back to jobs
                let decoder = JSONDecoder()
                let jobs = try decoder.decode([JobDTO].self, from: data)
                
                // Only keep delivered jobs
                historyJobs = jobs.filter { $0.status.rawValue == "delivered" }
                print("📚 HISTORY: Loaded \(historyJobs.count) delivered jobs from storage")
            } catch {
                print("🚨 HISTORY ERROR: Failed to load history jobs: \(error.localizedDescription)")
            }
        } else {
            print("📚 HISTORY: No history jobs found in storage")
        }
    }
    
    // Clear history
    func clearHistory() {
        historyJobs.removeAll()
        UserDefaults.standard.removeObject(forKey: "historyJobs")
        objectWillChange.send()
        print("📚 HISTORY: Cleared history")
    }
    
    // Helper to get the current user ID
    private func getCurrentUserId() -> Int? {
        return authService.currentUser?.id
    }
    
    // Method to update the authService after initialization
    func updateAuthService(_ newAuthService: AuthService) {
        self.authService = newAuthService
        print("🔄 HISTORY: Updated authService with environment instance")
        
        // After updating auth service, immediately try to fetch jobs
        // to ensure we have the correct user context
        fetchHistoryJobs()
    }
} 