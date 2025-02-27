import Foundation
import SwiftUI
import Combine

// MARK: - Custom Error Types

/// Specific error types for the Dashboard
enum DashboardError: Error, Identifiable {
    case network(description: String, isRetryable: Bool)
    case server(code: Int, description: String)
    case authentication(description: String)
    case authorization(description: String)
    case notFound(item: String)
    case parsing(description: String)
    case offline
    case timeout
    case jobAlreadyAccepted(jobId: Int)
    case unknown(Error?)
    
    var id: String {
        switch self {
        case .network: return "network"
        case .server(let code, _): return "server_\(code)"
        case .authentication: return "authentication"
        case .authorization: return "authorization"
        case .notFound: return "notFound"
        case .parsing: return "parsing"
        case .offline: return "offline"
        case .timeout: return "timeout"
        case .jobAlreadyAccepted(let jobId): return "jobAlreadyAccepted_\(jobId)"
        case .unknown: return "unknown"
        }
    }
    
    /// User-friendly error message
    var userMessage: String {
        switch self {
        case .network(let description, let isRetryable):
            return isRetryable 
                ? "Connection issue: \(description). We'll try again shortly."
                : "Network error: \(description). Please check your connection."
            
        case .server(let code, let description):
            switch code {
            case 500...599:
                return "Server error (\(code)): \(description). Our team has been notified."
            default:
                return "Server error (\(code)): \(description)."
            }
            
        case .authentication(let description):
            return "Authentication error: \(description). Please log in again."
            
        case .authorization(let description):
            return "Access denied: \(description). You don't have permission for this action."
            
        case .notFound(let item):
            return "\(item) could not be found."
            
        case .parsing(let description):
            return "Data error: \(description). Please contact support if this persists."
            
        case .offline:
            return "You're offline. Please check your connection and try again."
            
        case .timeout:
            return "Request timed out. Please try again later."
            
        case .jobAlreadyAccepted(let jobId):
            return "Job #\(jobId) has already been accepted by another driver."
            
        case .unknown(let error):
            if let error = error {
                return "An unexpected error occurred: \(error.localizedDescription)"
            } else {
                return "An unexpected error occurred. Please try again."
            }
        }
    }
    
    /// Debug information for logging
    var debugDescription: String {
        switch self {
        case .network(let description, let isRetryable):
            return "Network error: \(description), Retryable: \(isRetryable)"
        case .server(let code, let description):
            return "Server error (\(code)): \(description)"
        case .authentication(let description):
            return "Authentication error: \(description)"
        case .authorization(let description):
            return "Authorization error: \(description)"
        case .notFound(let item):
            return "Not found error: \(item)"
        case .parsing(let description):
            return "Parsing error: \(description)"
        case .offline:
            return "Device is offline"
        case .timeout:
            return "Request timed out"
        case .jobAlreadyAccepted(let jobId):
            return "Job #\(jobId) already accepted by another driver"
        case .unknown(let error):
            return "Unknown error: \(error?.localizedDescription ?? "No details")"
        }
    }
    
    /// Convert from APIError to more specific DashboardError
    static func from(_ apiError: APIError, context: [String: Any] = [:]) -> DashboardError {
        // Check if this is a job already accepted case
        if case .serverError(let code) = apiError, code == 409, 
           let jobId = context["jobId"] as? Int {
            return .jobAlreadyAccepted(jobId: jobId)
        }
        
        switch apiError {
        case .invalidURL:
            return .network(description: "Invalid URL", isRetryable: false)
            
        case .noData:
            return .network(description: "No data received", isRetryable: true)
            
        case .decodingError:
            return .parsing(description: "Could not process server response")
            
        case .serverError(let code):
            switch code {
            case 401:
                return .authentication(description: "Your session has expired")
            case 403:
                return .authorization(description: "You don't have permission to perform this action")
            case 404:
                return .notFound(item: "Resource")
            case 408:
                return .timeout
            case 409:
                // Generic conflict error when we don't have the job ID context
                return .server(code: code, description: "This resource is already in use")
            case 500...599:
                return .server(code: code, description: "Server encountered an error")
            default:
                return .server(code: code, description: "Unexpected server response")
            }
            
        case .networkError(let error):
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet:
                    return .offline
                case NSURLErrorTimedOut:
                    return .timeout
                case NSURLErrorNetworkConnectionLost, NSURLErrorCannotConnectToHost:
                    return .network(description: "Connection lost", isRetryable: true)
                default:
                    return .network(description: error.localizedDescription, isRetryable: true)
                }
            }
            return .network(description: error.localizedDescription, isRetryable: true)
            
