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
    case parsing(description: String)
    case offline
    case timeout
    case unknown(Error?)
    
    var id: String {
        switch self {
        case .network: return "network"
        case .server(let code, _): return "server_\(code)"
        case .jobNotFound(let jobId): return "jobNotFound_\(jobId)"
        case .authentication: return "authentication"
        case .parsing: return "parsing"
        case .offline: return "offline"
        case .timeout: return "timeout"
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
            
        case .parsing(let description):
            return "Data error: \(description). Please contact support if this persists."
            
        case .offline:
            return "You're offline. Please check your connection and try again."
            
        case .timeout:
            return "Request timed out. Please try again later."
            
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
    public let jobId: Int
    
    // Network monitor
    private let networkMonitor = NetworkMonitor.shared
    private var connectivityCancellable: AnyCancellable?
    
    init(apiClient: APIClient, jobId: Int) {
        self.apiClient = apiClient
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
    
    func fetchJobDetails() {
        isLoading = true
        error = nil
        showError = false
        
        print("🔍 JOB DETAILS: Fetching details for job ID: \(jobId)")
        
        Task {
            do {
                // Use the network-aware fetch method
                let job: JobDTO = try await apiClient.fetchWithOfflineSupport(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)",
                    requestType: "job_details"
                )
                
                self.job = job
                self.calculateRoute()
                self.isLoading = false
                print("✅ JOB DETAILS: Successfully fetched details for job ID: \(jobId)")
            } catch let error as APIError {
                handleError(error)
            } catch {
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
            return ["quoted", "assigned", "cancelled"].contains(newStatus)
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
}

struct JobDetailsView: View {
    @StateObject private var viewModel: JobDetailsViewModel
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    
    var onDismiss: (() -> Void)?
    
    init(apiClient: APIClient, jobId: Int, onDismiss: (() -> Void)? = nil) {
        _viewModel = StateObject(wrappedValue: JobDetailsViewModel(apiClient: apiClient, jobId: jobId))
        self.onDismiss = onDismiss
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let job = viewModel.job {
                    // Job found - normal view
                    // Status section
                    StatusBadgeView(status: job.status.rawValue)
                    
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
        .onAppear {
            viewModel.fetchJobDetails()
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
        default:
            return "Error"
        }
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
        default:
            return "You can try again or return to the dashboard to view other jobs."
        }
    }
}

// Helper Components

struct StatusBadgeView: View {
    let status: String
    
    var statusColor: Color {
        switch status {
        case "pending": return .yellow
        case "accepted": return .blue
        case "in_progress": return .orange
        case "completed": return .green
        case "cancelled": return .red
        default: return .gray
        }
    }
    
    var statusText: String {
        switch status {
        case "pending": return "Pending"
        case "accepted": return "Accepted"
        case "in_progress": return "In Progress"
        case "completed": return "Completed"
        case "cancelled": return "Cancelled"
        default: return status.capitalized
        }
    }
    
    var body: some View {
        Text(statusText)
            .font(.subheadline)
            .fontWeight(.medium)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(8)
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
            
            // Quote Amount if available
            if let quoteAmount = job.quoteAmount {
                Divider()
                    .padding(.vertical, 8)
                
                HStack {
                    Text("Quote Amount")
                        .font(.subheadline)
                    
                    Spacer()
                    
                    Text("$\(String(format: "%.2f", quoteAmount))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                }
            }
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
                    ActionButton(title: "Assign Job", iconName: "checkmark.circle", color: .blue)
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
                
            case "delivered":
                Button(action: {
                    onStatusUpdate("completed")
                }) {
                    ActionButton(title: "Complete Job", iconName: "flag.checkered", color: .green)
                }
                
            case "completed", "cancelled":
                Text("This job is \(job.status)")
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
            if job.status.rawValue != "completed" && job.status.rawValue != "cancelled" {
                Link(destination: URL(string: "maps://?daddr=\(job.deliveryAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""),\(job.deliveryCity.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""),\(job.deliveryPostalCode.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!) {
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

#Preview {
    NavigationView {
        JobDetailsView(
            apiClient: APIClient(authService: AuthService()), 
            jobId: 123,
            onDismiss: {}
        )
    }
} 