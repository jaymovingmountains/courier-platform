import SwiftUI
import MapKit
import Combine

// MARK: - Custom Error Types for Job Details

/// Specific error types for Job Details
enum JobDetailsError: Error, Identifiable {
    case network(description: String, isRetryable: Bool)
    case server(code: Int, description: String)
    case jobNotFound(jobId: Int)
    case authentication(description: String)
    case authorization(description: String)
    case parsing(description: String)
    case offline
    case timeout
    case jobNotOwnedByCurrentUser(jobId: Int)
    case unknown(Error?)
    
    var id: String {
        switch self {
        case .network: return "network"
        case .server(let code, _): return "server_\(code)"
        case .jobNotFound(let jobId): return "jobNotFound_\(jobId)"
        case .authentication: return "authentication"
        case .authorization: return "authorization"
        case .parsing: return "parsing"
        case .offline: return "offline"
        case .timeout: return "timeout"
        case .jobNotOwnedByCurrentUser(let jobId): return "jobNotOwned_\(jobId)"
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
            return "Server error (\(code)): \(description)"
            
        case .jobNotFound(let jobId):
            return "Job #\(jobId) could not be found. It may have been cancelled or removed."
            
        case .authentication(let description):
            return "Authentication error: \(description). Please log in again."
            
        case .authorization(let description):
            return "Authorization error: \(description)"
            
        case .parsing(let description):
            return "Data error: \(description). Please contact support if this persists."
            
        case .offline:
            return "You're offline. Please check your connection and try again."
            
        case .timeout:
            return "Request timed out. Please try again later."
            
        case .jobNotOwnedByCurrentUser(let jobId):
            return "Job #\(jobId) belongs to another driver. You do not have permission to view or update this job."
            
        case .unknown(let error):
            if let error = error {
                return "An unexpected error occurred: \(error.localizedDescription)"
            } else {
                return "An unexpected error occurred. Please try again."
            }
        }
    }
    
