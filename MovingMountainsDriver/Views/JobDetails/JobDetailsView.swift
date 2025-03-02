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
    
    private var apiClient: APIClient
    private var jobId: Int
    
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
        case .networkError(let description):
            return .network(description: description, isRetryable: true)
        case .serverError(let code, let message):
            if code == 404 {
                return .jobNotFound(jobId: jobId)
            } else if code == 401 {
                return .authentication(description: message)
            } else if code == 403 {
                return .authorization(description: message)
            }
            return .server(code: code, description: message)
        case .decodingError(let description):
            return .parsing(description: description)
        case .noInternet:
            return .offline
        case .timeoutError:
            return .timeout
        case .unknown(let underlyingError):
            return .unknown(underlyingError)
        }
    }
    
    private func setupMapRegion() {
        guard let job = job,
              let pickupLat = Double(job.pickupLatitude ?? "0"),
              let pickupLng = Double(job.pickupLongitude ?? "0"),
              let deliveryLat = Double(job.deliveryLatitude ?? "0"),
              let deliveryLng = Double(job.deliveryLongitude ?? "0") else {
            return
        }
        
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
        error = nil
        
        do {
            let endpoint = APIConstants.jobStatusUpdateURL(id: job.id)
            
            // The API expects a JSON body with the new status
            let response: [String: String] = try await apiClient.update(
                endpoint: endpoint,
                body: ["status": newStatus]
            )
            
            // Update the local job object with the new status
            self.job?.status = JobStatus(rawValue: newStatus) ?? .pending
            
            // Show success message
            successMessage = response["message"] ?? "Status updated to \(newStatus.replacingOccurrences(of: "_", with: " "))."
            showingSuccessMessage = true
            
            // Hide success message after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.showingSuccessMessage = false
            }
            
            // If the status is "delivered", post a notification to update the history view
            if newStatus == "delivered" {
                // Post notification to update UI in other views
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
    
    func callContact(isPickup: Bool) {
        guard let job = job else { return }
        
        let phoneNumber = isPickup ? job.pickupPhone : job.deliveryPhone
        
        if let phone = phoneNumber, !phone.isEmpty,
           let url = URL(string: "tel://\(phone.replacingOccurrences(of: " ", with: ""))") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Job Details View

struct JobDetailsView: View {
    @StateObject private var viewModel: JobDetailsViewModel
    @Environment(\.presentationMode) var presentationMode
    
    init(apiClient: APIClient, jobId: Int) {
        _viewModel = StateObject(wrappedValue: JobDetailsViewModel(apiClient: apiClient, jobId: jobId))
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Map section
                if viewModel.job != nil {
                    mapSection
                }
                
                // Job details card
                if let job = viewModel.job {
                    jobDetailsCard(job: job)
                    
                    // Addresses
                    addressesSection(job: job)
                    
                    // Status update section
                    if !viewModel.nextAvailableStatuses.isEmpty {
                        statusUpdateSection(job: job)
                    }
                    
                    // Contact section
                    contactSection(job: job)
                    
                    // Notes
                    if let notes = job.notes, !notes.isEmpty {
                        notesSection(notes: notes)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
        .navigationTitle("Job #\(viewModel.jobId)")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(false)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if !viewModel.nextAvailableStatuses.isEmpty {
                    Menu {
                        ForEach(viewModel.nextAvailableStatuses, id: \.self) { status in
                            Button(action: {
                                Task {
                                    await viewModel.updateJobStatus(to: status)
                                }
                            }) {
                                Label(
                                    status.replacingOccurrences(of: "_", with: " ").capitalized,
                                    systemImage: statusIcon(for: status)
                                )
                            }
                        }
                    } label: {
                        Text("Update Status")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                }
            }
        }
        .overlay {
            if viewModel.isLoading {
                LoadingOverlay()
            }
        }
        .alert(isPresented: $viewModel.showError) {
            Alert(
                title: Text("Error"),
                message: Text(viewModel.error?.userMessage ?? "An unknown error occurred"),
                dismissButton: .default(Text("OK"))
            )
        }
        .overlay(
            // Success message overlay
            viewModel.showingSuccessMessage ? 
                successMessageOverlay
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(.spring(), value: viewModel.showingSuccessMessage)
                : nil
        )
        .onAppear {
            Task {
                await viewModel.fetchJobDetails()
            }
        }
    }
    
    // MARK: - Map Section
    private var mapSection: some View {
        ZStack(alignment: .topTrailing) {
            Map(coordinateRegion: $viewModel.mapRegion, annotationItems: createMapAnnotations()) { annotation in
                MapAnnotation(coordinate: annotation.coordinate) {
                    VStack {
                        Image(systemName: annotation.iconName)
                            .font(.system(size: 24))
                            .foregroundColor(annotation.color)
                            .shadow(radius: 2)
                        
                        Text(annotation.title)
                            .font(.caption)
                            .padding(5)
                            .background(Color.white.opacity(0.8))
                            .cornerRadius(5)
                            .shadow(radius: 1)
                    }
                }
            }
            .frame(height: 200)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
            
            // Map action buttons
            VStack(alignment: .trailing, spacing: 8) {
                Button(action: {
                    // Toggle between satellite and standard view
                }) {
                    Image(systemName: "map")
                        .padding(8)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(radius: 2)
                }
                
                Button(action: {
                    // Recenter the map
                    viewModel.setupMapRegion()
                }) {
                    Image(systemName: "location")
                        .padding(8)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(radius: 2)
                }
            }
            .padding(8)
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
                
                // Status badge
                StatusBadge(status: job.status.rawValue)
            }
            
            Divider()
            
            // Job quick info
            HStack(alignment: .center, spacing: 20) {
                // Vehicle info
                VStack(alignment: .center, spacing: 4) {
                    Image(systemName: "car.fill")
                        .font(.title)
                        .foregroundColor(.blue)
                    Text(job.vehicleName ?? "Not Assigned")
                        .font(.caption)
                }
                .frame(maxWidth: .infinity)
                
                // Distance info
                VStack(alignment: .center, spacing: 4) {
                    Image(systemName: "arrow.left.and.right")
                        .font(.title)
                        .foregroundColor(.orange)
                    Text("\(job.estimatedDistance ?? 0) km")
                        .font(.caption)
                }
                .frame(maxWidth: .infinity)
                
                // Estimated time
                VStack(alignment: .center, spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.title)
                        .foregroundColor(.green)
                    Text("\(job.estimatedTime ?? 0) min")
                        .font(.caption)
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
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
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
                Image(systemName: iconName)
                    .font(.title3)
                    .foregroundColor(iconColor)
                Text(title)
                    .font(.headline)
                Spacer()
            }
            
            Divider()
            
            // Address details
            VStack(alignment: .leading, spacing: 4) {
                Text(address)
                    .font(.subheadline)
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
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
                Spacer()
                
                // Call button if there's a phone number
                if let phone = isPickup ? viewModel.job?.pickupPhone : viewModel.job?.deliveryPhone,
                   !phone.isEmpty {
                    Button(action: {
                        viewModel.callContact(isPickup: isPickup)
                    }) {
                        Label("Call", systemImage: "phone.fill")
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Status Update Section
    private func statusUpdateSection(job: JobDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Update Status")
                .font(.headline)
            
            Divider()
            
            Text("Current Status: \(job.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)")
                .font(.subheadline)
            
            if !viewModel.nextAvailableStatuses.isEmpty {
                VStack(spacing: 10) {
                    ForEach(viewModel.nextAvailableStatuses, id: \.self) { status in
                        Button(action: {
                            Task {
                                await viewModel.updateJobStatus(to: status)
                            }
                        }) {
                            HStack {
                                Image(systemName: statusIcon(for: status))
                                    .foregroundColor(.white)
                                
                                Text("Mark as \(status.replacingOccurrences(of: "_", with: " ").capitalized)")
                                    .fontWeight(.medium)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(statusColor(for: status))
                            .cornerRadius(10)
                        }
                        .disabled(viewModel.statusUpdateInProgress)
                    }
                }
            } else {
                Text("No further status updates available")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Contact Section
    private func contactSection(job: JobDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Contact Information")
                .font(.headline)
            
            Divider()
            
            // Shipper Info
            if let shipperName = job.shipperName {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Shipper")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(shipperName)
                            .font(.subheadline)
                    }
                    
                    Spacer()
                    
                    if let shipperPhone = job.shipperPhone, !shipperPhone.isEmpty {
                        Button(action: {
                            if let url = URL(string: "tel://\(shipperPhone.replacingOccurrences(of: " ", with: ""))") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Image(systemName: "phone.circle.fill")
                                .font(.title2)
                                .foregroundColor(.green)
                        }
                    }
                }
                .padding(.vertical, 8)
            }
            
            // Recipient Info
            if let recipientName = job.recipientName {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Recipient")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(recipientName)
                            .font(.subheadline)
                    }
                    
                    Spacer()
                    
                    if let recipientPhone = job.recipientPhone, !recipientPhone.isEmpty {
                        Button(action: {
                            if let url = URL(string: "tel://\(recipientPhone.replacingOccurrences(of: " ", with: ""))") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Image(systemName: "phone.circle.fill")
                                .font(.title2)
                                .foregroundColor(.green)
                        }
                    }
                }
                .padding(.vertical, 8)
            }
            
            // Support Contact
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Support")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Moving Mountains Support")
                        .font(.subheadline)
                }
                
                Spacer()
                
                Button(action: {
                    if let url = URL(string: "tel://+18005551234") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Image(systemName: "phone.circle.fill")
                        .font(.title2)
                        .foregroundColor(.green)
                }
            }
            .padding(.vertical, 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Notes Section
    private func notesSection(notes: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Notes")
                .font(.headline)
            
            Divider()
            
            Text(notes)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Success Message Overlay
    private var successMessageOverlay: some View {
        VStack {
            HStack(spacing: 16) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)
                
                Text(viewModel.successMessage)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Button(action: {
                    viewModel.showingSuccessMessage = false
                }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(10)
            .shadow(radius: 5)
            .padding(.horizontal)
            .padding(.top, 8)
            
            Spacer()
        }
    }
    
    // MARK: - Loading Overlay
    private struct LoadingOverlay: View {
        var body: some View {
            ZStack {
                Color.black.opacity(0.2)
                    .edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 20) {
                    ProgressView()
                        .scaleEffect(1.5)
                    
                    Text("Loading job details...")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .padding(20)
                .background(Color(.systemBackground).opacity(0.9))
                .cornerRadius(10)
                .shadow(radius: 10)
            }
        }
    }
    
    // MARK: - Helper Functions
    private func createMapAnnotations() -> [MapAnnotation] {
        guard let job = viewModel.job,
              let pickupLat = Double(job.pickupLatitude ?? "0"),
              let pickupLng = Double(job.pickupLongitude ?? "0"),
              let deliveryLat = Double(job.deliveryLatitude ?? "0"),
              let deliveryLng = Double(job.deliveryLongitude ?? "0") else {
            return []
        }
        
        let pickupCoordinate = CLLocationCoordinate2D(latitude: pickupLat, longitude: pickupLng)
        let deliveryCoordinate = CLLocationCoordinate2D(latitude: deliveryLat, longitude: deliveryLng)
        
        return [
            MapAnnotation(
                id: "pickup",
                coordinate: pickupCoordinate,
                title: "Pickup",
                iconName: "arrow.up.circle.fill",
                color: .blue
            ),
            MapAnnotation(
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
    
    private func statusIcon(for status: String) -> String {
        switch status {
        case "assigned":
            return "person.fill"
        case "picked_up":
            return "cube.box.fill"
        case "in_transit":
            return "car.fill"
        case "delivered":
            return "checkmark.circle.fill"
        default:
            return "circle"
        }
    }
    
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
}

// MARK: - Map Annotation
struct MapAnnotation: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let title: String
    let iconName: String
    let color: Color
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.replacingOccurrences(of: "_", with: " ").capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(backgroundColor)
            .foregroundColor(textColor)
            .cornerRadius(12)
    }
    
    private var backgroundColor: Color {
        switch status {
        case "pending":
            return Color.gray.opacity(0.2)
        case "quoted":
            return Color.blue.opacity(0.2)
        case "approved":
            return Color.green.opacity(0.2)
        case "assigned":
            return Color.orange.opacity(0.2)
        case "picked_up":
            return Color.purple.opacity(0.2)
        case "in_transit":
            return Color.indigo.opacity(0.2)
        case "delivered":
            return Color.mint.opacity(0.2)
        default:
            return Color.gray.opacity(0.2)
        }
    }
    
    private var textColor: Color {
        switch status {
        case "pending":
            return .gray
        case "quoted":
            return .blue
        case "approved":
            return .green
        case "assigned":
            return .orange
        case "picked_up":
            return .purple
        case "in_transit":
            return .indigo
        case "delivered":
            return .mint
        default:
            return .gray
        }
    }
}

#Preview {
    NavigationView {
        JobDetailsView(apiClient: APIClient(authService: AuthService()), jobId: 1)
    }
} 