        case .unauthorized:
            return .authentication(description: "Session expired or invalid")
            
        case .unknown:
            return .unknown(nil)
        }
    }
}

// MARK: - Dashboard View Model
@MainActor
final class DashboardViewModel: ObservableObject {
    // Published properties
    @Published var activeJobs: [JobDTO] = []
    @Published var availableJobs: [JobDTO] = []
    
    // Detailed loading states
    @Published var isLoadingActiveJobs: Bool = false
    @Published var isLoadingAvailableJobs: Bool = false
    @Published var isAcceptingJob: Bool = false
    
    // More detailed error handling
    @Published var error: DashboardError? = nil
    @Published var showError: Bool = false
    
    // Retry management
    private var fetchRetryCount = 0
    private var acceptRetryCount = 0
    private let maxRetryCount = 3
    private var activeJobsFetched = false
    private var availableJobsFetched = false
    
    // Dependencies
    private var apiClient: APIClient
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    // MARK: - Loading State Management
    
    private func setLoading(_ isLoading: Bool, for operation: LoadingOperation) {
        switch operation {
        case .fetchActiveJobs:
            isLoadingActiveJobs = isLoading
        case .fetchAvailableJobs:
            isLoadingAvailableJobs = isLoading
        case .acceptJob:
            isAcceptingJob = isLoading
        }
    }
    
    private enum LoadingOperation {
        case fetchActiveJobs
        case fetchAvailableJobs
        case acceptJob
    }
    
    // MARK: - Error Handling
    
    private func handleError(_ error: Error, operation: String, context: [String: Any] = [:], isRetryable: Bool = true, retryAction: (() async -> Void)? = nil) {
        // Convert to our custom error type
        let dashboardError: DashboardError
        
        if let apiError = error as? APIError {
            dashboardError = DashboardError.from(apiError, context: context)
        } else {
            dashboardError = .unknown(error)
        }
        
        // Log detailed error information
        print("🚨 ERROR in \(operation): \(dashboardError.debugDescription)")
        
        // Set the error and show it
        self.error = dashboardError
        self.showError = true
        
        // Perform retries for retryable errors
        if isRetryable, let retryAction = retryAction {
            // Different retry logic based on error type
            switch dashboardError {
            case .network(_, let isRetryable):
                if isRetryable {
                    Task {
                        await performRetry(retryAction, operation: operation)
                    }
                }
            case .server(_, _), .timeout, .offline:
                Task {
                    await performRetry(retryAction, operation: operation)
                }
            case .jobAlreadyAccepted:
                // Never retry already accepted jobs
                print("🔒 ERROR: Cannot retry - job is already accepted by another driver")
            default:
                break
            }
        }
    }
    
    // MARK: - Retry Logic
    
    private func performRetry(_ action: @escaping () async -> Void, operation: String) async {
        let retryCount: Int
        
        // Get the appropriate retry counter
        switch operation {
        case "fetchJobs":
            fetchRetryCount += 1
            retryCount = fetchRetryCount
        case "acceptJob":
            acceptRetryCount += 1
            retryCount = acceptRetryCount
        default:
            return
        }
        
        // Don't retry beyond max attempts
        guard retryCount <= maxRetryCount else {
            print("🔄 Maximum retry count reached for \(operation)")
            return
        }
        
        // Exponential backoff: 2^retry * 500ms base time
        let delay = pow(2.0, Double(retryCount)) * 0.5
        print("🔄 Retrying \(operation) in \(delay) seconds (attempt \(retryCount)/\(maxRetryCount))")
        
        // Wait with exponential backoff
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        
        // Execute the retry action
        await action()
    }
    
    // MARK: - Fetch Jobs
    
    func fetchJobs() {
        // Reset retry counters when manually fetching
        fetchRetryCount = 0
        activeJobsFetched = false
        availableJobsFetched = false
        
        // Clear previous errors
        error = nil
        showError = false
        
        // Begin fetching both active and available jobs
        fetchActiveJobs()
        fetchAvailableJobs()
    }
    
