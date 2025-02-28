import SwiftUI

struct HistoryView: View {
    @StateObject private var viewModel: HistoryViewModel
    @EnvironmentObject private var authService: AuthService
    
    init(apiClient: APIClient) {
        _viewModel = StateObject(wrappedValue: HistoryViewModel(apiClient: apiClient, authService: AuthService()))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .edgesIgnoringSafeArea(.all)
                
                if viewModel.isLoading {
                    LoadingView()
                } else if viewModel.historyJobs.isEmpty {
                    EmptyHistoryView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(viewModel.historyJobs) { job in
                                HistoryJobCard(job: job)
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        print("📱 HISTORY: Manual refresh triggered")
                        viewModel.fetchHistoryJobs()
                    }
                }
            }
            .navigationTitle("Delivery History")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !viewModel.historyJobs.isEmpty {
                        Button(action: {
                            viewModel.clearHistory()
                        }) {
                            Text("Clear")
                                .foregroundColor(.red)
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        print("📱 HISTORY: Refresh button tapped")
                        viewModel.fetchHistoryJobs()
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .alert(isPresented: $viewModel.showError) {
                Alert(
                    title: Text("Error"),
                    message: Text(viewModel.error?.userMessage ?? "An unknown error occurred"),
                    dismissButton: .default(Text("OK"))
                )
            }
        }
        .onAppear {
            print("📱 HISTORY: View appeared")
            viewModel.updateAuthService(authService)
            viewModel.fetchHistoryJobs()
            
            // Listen for job status UI refresh notifications
            NotificationCenter.default.addObserver(
                forName: NSNotification.Name("ForceJobUIRefresh"),
                object: nil,
                queue: .main
            ) { notification in
                if let jobId = notification.userInfo?["jobId"] as? Int,
                   let status = notification.userInfo?["status"] as? String,
                   status == "delivered" {
                    print("📱 HISTORY: Received UI refresh notification for delivered job #\(jobId)")
                    viewModel.fetchHistoryJobs()
                }
            }
        }
        .onDisappear {
            // Remove observers when view disappears
            NotificationCenter.default.removeObserver(
                self,
                name: NSNotification.Name("ForceJobUIRefresh"),
                object: nil
            )
        }
    }
}

struct HistoryJobCard: View {
    let job: JobDTO
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with job ID and date
            HStack {
                Text("Job #\(job.id)")
                    .font(.headline)
                
                Spacer()
                
                Text(formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Status badge
            StatusBadge(status: job.status.rawValue)
            
            Divider()
            
            // Addresses
            VStack(alignment: .leading, spacing: 8) {
                // Pickup address
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pickup")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(job.pickupAddress)
                        .font(.subheadline)
                    Text("\(job.pickupCity), \(job.pickupPostalCode)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Delivery address
                VStack(alignment: .leading, spacing: 2) {
                    Text("Delivery")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(job.deliveryAddress)
                        .font(.subheadline)
                    Text("\(job.deliveryCity), \(job.deliveryPostalCode)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Shipment type and other details
            HStack {
                if let shipmentType = job.shipmentType {
                    Text(shipmentType.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }
                
                Spacer()
                
                // Add delivered date badge
                Text("Delivered")
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.mint.opacity(0.2))
                    .foregroundColor(.mint)
                    .cornerRadius(4)
                
                if let vehicleName = job.vehicleName {
                    Text(vehicleName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.leading, 4)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private var formattedDate: String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        if let date = dateFormatter.date(from: job.createdAt) {
            dateFormatter.dateStyle = .medium
            dateFormatter.timeStyle = .short
            return dateFormatter.string(from: date)
        }
        
        return job.createdAt
    }
}

struct EmptyHistoryView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("No Delivered Jobs")
                .font(.headline)
            
            Text("Jobs marked as delivered will appear here automatically")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Loading delivery history...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    HistoryView(apiClient: APIClient(authService: AuthService()))
        .environmentObject(AuthService())
} 