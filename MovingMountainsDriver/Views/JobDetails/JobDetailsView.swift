import SwiftUI

struct JobDetailsView: View {
    @ObservedObject var viewModel: JobDetailsViewModel
    @State private var isUpdatingStatus = false
    @State private var selectedStatus: Job.JobStatus?
    
    var jobId: String
    var onBackTapped: () -> Void
    
    init(jobId: String, viewModel: JobDetailsViewModel, onBackTapped: @escaping () -> Void) {
        self.jobId = jobId
        self.viewModel = viewModel
        self.onBackTapped = onBackTapped
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header with back button
                HStack {
                    Button(action: onBackTapped) {
                        HStack {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .foregroundColor(.blue)
                    }
                    
                    Spacer()
                }
                .padding(.bottom, 8)
                
                if viewModel.isLoading && viewModel.job == nil {
                    loadingView
                } else if let job = viewModel.job {
                    // Job details
                    jobDetailSection(job)
                    
                    Divider()
                    
                    // Client info
                    clientInfoSection(job)
                    
                    Divider()
                    
                    // Shipments
                    shipmentSection
                    
                    Divider()
                    
                    // Actions section
                    actionSection(job)
                } else if let error = viewModel.error {
                    errorView(error)
                }
            }
            .padding()
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.loadJob(jobId: jobId)
        }
        .actionSheet(isPresented: $isUpdatingStatus) {
            ActionSheet(
                title: Text("Update Job Status"),
                message: Text("Select the new status for this job"),
                buttons: [
                    .default(Text("Pending")) {
                        updateJobStatus(.pending)
                    },
                    .default(Text("In Progress")) {
                        updateJobStatus(.inProgress)
                    },
                    .default(Text("Completed")) {
                        updateJobStatus(.completed)
                    },
                    .destructive(Text("Cancelled")) {
                        updateJobStatus(.cancelled)
                    },
                    .cancel()
                ]
            )
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .scaleEffect(1.5)
            
            Text("Loading job details...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 100)
    }
    
    private func errorView(_ error: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.red)
            
            Text("Error loading job")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text(error)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Retry") {
                viewModel.loadJob(jobId: jobId)
            }
            .padding()
            .foregroundColor(.white)
            .background(Color.blue)
            .cornerRadius(10)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
    
    private func jobDetailSection(_ job: Job) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(job.title)
                .font(.title)
                .fontWeight(.bold)
            