    /// Convert from APIError to more specific JobDetailsError
    static func from(_ apiError: APIError, jobId: Int? = nil) -> JobDetailsError {
        switch apiError {
        case .invalidURL:
            return .network(description: "Invalid URL", isRetryable: false)
            
        case .noData:
            return .network(description: "No data received", isRetryable: true)
            
        case .decodingError:
            return .parsing(description: "Could not process server response")
            
        case .serverError(let code):
            // Handle 404 errors specially
            if code == 404, let jobId = jobId {
                return .jobNotFound(jobId: jobId)
            }
            
            switch code {
            case 401:
                return .authentication(description: "Your session has expired")
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
    
    /// Whether this error type should be automatically retried
    var isRetryable: Bool {
        switch self {
        case .network(_, let isRetryable):
            return isRetryable
        case .offline, .timeout, .server:
            return true
        case .jobNotFound, .authentication, .parsing, .unknown:
            return false
        case .authorization:
            return false
        case .jobNotOwnedByCurrentUser:
            return false
        }
    }
}

@MainActor
final class JobDetailsViewModel: ObservableObject {
    @Published var job: JobDTO?
    @Published var isLoading = false
    @Published var error: JobDetailsError?
    @Published var showError = false
    @Published var directions: MKDirections.Response?
    @Published var statusUpdateMessage: String?
    @Published var showStatusUpdateMessage = false
    
    // Retry management
    private var retryCount = 0
    private let maxRetryCount = 3
    
    private let apiClient: APIClient
    private var authService: AuthService
    public let jobId: Int
    
    // Network monitor
    private let networkMonitor = NetworkMonitor.shared
    private var connectivityCancellable: AnyCancellable?
    
    init(apiClient: APIClient, authService: AuthService, jobId: Int) {
        self.apiClient = apiClient
        self.authService = authService
        self.jobId = jobId
        
        // Listen for connectivity restoration
        connectivityCancellable = NotificationCenter.default.publisher(
            for: NetworkMonitor.connectivityRestoredNotification
        )
        .receive(on: RunLoop.main)
        .sink { [weak self] _ in
            // When connection is restored, retry if we have an error
            if self?.error?.isRetryable == true {
                self?.resetRetryCounter()
                self?.fetchJobDetails()
            }
        }
    }
    
    // Helper method to get current user ID
    private func getCurrentUserId() -> Int? {
        return authService.currentUser?.id
    }
    
    // Helper method to check if job belongs to current user
    private func jobBelongsToCurrentUser(_ job: JobDTO) -> Bool {
        guard let currentUserId = getCurrentUserId() else {
            return false
        }
        
        if job.driverId == currentUserId {
            return true
        } else {
            // Create more specific error
            self.error = .jobNotOwnedByCurrentUser(jobId: job.id)
            return false
        }
    }
    
    func fetchJobDetails() {
        isLoading = true
        error = nil
        showError = false
        
        print("🔍 JOB DETAILS: Fetching details for job ID: \(jobId)")
        
        Task {
            // First try to fetch using getJobDetails which returns a Result<JobDTO, APIError>
            print("🔍 JOB DETAILS: Using enhanced getJobDetails method with ID \(jobId)")
            let result = await apiClient.getJobDetails(jobId: "\(jobId)")
            
            switch result {
            case .success(let fetchedJob):
                // Check if this job belongs to the current user
                if self.jobBelongsToCurrentUser(fetchedJob) {
                    self.job = fetchedJob
                    self.calculateRoute()
                    self.isLoading = false
                    print("✅ JOB DETAILS: Successfully fetched details for job ID: \(jobId)")
                } else {
                    print("❌ JOB DETAILS: Job #\(jobId) does not belong to the current user")
                    self.showError = true
                    self.isLoading = false
                }
                return
                
            case .failure(let error):
                print("❌ JOB DETAILS: Enhanced method failed with error: \(error.message)")
                if case .serverError(let code) = error, code == 404 {
                    print("❌ JOB DETAILS: Job #\(jobId) could not be found")
                    self.error = .jobNotFound(jobId: self.jobId)
                    self.showError = true
                    self.isLoading = false
                } else {
                    // Try legacy method for compatibility
                    print("🔍 JOB DETAILS: Attempting with legacy method as last resort")
                    tryLegacyFetchMethod()
                }
            }
        }
    }
    
    private func tryLegacyFetchMethod() {
        Task {
            do {
                // Try with int ID
                let intJobId = jobId
                print("🔍 JOB DETAILS: Trying with integer job ID: \(intJobId)")
                
                do {
                    let jobResult: JobDTO = try await apiClient.fetch(
                        endpoint: "\(APIConstants.jobsEndpoint)/\(intJobId)"
                    )
                    
                    // Check if this job belongs to the current user
                    if self.jobBelongsToCurrentUser(jobResult) {
                        self.job = jobResult
                        self.calculateRoute()
                        self.isLoading = false
                        print("✅ JOB DETAILS: Successfully fetched with integer ID")
                    } else {
                        print("❌ JOB DETAILS: Job #\(jobId) does not belong to the current user")
                        // Error is set by jobBelongsToCurrentUser method
                        self.showError = true
                        self.isLoading = false
                    }
                    return
                    
                } catch let error as APIError {
                    print("⚠️ JOB DETAILS: Integer ID fetch failed: \(error.message)")
                    
                    // Try with string ID
                    print("🔍 JOB DETAILS: Trying with string job ID: \"\(intJobId)\"")
                    do {
                        let jobResult: JobDTO = try await apiClient.fetch(
                            endpoint: "\(APIConstants.jobsEndpoint)/\"\(intJobId)\""
                        )
                        
                        // Check if this job belongs to the current user
                        if self.jobBelongsToCurrentUser(jobResult) {
                            self.job = jobResult
                            self.calculateRoute()
                            self.isLoading = false
                            print("✅ JOB DETAILS: Successfully fetched with string ID")
                        } else {
                            print("❌ JOB DETAILS: Job #\(jobId) does not belong to the current user")
                            // Error is set by jobBelongsToCurrentUser method
                            self.showError = true
                            self.isLoading = false
                        }
                        return
                        
                    } catch let stringError as APIError {
                        print("⚠️ JOB DETAILS: String ID fetch also failed: \(stringError.message)")
                        throw stringError
                    }
                }
                
            } catch let error as APIError {
                print("🚨 JOB DETAILS ERROR: All fetch attempts failed. Final error: \(error.message)")
                handleError(error)
            } catch {
                print("🚨 JOB DETAILS UNEXPECTED ERROR: \(error.localizedDescription)")
                handleError(error)
            }
        }
    }
    
    private func handleError(_ error: Error) {
        let jobDetailsError: JobDetailsError
        
        if let apiError = error as? APIError {
            jobDetailsError = JobDetailsError.from(apiError, jobId: jobId)
        } else {
            jobDetailsError = .unknown(error)
        }
        
        print("🚨 JOB DETAILS ERROR: \(jobDetailsError.userMessage)")
        
        // Set the error and show it
        self.error = jobDetailsError
        self.showError = true
        self.isLoading = false
        
        // Automatically retry for network-related errors if we're online
        // Note: The NetworkMonitor will handle offline retries,
        // so we only need to handle online retries here
        if jobDetailsError.isRetryable && retryCount < maxRetryCount && networkMonitor.isConnected {
            retryFetchJobDetails()
        }
    }
    
    private func retryFetchJobDetails() {
        retryCount += 1
        
        // Exponential backoff: 2^retry * 500ms base time
        let delay = pow(2.0, Double(retryCount)) * 0.5
        print("🔄 JOB DETAILS: Retrying fetch in \(delay) seconds (attempt \(retryCount)/\(maxRetryCount))")
        
        // Wait with exponential backoff
        Task {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            fetchJobDetails()
        }
    }
    
    func calculateRoute() {
        guard let job = job else { return }
        
        let geocoder = CLGeocoder()
        
        // First, geocode the pickup address
        let pickupAddressString = "\(job.pickupAddress), \(job.pickupCity), \(job.pickupPostalCode)"
        geocoder.geocodeAddressString(pickupAddressString) { [weak self] pickupPlacemarks, pickupError in
            if let pickupError = pickupError {
                print("Pickup geocoding error: \(pickupError.localizedDescription)")
                return
            }
            
            guard let pickupPlacemark = pickupPlacemarks?.first,
                  let pickupLocation = pickupPlacemark.location else {
                print("No pickup location found")
                return
            }
            
            // Then, geocode the delivery address
            let deliveryAddressString = "\(job.deliveryAddress), \(job.deliveryCity), \(job.deliveryPostalCode)"
            geocoder.geocodeAddressString(deliveryAddressString) { [weak self] deliveryPlacemarks, deliveryError in
                if let deliveryError = deliveryError {
                    print("Delivery geocoding error: \(deliveryError.localizedDescription)")
                    return
                }
                
                guard let deliveryPlacemark = deliveryPlacemarks?.first,
                      let deliveryLocation = deliveryPlacemark.location else {
                    print("No delivery location found")
                    return
                }
                
                // Create the route request
                let request = MKDirections.Request()
                request.source = MKMapItem(placemark: MKPlacemark(coordinate: pickupLocation.coordinate))
                request.destination = MKMapItem(placemark: MKPlacemark(coordinate: deliveryLocation.coordinate))
                request.transportType = .automobile
                
                // Calculate the route
                let directions = MKDirections(request: request)
                directions.calculate { [weak self] response, error in
                    if let error = error {
                        print("Route calculation error: \(error.localizedDescription)")
                        return
                    }
                    
                    // Access the main actor to update UI
                    Task { @MainActor in
                        self?.directions = response
                    }
                }
            }
        }
    }
    
    /// Check if the status transition is valid based on server-side validation rules
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
            return ["completed", "cancelled"].contains(newStatus)
        case "completed", "cancelled":
            return false // Terminal states
        default:
            return false
        }
    }
    
    /// Get user-friendly message for status update
    private func getStatusUpdateMessage(for status: String) -> String {
        switch status {
        case "assigned":
            return "Job assigned successfully"
        case "picked_up":
            return "Pickup confirmed"
        case "in_transit":
            return "Shipment is now in transit"
        case "delivered":
            return "Delivery confirmed"
        case "completed":
            return "Job completed successfully"
        case "cancelled":
            return "Job has been cancelled"
        default:
            return "Status updated to \(status)"
        }
    }
    
    func updateJobStatus(to status: String) {
        // Validate job exists
        guard let job = job else {
            error = .unknown(nil)
            showError = true
            return
        }
        
        // Validate the status transition
        if !isValidStatusTransition(from: job.status.rawValue, to: status) {
            error = .server(code: 400, description: "Invalid status transition from \(job.status.rawValue) to \(status)")
            showError = true
            return
        }
        
        isLoading = true
        error = nil
        showError = false
        statusUpdateMessage = "Updating job status..."
        showStatusUpdateMessage = true
        
        print("🔄 JOB STATUS: Updating job #\(jobId) status to: \(status)")
        
        Task {
            do {
                // Format the request body to match server.js expectations: {status: 'new_status'}
                let updateBody = ["status": status]
                let jsonData = try JSONSerialization.data(withJSONObject: updateBody)
                
                // Use the exact endpoint structure from server.js: /jobs/:id/status with PUT method
                let updatedJob: JobDTO = try await apiClient.fetchWithOfflineSupport(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/status",
                    method: "PUT",
                    body: jsonData,
                    requestType: "update_job_status"
                )
                
                self.job = updatedJob
                self.isLoading = false
                
                // Show success message
                self.statusUpdateMessage = getStatusUpdateMessage(for: status)
                self.showStatusUpdateMessage = true
                
                // Auto-hide the message after 3 seconds
                Task {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    self.showStatusUpdateMessage = false
                }
                
                print("✅ JOB STATUS: Successfully updated job #\(jobId) status to: \(status)")
            } catch let error as APIError {
                handleError(error)
                statusUpdateMessage = nil
                showStatusUpdateMessage = false
            } catch {
                handleError(error)
                statusUpdateMessage = nil
                showStatusUpdateMessage = false
            }
        }
    }
    
    /// Reset retry counter for manual retries
    func resetRetryCounter() {
        retryCount = 0
    }
    
    func updateAuthService(_ authService: AuthService) {
        self.authService = authService
    }
}

struct JobDetailsView: View {
    @StateObject private var viewModel: JobDetailsViewModel
    @EnvironmentObject private var authService: AuthService
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    @State private var showHistoryRedirectAlert = false
    
