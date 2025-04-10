import SwiftUI
import UIKit

struct StatusOption: Identifiable {
    let id: String
    let label: String
    let description: String
}

// Add StatusBadge directly in this file as a fallback
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
        switch status.lowercased() {
        case "pending":
            return .orange
        case "picked_up", "pickup_started", "pickup_complete":
            return .blue
        case "in_transit", "in_progress", "out_for_delivery":
            return .purple
        case "delivered", "complete", "completed":
            return .green
        case "cancelled", "canceled", "failed":
            return .red
        default:
            return .gray
        }
    }
}

// Create an identifiable alert item
struct AlertItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

@MainActor
final class UpdateStatusViewModel: ObservableObject {
    @Published var job: JobDTO?
    @Published var selectedStatus: String = ""
    @Published var notes: String = ""
    @Published var isLoading = false
    @Published var alertItem: AlertItem?
    @Published var isSuccess = false
    
    private let apiClient: APIClient
    private let jobId: Int
    
    init(apiClient: APIClient, jobId: Int) {
        self.apiClient = apiClient
        self.jobId = jobId
        fetchJobDetails()
    }
    
    var statusOptions: [StatusOption] {
        // Define all possible status options with server-compatible values
        let allOptions: [StatusOption] = [
            StatusOption(id: "assigned", label: "Assigned", description: "Job has been assigned to driver"),
            StatusOption(id: "picked_up", label: "Picked Up", description: "Package has been picked up from sender"),
            StatusOption(id: "in_transit", label: "In Transit", description: "Package is in transit to destination"),
            StatusOption(id: "delivered", label: "Delivered", description: "Package has been delivered to recipient"),
            StatusOption(id: "completed", label: "Completed", description: "Job has been completed"),
            StatusOption(id: "cancelled", label: "Cancelled", description: "Job has been cancelled")
        ]
        
        // Filter options based on current job status
        guard let job = job else { return [] }
        
        switch job.status.rawValue {
        case "pending", "approved", "quoted":
            return allOptions.filter { $0.id == "assigned" }
        case "assigned":
            return allOptions.filter { $0.id == "picked_up" }
        case "picked_up":
            return allOptions.filter { $0.id == "in_transit" }
        case "in_transit":
            return allOptions.filter { $0.id == "delivered" }
        case "delivered":
            return allOptions.filter { $0.id == "completed" }
        case "completed", "cancelled":
            return [] // No further transitions from terminal states
        default:
            return []
        }
    }
    
    var canSubmit: Bool {
        !selectedStatus.isEmpty && !isLoading
    }
    
    func fetchJobDetails() {
        isLoading = true
        
        Task {
            do {
                let job: JobDTO = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)"
                )
                
                self.job = job
                
                // Pre-select next logical status
                if let nextStatus = self.statusOptions.first?.id {
                    self.selectedStatus = nextStatus
                }
                
                self.isLoading = false
            } catch {
                self.alertItem = AlertItem(
                    title: "Error",
                    message: "Failed to fetch job details"
                )
                self.isLoading = false
            }
        }
    }
    
    func updateStatus() {
        guard canSubmit else { return }
        
        isLoading = true
        
        struct UpdateRequest: Codable {
            let status: String
            let notes: String
        }
        
        let request = UpdateRequest(status: selectedStatus, notes: notes)
        
        Task {
            do {
                let requestData = try JSONEncoder().encode(request)
                
                let _: EmptyResponse = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/status",
                    method: "PUT",
                    body: requestData
                )
                
                self.isSuccess = true
                self.isLoading = false
            } catch {
                self.alertItem = AlertItem(
                    title: "Error",
                    message: "Failed to update status"
                )
                self.isLoading = false
            }
        }
    }
}

struct UpdateStatusView: View {
    @StateObject private var viewModel: UpdateStatusViewModel
    
    // Use a closure instead of the environment for dismissal
    var onDismiss: (() -> Void)?
    
    init(apiClient: APIClient, jobId: Int, onDismiss: (() -> Void)? = nil) {
        _viewModel = StateObject(wrappedValue: UpdateStatusViewModel(apiClient: apiClient, jobId: jobId))
        self.onDismiss = onDismiss
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Current status section
                if let job = viewModel.job {
                    HStack {
                        Text("Current Status:")
                            .font(.headline)
                        
                        StatusBadge(status: job.status.rawValue)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                
                // Status update form
                VStack(alignment: .leading, spacing: 15) {
                    Text("Update Status")
                        .font(.headline)
                    
                    if viewModel.statusOptions.isEmpty {
                        Text("No status updates available")
                            .foregroundColor(.secondary)
                    } else {
                        // Status options picker
                        Picker("New Status", selection: $viewModel.selectedStatus) {
                            Text("Select new status").tag("")
                            
                            ForEach(viewModel.statusOptions) { option in
                                Text(option.label).tag(option.id)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                        
                        // Selected status description
                        if let selectedOption = viewModel.statusOptions.first(where: { $0.id == viewModel.selectedStatus }) {
                            Text(selectedOption.description)
                                .foregroundColor(.secondary)
                                .font(.subheadline)
                                .padding(.horizontal)
                        }
                        
                        // Notes field
                        Text("Notes (optional)")
                            .font(.headline)
                            .padding(.top)
                        
                        TextEditor(text: $viewModel.notes)
                            .frame(minHeight: 100)
                            .padding(4)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                
                // Submit button
                Button(action: {
                    viewModel.updateStatus()
                }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Update Status")
                            .fontWeight(.medium)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(viewModel.canSubmit ? Color.accentColor : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(!viewModel.canSubmit)
                .padding(.vertical)
            }
            .padding()
        }
        .navigationTitle("Update Status")
        .navigationBarTitleDisplayMode(.inline)
        .alert(item: $viewModel.alertItem) { alertItem in 
            Alert(
                title: Text(alertItem.title),
                message: Text(alertItem.message),
                dismissButton: .default(Text("OK"))
            )
        }
        .alert(isPresented: $viewModel.isSuccess) {
            Alert(
                title: Text("Success"),
                message: Text("Status updated successfully"),
                dismissButton: .default(Text("OK")) {
                    // Use the callback for dismissal instead of Environment
                    onDismiss?()
                }
            )
        }
    }
}

// Required by the view model for API response
struct EmptyResponse: Codable {} 
