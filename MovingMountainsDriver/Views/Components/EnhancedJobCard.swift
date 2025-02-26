import SwiftUI

struct EnhancedJobCard: View {
    let job: Job
    let isAccepting: Bool
    let onAccept: () -> Void
    
    @State private var isPressed = false
    @State private var isHovered = false
    
    var body: some View {
        ZStack {
            // Background with elevation and depth
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(
                    gradient: Gradient(colors: [
                        Color("CardBackground"),
                        Color("CardBackground").opacity(0.95)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .shadow(color: Color.black.opacity(0.1), radius: isHovered ? 10 : 5, x: 0, y: isHovered ? 8 : 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.4), lineWidth: 1)
                        .blur(radius: 1)
                )
                .rotation3DEffect(
                    .degrees(isHovered ? 1 : 0),
                    axis: (x: 0.5, y: 1, z: 0)
                )
                .scaleEffect(isHovered ? 1.02 : 1)
                .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isHovered)
            
            // Content
            VStack(spacing: 0) {
                // Header with job ID and type
                HStack {
                    Text("Job #\(job.id)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Color("HeaderText"))
                    
                    Spacer()
                    
                    // Animated shine effect on the badge
                    ZStack {
                        Text(job.title)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(
                                Capsule()
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color("AccentColor").opacity(0.8),
                                            Color("AccentColor").opacity(0.6)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .overlay(
                                        ShineEffect()
                                            .opacity(isHovered ? 1 : 0)
                                    )
                            )
                            .foregroundColor(.white)
                    }
                }
                .padding(20)
                
                Divider()
                    .background(Color.white.opacity(0.1))
                    .padding(.horizontal, 20)
                
                // Animated route visualization
                VStack(spacing: 25) {
                    RouteVisualization(
                        pickup: job.address.components(separatedBy: ",").first ?? "Pickup",
                        delivery: job.address.components(separatedBy: ",").last ?? "Delivery",
                        isHovered: isHovered
                    )
                    .padding(.top, 15)
                }
                .padding(.horizontal, 20)
                
                // Job details with rich iconography
                HStack(spacing: 0) {
                    // Distance with pulsing effect
                    JobDetailItem(
                        icon: "location.fill",
                        value: "12.5 mi",
                        color: Color("BlueText"),
                        backgroundColor: Color("BlueBackground").opacity(0.2),
                        isPulsing: isHovered
                    )
                    
                    // Date with calendar animation
                    JobDetailItem(
                        icon: "calendar",
                        value: formatDate(job.scheduledDate),
                        color: Color("PurpleText"),
                        backgroundColor: Color("PurpleBackground").opacity(0.2),
                        isPulsing: false
                    )
                    
                    // Package type with 3D rotation
                    JobDetailItem(
                        icon: "shippingbox.fill",
                        value: "Standard",
                        color: Color("OrangeText"),
                        backgroundColor: Color("OrangeBackground").opacity(0.2),
                        is3D: isHovered
                    )
                }
                .padding(.top, 20)
                .padding(.horizontal, 20)
                
                // Quote amount with blur reveal animation
                HStack {
                    Spacer()
                    
                    // Price with glowing effect on hover
                    Text("$\(Int.random(in: 80...200))")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(Color("GreenText"))
                        .padding(.horizontal, 15)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color("GreenBackground").opacity(0.3))
                                .shadow(color: Color("GreenText").opacity(isHovered ? 0.3 : 0), radius: 8, x: 0, y: 0)
                        )
                }
                .padding(.top, 15)
                .padding(.horizontal, 20)
                
                // Accept button with loading animation
                Button(action: onAccept) {
                    ZStack {
                        // Button gradient background with intensity change
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color("GreenGradientStart"),
                                Color("GreenGradientEnd")
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .opacity(isAccepting ? 0.8 : 1)
                        
                        HStack {
                            if isAccepting {
                                // Custom loading animation
                                LoadingIndicator(color: .white)
                                    .frame(width: 24, height: 24)
                                
                                Text("Accepting...")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            } else {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.trailing, 8)
                                
                                Text("Accept Job")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            }
                        }
                        .padding(.vertical, 15)
                    }
                    .frame(maxWidth: .infinity)
                    .cornerRadius(16)
                    .padding(.top, 20)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                .buttonStyle(SpringyButtonStyle())
                .disabled(isAccepting)
            }
        }
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isHovered.toggle()
            }
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// Shine effect for badges
struct ShineEffect: View {
    @State private var animation = false
    
