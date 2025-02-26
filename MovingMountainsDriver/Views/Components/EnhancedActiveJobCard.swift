import SwiftUI

struct EnhancedActiveJobCard: View {
    let job: Job
    let onViewDetails: () -> Void
    let onUpdateStatus: () -> Void
    
    @State private var isAnimating = false
    @State private var progressValue: Double = 0
    
    var body: some View {
        ZStack {
            // Background with glass effect
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white.opacity(0.1),
                        Color.white.opacity(0.05)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
            
            // Content
            VStack(spacing: 0) {
                // Header with job ID and status
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Job #\(job.id)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(Color.white)
                        
                        Text(job.title)
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.7))
                    }
                    
                    Spacer()
                    
                    // Status badge with pulsing animation
                    Text(job.status.capitalized)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Color("BlueText"))
                                .shadow(color: Color("BlueText").opacity(0.5), radius: 5, x: 0, y: 2)
                                .overlay(
                                    Capsule()
                                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                )
                        )
                        .scaleEffect(isAnimating ? 1.05 : 1)
                        .animation(
                            Animation.easeInOut(duration: 1.5)
                                .repeatForever(autoreverses: true),
                            value: isAnimating
                        )
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 15)
                
                // Progress bar
                VStack(spacing: 8) {
                    // Progress bar
                    ZStack(alignment: .leading) {
                        // Background track
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 8)
                        
                        // Progress fill with gradient
                        RoundedRectangle(cornerRadius: 4)
                            .fill(LinearGradient(
                                gradient: Gradient(colors: [
                                    Color("GreenGradientStart"),
                                    Color("GreenGradientEnd")
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            ))
                            .frame(width: isAnimating ? max(20, UIScreen.main.bounds.width * 0.7 * progressValue) : 0, height: 8)
                            .animation(.easeInOut(duration: 1.0), value: isAnimating)
                    }
                    
                    // Progress labels
                    HStack {
                        Text("In Progress")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        Spacer()
                        
                        Text("\(Int(progressValue * 100))%")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundColor(Color.white)
                    }
                }
                .padding(.horizontal, 20)
                
                // Location info
                HStack(spacing: 15) {
                    // From location
                    VStack(alignment: .leading, spacing: 4) {
                        Text("From")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        Text(job.address.components(separatedBy: ",").first ?? "")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Color.white)
                            .lineLimit(1)
                    }
                    
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.5))
                    
                    // To location
                    VStack(alignment: .leading, spacing: 4) {
                        Text("To")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        Text(job.address.components(separatedBy: ",").last ?? "")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Color.white)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    // Estimated time
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("ETA")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        Text(formatDuration(job.estimatedDuration))
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Color.white)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 15)
                
                // Client info
                HStack {
                    Image(systemName: "person.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color.white.opacity(0.7))
                        .frame(width: 20)
                    
                    Text(job.clientName)
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(Color.white)
                    
                    Spacer()
                    
                    Image(systemName: "phone.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color.white.opacity(0.7))
                        .frame(width: 20)
                    
                    Text(formatPhoneNumber(job.clientPhone))
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(Color.white)
                }
                .padding(.horizontal, 20)
                .padding(.top, 15)
                
                // Action buttons
                HStack(spacing: 15) {
                    // View details button
                    Button(action: onViewDetails) {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .font(.system(size: 14))
                            
                            Text("View Details")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.1))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                    
                    // Update status button
                    Button(action: onUpdateStatus) {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 14))
                            
                            Text("Update Status")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color("PrimaryColor"),
                                        Color("PrimaryColor").opacity(0.8)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ))
                                .shadow(color: Color("PrimaryColor").opacity(0.3), radius: 5, x: 0, y: 3)
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 20)
            }
        }
        .onAppear {
            // Calculate progress based on job status
            switch job.status.lowercased() {
            case "pending":
                progressValue = 0.1
            case "in_progress":
                progressValue = 0.5
            case "completed":
                progressValue = 1.0
            default:
                progressValue = 0.3
            }
            
            withAnimation {
                isAnimating = true
            }
        }
    }
    
    private func formatDuration(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
    
    private func formatPhoneNumber(_ phone: String) -> String {
        let cleaned = phone.filter { $0.isNumber }
        guard cleaned.count == 10 else { return phone }
        
        let areaCode = cleaned.prefix(3)
        let firstPart = cleaned.dropFirst(3).prefix(3)
        let lastPart = cleaned.dropFirst(6).prefix(4)
        
        return "(\(areaCode)) \(firstPart)-\(lastPart)"
    }
}

// Scale button style for interactive feedback
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct EnhancedActiveJobCard_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            EnhancedActiveJobCard(
                job: Job(
                    id: 12345,
                    title: "Office Relocation",
                    description: "Moving office furniture and equipment",
                    address: "123 Main St, San Francisco, CA 94105",
                    status: "in_progress",
                    assignedTo: 1,
                    clientName: "Acme Corp",
                    clientPhone: "5551234567",
                    scheduledDate: Date(),
                    estimatedDuration: 7200,
                    shipments: ["1", "2"],
                    createdAt: Date(),
                    updatedAt: Date()
                ),
                onViewDetails: {},
                onUpdateStatus: {}
            )
            .padding()
        }
    }
} 