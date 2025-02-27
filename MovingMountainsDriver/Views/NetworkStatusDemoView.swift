import SwiftUI

struct NetworkStatusDemoView: View {
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var viewModel = NetworkDemoViewModel()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Network status indicator
                networkStatusCard
                
                // Pending requests section
                pendingRequestsSection
                
                Spacer()
                
                // Test buttons
                testButtonsSection
            }
            .padding()
            .navigationTitle("Network Monitor Demo")
            .withOfflineIndicator()  // Apply our custom offline indicator
            .alert(isPresented: $viewModel.showError) {
                Alert(
                    title: Text("Error"),
                    message: Text(viewModel.errorMessage),
                    dismissButton: .default(Text("OK"))
                )
            }
        }
    }
    
    private var networkStatusCard: some View {
        VStack(alignment: .center, spacing: 10) {
            HStack {
                Image(systemName: networkStatusIcon)
                    .font(.system(size: 40))
                    .foregroundColor(networkStatusColor)
                
                VStack(alignment: .leading) {
                    Text("Network Status")
                        .font(.headline)
                    
                    Text(networkMonitor.status.description)
                        .foregroundColor(.secondary)
                    
                    Text("Connection: \(connectionTypeString)")
                        .foregroundColor(.secondary)
                        .font(.subheadline)
                }
                
                Spacer()
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }
    
    private var pendingRequestsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Pending Requests")
                .font(.headline)
            
            if networkMonitor.pendingRequests.isEmpty {
                Text("No pending requests")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                List {
                    ForEach(networkMonitor.pendingRequests) { request in
                        VStack(alignment: .leading) {
                            Text(request.endpoint)
                                .font(.headline)
                            
                            Text("Method: \(request.method)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            Text("Attempt: \(request.retryCount + 1)/\(request.maxRetries)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                networkMonitor.cancelRequest(id: request.id)
                            } label: {
                                Label("Cancel", systemImage: "trash")
                            }
                            
                            Button {
                                networkMonitor.retryRequest(id: request.id)
                            } label: {
                                Label("Retry", systemImage: "arrow.clockwise")
                            }
                            .tint(.blue)
                        }
                    }
                }
                .frame(height: 200)
            }
            
            if !networkMonitor.pendingRequests.isEmpty {
                HStack {
                    Button(action: {
                        networkMonitor.forceTriggerRetry()
                    }) {
                        Text("Retry All")
                            .font(.subheadline)
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                    .disabled(!networkMonitor.isConnected)
                    
                    Spacer()
                    
                    Button(action: {
                        networkMonitor.reset()
                    }) {
                        Text("Clear All")
                            .font(.subheadline)
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            }
        }
    }
    
    private var testButtonsSection: some View {
        VStack(spacing: 15) {
            Button(action: {
                viewModel.fetchJobDetails(jobId: 123)
            }) {
                HStack {
                    Image(systemName: "arrow.down.doc.fill")
                    Text("Fetch Job Details")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            
            Button(action: {
                viewModel.updateJobStatus(jobId: 123, status: "completed")
            }) {
                HStack {
                    Image(systemName: "arrow.up.doc.fill")
                    Text("Update Job Status")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            
            Button(action: {
                // Toggle the airplane mode instruction alert
                viewModel.showAirplaneModeInstructions = true
            }) {
                HStack {
                    Image(systemName: "airplane")
                    Text("Test Offline Mode")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
        .alert(isPresented: $viewModel.showAirplaneModeInstructions) {
            Alert(
                title: Text("Test Offline Mode"),
                message: Text("To test offline functionality, enable Airplane Mode on your device, then try making requests. When you turn Airplane Mode off, pending requests should automatically retry."),
                dismissButton: .default(Text("Got it"))
            )
        }
    }
    
    // Helper computed properties
    
    private var networkStatusIcon: String {
        if networkMonitor.isConnected {
            return connectionTypeIcon
        } else {
            return "wifi.slash"
        }
    }
    
    private var connectionTypeIcon: String {
        switch networkMonitor.connectionType {
        case .wifi:
            return "wifi"
        case .cellular:
            return "antenna.radiowaves.left.and.right"
        case .wiredEthernet:
            return "network"
        default:
            return "dot.radiowaves.up.forward"
        }
    }
    
    private var networkStatusColor: Color {
        if networkMonitor.isConnected {
            return .green
        } else {
            return .red
        }
    }
    
    private var connectionTypeString: String {
        switch networkMonitor.connectionType {
        case .wifi:
            return "WiFi"
        case .cellular:
            return "Cellular"
        case .wiredEthernet:
            return "Ethernet"
        default:
            return "Other"
        }
    }
}

/// ViewModel to handle network operations in the demo
class NetworkDemoViewModel: ObservableObject {
    @Published var showError = false
    @Published var errorMessage = ""
    @Published var showAirplaneModeInstructions = false
    
    private let apiClient = APIClient(authService: AuthService())
    
    func fetchJobDetails(jobId: Int) {
        Task { @MainActor in
            do {
                let endpoint = "\(APIConstants.jobsEndpoint)/\(jobId)"
                
                let _: JobDTO = try await apiClient.fetchWithOfflineSupport(
                    endpoint: endpoint,
                    requestType: "job_details"
                )
                
                // Success handling would go here
            } catch let error as APIError {
                handleError(error)
            } catch {
                handleError(error)
            }
        }
    }
    
    func updateJobStatus(jobId: Int, status: String) {
        Task { @MainActor in
            do {
                let endpoint = "\(APIConstants.jobsEndpoint)/\(jobId)/status"
                let updateBody = ["status": status]
                let jsonData = try JSONSerialization.data(withJSONObject: updateBody)
                
                let _: JobDTO = try await apiClient.fetchWithOfflineSupport(
                    endpoint: endpoint,
                    method: "PUT",
                    body: jsonData,
                    requestType: "update_job_status"
                )
                
                // Success handling would go here
            } catch let error as APIError {
                handleError(error)
            } catch {
                handleError(error)
            }
        }
    }
    
    private func handleError(_ error: Error) {
        if let apiError = error as? APIError {
            errorMessage = apiError.message
        } else {
            errorMessage = error.localizedDescription
        }
        
        showError = true
    }
}

// Preview provider
struct NetworkStatusDemoView_Previews: PreviewProvider {
    static var previews: some View {
        NetworkStatusDemoView()
    }
} 