            StatusBadge(status: job.status)
            
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    Image(systemName: "location.fill")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    Text(job.address)
                        .font(.body)
                }
                
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    Text(job.scheduledDate.formattedString(format: "EEEE, MMM d, yyyy"))
                        .font(.body)
                }
                
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    Text(job.scheduledDate.formattedString(format: "h:mm a"))
                        .font(.body)
                    
                    Text("(\(Int(job.estimatedDuration / 60)) min)")
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
            
            Text(job.description)
                .font(.body)
                .padding(.vertical, 4)
        }
    }
    
    private func clientInfoSection(_ job: Job) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Client Information")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "person.fill")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    Text(job.clientName)
                        .font(.body)
                }
                
                HStack {
                    Image(systemName: "phone.fill")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    Button(action: {
                        let telephone = "tel://"
                        let formattedString = telephone + job.clientPhone.filter { $0.isNumber }
                        guard let url = URL(string: formattedString) else { return }
                        UIApplication.shared.open(url)
                    }) {
                        Text(job.clientPhone)
                            .font(.body)
                            .foregroundColor(.blue)
                            .underline()
                    }
                }
            }
        }
    }
    
    private var shipmentSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Shipments (\(viewModel.shipments.count))")
                .font(.headline)
            
            if viewModel.isLoading && viewModel.job != nil {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else if viewModel.shipments.isEmpty {
                Text("No shipments found.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(viewModel.shipments) { shipment in
                    shipmentCard(shipment)
                }
            }
        }
    }
    
    private func shipmentCard(_ shipment: Shipment) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Tracking #\(shipment.trackingNumber)")
                    .font(.headline)
                
                Spacer()
                
                Text(shipment.status.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(shipmentStatusColor(shipment.status).opacity(0.2))
                    .foregroundColor(shipmentStatusColor(shipment.status))
                    .cornerRadius(6)
            }
            
            Text(shipment.description)
                .font(.body)
                .foregroundColor(.secondary)
            
            HStack {
                Text("Weight: \(Formatters.formatWeight(shipment.weight))")
                
                Spacer()
                
                Text("Dimensions: \(shipment.dimensions.formattedDimensions)")
            }
            .font(.caption)
            .foregroundColor(.secondary)
            
            if !shipment.specialInstructions.isEmpty {
                Text("Special Instructions:")
                    .font(.caption)
                    .fontWeight(.bold)
                
                Text(shipment.specialInstructions)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
    
    private func shipmentStatusColor(_ status: Shipment.ShipmentStatus) -> Color {
        switch status {
        case .pending:
            return .orange
        case .inTransit:
            return .blue
        case .delivered:
            return .green
        case .damaged:
            return .red
        case .lost:
            return .purple
        }
    }
    
    private func actionSection(_ job: Job) -> some View {
        VStack(spacing: 16) {
            Text("Actions")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            PrimaryButton(
                title: "Update Status",
                action: {
                    isUpdatingStatus = true
                },
                icon: "arrow.triangle.2.circlepath"
            )
            
            NavigationLink(destination: UpdateStatusView(jobId: job.id)) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Take Photos & Notes")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .foregroundColor(.blue)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
            
            Button(action: {
                openMapsForDirections(address: job.address)
            }) {
                HStack {
                    Image(systemName: "map.fill")
                    Text("Get Directions")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .foregroundColor(.blue)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
            
            Button(action: {
                callClient(phoneNumber: job.clientPhone)
            }) {
                HStack {
                    Image(systemName: "phone.fill")
                    Text("Call Client")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .foregroundColor(.blue)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
        }
    }
    
    private func updateJobStatus(_ status: Job.JobStatus) {
        selectedStatus = status
        viewModel.updateJobStatus(status: status)
    }
    
    private func openMapsForDirections(address: String) {
        let formattedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?daddr=\(formattedAddress)&dirflg=d") {
            UIApplication.shared.open(url)
        }
    }
    
    private func callClient(phoneNumber: String) {
        let telephone = "tel://"
        let formattedString = telephone + phoneNumber.filter { $0.isNumber }
        guard let url = URL(string: formattedString) else { return }
        UIApplication.shared.open(url)
    }
}

struct JobDetailsView_Previews: PreviewProvider {
    static var previews: some View {
        let viewModel = JobDetailsViewModel()
        
        // Mock data for preview
        viewModel.job = Job(
            id: "1",
            title: "Office Relocation",
            description: "Move office equipment from old location to new office",
            address: "123 Business Park, Suite 456, San Francisco, CA 94107",
            status: .inProgress,
            assignedTo: "driver-123",
            clientName: "Acme Corp",
            clientPhone: "(555) 123-4567",
            scheduledDate: Date(),
            estimatedDuration: 3600, // 1 hour in seconds
            shipments: ["ship-1", "ship-2"]
        )
        
        viewModel.shipments = [
            Shipment(
                id: "ship-1",
                jobId: "1",
                description: "Office desks and chairs",
                weight: 450.5,
                dimensions: Shipment.Dimensions(length: 72, width: 36, height: 30),
                status: .inTransit,
                trackingNumber: "TRK123456",
                specialInstructions: "Handle with care, expensive equipment"
            ),
            Shipment(
                id: "ship-2",
                jobId: "1",
                description: "Filing cabinets",
                weight: 320.0,
                dimensions: Shipment.Dimensions(length: 48, width: 24, height: 60),
                status: .inTransit,
                trackingNumber: "TRK789012",
                specialInstructions: ""
            )
        ]
        
        return NavigationView {
            JobDetailsView(jobId: "1", viewModel: viewModel, onBackTapped: {})
        }
    }
} 