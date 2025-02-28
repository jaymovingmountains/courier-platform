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
            
        case .transitionError(let message):
            return .server(code: 400, description: "Invalid status transition: \(message)")
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
    @Published var isUpdatingJobStatus: Bool = false
    
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
    private var authService: AuthService  // Add AuthService as a dependency
    private var refreshCancellable: AnyCancellable?
    private var updateStatusCancellable: AnyCancellable?
    
    // Add a debounce mechanism to prevent multiple rapid status updates
    private var lastUpdateRequestTime: [Int: Date] = [:]
    private let minimumUpdateInterval: TimeInterval = 1.0 // 1 second between requests
    
    init(apiClient: APIClient, authService: AuthService) {  // Update initializer to accept AuthService
        self.apiClient = apiClient
        self.authService = authService
        
        // Set up notification observer for job refreshes
        refreshCancellable = NotificationCenter.default.publisher(
            for: NSNotification.Name("RefreshJobsNotification")
        )
        .receive(on: RunLoop.main)
        .sink { [weak self] _ in
            print("♻️ Refreshing jobs from notification")
            self?.fetchJobs()
        }
        
        // Set up notification observer for job status updates
        updateStatusCancellable = NotificationCenter.default.publisher(
            for: NSNotification.Name("UpdateJobStatusNotification")
        )
        .receive(on: RunLoop.main)
        .sink { [weak self] notification in
            guard let userInfo = notification.userInfo,
                  let jobId = userInfo["jobId"] as? Int,
                  let status = userInfo["status"] as? String else {
                print("❌ Invalid job status update notification")
                return
            }
            
            print("♻️ Received request to update job #\(jobId) status to: \(status)")
            self?.updateJobStatus(jobId: jobId, status: status)
        }
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
        case .updateJobStatus:
            isUpdatingJobStatus = isLoading
        }
    }
    
    private enum LoadingOperation {
        case fetchActiveJobs
        case fetchAvailableJobs
        case acceptJob
        case updateJobStatus
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
    
    // MARK: - Job Management
    
    func fetchJobs() {
        // Reset retry counters when manually fetching
        fetchRetryCount = 0
        
        // Reset flags
        activeJobsFetched = false
        availableJobsFetched = false
        
        // Clear previous errors
        error = nil
        showError = false
        
        // Start both fetches
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
                    
                    // Get current user ID
                    if let currentUserId = getCurrentUserId() {
                        // Filter jobs that belong to the current user
                        let userJobs = jobs.filter { $0.driverId == currentUserId }
                        print("👤 Filtered \(userJobs.count) jobs assigned to current user ID \(currentUserId)")
                        handleActiveJobsSuccess(userJobs)
                    } else {
                        print("⚠️ Could not determine current user ID, showing all assigned jobs as fallback")
                        handleActiveJobsSuccess(jobs.filter { $0.driverId != nil })
                    }
                    
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
                
                // Filter by current user ID if available
                if let currentUserId = getCurrentUserId() {
                    let userJobs = active.filter { $0.driverId == currentUserId }
                    print("👤 Filtered \(userJobs.count) jobs assigned to current user ID \(currentUserId)")
                    handleActiveJobsSuccess(userJobs)
                } else {
                    print("⚠️ Could not determine current user ID, showing all assigned jobs as fallback")
                    handleActiveJobsSuccess(active)
                }
                
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
        // Filter out delivered jobs to keep them from showing in active jobs
        let filteredJobs = jobs.filter { $0.status != .delivered }
        
        activeJobs = filteredJobs
        activeJobsFetched = true
        setLoading(false, for: .fetchActiveJobs)
        
        // Log information about user-specific jobs
        if let currentUserId = getCurrentUserId() {
            let userJobs = filteredJobs.filter { $0.driverId == currentUserId }
            print("👤 User #\(currentUserId) has \(userJobs.count) active jobs")
            
            // Check for delivered jobs and add them to history
            let deliveredJobs = jobs.filter { $0.status == .delivered && $0.driverId == currentUserId }
            if !deliveredJobs.isEmpty {
                print("📚 Found \(deliveredJobs.count) delivered jobs to move to history")
                for job in deliveredJobs {
                    // Move to history
                    NotificationCenter.default.post(
                        name: NSNotification.Name("MoveJobToHistory"),
                        object: nil,
                        userInfo: ["job": job]
                    )
                }
            }
        }
    }
    
    private func handleAvailableJobsSuccess(_ jobs: [JobDTO]) {
        self.availableJobs = jobs
        self.availableJobsFetched = true
        setLoading(false, for: .fetchAvailableJobs)
        print("✅ Available jobs updated: \(jobs.count) jobs")
    }
    
    // MARK: - Accept Job
    
    func acceptJob(jobId: Int) {
        // Avoid multiple rapid accept attempts
        guard !isAcceptingJob else {
            print("⚠️ Job accept already in progress, ignoring request")
            return
        }
        
        // Check if user is authenticated
        guard let currentUserId = getCurrentUserId() else {
            print("⚠️ Cannot accept job: User not authenticated")
            error = .authentication(description: "You must be logged in to accept jobs")
            showError = true
            return
        }
        
        setLoading(true, for: .acceptJob)
        
        print("📱 Attempting to accept job #\(jobId)")
        
        // Reset retry counter for a new accept attempt
        acceptRetryCount = 0
        
        Task {
            do {
                // Attempt to accept the job
                let accepted: JobDTO = try await apiClient.fetch(
                    endpoint: APIConstants.jobAcceptURL(id: jobId),
                    method: "POST"
                )
                
                // Verify the job was assigned to the current user
                if accepted.driverId == currentUserId {
                    print("✅ Successfully accepted job #\(jobId)")
                    
                    // Refresh all jobs to update UI
                    fetchJobs()
                    
                    // Reset loading state
                    setLoading(false, for: .acceptJob)
                } else {
                    // Job was accepted but assigned to someone else
                    print("⚠️ Job #\(jobId) was accepted but assigned to user #\(accepted.driverId ?? -1) instead of #\(currentUserId)")
                    error = .jobAlreadyAccepted(jobId: jobId)
                    showError = true
                    setLoading(false, for: .acceptJob)
                }
                
            } catch let apiError as APIError {
                // If conflict error (409), job was already accepted by someone else
                if case .serverError(let code) = apiError, code == 409 {
                    print("⚠️ Job #\(jobId) was already accepted by another driver")
                    error = .jobAlreadyAccepted(jobId: jobId)
                    showError = true
                    setLoading(false, for: .acceptJob)
                    
                    // Refresh jobs to get latest state
                    fetchJobs()
                    return
                }
                
                // For other errors, handle with retry logic
                handleError(apiError, operation: "acceptJob", context: ["jobId": jobId], retryAction: { [weak self] in
                    self?.retryAcceptJob(jobId)
                })
                
            } catch {
                handleError(error, operation: "acceptJob", retryAction: { [weak self] in
                    self?.retryAcceptJob(jobId)
                })
            }
        }
    }
    
    private func retryAcceptJob(_ jobId: Int) {
        acceptRetryCount += 1
        
        if acceptRetryCount <= maxRetryCount {
            print("🔄 Retrying job acceptance for job #\(jobId) (Attempt \(acceptRetryCount)/\(maxRetryCount))")
            
            // Calculate backoff time - exponential backoff
            let backoffTime = pow(2.0, Double(acceptRetryCount)) * 0.5
            
            // Retry with backoff
            Task {
                try? await Task.sleep(nanoseconds: UInt64(backoffTime * 1_000_000_000))
                acceptJob(jobId: jobId)
            }
        } else {
            print("⚠️ Maximum retry attempts (\(maxRetryCount)) reached for accept job #\(jobId)")
            setLoading(false, for: .acceptJob)
        }
    }
    
    // MARK: - Update Job Status
    
    private func handleJobStatusUpdateSuccess(jobId: Int, updatedJob: JobDTO) {
        print("🔄 UPDATE JOB STATUS: Handling successful update for job #\(jobId) to status: \(updatedJob.status.rawValue)")
        
        // Remove job from active jobs if it exists
        if let index = activeJobs.firstIndex(where: { $0.id == jobId }) {
            print("📱 Removing job #\(jobId) from activeJobs at index \(index)")
            activeJobs.remove(at: index)
            
            // Add job back to active jobs if it's still active
            // Consider "delivered" as a terminal state that should move to history
            if updatedJob.status != .delivered && updatedJob.status != .cancelled {
                print("📱 Adding updated job back to activeJobs with status: \(updatedJob.status.rawValue)")
                activeJobs.append(updatedJob)
                
                // Force UI refresh by triggering a small change
                objectWillChange.send()
            } else {
                print("📱 Job #\(jobId) is now in terminal state: \(updatedJob.status.rawValue), not adding back to activeJobs")
                
                // If the job is delivered, add it to history
                if updatedJob.status == .delivered {
                    print("📱 Job #\(jobId) marked as delivered - moving to history")
                    // Post notification to move job to history
                    NotificationCenter.default.post(
                        name: NSNotification.Name("MoveJobToHistory"),
                        object: nil,
                        userInfo: ["job": updatedJob]
                    )
                }
            }
        } else {
            print("⚠️ Could not find job #\(jobId) in activeJobs, checking availableJobs...")
            
            // Check if it's in availableJobs (rare case)
            if let index = availableJobs.firstIndex(where: { $0.id == jobId }) {
                print("📱 Removing job #\(jobId) from availableJobs at index \(index)")
                availableJobs.remove(at: index)
                
                // Add to active jobs if not in terminal state
                if updatedJob.status != .delivered && updatedJob.status != .cancelled {
                    print("📱 Adding job to activeJobs with status: \(updatedJob.status.rawValue)")
                    activeJobs.append(updatedJob)
                    
                    // Force UI refresh
                    objectWillChange.send()
                } else if updatedJob.status == .delivered {
                    // If the job is delivered, add it to history
                    print("📱 Job #\(jobId) marked as delivered - moving to history")
                    // Post notification to move job to history
                    NotificationCenter.default.post(
                        name: NSNotification.Name("MoveJobToHistory"),
                        object: nil,
                        userInfo: ["job": updatedJob]
                    )
                }
            }
        }
        
        // Post notification of successful update
        NotificationCenter.default.post(
            name: NSNotification.Name("JobStatusUpdateResult"),
            object: nil,
            userInfo: ["jobId": jobId, "success": true, "updatedStatus": updatedJob.status.rawValue]
        )
        
        // Explicitly post a refresh notification for any views that need it
        NotificationCenter.default.post(
            name: NSNotification.Name("ForceJobUIRefresh"),
            object: nil,
            userInfo: ["jobId": jobId, "status": updatedJob.status.rawValue]
        )
        
        // Reset loading state
        setLoading(false, for: .updateJobStatus)
        
        // Refresh job lists after a slight delay to ensure UI consistency
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            print("📱 Running delayed fetchJobs() to refresh all job data")
            self?.fetchJobs()
        }
        
        print("✅ UPDATE JOB STATUS: Job status update completed for ID: \(jobId)")
    }
    
    /// Update the status of a job directly from the dashboard
    func updateJobStatus(jobId: Int, status: String) {
        // Guard against multiple rapid clicks
        guard !isUpdatingJobStatus else {
            print("🛑 UPDATE JOB STATUS: Already processing a status update request")
            return
        }
        
        // Check if we've recently made a request for this job
        if let lastTime = lastUpdateRequestTime[jobId], 
           Date().timeIntervalSince(lastTime) < minimumUpdateInterval {
            print("🛑 UPDATE JOB STATUS: Debouncing request for job \(jobId) - too soon after previous request")
            return
        }
        
        // Store the current time as the most recent request time
        lastUpdateRequestTime[jobId] = Date()
        
        // Find the job's current status
        var currentStatus: String?
        if let job = activeJobs.first(where: { $0.id == jobId }) {
            currentStatus = job.status.rawValue
        } else if let job = availableJobs.first(where: { $0.id == jobId }) {
            currentStatus = job.status.rawValue
        }
        
        // Verify the transition is valid
        if let currentStatus = currentStatus {
            let isValid = isValidStatusTransition(from: currentStatus, to: status)
            if !isValid {
                print("⚠️ INVALID TRANSITION: Cannot transition from \(currentStatus) to \(status)")
                
                // If trying to go from approved directly to picked_up, suggest the correct flow
                if currentStatus == "approved" && status == "picked_up" {
                    let transitionError = DashboardError.server(
                        code: 400,
                        description: "Jobs must first be assigned before pickup. Please select 'assigned' as the next status."
                    )
                    self.error = transitionError
                    self.showError = true
                    return
                } else {
                    let transitionError = DashboardError.server(
                        code: 400,
                        description: "Invalid status transition from \(currentStatus) to \(status)"
                    )
                    self.error = transitionError
                    self.showError = true
                    return
                }
            }
        }
        
        setLoading(true, for: .updateJobStatus)
        print("🔍 UPDATE JOB STATUS: Starting job status update for ID: \(jobId) to \(status)")
        
        Task {
            do {
                // Use the updateJobStatus method which returns a Result type
                let statusUpdateResult = await apiClient.updateJobStatus(jobId: jobId, status: status)
                
                switch statusUpdateResult {
                case .success(let updatedJob):
                    print("✅ UPDATE JOB STATUS: Successfully updated job ID: \(jobId) to \(status)")
                    handleJobStatusUpdateSuccess(jobId: jobId, updatedJob: updatedJob)
                    
                case .failure(let error):
                    print("🚨 UPDATE JOB STATUS: Update failed: \(error.message)")
                    
                    // Post notification of failed update
                    NotificationCenter.default.post(
                        name: NSNotification.Name("JobStatusUpdateResult"),
                        object: nil, 
                        userInfo: ["jobId": jobId, "success": false, "error": error.message]
                    )
                    
                    // Special handling for transition errors
                    if case .transitionError(let errorMessage) = error {
                        print("⚠️ INVALID TRANSITION: \(errorMessage)")
                        
                        // Create a more specific user-friendly error based on error message
                        var userFriendlyMessage = "Cannot update job status to '\(status)'."
                        
                        if errorMessage.contains("already assigned") {
                            userFriendlyMessage = "This job is already assigned to you. Please select a different status update."
                        } else if errorMessage.contains("Cannot transition from approved to picked_up") {
                            userFriendlyMessage = "Jobs must first be assigned before pickup. Please update the status to 'assigned' first."
                        } else if errorMessage.contains("Invalid status") {
                            userFriendlyMessage = "Invalid status update: \(errorMessage). Please try a different status."
                        } else {
                            userFriendlyMessage += " \(errorMessage)"
                        }
                        
                        let transitionError = DashboardError.server(
                            code: 400,
                            description: userFriendlyMessage
                        )
                        
                        self.error = transitionError
                        self.showError = true
                        setLoading(false, for: .updateJobStatus)
                        return
                    }
                    
                    // Special handling for 400 errors
                    if case .serverError(let code) = error, code == 400 {
                        print("⚠️ BAD REQUEST: Server rejected the status change.")
                        
                        // Handle bad request
                        let requestError = DashboardError.server(
                            code: 400,
                            description: "Server rejected the status update to '\(status)'. Please try again."
                        )
                        
                        self.error = requestError
                        self.showError = true
                        setLoading(false, for: .updateJobStatus)
                        return
                    }
                    
                    throw error
                }
                
            } catch let error as APIError {
                print("🚨 UPDATE JOB STATUS: API error occurred: \(error.message)")
                handleError(error, operation: "updateJobStatus", context: ["jobId": jobId], isRetryable: true)
                setLoading(false, for: .updateJobStatus)
            } catch {
                print("🚨 UPDATE JOB STATUS: Unexpected error: \(error.localizedDescription)")
                handleError(error, operation: "updateJobStatus", context: ["jobId": jobId], isRetryable: true)
                setLoading(false, for: .updateJobStatus)
            }
        }
    }
    
    // Add validation method to DashboardViewModel
    private func isValidStatusTransition(from currentStatus: String, to newStatus: String) -> Bool {
        // Match the server-side validation logic
        switch currentStatus {
        case "pending":
            return ["approved", "assigned", "cancelled"].contains(newStatus)
        case "approved":
            return ["assigned", "cancelled"].contains(newStatus) // ONLY allow assigned or cancelled from approved
        case "quoted":
            return ["assigned", "cancelled"].contains(newStatus)
        case "assigned":
            return ["picked_up", "cancelled"].contains(newStatus)
        case "picked_up":
            return ["in_transit", "cancelled"].contains(newStatus)
        case "in_transit":
            return ["delivered", "cancelled"].contains(newStatus)
        case "delivered":
            return ["cancelled"].contains(newStatus) // Remove completed transition - delivered is final state
        case "cancelled":
            return false // Terminal state
        default:
            return false
        }
    }
    
    // MARK: - Combined Loading State
    
    var isLoading: Bool {
        isLoadingActiveJobs || isLoadingAvailableJobs || isAcceptingJob || isUpdatingJobStatus
    }
    
    // Method to update the authService after initialization
    func updateAuthService(_ newAuthService: AuthService) {
        self.authService = newAuthService
        print("🔄 Updated authService with environment instance")
    }
    
    // Helper to get the current user ID
    private func getCurrentUserId() -> Int? {
        return authService.currentUser?.id
    }
} 