    var body: some View {
        GeometryReader { geometry in
            Rectangle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .white.opacity(0.8), location: 0.45),
                            .init(color: .white.opacity(0.8), location: 0.55),
                            .init(color: .clear, location: 1)
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .mask(Rectangle())
                .offset(x: self.animation ? geometry.size.width : -geometry.size.width)
                .animation(
                    Animation.easeInOut(duration: 1.5)
                        .delay(1)
                        .repeatForever(autoreverses: false),
                    value: animation
                )
                .onAppear {
                    self.animation = true
                }
        }
    }
}

// Route visualization with animation
struct RouteVisualization: View {
    let pickup: String
    let delivery: String
    let isHovered: Bool
    
    @State private var progress: CGFloat = 0
    @State private var truckOffset: CGFloat = 0
    
    var body: some View {
        HStack(spacing: 15) {
            // Pickup location with pulsing effect
            VStack(alignment: .leading, spacing: 4) {
                Circle()
                    .fill(Color("GreenText"))
                    .frame(width: 12, height: 12)
                    .overlay(
                        Circle()
                            .stroke(Color("GreenText").opacity(0.5), lineWidth: 2)
                            .scaleEffect(isHovered ? 1.5 : 1)
                            .opacity(isHovered ? 0 : 1)
                            .animation(
                                Animation.easeOut(duration: 1)
                                    .repeatForever(autoreverses: false),
                                value: isHovered
                            )
                    )
                
                Text("From")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(Color("SecondaryText"))
                
                Text(pickup)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(Color("PrimaryText"))
            }
            
            // Animated route line with truck
            ZStack(alignment: .center) {
                // Route line
                Rectangle()
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color("GreenText"),
                                Color("BlueText")
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 3)
                    .opacity(0.6)
                
                // Animated progress indicator
                HStack {
                    Rectangle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color("GreenText"),
                                    Color("BlueText")
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: isHovered ? .infinity : 0, height: 3)
                        .animation(.easeInOut(duration: 1.5), value: isHovered)
                    
                    Spacer(minLength: 0)
                }
                
                // Truck icon moving along the route
                Image(systemName: "truck.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color("PrimaryColor"))
                    .offset(x: isHovered ? 50 : -50, y: -12)
                    .animation(
                        Animation.easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: true),
                        value: isHovered
                    )
                    .rotationEffect(.degrees(180))
            }
            .frame(maxWidth: .infinity)
            
            // Delivery location
            VStack(alignment: .leading, spacing: 4) {
                Circle()
                    .fill(Color("BlueText"))
                    .frame(width: 12, height: 12)
                
                Text("To")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(Color("SecondaryText"))
                
                Text(delivery)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(Color("PrimaryText"))
            }
        }
    }
}

// Job detail item with rich visual effects
struct JobDetailItem: View {
    let icon: String
    let value: String
    let color: Color
    let backgroundColor: Color
    var isPulsing: Bool = false
    var is3D: Bool = false
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(backgroundColor)
                    .frame(width: 40, height: 40)
                
                if isPulsing {
                    // Pulsing effect
                    Circle()
                        .stroke(color.opacity(0.5), lineWidth: 2)
                        .frame(width: 40, height: 40)
                        .scaleEffect(isPulsing ? 1.5 : 1)
                        .opacity(isPulsing ? 0 : 1)
                        .animation(
                            Animation.easeOut(duration: 1)
                                .repeatForever(autoreverses: false),
                            value: isPulsing
                        )
                }
                
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(color)
                    .rotation3DEffect(
                        .degrees(is3D ? 10 : 0),
                        axis: (x: 0, y: 1, z: 0)
                    )
                    .animation(
                        Animation.easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true),
                        value: is3D
                    )
            }
            
            Text(value)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundColor(Color("SecondaryText"))
        }
        .frame(maxWidth: .infinity)
    }
}

// Springy button style with haptic feedback
struct SpringyButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// Loading indicator
struct LoadingIndicator: View {
    let color: Color
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            ForEach(0..<8) { index in
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                    .offset(y: -10)
                    .rotationEffect(.degrees(Double(index) * 45))
                    .opacity(isAnimating ? (Double(index) % 8.0) / 8.0 : 1.0)
            }
        }
        .onAppear {
            withAnimation(Animation.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

struct EnhancedJobCard_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            EnhancedJobCard(
                job: Job(
                    id: 12345,
                    title: "Office Relocation",
                    description: "Moving office furniture and equipment",
                    address: "123 Main St, San Francisco, CA 94105",
                    status: "pending",
                    assignedTo: 1,
                    clientName: "Acme Corp",
                    clientPhone: "5551234567",
                    scheduledDate: Date(),
                    estimatedDuration: 7200,
                    shipments: ["1", "2"],
                    createdAt: Date(),
                    updatedAt: Date()
                ),
                isAccepting: false,
                onAccept: {}
            )
            .padding()
        }
    }
} 