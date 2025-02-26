import SwiftUI

struct JobHistoryView: View {
    @StateObject private var viewModel = JobHistoryViewModel()
    @State private var searchText = ""
    @State private var showFilters = false
    @State private var filterStatus: Job.JobStatus? = nil
    @State private var dateFilterRange: DateFilterRange = .lastMonth
    
    enum DateFilterRange: String, CaseIterable, Identifiable {
        case today = "Today"
        case lastWeek = "Last Week"
        case lastMonth = "Last Month"
        case last3Months = "Last 3 Months"
        case custom = "Custom Range"
        
        var id: String { rawValue }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Job History")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Button(action: {
                    showFilters.toggle()
                }) {
                    HStack {
                        Image(systemName: "line.3.horizontal.decrease.circle\(showFilters ? ".fill" : "")")
                        Text("Filter")
                    }
                    .foregroundColor(.blue)
                }
            }
            .padding()
            
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search by client, title or address", text: $searchText)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .padding(.horizontal)
            
            // Filters section (expandable)
            if showFilters {
                VStack(spacing: 16) {
                    // Status filter
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Status")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            statusFilterButton(status: nil, label: "All")
                            statusFilterButton(status: .completed, label: "Completed")
                            statusFilterButton(status: .cancelled, label: "Cancelled")
                        }
                    }
                    
                    // Date range filter
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Date Range")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Picker("Date Range", selection: $dateFilterRange) {
                            ForEach(DateFilterRange.allCases) { range in
                                Text(range.rawValue).tag(range)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    
                    // Apply filters button
                    Button(action: {
                        viewModel.applyFilters(
                            status: filterStatus,
                            dateRange: dateFilterRange,
                            searchText: searchText
                        )
                    }) {
                        Text("Apply Filters")
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .transition(.move(edge: .top))
                .animation(.easeInOut, value: showFilters)
            }
            
            // Job history list
            if viewModel.isLoading {
                loadingView
            } else if viewModel.filteredJobs.isEmpty {
                emptyStateView
            } else {
                jobListView
            }
        }
        .onAppear {
            viewModel.loadJobHistory()
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .scaleEffect(1.5)
            
            Text("Loading job history...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))
            
            Text("No jobs found")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Try adjusting your filters")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Button("Clear Filters") {
                searchText = ""
                filterStatus = nil
                dateFilterRange = .lastMonth
                viewModel.clearFilters()
            }
            .foregroundColor(.blue)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .background(Color(.systemBackground))
    }
    
    private var jobListView: some View {
        List {
            ForEach(groupedJobs.keys.sorted(by: >), id: \.self) { date in
                Section(header: Text(formatSectionDate(date))) {
                    ForEach(groupedJobs[date] ?? []) { job in
                        JobHistoryRow(job: job)
                            .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }
    
    private func statusFilterButton(status: Job.JobStatus?, label: String) -> some View {
        Button(action: {
            filterStatus = status
        }) {
            Text(label)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(filterStatus == status ? Color.blue : Color(.systemGray6))
                .foregroundColor(filterStatus == status ? .white : .primary)
                .cornerRadius(20)
        }
    }
    
    private var groupedJobs: [Date: [Job]] {
        Dictionary(grouping: viewModel.filteredJobs) { job in
            // Group by day
            Calendar.current.startOfDay(for: job.scheduledDate)
        }
    }
    
    private func formatSectionDate(_ date: Date) -> String {
        if date.isToday {
            return "Today"
        } else if date.isYesterday {
            return "Yesterday"
        } else {
            return date.formattedString(format: "EEEE, MMM d, yyyy")
        }
    }
}

struct JobHistoryRow: View {
    let job: Job
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(job.title)
                        .font(.headline)
                    
                    Text(job.clientName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                StatusBadge(status: job.status)
            }
            
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.blue)
                
                Text(job.scheduledDate.formattedString(format: "h:mm a"))
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(job.scheduledDate.timeAgo())
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .contentShape(Rectangle())
    }
}

// This ViewModel would be properly implemented in a real app
class JobHistoryViewModel: ObservableObject {
    @Published var allJobs: [Job] = []
    @Published var filteredJobs: [Job] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    
    func loadJobHistory() {
        isLoading = true
        
        // In a real app, fetch from API
        // Simulating network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.allJobs = self.generateSampleJobs()
            self.filteredJobs = self.allJobs
            self.isLoading = false
        }
    }
    
    func applyFilters(status: Job.JobStatus?, dateRange: JobHistoryView.DateFilterRange, searchText: String) {
        isLoading = true
        
        // Filter by status
        var filtered = allJobs
        if let status = status {
            filtered = filtered.filter { $0.status == status }
        }
        
        // Filter by date range
        let calendar = Calendar.current
        let now = Date()
        let startDate: Date
        
        switch dateRange {
        case .today:
            startDate = calendar.startOfDay(for: now)
        case .lastWeek:
            startDate = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        case .lastMonth:
            startDate = calendar.date(byAdding: .month, value: -1, to: now) ?? now
        case .last3Months:
            startDate = calendar.date(byAdding: .month, value: -3, to: now) ?? now
        case .custom:
            // In a real app, we would have UI for custom date selection
            startDate = calendar.date(byAdding: .month, value: -6, to: now) ?? now
        }
        
        filtered = filtered.filter { $0.scheduledDate >= startDate }
        
        // Filter by search text
        if !searchText.isEmpty {
            let lowercasedSearch = searchText.lowercased()
            filtered = filtered.filter {
                $0.title.lowercased().contains(lowercasedSearch) ||
                $0.clientName.lowercased().contains(lowercasedSearch) ||
                $0.address.lowercased().contains(lowercasedSearch)
            }
        }
        
        // Apply filters
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.filteredJobs = filtered
            self.isLoading = false
        }
    }
    
    func clearFilters() {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.filteredJobs = self.allJobs
            self.isLoading = false
        }
    }
    
    private func generateSampleJobs() -> [Job] {
        let now = Date()
        let calendar = Calendar.current
        
        let titles = ["Office Move", "Home Relocation", "Furniture Delivery", "Equipment Transport", "Store Inventory Move"]
        let clients = ["Acme Corp", "Johnson Family", "Tech Solutions Inc", "Main Street Cafe", "Smith Contractors"]
        let addresses = [
            "123 Business Park, San Francisco, CA",
            "456 Residential Lane, Oakland, CA",
            "789 Commercial Ave, Palo Alto, CA",
            "321 Main Street, San Jose, CA",
            "654 Industrial Blvd, Fremont, CA"
        ]
        
        var jobs: [Job] = []
        
        for i in 0..<20 {
            let daysAgo = Int.random(in: 0...60)
            let scheduledDate = calendar.date(byAdding: .day, value: -daysAgo, to: now) ?? now
            
            let status: Job.JobStatus
            if daysAgo > 30 {
                status = [Job.JobStatus.completed, Job.JobStatus.cancelled].randomElement() ?? .completed
            } else if daysAgo > 7 {
                status = [Job.JobStatus.completed, Job.JobStatus.cancelled, Job.JobStatus.inProgress].randomElement() ?? .completed
            } else {
                status = Job.JobStatus.allCases.randomElement() ?? .pending
            }
            
            let job = Job(
                id: "hist-\(i)",
                title: titles[i % titles.count],
                description: "Sample job description #\(i)",
                address: addresses[i % addresses.count],
                status: status,
                assignedTo: "driver-123",
                clientName: clients[i % clients.count],
                clientPhone: "(555) \(100 + i)-\(1000 + i)",
                scheduledDate: scheduledDate,
                estimatedDuration: Double(Int.random(in: 30...180) * 60), // 30-180 minutes in seconds
                shipments: (0..<Int.random(in: 1...3)).map { _ in "ship-\(Int.random(in: 100...999))" }
            )
            
            jobs.append(job)
        }
        
        return jobs
    }
}

struct JobHistoryView_Previews: PreviewProvider {
    static var previews: some View {
        JobHistoryView()
    }
} 