    private func fetchActiveJobs() {
        guard !activeJobsFetched else { return }
        
        setLoading(true, for: .fetchActiveJobs)
        print("🔍 Fetching active jobs...")
        
        Task {
            do {
                // First try the debug method
                let result = await apiClient.debugFetchJobs()
                
                switch result {
                case .success(let jobs):
                    print("✅ Successfully fetched \(jobs.count) jobs with debug method")
                    handleActiveJobsSuccess(jobs.filter { $0.driverId != nil })
                    handleAvailableJobsSuccess(jobs.filter { $0.driverId == nil })
                    return
                    
                case .failure(let apiError):
                    print("⚠️ Debug fetch failed: \(apiError.message), falling back to standard method")
                    // Continue with standard method below
                }
                
                // Standard method if debug method fails
                let active: [JobDTO] = try await apiClient.fetch(
                    endpoint: APIConstants.jobsWithParams(assigned: true)
                )
                
                handleActiveJobsSuccess(active)
                
            } catch {
                handleError(error, operation: "fetchJobs", retryAction: { [weak self] in
                    self?.fetchActiveJobs()
                })
                setLoading(false, for: .fetchActiveJobs)
            }
        }
    }
    
    private func fetchAvailableJobs() {
        guard !availableJobsFetched else { return }
        
        setLoading(true, for: .fetchAvailableJobs)
        print("🔍 Fetching available jobs...")
        
        Task {
            do {
                // Try to fetch jobs by status
                do {
                    var allAvailableJobs: [JobDTO] = []
                    
                    // Fetch each status type separately
                    for status in ["pending", "approved", "quoted"] {
                        let statusJobs: [JobDTO] = try await apiClient.fetch(
                            endpoint: APIConstants.jobsWithParams(status: status, assigned: false)
                        )
                        print("✅ Found \(statusJobs.count) jobs with status: \(status)")
                        allAvailableJobs.append(contentsOf: statusJobs)
                    }
                    
                    handleAvailableJobsSuccess(allAvailableJobs)
                    
                } catch {
                    print("⚠️ Error fetching by status, falling back to all unassigned: \(error.localizedDescription)")
                    
                    // Fallback to fetching all unassigned
                    let available: [JobDTO] = try await apiClient.fetch(
                        endpoint: APIConstants.jobsWithParams(assigned: false)
                    )
                    
                    handleAvailableJobsSuccess(available)
                }
                
            } catch {
                handleError(error, operation: "fetchJobs", retryAction: { [weak self] in
                    self?.fetchAvailableJobs()
                })
                setLoading(false, for: .fetchAvailableJobs)
            }
        }
    }
    
    private func handleActiveJobsSuccess(_ jobs: [JobDTO]) {
        self.activeJobs = jobs
        self.activeJobsFetched = true
        setLoading(false, for: .fetchActiveJobs)
        print("✅ Active jobs updated: \(jobs.count) jobs")
    }
    
    private func handleAvailableJobsSuccess(_ jobs: [JobDTO]) {
        self.availableJobs = jobs
        self.availableJobsFetched = true
        setLoading(false, for: .fetchAvailableJobs)
        print("✅ Available jobs updated: \(jobs.count) jobs")
    }
    
    // MARK: - Accept Job
    
