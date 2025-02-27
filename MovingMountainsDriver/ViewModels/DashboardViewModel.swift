import Foundation
import Combine

class DashboardViewModel: ObservableObject {
    @Published var activeJob: JobDTO?
    @Published var availableJobs: [JobDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiClient: APIClient
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    func fetchJobs() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Fetch active jobs (assigned to current driver)
                let activeJobs: [JobDTO] = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)?assigned=true"
                )
                
                // Find first active job (not delivered)
                let active = activeJobs.first { 
                    ["assigned", "picked_up", "in_transit"].contains($0.status) 
                }
                
                // Fetch available jobs
                let available: [JobDTO] = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)?status=approved&assigned=false"
                )
                
                DispatchQueue.main.async {
                    self.activeJob = active
                    self.availableJobs = available
                    self.isLoading = false
                }
            } catch let error as APIError {
                DispatchQueue.main.async {
                    self.errorMessage = error.message
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "An unexpected error occurred"
                    self.isLoading = false
                }
            }
        }
    }
    
    func acceptJob(id: Int) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Call API to accept the job
                let updatedJob: JobDTO = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(id)/accept",
                    method: "POST"
                )
                
                DispatchQueue.main.async {
                    self.activeJob = updatedJob
                    self.availableJobs.removeAll { $0.id == id }
                    self.isLoading = false
                }
            } catch let error as APIError {
                DispatchQueue.main.async {
                    self.errorMessage = error.message
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "An unexpected error occurred"
                    self.isLoading = false
                }
            }
        }
    }
} 