    var onDismiss: (() -> Void)?
    
    init(apiClient: APIClient, jobId: Int, onDismiss: (() -> Void)? = nil) {
        // Use a temporary AuthService here
        _viewModel = StateObject(wrappedValue: JobDetailsViewModel(apiClient: apiClient, authService: AuthService(), jobId: jobId))
        self.onDismiss = onDismiss
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let job = viewModel.job {
                    // Check if the job is delivered and show a message
                    if job.status == .delivered {
                        DeliveredJobBanner()
                    }
                    
                    // Job found - normal view
                    // Status section
                    StatusBadgeView(status: job.status.rawValue)
                    
                    // Status flow view
                    JobStatusFlowView(currentStatus: job.status.rawValue)
                    
                    // Map View
                    JobDetailsMapView(directions: viewModel.directions)
                        .frame(height: 250)
                        .cornerRadius(12)
                    
                    // Address section
                    AddressSection(job: job)
                    
                    // Vehicle section if available
                    if let vehicleName = job.vehicleName, let licensePlate = job.licensePlate {
                        VehicleInfoView(vehicleName: vehicleName, licensePlate: licensePlate)
                    }
                    
                    // Action buttons
                    ActionButtonsView(job: job, onStatusUpdate: { newStatus in
                        viewModel.updateJobStatus(to: newStatus)
                    })
                } else if viewModel.error != nil && !viewModel.isLoading {
                    // Job not found or error - guidance view
                    JobErrorGuidanceView(
                        error: viewModel.error!, 
                        onRetry: {
                            viewModel.resetRetryCounter()
                            viewModel.fetchJobDetails()
                        },
                        onBackToDashboard: {
                            onDismiss?()
                        }
                    )
                }
            }
            .padding()
        }
        .navigationTitle("Job #\(viewModel.job?.id ?? viewModel.jobId)")
        .overlay(
            Group {
                if viewModel.isLoading {
                    LoadingView()
                }
                
                // Status update message overlay
                if viewModel.showStatusUpdateMessage, let message = viewModel.statusUpdateMessage {
                    VStack {
                        Spacer()
                        
                        Text(message)
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(8)
                            .shadow(radius: 3)
                            .padding(.bottom, 20)
                    }
                    .transition(.move(edge: .bottom))
                    .animation(.easeInOut, value: viewModel.showStatusUpdateMessage)
                }
            }
        )
        .alert(isPresented: $viewModel.showError) {
            Alert(
                title: Text(errorAlertTitle),
                message: Text(viewModel.error?.userMessage ?? "Unknown error"),
                dismissButton: .default(Text("OK"))
            )
        }
        .alert(isPresented: $showHistoryRedirectAlert) {
            Alert(
                title: Text("Job Delivered"),
                message: Text("This job has been delivered and moved to the History tab. You can view all delivered jobs in the History section."),
                dismissButton: .default(Text("OK"))
            )
        }
        .onAppear {
            // Update with the proper AuthService from the environment
            viewModel.updateAuthService(authService)
            viewModel.fetchJobDetails()
            
            // Check job status after loading and show history alert if needed
            if let job = viewModel.job, job.status == .delivered {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showHistoryRedirectAlert = true
                }
            }
        }
        .onChange(of: viewModel.job?.status.rawValue) { newStatus in
            if newStatus == "delivered" {
                // If the job just became delivered, show the history redirect alert
                showHistoryRedirectAlert = true
            }
        }
        .withOfflineIndicator() // Apply our offline indicator
    }
    
    // Custom error alert title based on error type
    private var errorAlertTitle: String {
        guard let error = viewModel.error else { return "Error" }
        
        switch error {
        case .jobNotFound:
            return "Job Not Found"
        case .authentication:
            return "Authentication Error"
        case .network, .offline, .timeout:
            return "Connection Error"
        case .server:
            return "Server Error"
        case .authorization:
            return "Authorization Error"
        default:
            return "Error"
        }
    }
}