    func acceptJob(jobId: Int) {
        // Reset retry counter
        acceptRetryCount = 0
        
        // Clear any previous errors
        error = nil
        showError = false
        
        setLoading(true, for: .acceptJob)
        print("🔍 ACCEPT JOB: Starting job acceptance process for ID: \(jobId)")
        
        Task {
            do {
                // Try the debug method first
                print("🔍 ACCEPT JOB: Attempting acceptance with debug method")
                let result = await apiClient.debugAcceptJob(jobId: jobId)
                
                switch result {
                case .success(let updatedJob):
                    print("✅ ACCEPT JOB: Successfully accepted job ID: \(jobId) using debug method")
                    handleJobAcceptSuccess(jobId: jobId, updatedJob: updatedJob)
                    return
                    
                case .failure(let apiError):
                    print("⚠️ ACCEPT JOB: Debug accept failed: \(apiError.message), falling back to standard method")
                    // Check for already accepted error
                    if case .serverError(let code) = apiError, code == 409 {
                        print("🔒 ACCEPT JOB: Job #\(jobId) is already accepted by another driver (409 Conflict)")
                        handleError(apiError, operation: "acceptJob", context: ["jobId": jobId], isRetryable: false)
                        setLoading(false, for: .acceptJob)
                        return
                    }
                    // Continue with standard method below for other errors
                }
                
                // Standard method if debug fails
                print("🔍 ACCEPT JOB: Falling back to standard API method for job acceptance")
                let endpoint = APIConstants.jobAcceptURL(id: jobId)
                print("🔍 ACCEPT JOB: Using endpoint: \(endpoint) with POST method")
                
                let updatedJob: JobDTO = try await apiClient.fetch(
                    endpoint: endpoint,
                    method: "POST"
                )
                
                print("✅ ACCEPT JOB: Successfully accepted job ID: \(jobId) using standard method")
                handleJobAcceptSuccess(jobId: jobId, updatedJob: updatedJob)
                
            } catch let error as APIError {
                print("🚨 ACCEPT JOB: API error occurred: \(error.message)")
                
                // Special handling for 409 (Conflict) - Job already accepted
                if case .serverError(let code) = error, code == 409 {
                    print("🔒 ACCEPT JOB: Job #\(jobId) is already accepted by another driver (409 Conflict)")
                    handleError(error, operation: "acceptJob", context: ["jobId": jobId], isRetryable: false)
                } else {
                    handleError(error, operation: "acceptJob", context: ["jobId": jobId], retryAction: { [weak self] in
                        await self?.retryAcceptJob(jobId: jobId)
                    })
                }
                setLoading(false, for: .acceptJob)
            } catch {
                print("🚨 ACCEPT JOB: Unexpected error: \(error.localizedDescription)")
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], retryAction: { [weak self] in
                    await self?.retryAcceptJob(jobId: jobId)
                })
                setLoading(false, for: .acceptJob)
            }
        }
    }
    
    private func retryAcceptJob(jobId: Int) async {
        print("🔄 ACCEPT JOB: Retrying job acceptance for ID: \(jobId), attempt \(acceptRetryCount + 1)/\(maxRetryCount)")
        
        do {
            let endpoint = APIConstants.jobAcceptURL(id: jobId)
            print("🔍 ACCEPT JOB RETRY: Using endpoint: \(endpoint) with POST method")
            
            let updatedJob: JobDTO = try await apiClient.fetch(
                endpoint: endpoint,
                method: "POST"
            )
            
            print("✅ ACCEPT JOB RETRY: Successfully accepted job ID: \(jobId) on retry attempt \(acceptRetryCount)")
            handleJobAcceptSuccess(jobId: jobId, updatedJob: updatedJob)
            
        } catch let error as APIError {
            print("🚨 ACCEPT JOB RETRY: API error occurred: \(error.message)")
            
            // Special handling for 409 (Conflict) - Job already accepted
            if case .serverError(let code) = error, code == 409 {
                print("🔒 ACCEPT JOB RETRY: Job #\(jobId) is already accepted by another driver (409 Conflict)")
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], isRetryable: false)
                setLoading(false, for: .acceptJob)
                return
            }
            
            if acceptRetryCount < maxRetryCount {
                // Continue retrying with exponential backoff via the retry mechanism
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], retryAction: { [weak self] in
                    await self?.retryAcceptJob(jobId: jobId)
                })
            } else {
                // Max retries reached, just show error
                print("🚫 ACCEPT JOB RETRY: Maximum retry count reached for job ID: \(jobId)")
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], isRetryable: false)
            }
            setLoading(false, for: .acceptJob)
        } catch {
            print("🚨 ACCEPT JOB RETRY: Unexpected error: \(error.localizedDescription)")
            if acceptRetryCount < maxRetryCount {
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], retryAction: { [weak self] in
                    await self?.retryAcceptJob(jobId: jobId)
                })
            } else {
                handleError(error, operation: "acceptJob", context: ["jobId": jobId], isRetryable: false)
            }
            setLoading(false, for: .acceptJob)
        }
    }
    
    private func handleJobAcceptSuccess(jobId: Int, updatedJob: JobDTO) {
        print("✅ ACCEPT JOB SUCCESS: Job ID: \(jobId) accepted")
        print("📊 ACCEPT JOB SUCCESS: Updated job status: \(updatedJob.status)")
        
        // Add the accepted job to activeJobs
        self.activeJobs.append(updatedJob)
        print("📊 ACCEPT JOB SUCCESS: Added to activeJobs. New count: \(self.activeJobs.count)")
        
        // Remove the job from availableJobs
        self.availableJobs.removeAll { $0.id == jobId }
        print("📊 ACCEPT JOB SUCCESS: Removed from availableJobs. New count: \(self.availableJobs.count)")
        
        setLoading(false, for: .acceptJob)
        print("✅ ACCEPT JOB SUCCESS: Job acceptance process completed for ID: \(jobId)")
    }
    
    // MARK: - Combined Loading State
    
    var isLoading: Bool {
        isLoadingActiveJobs || isLoadingAvailableJobs || isAcceptingJob
    }
} 