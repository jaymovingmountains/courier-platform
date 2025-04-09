import SwiftUI
import MapKit
import Combine
// Import components module to access PackageDimensionsForm

// MARK: - Custom Error Types for Job Details

/// Specific error types for Job Details
enum JobDetailsError: Error, Identifiable, LocalizedError {
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
        case .network(let description, _): return "network_\(description)"
        case .server(let code, _): return "server_\(code)"
        case .jobNotFound(let jobId): return "not_found_\(jobId)"
        case .authentication: return "authentication"
        case .authorization: return "authorization"
        case .parsing: return "parsing"
        case .offline: return "offline"
        case .timeout: return "timeout"
        case .jobNotOwnedByCurrentUser(let jobId): return "not_owned_\(jobId)"
        case .unknown: return "unknown"
        }
    }
    
    /// User-friendly error message
    var userMessage: String {
        switch self {
        case .network(let description, let isRetryable):
            return isRetryable ? "Network error: \(description). Please try again." : "Network error: \(description)."
        case .server(let code, let description):
            return "Server error (\(code)): \(description)"
        case .jobNotFound(let jobId):
            return "Job #\(jobId) not found. It may have been deleted or reassigned."
        case .authentication(let description):
            return "Authentication error: \(description). Please log in again."
        case .authorization(let description):
            return "Authorization error: \(description). You don't have permission to view this job."
        case .parsing(let description):
            return "Error processing data: \(description)"
        case .offline:
            return "You're offline. Please check your connection and try again."
        case .timeout:
            return "Request timed out. Please try again."
        case .jobNotOwnedByCurrentUser(let jobId):
            return "Job #\(jobId) is not assigned to you."
        case .unknown(let error):
            return "An unexpected error occurred: \(error?.localizedDescription ?? "Unknown error")"
        }
    }
    
    // Add LocalizedError conformance
    var errorDescription: String? {
        return userMessage
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

// MARK: - Job Details View Model

@MainActor
final class JobDetailsViewModel: ObservableObject {
    @Published var job: JobDTO?
    @Published var isLoading: Bool = false
    @Published var error: JobDetailsError?
    @Published var showError: Bool = false
    @Published var mapRegion = MKCoordinateRegion()
    @Published var routeCoordinates: [CLLocationCoordinate2D] = []
    @Published var statusUpdateInProgress: Bool = false
    @Published var showingStatusOptions: Bool = false
    @Published var showingSuccessMessage: Bool = false
    @Published var successMessage: String = ""
    
    // Package dimension fields
    @Published var weight: String = ""
    @Published var length: String = ""
    @Published var width: String = ""
    @Published var height: String = ""
    @Published var dimensionUnit: String = "cm"
    @Published var packageDescription: String = ""
    @Published var showDimensionsForm: Bool = false
    
    private var apiClient: APIClient
    var jobId: Int
    
    init(apiClient: APIClient, jobId: Int) {
        self.apiClient = apiClient
        self.jobId = jobId
    }
    
    func fetchJobDetails() async {
        isLoading = true
        error = nil
        
        do {
            let endpoint = APIConstants.jobDetailsURL(id: jobId)
            let fetchedJob: JobDTO = try await apiClient.fetch(endpoint: endpoint)
            job = fetchedJob
            
            // Set up the map region
            setupMapRegion()
            
            isLoading = false
        } catch let apiError as APIError {
            isLoading = false
            let jobDetailsError = mapAPIError(apiError)
            error = jobDetailsError
            showError = true
        } catch {
            isLoading = false
            self.error = .unknown(error)
            showError = true
        }
    }
    
    private func mapAPIError(_ error: APIError) -> JobDetailsError {
        switch error {
        case .invalidURL:
            return .network(description: "Invalid URL", isRetryable: false)
            
        case .noData:
            return .network(description: "No data received", isRetryable: true)
            
        case .decodingError:
            return .parsing(description: "Could not process server response")
            
        case .serverError(let code):
            // Handle 404 errors specially
            if code == 404 {
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
    
    func setupMapRegion() {
        guard job != nil else {
            return
        }
        
        // Default coordinates if not available
        let pickupLat = 43.6532
        let pickupLng = -79.3832
        let deliveryLat = 43.7532
        let deliveryLng = -79.4832
        
        let pickupCoordinate = CLLocationCoordinate2D(latitude: pickupLat, longitude: pickupLng)
        let deliveryCoordinate = CLLocationCoordinate2D(latitude: deliveryLat, longitude: deliveryLng)
        
        // Calculate the center point between pickup and delivery
        let centerLatitude = (pickupLat + deliveryLat) / 2
        let centerLongitude = (pickupLng + deliveryLng) / 2
        
        // Calculate appropriate span values
        let latDelta = abs(pickupLat - deliveryLat) * 1.5 // Add some padding
        let lngDelta = abs(pickupLng - deliveryLng) * 1.5
        
        mapRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLatitude, longitude: centerLongitude),
            span: MKCoordinateSpan(latitudeDelta: max(latDelta, 0.02), longitudeDelta: max(lngDelta, 0.02))
        )
        
        // Set route coordinates for the map (just direct line for now)
        routeCoordinates = [pickupCoordinate, deliveryCoordinate]
    }
    
    func updateJobStatus(to newStatus: String) async {
        guard let job = job else { return }
        statusUpdateInProgress = true
        
        do {
            // Check if this is a pickup and package dimensions are needed
            if newStatus == "picked_up" && showDimensionsForm {
                // Include package dimensions if provided
                let dimensionsData: [String: Any] = [
                    "status": newStatus,
                    "weight": weight.isEmpty ? NSNull() : Double(weight),
                    "length": length.isEmpty ? NSNull() : Double(length),
                    "width": width.isEmpty ? NSNull() : Double(width),
                    "height": height.isEmpty ? NSNull() : Double(height),
                    "dimension_unit": dimensionUnit.isEmpty ? "cm" : dimensionUnit,
                    "description": packageDescription
                ]
                
            let endpoint = APIConstants.jobStatusUpdateURL(id: job.id)
                let updatedJob: JobDTO = try await apiClient.updateJobStatus(jobId: job.id, status: newStatus).get()
                
                // Update local job data
                self.job = updatedJob
                
                // Show success message
                successMessage = "Job status updated to: \(newStatus.capitalized)"
                showingSuccessMessage = true
                
                // Reset dimensions form
                showDimensionsForm = false
                
                // Post notification about status change
                NotificationCenter.default.post(
                    name: NSNotification.Name("JobStatusChanged"),
                    object: nil,
                    userInfo: ["jobId": job.id, "status": newStatus]
                )
                
                // Also post notification to refresh UI
                NotificationCenter.default.post(
                    name: NSNotification.Name("ForceJobUIRefresh"),
                    object: nil,
                    userInfo: ["jobId": job.id, "status": newStatus]
                )
                
                // Also post notification to add job to history
                NotificationCenter.default.post(
                    name: NSNotification.Name("MoveJobToHistory"),
                    object: nil,
                    userInfo: ["job": job]
                )
            } else {
                // Regular status update without dimensions
                let endpoint = APIConstants.jobStatusUpdateURL(id: job.id)
                let updatedJob: JobDTO = try await apiClient.updateJobStatus(jobId: job.id, status: newStatus).get()
                
                // Update local job data
                self.job = updatedJob
            
            // Show success message
                successMessage = "Job status updated to: \(newStatus.capitalized)"
            showingSuccessMessage = true
            
                // Post notification about status change
                NotificationCenter.default.post(
                    name: NSNotification.Name("JobStatusChanged"),
                    object: nil,
                    userInfo: ["jobId": job.id, "status": newStatus]
                )
                
                // Also post notification to refresh UI
                NotificationCenter.default.post(
                    name: NSNotification.Name("ForceJobUIRefresh"),
                    object: nil,
                    userInfo: ["jobId": job.id, "status": newStatus]
                )
                
                // Also post notification to add job to history
                NotificationCenter.default.post(
                    name: NSNotification.Name("MoveJobToHistory"),
                    object: nil,
                    userInfo: ["job": job]
                )
            }
            
            statusUpdateInProgress = false
        } catch let apiError as APIError {
            statusUpdateInProgress = false
            let jobDetailsError = mapAPIError(apiError)
            error = jobDetailsError
            showError = true
        } catch {
            statusUpdateInProgress = false
            self.error = .unknown(error)
            showError = true
        }
    }
    
    var nextAvailableStatuses: [String] {
        guard let currentStatus = job?.status.rawValue else { return [] }
        
        // Status progression:
        // assigned -> picked_up -> in_transit -> delivered
        
        switch currentStatus {
        case "assigned":
            return ["picked_up"]
        case "picked_up":
            return ["in_transit"]
        case "in_transit":
            return ["delivered"]
        default:
            return []
        }
    }
    
    func openMapsApp(forDestination isDelivery: Bool) {
        guard let job = job else { return }
        
        let address: String
        let city: String
        let postalCode: String
        
        if isDelivery {
            address = job.deliveryAddress
            city = job.deliveryCity
            postalCode = job.deliveryPostalCode
        } else {
            address = job.pickupAddress
            city = job.pickupCity
            postalCode = job.pickupPostalCode
        }
        
        let fullAddress = "\(address), \(city), \(postalCode)"
        let encodedAddress = fullAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        
        // Try to open in Apple Maps
        if let url = URL(string: "maps://?address=\(encodedAddress)") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
                return
            }
        }
        
        // Fallback to Google Maps
        if let url = URL(string: "comgooglemaps://?q=\(encodedAddress)") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
                return
            }
        }
        
        // Final fallback to browser with Google Maps
        if let url = URL(string: "https://maps.google.com/?q=\(encodedAddress)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Job Details View

struct JobDetailsView: View {
    @StateObject private var viewModel: JobDetailsViewModel
    
    // Add an onDismiss closure parameter with a default value of nil
    var onDismiss: (() -> Void)?
    
    init(apiClient: APIClient, jobId: Int, onDismiss: (() -> Void)? = nil) {
        _viewModel = StateObject(wrappedValue: JobDetailsViewModel(apiClient: apiClient, jobId: jobId))
        self.onDismiss = onDismiss
    }
    
    // Break body into smaller components
    var body: some View {
        ZStack {
            // TESTING - Remove this test view when UI changes are visible
            VStack {
                Text("TEST VIEW - UI CHANGES APPLIED")
                    .font(.largeTitle)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.red)
                    .cornerRadius(10)
                    .padding(.top, 100)
                    .zIndex(999)
                
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black.opacity(0.3))
            .edgesIgnoringSafeArea(.all)
            .zIndex(100)
            
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color(.systemBackground), Color(.systemGray6)]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Main content
            if viewModel.isLoading {
                loadingView
            } else if let job = viewModel.job {
        ScrollView {
                    VStack(spacing: 22) {
                        // Status indicator at the top
                        statusHeader(job: job)
                            .padding(.top, 10)
                        
                // Map section
                    mapSection
                
                        // Job summary section
                        jobSummarySection(job: job)
                    
                        // Addresses section
                    addressesSection(job: job)
                    
                        // Package details section (if available)
                        // (This would show the actual package dimensions once recorded)
                        // Note: JobDTO doesn't have weight or dimensions properties yet
                        // This is a placeholder for when those properties are added
                        /*
                        if let _ = job.weight, 
                           let dimensions = job.dimensions {
                            packageDetailsSection(
                                weight: job.weight ?? 0.0,
                                dimensions: dimensions,
                                description: job.description
                            )
                        }
                        */
                        
                        // Action buttons
                        actionButtons(job: job)
                            .padding(.horizontal)
                            .padding(.bottom, 30)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                }
                .refreshable {
                    Task {
                        await viewModel.fetchJobDetails()
                    }
                }
                .alert(isPresented: $viewModel.showError, error: viewModel.error) { _ in
                    Button("OK") {
                        viewModel.showError = false
                    }
                } message: { error in
                    Text(error.errorDescription ?? "Unknown error")
                }
                .overlay(
                    Group {
                        if viewModel.showingSuccessMessage {
                            VStack {
                                Spacer()
                                Text(viewModel.successMessage)
                                    .font(.headline)
                                    .padding()
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color.green)
                                            .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
                                    )
                                    .foregroundColor(.white)
                                    .padding(.bottom, 40)
                                    .transition(.move(edge: .bottom).combined(with: .opacity))
                                    .onAppear {
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                            withAnimation(.easeInOut) {
                                                viewModel.showingSuccessMessage = false
                                            }
                                        }
                                    }
                            }
                        }
                    }
                )
                .navigationTitle("Job #\(job.id)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                            Button(action: {
                                Task {
                                await viewModel.fetchJobDetails()
                            }
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .imageScale(.medium)
                        }
                    }
                }
            } else {
                // No job data (could be error or not found)
                errorView
            }
        }
        .onAppear {
            Task {
                await viewModel.fetchJobDetails()
            }
        }
    }
    
    // MARK: - Status Header
    private func statusHeader(job: JobDTO) -> some View {
        HStack {
            Text("Job Status:")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(job.statusDisplayName)
                .font(.headline)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(statusColor(for: job.status.rawValue).opacity(0.2))
                .foregroundColor(statusColor(for: job.status.rawValue))
                .cornerRadius(8)
                
            Spacer()
            
            if job.isActive {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Active")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.1))
                .cornerRadius(5)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 1)
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .progressViewStyle(CircularProgressViewStyle(tint: Color.blue))
            
            Text("Loading job details...")
                .font(.headline)
                .foregroundColor(.primary)
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
        )
    }
    
    // MARK: - Error View
    private var errorView: some View {
        VStack(spacing: 25) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.orange)
            
            Text("An error occurred while loading job details.")
                .font(.headline)
                .foregroundColor(.primary)
                .multilineTextAlignment(.center)
            
            Button(action: {
            Task {
                await viewModel.fetchJobDetails()
            }
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Retry")
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 30)
                .padding(.vertical, 12)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .shadow(color: Color.blue.opacity(0.3), radius: 5, x: 0, y: 2)
            }
        }
        .padding(30)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.1), radius: 15, x: 0, y: 5)
        )
        .padding()
    }
    
    // MARK: - Map Section
    private var mapSection: some View {
        ZStack(alignment: .topTrailing) {
            // Test with a bright background to verify changes are visible
            Rectangle()
                .fill(Color.orange)
                .frame(height: 220)
                .cornerRadius(16)
                .overlay(
            Map(coordinateRegion: $viewModel.mapRegion, annotationItems: createMapAnnotations()) { annotation in
                MapAnnotation(coordinate: annotation.coordinate) {
                    VStack {
                                ZStack {
                                    Circle()
                                        .fill(Color.white)
                                        .frame(width: 36, height: 36)
                                        .shadow(color: Color.black.opacity(0.2), radius: 3, x: 0, y: 2)
                                    
                        Image(systemName: annotation.iconName)
                                        .font(.system(size: 20))
                            .foregroundColor(annotation.color)
                                }
                        
                        Text(annotation.title)
                            .font(.caption)
                                    .fontWeight(.medium)
                            .padding(5)
                                    .background(Color.white.opacity(0.9))
                            .cornerRadius(5)
                            .shadow(radius: 1)
                    }
                            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
                }
            }
            )
            
            // Map action buttons
            VStack(alignment: .trailing, spacing: 10) {
                Button(action: {
                    // Toggle between satellite and standard view
                }) {
                    Image(systemName: "map")
                        .padding(10)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.15), radius: 3, x: 0, y: 2)
                }
                
                Button(action: {
                    // Recenter the map
                    viewModel.setupMapRegion()
                }) {
                    Image(systemName: "location")
                        .padding(10)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.15), radius: 3, x: 0, y: 2)
                }
            }
            .padding(12)
        }
    }
    
    // MARK: - Job Summary Section
    private func jobSummarySection(job: JobDTO) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Job details card
            jobDetailsCard(job: job)
            
            // Job quick info
            jobQuickInfo(job: job)
        }
    }
    
    // MARK: - Job Details Card
    private func jobDetailsCard(job: JobDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with job type and status
            HStack {
                // Job type badge
                Text(job.shipmentType?.uppercased() ?? "STANDARD")
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(4)
                
                Spacer()
                
                // Status badge - now in the header
                Text(job.createdAt.prefix(10))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Divider()
            
            // Job quick info
            HStack(alignment: .center, spacing: 20) {
                // Vehicle info
                VStack(alignment: .center, spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.1))
                            .frame(width: 40, height: 40)
                    Image(systemName: "car.fill")
                            .font(.system(size: 18))
                        .foregroundColor(.blue)
                    }
                    Text(job.vehicleName ?? "Not Assigned")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                
                // Distance info (hardcoded placeholder since property is missing)
                VStack(alignment: .center, spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.1))
                            .frame(width: 40, height: 40)
                    Image(systemName: "arrow.left.and.right")
                            .font(.system(size: 18))
                        .foregroundColor(.orange)
                    }
                    Text("10 km")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                
                // Estimated time (hardcoded placeholder since property is missing)
                VStack(alignment: .center, spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(Color.green.opacity(0.1))
                            .frame(width: 40, height: 40)
                    Image(systemName: "clock.fill")
                            .font(.system(size: 18))
                        .foregroundColor(.green)
                    }
                    Text("30 min")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 8)
            
            Divider()
            
            // Created date and ID
            HStack {
                Text("Created: \(formattedDate(job.createdAt))")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("ID: #\(job.id)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Job Quick Info
    private func jobQuickInfo(job: JobDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Delivery Options")
                .font(.headline)
                .foregroundColor(.primary)
            
            Divider()
            
            HStack(alignment: .top, spacing: 20) {
                // Pickup option
                Button(action: {
                    viewModel.openMapsApp(forDestination: false)
                }) {
                    VStack(spacing: 8) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 22))
                            .foregroundColor(.blue)
                        
                        Text("Navigate to Pickup")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(10)
                }
                
                // Delivery option
                Button(action: {
                    viewModel.openMapsApp(forDestination: true)
                }) {
                    VStack(spacing: 8) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.green)
                        
                        Text("Navigate to Delivery")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Addresses Section
    private func addressesSection(job: JobDTO) -> some View {
        VStack(spacing: 20) {
            // Pickup address
            addressCard(
                title: "Pickup Location",
                address: job.pickupAddress,
                city: job.pickupCity,
                postalCode: job.pickupPostalCode,
                iconName: "arrow.up.circle.fill",
                iconColor: .blue,
                isPickup: true
            )
            
            // Delivery address
            addressCard(
                title: "Delivery Location",
                address: job.deliveryAddress,
                city: job.deliveryCity,
                postalCode: job.deliveryPostalCode,
                iconName: "arrow.down.circle.fill",
                iconColor: .red,
                isPickup: false
            )
        }
    }
    
    // MARK: - Address Card
    private func addressCard(
        title: String,
        address: String,
        city: String,
        postalCode: String,
        iconName: String,
        iconColor: Color,
        isPickup: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.1))
                        .frame(width: 36, height: 36)
                Image(systemName: iconName)
                        .font(.system(size: 18))
                    .foregroundColor(iconColor)
                }
                
                Text(title)
                    .font(.headline)
                Spacer()
            }
            
            Divider()
            
            // Address details
            VStack(alignment: .leading, spacing: 6) {
                Text(address)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text("\(city), \(postalCode)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Action buttons
            HStack {
                Button(action: {
                    viewModel.openMapsApp(forDestination: !isPickup)
                }) {
                    Label("Directions", systemImage: "map.fill")
                        .font(.subheadline)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(isPickup ? Color.blue : Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .shadow(color: (isPickup ? Color.blue : Color.red).opacity(0.3), radius: 3, x: 0, y: 2)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Package Details Section
    private func packageDetailsSection(weight: Double, dimensions: Dimensions, description: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with icon
            HStack {
                ZStack {
                    Circle()
                        .fill(Color.purple.opacity(0.1))
                        .frame(width: 36, height: 36)
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.purple)
                }
                
                Text("Package Details")
                .font(.headline)
                Spacer()
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Weight:")
                .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("\(String(format: "%.1f", weight)) kg")
                        .font(.body)
                        .fontWeight(.medium)
                }
                
                Spacer()
                
                VStack(alignment: .leading) {
                    Text("Dimensions:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("\(String(format: "%.1f", dimensions.length)) × \(String(format: "%.1f", dimensions.width)) × \(String(format: "%.1f", dimensions.height)) \(dimensions.unit)")
                        .font(.body)
                                    .fontWeight(.medium)
                }
            }
            
            if !description.isEmpty {
                Divider()
                
                VStack(alignment: .leading) {
                    Text("Description:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    Text(description)
                        .font(.body)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Action Buttons
    private func actionButtons(job: JobDTO) -> some View {
        VStack(spacing: 16) {
            // Package dimensions form if needed
            if job.status.rawValue == "assigned" && viewModel.showDimensionsForm {
                DimensionsFormPlaceholder(
                    weight: $viewModel.weight,
                    length: $viewModel.length,
                    width: $viewModel.width,
                    height: $viewModel.height,
                    dimensionUnit: $viewModel.dimensionUnit,
                    description: $viewModel.packageDescription
                )
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemBackground))
                        .shadow(color: Color.black.opacity(0.08), radius: 5, x: 0, y: 2)
                )
                .transition(.opacity)
                .padding(.bottom, 16)
            }
            
            // Change status button (if available)
            if let nextStatus = viewModel.nextAvailableStatuses.first {
                        Button(action: {
                    // If picking up and dimensions not shown yet, show form
                    if nextStatus == "picked_up" && !viewModel.showDimensionsForm {
                        withAnimation {
                            viewModel.showDimensionsForm = true
                        }
                    } else {
                        // Otherwise proceed with status update
                        Task {
                            await viewModel.updateJobStatus(to: nextStatus)
                        }
                    }
                }) {
                HStack {
                        Text(viewModel.showDimensionsForm ? 
                             "Confirm Package Pickup" : 
                             "Mark as \(statusDisplayName(nextStatus))")
                            .fontWeight(.semibold)
                        
                        if viewModel.statusUpdateInProgress {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                                .scaleEffect(0.8)
                                .padding(.leading, 4)
                        } else {
                            Image(systemName: "arrow.right.circle.fill")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.8)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(16)
                    .shadow(color: Color.blue.opacity(0.3), radius: 5, x: 0, y: 2)
                    .disabled(viewModel.statusUpdateInProgress)
                }
                .disabled(viewModel.statusUpdateInProgress)
            }
            
            // Call customer button
            /* JobDTO doesn't have customerPhone property yet
            if let phoneNumber = job.customerPhone, !phoneNumber.isEmpty {
                Button(action: {
                    if let url = URL(string: "tel:\(phoneNumber.replacingOccurrences(of: " ", with: ""))") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "phone.fill")
                        Text("Call Customer")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
        .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.green, Color.green.opacity(0.8)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(16)
                    .shadow(color: Color.green.opacity(0.3), radius: 5, x: 0, y: 2)
                }
            }
            */
        }
    }
    
    // Helper function to convert status keys to display names
    private func statusDisplayName(_ status: String) -> String {
        switch status {
        case "picked_up":
            return "Picked Up"
        case "in_transit":
            return "In Transit"
        case "delivered":
            return "Delivered"
        default:
            return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
    
    // Helper function to get status color
    private func statusColor(for status: String) -> Color {
        switch status {
        case "assigned":
            return .blue
        case "picked_up":
            return .orange
        case "in_transit":
            return .purple
        case "delivered":
            return .green
        default:
            return .gray
        }
    }
    
    // MARK: - Helper Functions
    private func createMapAnnotations() -> [CustomMapAnnotation] {
        guard viewModel.job != nil else {
            return []
        }
        
        // Default coordinates
        let pickupLat = 43.6532
        let pickupLng = -79.3832
        let deliveryLat = 43.7532
        let deliveryLng = -79.4832
        
        let pickupCoordinate = CLLocationCoordinate2D(latitude: pickupLat, longitude: pickupLng)
        let deliveryCoordinate = CLLocationCoordinate2D(latitude: deliveryLat, longitude: deliveryLng)
        
        return [
            CustomMapAnnotation(
                id: "pickup",
                coordinate: pickupCoordinate,
                title: "Pickup",
                iconName: "arrow.up.circle.fill",
                color: .blue
            ),
            CustomMapAnnotation(
                id: "delivery",
                coordinate: deliveryCoordinate,
                title: "Delivery",
                iconName: "arrow.down.circle.fill",
                color: .red
            )
        ]
    }
    
    private func formattedDate(_ dateString: String) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        if let date = dateFormatter.date(from: dateString) {
            dateFormatter.dateStyle = .short
            dateFormatter.timeStyle = .short
            return dateFormatter.string(from: date)
        }
        
        return dateString
    }
}

// MARK: - Map Annotation
struct CustomMapAnnotation: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let title: String
    let iconName: String
    let color: Color
}

struct JobDetailsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            JobDetailsView(apiClient: APIClient(authService: AuthService()), jobId: 1)
        }
    }
}

// Temporary placeholder until PackageDimensionsForm is properly imported
struct DimensionsFormPlaceholder: View {
    @Binding var weight: String
    @Binding var length: String
    @Binding var width: String
    @Binding var height: String
    @Binding var dimensionUnit: String
    @Binding var description: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            HStack {
                ZStack {
                    Circle()
                        .fill(Color.purple.opacity(0.1))
                        .frame(width: 36, height: 36)
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.purple)
                }
                
                Text("Package Dimensions")
                    .font(.headline)
                Spacer()
            }
            
            Divider()
            
            // Weight input with card style
            VStack(alignment: .leading, spacing: 6) {
                Text("Weight")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 10) {
                    TextField("Enter weight", text: $weight)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(10)
                    
                    Text("kg")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .frame(width: 40)
                }
            }
            
            // Dimensions Group
            VStack(alignment: .leading, spacing: 16) {
                Text("Dimensions")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                // Unit selector at the top
                HStack {
                    Text("Unit:")
            .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Picker("Unit", selection: $dimensionUnit) {
                        Text("cm").tag("cm")
                        Text("in").tag("in")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .frame(width: 120)
                    
                    Spacer()
                }
                
                // Length, width, height inputs
                VStack(spacing: 12) {
                    dimensionField(label: "Length", value: $length)
                    dimensionField(label: "Width", value: $width)
                    dimensionField(label: "Height", value: $height)
                }
            }
            
            // Package description
            VStack(alignment: .leading, spacing: 6) {
                Text("Description")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextField("Package description (optional)", text: $description)
                    .frame(height: 80)
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(10)
            }
        }
        .padding(20)
    }
    
    // Helper for consistent dimension fields
    private func dimensionField(label: String, value: Binding<String>) -> some View {
        HStack(spacing: 10) {
            Text(label)
                .font(.body)
                .foregroundColor(.primary)
                .frame(width: 80, alignment: .leading)
            
            TextField("Enter \(label.lowercased())", text: value)
                .keyboardType(.decimalPad)
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)
            
            Text(dimensionUnit.isEmpty ? "cm" : dimensionUnit)
                .font(.body)
                .foregroundColor(.secondary)
                .frame(width: 40)
        }
    }
} 
