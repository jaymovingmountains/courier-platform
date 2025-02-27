import SwiftUI

struct StatusOption: Identifiable {
    let id: String
    let label: String
    let description: String
}

// Create an identifiable alert item
struct AlertItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

class UpdateStatusViewModel: ObservableObject {
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
        let options: [StatusOption] = [
            StatusOption(id: "picked_up", label: "Picked Up", description: "Package has been picked up from sender"),
            StatusOption(id: "in_transit", label: "In Transit", description: "Package is in transit to destination"),
            StatusOption(id: "delivered", label: "Delivered", description: "Package has been delivered to recipient")
        ]
        
        // Filter options based on current job status
        guard let job = job else { return [] }
        
        switch job.status {
        case "assigned":
            return options.filter { $0.id == "picked_up" }
        case "picked_up":
            return options.filter { $0.id == "in_transit" }
        case "in_transit":
            return options.filter { $0.id == "delivered" }
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
                
                DispatchQueue.main.async {
                    self.job = job
                    
                    // Pre-select next logical status
                    if let nextStatus = self.statusOptions.first?.id {
                        self.selectedStatus = nextStatus
                    }
                    
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.alertItem = AlertItem(
                        title: "Error",
                        message: "Failed to fetch job details"
                    )
                    self.isLoading = false
                }
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
                
                DispatchQueue.main.async {
                    self.isSuccess = true
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.alertItem = AlertItem(
                        title: "Error",
                        message: "Failed to update status"
                    )
                    self.isLoading = false
                }
            }
        }
    }
}

struct UpdateStatusView: View {
    @StateObject private var viewModel: UpdateStatusViewModel
    @Environment(\.dismiss) var dismiss
    
    init(apiClient: APIClient, jobId: Int) {
        _viewModel = StateObject(wrappedValue: UpdateStatusViewModel(apiClient: apiClient, jobId: jobId))
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Current status section
                if let job = viewModel.job {
                    HStack {
                        Text("Current Status:")
                            .font(.headline)
                        
                        StatusBadgeView(status: job.status)
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
                    dismiss()
                }
            )
        }
    }
}

// Required by the view model for API response
struct EmptyResponse: Codable {} 