// Add a banner component for delivered jobs
struct DeliveredJobBanner: View {
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.mint)
                    .font(.title2)
                
                Text("Delivery Complete")
                    .font(.headline)
                    .foregroundColor(.mint)
            }
            
            Text("This job has been delivered and moved to your history tab.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.mint.opacity(0.1))
        .cornerRadius(12)
    }
}

struct JobErrorGuidanceView: View {
    let error: JobDetailsError
    let onRetry: () -> Void
    let onBackToDashboard: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: errorIcon)
                .font(.system(size: 64))
                .foregroundColor(errorColor)
                .padding(.bottom, 8)
            
            // Error message
            Text(error.userMessage)
                .font(.headline)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            // Guidance message
            Text(guidanceMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            // Action buttons
            VStack(spacing: 12) {
                // Only show retry button for retryable errors
                if error.isRetryable {
                    Button(action: onRetry) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Try Again")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                
                Button(action: onBackToDashboard) {
                    HStack {
                        Image(systemName: "house.fill")
                        Text("Back to Dashboard")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(error.isRetryable ? Color(.systemGray5) : Color.accentColor)
                    .foregroundColor(error.isRetryable ? .primary : .white)
                    .cornerRadius(10)
                }
            }
            .padding(.top, 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
        .padding()
    }
    
    private var errorIcon: String {
        switch error {
        case .jobNotFound:
            return "doc.fill.questionmark"
        case .network, .offline, .timeout:
            return "wifi.exclamationmark"
        case .authentication:
            return "lock.fill"
        case .authorization:
            return "exclamationmark.triangle.fill"
        case .jobNotOwnedByCurrentUser:
            return "person.fill.xmark"
        case .server:
            return "server.rack"
        default:
            return "exclamationmark.triangle.fill"
        }
    }
    
    private var errorColor: Color {
        switch error {
        case .jobNotFound:
            return .orange
        case .network, .offline, .timeout:
            return .blue
        case .authentication:
            return .red
        case .authorization:
            return .red
        case .jobNotOwnedByCurrentUser:
            return .red
        case .server:
            return .red
        default:
            return .yellow
        }
    }
    
    private var guidanceMessage: String {
        switch error {
        case .jobNotFound:
            return "This job may have been cancelled or reassigned. You can return to the dashboard to see your current jobs."
        case .network, .offline, .timeout:
            return "There seems to be a connection issue. Check your internet connection and try again."
        case .authentication:
            return "Your session has expired. Please return to the dashboard and log in again."
        case .authorization:
            return "You do not have permission to view this job. Please contact the job owner for access."
        case .jobNotOwnedByCurrentUser:
            return "This job is assigned to another driver. You can only view and update jobs assigned to you."
        default:
            return "You can try again or return to the dashboard to view other jobs."
        }
    }
}

// Helper Components

struct StatusBadgeView: View {
    let status: String
    
    var body: some View {
        VStack(spacing: 6) {
            Text(statusText)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(statusColor.opacity(0.2))
                .foregroundColor(statusColor)
                .cornerRadius(8)
                
            Text(statusDescription)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
    }
    
    var statusColor: Color {
        switch status {
        case "pending":
            return .yellow
        case "approved", "quoted":
            return .orange
        case "assigned":
            return .blue
        case "picked_up":
            return .purple  
        case "in_transit":
            return .indigo
        case "delivered":
            return .mint
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
    
    var statusText: String {
        // Format the status text by replacing underscores with spaces and capitalizing
        return status
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }
    
    // Add a helpful description for each status
    var statusDescription: String {
        switch status {
        case "pending":
            return "Waiting for approval from shipper"
        case "approved":
            return "Approved by shipper - Ready to be assigned to you"
        case "quoted":
            return "Quote provided - Ready to be assigned to you"
        case "assigned":
            return "Job is assigned to you - Ready for pickup"
        case "picked_up":
            return "Shipment picked up - Ready to start transit"
        case "in_transit":
            return "Shipment in transit to destination"
        case "delivered":
            return "Delivered to recipient - Job complete"
        case "cancelled":
            return "Job has been cancelled"
        default:
            return "Unknown status"
        }
    }
}

struct AddressSection: View {
    let job: JobDTO
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Delivery Details")
                .font(.headline)
                .padding(.bottom, 4)
            
            // Pickup Address
            VStack(alignment: .leading, spacing: 4) {
                Text("PICKUP")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(job.pickupAddress)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text("\(job.pickupCity), \(job.pickupPostalCode)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 8)
            
            // Delivery Address
            VStack(alignment: .leading, spacing: 4) {
                Text("DELIVERY")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(job.deliveryAddress)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text("\(job.deliveryCity), \(job.deliveryPostalCode)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // Removed quote amount display as requested
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct VehicleInfoView: View {
    let vehicleName: String
    let licensePlate: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vehicle Information")
                .font(.headline)
                .padding(.bottom, 4)
            
            HStack {
                Image(systemName: "car.fill")
                    .foregroundColor(.accentColor)
                
                Text(vehicleName)
                    .font(.body)
            }
            
            HStack {
                Image(systemName: "captions.bubble.fill")
                    .foregroundColor(.accentColor)
                
                Text(licensePlate)
                    .font(.body)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct ActionButtonsView: View {
    let job: JobDTO
    let onStatusUpdate: (String) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Different buttons depending on job status
            switch job.status.rawValue {
            case "pending", "approved", "quoted":
                Button(action: {
                    onStatusUpdate("assigned")
                }) {
                    ActionButton(title: "Accept Job", iconName: "checkmark.circle", color: .blue)
                }
                
            case "assigned":
                Button(action: {
                    onStatusUpdate("picked_up")
                }) {
                    ActionButton(title: "Confirm Pickup", iconName: "cube.box.fill", color: .blue)
                }
                
            case "picked_up":
                Button(action: {
                    onStatusUpdate("in_transit")
                }) {
                    ActionButton(title: "Start Transit", iconName: "arrow.right.circle.fill", color: .orange)
                }
                
            case "in_transit":
                Button(action: {
                    onStatusUpdate("delivered")
                }) {
                    ActionButton(title: "Confirm Delivery", iconName: "checkmark.circle.fill", color: .green)
                }
                
            case "delivered", "cancelled":
                Text("This job is \(job.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
                
            default:
                EmptyView()
            }
            
            // Navigation button
            if job.status.rawValue != "delivered" && job.status.rawValue != "cancelled" {
                let encodedAddress = "\(job.deliveryAddress), \(job.deliveryCity), \(job.deliveryPostalCode)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                Link(destination: URL(string: "maps://?daddr=\(encodedAddress)")!) {
                    ActionButton(title: "Open in Maps", iconName: "map", color: .blue)
                }
                
                // Add cancel button for non-terminal states
                Button(action: {
                    onStatusUpdate("cancelled")
                }) {
                    ActionButton(title: "Cancel Job", iconName: "xmark.circle", color: .red)
                }
            }
        }
    }
}

struct ActionButton: View {
    let title: String
    let iconName: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: iconName)
            Text(title)
                .fontWeight(.semibold)
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding()
        .background(color)
        .cornerRadius(8)
    }
}

struct JobDetailsMapView: UIViewRepresentable {
    var directions: MKDirections.Response?
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations)
        
        if let directions = directions, let route = directions.routes.first {
            mapView.addOverlay(route.polyline)
            
            // Add annotations for source and destination
            if let sourceCoordinate = route.steps.first?.polyline.coordinate,
               let destinationCoordinate = route.steps.last?.polyline.coordinate {
                
                let sourceAnnotation = MKPointAnnotation()
                sourceAnnotation.coordinate = sourceCoordinate
                sourceAnnotation.title = "Pickup"
                
                let destinationAnnotation = MKPointAnnotation()
                destinationAnnotation.coordinate = destinationCoordinate
                destinationAnnotation.title = "Delivery"
                
                mapView.addAnnotations([sourceAnnotation, destinationAnnotation])
            }
            
            // Set the map region to show the entire route
            let padding: CGFloat = 50
            mapView.setVisibleMapRect(route.polyline.boundingMapRect, edgePadding: UIEdgeInsets(top: padding, left: padding, bottom: padding, right: padding), animated: true)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: JobDetailsMapView
        
        init(_ parent: JobDetailsMapView) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = UIColor.systemBlue
                renderer.lineWidth = 5
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
        
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if annotation is MKUserLocation {
                return nil
            }
            
            let identifier = "pin"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
            
            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
            } else {
                annotationView?.annotation = annotation
            }
            
            // Customize pin color based on title
            if annotation.title == "Pickup" {
                annotationView?.markerTintColor = UIColor.systemGreen
            } else if annotation.title == "Delivery" {
                annotationView?.markerTintColor = UIColor.systemRed
            }
            
            return annotationView
        }
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                ProgressView()
                    .scaleEffect(1.5)
                    .padding()
                
                Text("Loading...")
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(.systemBackground).opacity(0.8))
            )
        }
    }
}

// Add this new struct near other helper views
struct JobStatusFlowView: View {
    let currentStatus: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Job Status Flow")
                .font(.headline)
                .padding(.bottom, 4)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(statusFlow, id: \.self) { status in
                        HStack(spacing: 2) {
                            Text(formatStatus(status))
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(statusBackgroundColor(status))
                                .foregroundColor(statusTextColor(status))
                                .cornerRadius(12)
                            
                            if status != "delivered" && status != "cancelled" {
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding(.bottom, 4)
            }
            
            Text("Current status: \(formatStatus(currentStatus))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
    
    private var statusFlow: [String] {
        ["pending", "approved", "assigned", "picked_up", "in_transit", "delivered"]
    }
    
    private func formatStatus(_ status: String) -> String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }
    
    private func statusBackgroundColor(_ status: String) -> Color {
        if status == currentStatus {
            // Highlight current status
            switch status {
            case "pending": return .yellow
            case "approved", "quoted": return .orange
            case "assigned": return .blue
            case "picked_up": return .purple
            case "in_transit": return .indigo
            case "delivered": return .mint
            case "cancelled": return .red
            default: return .gray
            }
        } else {
            // Past statuses with light background
            return Color(.systemGray5)
        }
    }
    
    private func statusTextColor(_ status: String) -> Color {
        if status == currentStatus {
            return .white
        } else {
            return .primary
        }
    }
}

#Preview {
    NavigationView {
        JobDetailsView(
            apiClient: APIClient(authService: AuthService()), 
            jobId: 123,
            onDismiss: {}
        )
        .environmentObject(AuthService()) // Add the environment object for the preview
    }
} 
