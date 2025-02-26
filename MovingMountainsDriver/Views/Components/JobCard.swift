import SwiftUI

struct JobCard: View {
    let job: Job
    var onTap: (Job) -> Void
    
    var body: some View {
        Button(action: {
            onTap(job)
        }) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading) {
                        Text(job.title)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text(job.clientName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    StatusBadge(status: job.status)
                }
                
                HStack(alignment: .top) {
                    Image(systemName: "location.fill")
                        .foregroundColor(.blue)
                        .frame(width: 20)
                    
                    Text(job.address)
                        .font(.callout)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                    
                    Spacer()
                }
                
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                        .frame(width: 20)
                    
                    Text(job.scheduledDate.formattedString())
                        .font(.callout)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Text("\(Int(job.estimatedDuration / 60)) min")
                        .font(.callout)
                        .foregroundColor(.secondary)
                }
                
                if !job.shipments.isEmpty {
                    HStack {
                        Image(systemName: "cube.box.fill")
                            .foregroundColor(.blue)
                            .frame(width: 20)
                        
                        Text("\(job.shipments.count) shipment\(job.shipments.count > 1 ? "s" : "")")
                            .font(.callout)
                            .foregroundColor(.primary)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
        }
    }
}

struct StatusBadge: View {
    let status: Job.JobStatus
    
    var body: some View {
        Text(statusTitle)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }
    
    var statusTitle: String {
        switch status {
        case .pending:
            return "Pending"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        }
    }
    
    var statusColor: Color {
        switch status {
        case .pending:
            return .orange
        case .inProgress:
            return .blue
        case .completed:
            return .green
        case .cancelled:
            return .red
        }
    }
}

struct JobCard_Previews: PreviewProvider {
    static var previews: some View {
        let sampleJob = Job(
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
        
        return VStack {
            JobCard(job: sampleJob) { _ in }
                .padding()
            
            JobCard(job: Job(
                id: "2",
                title: "Home Moving",
                description: "Move household items to new home",
                address: "456 Residential St, Oakland, CA 94612",
                status: .pending,
                assignedTo: "driver-123",
                clientName: "John Smith",
                clientPhone: "(555) 987-6543",
                scheduledDate: Date().addingTimeInterval(86400), // tomorrow
                estimatedDuration: 7200, // 2 hours in seconds
                shipments: ["ship-3"]
            )) { _ in }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
    }
} 