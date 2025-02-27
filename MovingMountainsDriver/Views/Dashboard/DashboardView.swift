import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel
    @EnvironmentObject private var authService: AuthService
    private let apiClient: APIClient
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
        _viewModel = StateObject(wrappedValue: DashboardViewModel(apiClient: apiClient))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Active job section
                        if let activeJob = viewModel.activeJob {
                            ActiveJobCard(job: activeJob, apiClient: apiClient)
                        } else {
                            NoActiveJobView()
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
                                    JobCard(job: job, apiClient: apiClient, onAccept: { viewModel.acceptJob(id: job.id) })
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
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Alert(
                    title: Text("Error"),
                    message: Text(viewModel.errorMessage ?? ""),
                    dismissButton: .default(Text("OK"))
                )
            }
        }
        .onAppear {
            viewModel.fetchJobs()
        }
    }
}

// Supporting components

struct ActiveJobCard: View {
    let job: JobDTO
    let apiClient: APIClient
    
    var body: some View {
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
                StatusBadge(status: job.status)
                
                Spacer()
                
                if let vehicleName = job.vehicleName, let licensePlate = job.licensePlate {
                    Text("\(vehicleName) (\(licensePlate))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            HStack {
                NavigationLink(destination: JobDetailsView(apiClient: apiClient, jobId: job.id)) {
                    Text("View Details")
                        .font(.subheadline)
                        .foregroundColor(.accentColor)
                }
                
                Spacer()
                
                Button(action: {
                    // Open in Maps
                }) {
                    Label("Navigate", systemImage: "location.fill")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.accentColor)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct JobCard: View {
    let job: JobDTO
    let apiClient: APIClient
    let onAccept: () -> Void
    
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
                
                if let quoteAmount = job.quoteAmount {
                    Text("$\(String(format: "%.2f", quoteAmount))")
                        .font(.headline)
                        .foregroundColor(.green)
                }
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
                
                Button(action: onAccept) {
                    Text("Accept Job")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.accentColor)
                        .cornerRadius(8)
                }
            }
            
            NavigationLink(destination: JobDetailsView(apiClient: apiClient, jobId: job.id)) {
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
        case "assigned":
            return .blue
        case "picked_up":
            return .orange
        case "in_transit":
            return .purple
        case "delivered":
            return .green
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
} 