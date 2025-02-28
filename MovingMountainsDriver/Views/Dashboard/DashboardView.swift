import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel
    @EnvironmentObject private var authService: AuthService
    private let apiClient: APIClient
    
    // Add state for custom alert
    @State private var showCustomAlert = false
    @State private var alertTitle = ""
    @State private var alertMessage = ""
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
        _viewModel = StateObject(wrappedValue: DashboardViewModel(apiClient: apiClient, authService: AuthService()))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Active jobs section
                        VStack(alignment: .leading) {
                            HStack {
                                Text("Active Jobs")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Text("\(viewModel.activeJobs.count)")
                                    .font(.subheadline)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 4)
                                    .background(Color.accentColor)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }
                            .padding(.horizontal)
                            
                            if viewModel.activeJobs.isEmpty && !viewModel.isLoading {
                                NoActiveJobView()
                            } else {
                                ForEach(viewModel.activeJobs) { job in
                                    ActiveJobCard(job: job, apiClient: apiClient)
                                }
                            }
                        }
                        
                        // Available jobs section
                        VStack(alignment: .leading) {
                            HStack {
                                Text("Available Jobs")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Text("\(viewModel.availableJobs.count)")
                                    .font(.subheadline)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 4)
                                    .background(Color.accentColor)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }
                            .padding(.horizontal)
                            
                            if viewModel.availableJobs.isEmpty && !viewModel.isLoading {
                                EmptyStateView(
                                    icon: "package.fill", 
                                    message: "No available jobs at the moment. Check back later!"
                                )
                            } else {
                                ForEach(viewModel.availableJobs) { job in
                                    JobCard(job: job, apiClient: apiClient, onAccept: { viewModel.acceptJob(jobId: job.id) })
                                }
                            }
                        }
                    }
                    .padding()
                }
                .refreshable {
                    viewModel.fetchJobs()
                }
                .overlay(
                    Group {
                        if viewModel.isLoading {
                            DashboardLoadingView()
                        }
                    }
                )
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        authService.logout()
                    }) {
                        Text("Logout")
                    }
                }
            }
            .alert(isPresented: Binding<Bool>(
                get: { viewModel.showError },
                set: { if !$0 { viewModel.showError = false; viewModel.error = nil } }
            )) {
                Alert(
                    title: Text(errorAlertTitle),
                    message: Text(viewModel.error?.userMessage ?? "An unknown error occurred"),
                    dismissButton: .default(Text("OK"))
                )
            }
            // Add custom alert for permission issues
            .alert(isPresented: $showCustomAlert) {
                Alert(
                    title: Text(alertTitle),
                    message: Text(alertMessage),
                    dismissButton: .default(Text("OK"))
                )
            }
        }
        .onAppear {
            viewModel.updateAuthService(authService)
            viewModel.fetchJobs()
            
            // Listen for custom error alerts
            NotificationCenter.default.addObserver(
                forName: NSNotification.Name("ShowErrorAlert"),
                object: nil,
                queue: .main
            ) { notification in
                if let title = notification.userInfo?["title"] as? String,
                   let message = notification.userInfo?["message"] as? String {
                    self.alertTitle = title
                    self.alertMessage = message
                    self.showCustomAlert = true
                }
            }
            
            // Listen for job status UI refresh notifications
            NotificationCenter.default.addObserver(
                forName: NSNotification.Name("ForceJobUIRefresh"),
                object: nil,
                queue: .main
            ) { notification in
                if let jobId = notification.userInfo?["jobId"] as? Int,
                   let status = notification.userInfo?["status"] as? String {
                    print("📱 Received UI refresh notification for job #\(jobId), new status: \(status)")
                    
                    // Force refresh the view
                    viewModel.objectWillChange.send()
                    
                    // Show status update toast message
                    let statusMessage: String
                    switch status {
                    case "picked_up": statusMessage = "Job marked as picked up"
                    case "in_transit": statusMessage = "Job marked as in transit"
                    case "delivered": statusMessage = "Job successfully delivered!"
                    default: statusMessage = "Job status updated to \(status)"
                    }
                    
                    // Show feedback to user about status change
                    self.alertTitle = "Status Updated"
                    self.alertMessage = statusMessage
                    self.showCustomAlert = true
                }
            }
        }
        .onDisappear {
            // Remove observers when view disappears - using the correct method
            NotificationCenter.default.removeObserver(
                self, 
                name: NSNotification.Name("ShowErrorAlert"),
                object: nil
            )
            
            // Remove the job UI refresh observer
            NotificationCenter.default.removeObserver(
                self, 
                name: NSNotification.Name("ForceJobUIRefresh"),
                object: nil
            )
        }
    }
    
    // Custom error alert title based on error type
    private var errorAlertTitle: String {
        guard let error = viewModel.error else { return "Error" }
        
        switch error {
        case .jobAlreadyAccepted:
            return "Job Unavailable"
        case .authentication, .authorization:
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

// Supporting components

struct ActiveJobCard: View {
    let job: JobDTO
    let apiClient: APIClient
    @EnvironmentObject private var authService: AuthService
    @State private var showingActionSheet = false
    @State private var isShowingQRScanner = false
    @State private var isShowingPhotoCapture = false
    @State private var photoDestination: PhotoDestination = .pickup
    
    var body: some View {
        // Don't display delivered jobs in the active view
        if job.status == .delivered {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("Current Delivery")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Pickup")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(job.pickupAddress)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("\(job.pickupCity), \(job.pickupPostalCode)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "arrow.right")
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Delivery")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(job.deliveryAddress)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("\(job.deliveryCity), \(job.deliveryPostalCode)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Divider()
                
                HStack {
                    StatusBadge(status: job.status.rawValue)
                    
                    Spacer()
                    
                    if let vehicleName = job.vehicleName, let licensePlate = job.licensePlate {
                        Text("\(vehicleName) (\(licensePlate))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Status Update Button
                Button(action: {
                    // Debug print to check status
                    print("Current job status: \(job.status.rawValue)")
                    print("Job ID: \(job.id)")
                    print("Is this job already assigned? \(job.status.rawValue == "assigned")")
                    print("Is this job in pending/approved/quoted state? \(["pending", "approved", "quoted"].contains(job.status.rawValue))")
                    showingActionSheet = true
                }) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Update Status")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .confirmationDialog(
                    "Update Job Status",
                    isPresented: $showingActionSheet,
                    titleVisibility: .visible
                ) {
                    // Follow proper status transition sequence based on current status
                    let currentStatus = job.status.rawValue
                    
                    // For jobs with pending/approved/quoted status, show options for both
                    // assigning and for picking up (which will use the chain)
                    if ["pending", "approved", "quoted"].contains(currentStatus) {
                        Button("Assign to Me") {
                            updateJobStatus(to: "assigned")
                        }
                        
                        Button("Mark as Picked Up") {
                            // This will use the chain to go through "assigned" first
                            updateJobStatus(to: "picked_up")
                        }
                    }
                    
                    // assigned → picked_up
                    if currentStatus == "assigned" {
                        Button("Mark as Picked Up") {
                            updateJobStatus(to: "picked_up")
                        }
                    }
                    
                    // picked_up → in_transit
                    if currentStatus == "picked_up" {
                        Button("Mark as In Transit") {
                            updateJobStatus(to: "in_transit")
                        }
                    }
                    
                    // in_transit → delivered
                    if currentStatus == "in_transit" {
                        Button("Mark as Delivered") {
                            updateJobStatus(to: "delivered")
                        }
                    }
                    
                    // Always show cancel button for dialog
                    Button("Cancel", role: .cancel) {}
                    
                    // Add option to document damage regardless of status
                    Button("Document Damage") {
                        documentDamage()
                    }
                } message: {
                    Text("Current status: \(job.status.displayName)\nChange the status of this job")
                }
                
                HStack {
                    // Navigation Buttons
                    HStack(spacing: 8) {
                        // Navigate to Pickup
                        Button(action: {
                            // Open pickup address in Maps
                            let encodedAddress = "\(job.pickupAddress), \(job.pickupCity), \(job.pickupPostalCode)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                            print("🗺️ Opening Maps with pickup address: \(encodedAddress)")
                            if let url = URL(string: "maps://?daddr=\(encodedAddress)") {
                                print("🗺️ Maps URL: \(url)")
                                UIApplication.shared.open(url, options: [:]) { success in
                                    print("🗺️ Maps opened successfully: \(success)")
                                }
                            }
                        }) {
                            VStack {
                                Image(systemName: "location.fill")
                                Text("Pickup")
                                    .font(.caption)
                            }
                            .padding(8)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        
                        // Navigate to Delivery
                        Button(action: {
                            // Open delivery address in Maps
                            let encodedAddress = "\(job.deliveryAddress), \(job.deliveryCity), \(job.deliveryPostalCode)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                            print("🗺️ Opening Maps with delivery address: \(encodedAddress)")
                            if let url = URL(string: "maps://?daddr=\(encodedAddress)") {
                                print("🗺️ Maps URL: \(url)")
                                UIApplication.shared.open(url, options: [:]) { success in
                                    print("🗺️ Maps opened successfully: \(success)")
                                }
                            }
                        }) {
                            VStack {
                                Image(systemName: "location.fill")
                                Text("Delivery")
                                    .font(.caption)
                            }
                            .padding(8)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        
                        // QR Scan Button
                        Button(action: {
                            isShowingQRScanner = true
                        }) {
                            VStack {
                                Image(systemName: "qrcode.viewfinder")
                                Text("Scan")
                                    .font(.caption)
                            }
                            .padding(8)
                            .background(Color.purple)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .sheet(isPresented: $isShowingQRScanner) {
                            QRScannerView(isPresented: $isShowingQRScanner, jobId: job.id) { scannedCode in
                                handleScannedCode(scannedCode)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // View Details
                    NavigationLink(destination: JobDetailsView(
                        apiClient: apiClient, 
                        jobId: job.id,
                        onDismiss: {
                            // Refresh jobs list when returning from details
                            print("⟲ Refreshing jobs after returning from job details")
                            NotificationCenter.default.post(name: NSNotification.Name("RefreshJobsNotification"), object: nil)
                        }
                    )) {
                        Text("View Details")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
            .sheet(isPresented: $isShowingPhotoCapture) {
                PhotoCaptureView(
                    isPresented: $isShowingPhotoCapture,
                    jobId: job.id,
                    destination: photoDestination
                ) { success in
                    if success {
                        // Handle different photo types
                        switch photoDestination {
                        case .pickup:
                            updateJobStatus(to: "picked_up", skipPhotoPrompt: true)
                        case .delivery:
                            updateJobStatus(to: "delivered", skipPhotoPrompt: true)
                        case .damage:
                            // Just log damage photos, don't change status
                            print("📸 Damage photo documented for job #\(job.id)")
                        }
                    }
                }
            }
        }
    }
    
    // Add a new method to handle damage documentation
    private func documentDamage() {
        photoDestination = .damage
        isShowingPhotoCapture = true
    }
    
    // Update the updateJobStatus method to also handle delivery photos
    private func updateJobStatus(to status: String, skipPhotoPrompt: Bool = false) {
        // Check job's current status and desired status
        let currentStatus = job.status.rawValue
        print("Current job status: \(currentStatus)")
        print("Job ID: \(job.id)")
        
        // Check if this job belongs to the current user
        // First, get current user ID from the environment
        guard let currentUserId = getUserId() else {
            print("⚠️ Cannot update job: Unable to determine current user ID")
            showErrorAlert(title: "Authentication Error", message: "Please log out and log back in.")
            return
        }
        
        // Check if the job is assigned to someone else or doesn't exist for this user
        if let driverId = job.driverId {
            if driverId != currentUserId {
                print("⚠️ Cannot update job #\(job.id): It belongs to driver #\(driverId), but you are #\(currentUserId)")
                showErrorAlert(title: "Permission Denied", 
                               message: "You cannot update this job because it is assigned to another driver.")
                return
            }
        } else if !["pending", "approved", "quoted"].contains(currentStatus) {
            // The job is not assigned to anyone, but it's not in a state where the current user should update it
            print("⚠️ Cannot update job #\(job.id): It is not assigned to you and is in state: \(currentStatus)")
            showErrorAlert(title: "Invalid Job Status", 
                           message: "This job is not assigned to you and cannot be updated in its current state.")
            return
        }
        
        // Handle status transitions correctly
        let isAssigned = job.driverId != nil
        let isPendingState = currentStatus == "pending" || currentStatus == "approved" || currentStatus == "quoted"
        
        // Log state for debugging
        print("Is this job already assigned? \(isAssigned)")
        print("Is this job in pending/approved/quoted state? \(isPendingState)")
        
        // Check if we need to take photos first
        if status == "picked_up" && !skipPhotoPrompt {
            // Show photo capture for pickup
            photoDestination = .pickup
            isShowingPhotoCapture = true
            return // Don't update status yet, it will be done after photo capture
        }
        
        // Add photo capture for delivery too
        if status == "delivered" && !skipPhotoPrompt {
            // Show photo capture for delivery
            photoDestination = .delivery
            isShowingPhotoCapture = true
            return // Don't update status yet, it will be done after photo capture
        }
        
        // For specific transitions that need to go through a chain
        if currentStatus == "approved" && status == "picked_up" {
            print("🔄 Attempting to update job \(job.id) from \(currentStatus) to \(status)")
            
            // Try direct update to picked_up first
            let userInfo: [String: Any] = ["jobId": job.id, "status": status]
            NotificationCenter.default.post(
                name: NSNotification.Name("UpdateJobStatusNotification"),
                object: nil,
                userInfo: userInfo
            )
            return
        }
        
        // For all other cases, just update directly
        let userInfo: [String: Any] = ["jobId": job.id, "status": status]
        NotificationCenter.default.post(
            name: NSNotification.Name("UpdateJobStatusNotification"),
            object: nil,
            userInfo: userInfo
        )
    }
    
    // Helper method to get the current user ID
    private func getUserId() -> Int? {
        // Get the ID directly from the authService
        // Access the wrapped value and the appropriate property
        if let userId = authService.currentUser?.id {
            return userId
        }
        
        // Fallback for development/testing
        print("⚠️ Could not get user ID from AuthService, using fallback")
        return nil
    }
    
    // Helper method to show error alerts
    private func showErrorAlert(title: String, message: String) {
        NotificationCenter.default.post(
            name: NSNotification.Name("ShowErrorAlert"),
            object: nil,
            userInfo: ["title": title, "message": message]
        )
    }
    
    // Update the handleScannedCode method to respect status sequence
    private func handleScannedCode(_ code: String) {
        print("📱 Scanned code for job #\(job.id): \(code)")
        
        // In a real implementation, this could verify the package, 
        // update server records, or trigger a status update
        
        // For active jobs, update the job status based on current status
        var nextStatus: String?
        
        // For active jobs, follow the proper status transition sequence
        // The server requires proper transition sequence even for active jobs
        switch job.status.rawValue {
        case "pending", "approved", "quoted":
            // Must use chain transition for these statuses
            print("📱 QR scan for \(job.status.rawValue) job - must use chain transition")
            updateJobStatusWithChain(initialStatus: "assigned", finalStatus: "picked_up")
            return
        case "assigned":
            nextStatus = "picked_up" // To pick up if already assigned
        case "picked_up":
            nextStatus = "in_transit" // To in_transit if already picked up
        case "in_transit":
            nextStatus = "delivered" // To delivered if already in transit
        case "delivered":
            // Delivered is now final, no transition to completed
            print("📱 QR scan - Job is already delivered, no further status updates needed")
            break
        case "cancelled":
            print("📱 QR scan - Cannot update cancelled job")
            break
        default:
            // Don't change status for unrecognized states
            print("📱 QR scan - No valid status transition available from \(job.status.rawValue)")
            break
        }
        
        if let status = nextStatus {
            print("📱 QR scan triggering status update to: \(status)")
            updateJobStatus(to: status)
        }
    }
    
    // Method to handle status updates that need to go through a chain
    private func updateJobStatusWithChain(initialStatus: String, finalStatus: String) {
        print("🔄 Direct update approach: Updating job \(job.id) to \(finalStatus)")
        
        // Instead of trying to chain multiple status updates, just try to update directly to the final status
        // This avoids the issue with multiple requests being triggered
        let userInfo: [String: Any] = ["jobId": job.id, "status": finalStatus]
        NotificationCenter.default.post(
            name: NSNotification.Name("UpdateJobStatusNotification"),
            object: nil,
            userInfo: userInfo
        )
    }
}

struct JobCard: View {
    let job: JobDTO
    let apiClient: APIClient
    let onAccept: () -> Void
    @State private var isAcceptingJob = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("#\(job.id)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let shipmentType = job.shipmentType {
                        Text(shipmentType.capitalized)
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                }
                
                Spacer()
                
                // Removed quote amount display as requested
            }
            
            Divider()
            
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Pickup")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(job.pickupAddress)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("\(job.pickupCity), \(job.pickupPostalCode)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Delivery")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(job.deliveryAddress)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("\(job.deliveryCity), \(job.deliveryPostalCode)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Divider()
            
            HStack {
                Text("Created: \(job.createdAt)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button(action: {
                    // Prevent multiple taps
                    guard !isAcceptingJob else { return }
                    isAcceptingJob = true
                    
                    // Perform the action
                    onAccept()
                    
                    // Reset after a short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        isAcceptingJob = false
                    }
                }) {
                    Text(isAcceptingJob ? "Processing..." : "Accept Job")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(isAcceptingJob ? Color.gray : Color.accentColor)
                        .cornerRadius(8)
                }
                .disabled(isAcceptingJob)
            }
            
            NavigationLink(destination: JobDetailsView(
                apiClient: apiClient, 
                jobId: job.id,
                onDismiss: {
                    // Refresh jobs list when returning from details
                    print("⟲ Refreshing jobs after returning from job details")
                    NotificationCenter.default.post(name: NSNotification.Name("RefreshJobsNotification"), object: nil)
                }
            )) {
                Text("View Details")
                    .font(.subheadline)
                    .foregroundColor(.accentColor)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct NoActiveJobView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "car.fill")
                .font(.system(size: 48))
                .foregroundColor(.accentColor)
            
            Text("No Active Deliveries")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("You don't have any active deliveries. Accept a job to get started!")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct EmptyStateView: View {
    let icon: String
    let message: String
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct DashboardLoadingView: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.1)
                .edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                
                Text("Loading...")
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            .padding(24)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
        }
    }
}

struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.replacingOccurrences(of: "_", with: " ").capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(backgroundColor)
            .foregroundColor(.white)
            .cornerRadius(8)
    }
    
    private var backgroundColor: Color {
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
        case "completed":
            return .green
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
}

// Replace the QRScannerView implementation with a simpler one that doesn't use Environment
struct QRScannerView: View {
    @Binding var isPresented: Bool
    let jobId: Int
    var onScanComplete: (String) -> Void
    
    // In a real implementation, this would be connected to AVFoundation camera capture
    @State private var simulatedCode: String = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Camera preview placeholder
                ZStack {
                    Color.black
                        .edgesIgnoringSafeArea(.all)
                    
                    // QR code frame indicator
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color.green, lineWidth: 3)
                        .frame(width: 250, height: 250)
                    
                    // Scanning animation
                    Rectangle()
                        .fill(Color.green.opacity(0.3))
                        .frame(height: 3)
                        .offset(y: -125)
                        .animation(
                            Animation.easeInOut(duration: 1.5)
                                .repeatForever(autoreverses: true),
                            value: UUID() // This forces the animation to run
                        )
                }
                .frame(height: 350)
                
                Text("Position the QR code within the frame to scan")
                    .font(.headline)
                    .padding()
                
                // For demo purposes only - simulate scanning a code
                TextField("Enter code for testing", text: $simulatedCode)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)
                
                Button(action: {
                    // Simulate successful scan
                    if !simulatedCode.isEmpty {
                        hapticFeedback()
                        onScanComplete(simulatedCode)
                        isPresented = false
                    }
                }) {
                    Text("Simulate Scan")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.blue)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                .disabled(simulatedCode.isEmpty)
                
                Text("Job #\(jobId)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top)
                
                Spacer()
            }
            .navigationTitle("Scan QR Code")
            .navigationBarItems(trailing: 
                Button("Cancel") {
                    isPresented = false
                }
            )
        }
    }
    
    private func hapticFeedback() {
        // Provide haptic feedback for successful scan
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

// Enum to track what the photo is for
enum PhotoDestination {
    case pickup
    case delivery
    case damage
    
    var title: String {
        switch self {
        case .pickup:
            return "Pickup Photo"
        case .delivery:
            return "Delivery Photo"
        case .damage:
            return "Damage Documentation"
        }
    }
    
    var instructions: String {
        switch self {
        case .pickup:
            return "Take a photo of the package at pickup to confirm its condition"
        case .delivery:
            return "Take a photo of the delivered package to confirm successful delivery"
        case .damage:
            return "Document any damage to the package with clear photos"
        }
    }
    
    var icon: String {
        switch self {
        case .pickup:
            return "cube.box.fill"
        case .delivery:
            return "checkmark.circle.fill"
        case .damage:
            return "exclamationmark.triangle.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .pickup:
            return .blue
        case .delivery:
            return .green
        case .damage:
            return .red
        }
    }
}

// Update PhotoCaptureView with better visuals
struct PhotoCaptureView: View {
    @Binding var isPresented: Bool
    let jobId: Int
    let destination: PhotoDestination
    let onComplete: (Bool) -> Void
    
    // In a real implementation, this would use UIImagePickerController or Camera API
    @State private var showingImagePicker = false
    @State private var capturedImage: UIImage?
    @State private var isSaving = false
    @State private var notes: String = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Icon and instructions
                    VStack(spacing: 12) {
                        Image(systemName: destination.icon)
                            .font(.system(size: 48))
                            .foregroundColor(destination.color)
                            .padding()
                        
                        Text(destination.instructions)
                            .font(.headline)
                            .padding(.horizontal)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top)
                    
                    if let image = capturedImage {
                        // Display captured image
                        VStack {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .frame(height: 300)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(destination.color, lineWidth: 2)
                                )
                                .padding()
                            
                            // Button to retake photo
                            Button(action: {
                                capturedImage = nil
                                showingImagePicker = true
                            }) {
                                Label("Retake Photo", systemImage: "arrow.counterclockwise")
                                    .font(.subheadline)
                            }
                            .padding(.bottom)
                        }
                    } else {
                        // Camera placeholder
                        ZStack {
                            Color.black
                                .frame(height: 350)
                                .cornerRadius(12)
                            
                            VStack {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 48))
                                    .foregroundColor(.white)
                                
                                Text("Tap to take photo")
                                    .foregroundColor(.white)
                                    .padding(.top, 8)
                            }
                        }
                        .onTapGesture {
                            showingImagePicker = true
                        }
                        .padding()
                    }
                    
                    // Notes field for damage documentation
                    if destination == .damage {
                        VStack(alignment: .leading) {
                            Text("Damage Notes:")
                                .font(.headline)
                            
                            TextEditor(text: $notes)
                                .frame(height: 120)
                                .padding(4)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray, lineWidth: 1)
                                )
                        }
                        .padding(.horizontal)
                    }
                    
                    // Action buttons
                    HStack(spacing: 20) {
                        Button(action: {
                            // Cancel photo and go back
                            isPresented = false
                            onComplete(false)
                        }) {
                            Text("Cancel")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.gray)
                                .cornerRadius(10)
                        }
                        
                        Button(action: {
                            if capturedImage == nil {
                                showingImagePicker = true
                            } else {
                                savePhoto()
                            }
                        }) {
                            if isSaving {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(capturedImage == nil ? "Take Photo" : "Save")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(capturedImage == nil ? Color.blue : destination.color)
                        .cornerRadius(10)
                        .disabled(isSaving)
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .navigationTitle(destination.title)
            .navigationBarItems(trailing: 
                Button("Skip") {
                    isPresented = false
                    onComplete(true) // Still proceed with status update
                }
            )
            // Simple simulation of image picker
            .sheet(isPresented: $showingImagePicker) {
                // In a real implementation, this would be UIImagePickerController
                VStack {
                    Text("Camera Simulator")
                        .font(.title)
                        .padding()
                    
                    // Create different placeholder images based on photo type
                    Button("Take Photo") {
                        // Simulate photo capture with a placeholder image
                        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 300))
                        capturedImage = renderer.image { ctx in
                            UIColor.gray.setFill()
                            ctx.fill(CGRect(x: 0, y: 0, width: 400, height: 300))
                            
                            // Draw text to simulate a photo
                            let attributes: [NSAttributedString.Key: Any] = [
                                .font: UIFont.systemFont(ofSize: 36),
                                .foregroundColor: UIColor.white
                            ]
                            
                            let text: String
                            switch destination {
                            case .pickup:
                                text = "Pickup Photo #\(jobId)"
                            case .delivery:
                                text = "Delivery Photo #\(jobId)"
                            case .damage:
                                text = "Damage Photo #\(jobId)"
                            }
                            
                            let rect = CGRect(x: 50, y: 130, width: 300, height: 40)
                            text.draw(in: rect, withAttributes: attributes)
                        }
                        
                        showingImagePicker = false
                    }
                    .padding()
                    .background(destination.color)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    
                    Button("Cancel") {
                        showingImagePicker = false
                    }
                    .padding()
                }
            }
        }
    }
    
    private func savePhoto() {
        guard let _ = capturedImage else { return }
        
        // Simulate saving photo to server
        isSaving = true
        
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            print("📸 Photo saved for job #\(jobId) - \(destination.title)")
            
            // If damage notes were provided, log them
            if destination == .damage && !notes.isEmpty {
                print("📝 Damage notes: \(notes)")
            }
            
            isSaving = false
            isPresented = false
            onComplete(true)
            
            // Provide success feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
        }
    }
} 