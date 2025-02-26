import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedTab = 0
    
    // Animation states
    @State private var isHeaderVisible = false
    @State private var isStatsVisible = false
    @State private var isActiveJobVisible = false
    @State private var isMapVisible = false
    @State private var isAvailableJobsVisible = false
    
    // For pull to refresh
    @State private var refreshOffset: CGFloat = 0
    @State private var isRefreshing = false
    
    // Weather animation states
    @State private var isDayTime = true
    @State private var isRaining = false
    @State private var isSnowing = false
    @State private var weatherIcon: String = "sun.max.fill"
    
    var body: some View {
        ZStack {
            // Background with subtle pattern and weather effects
            GeometryReader { geo in
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            isDayTime ? Color("DayGradientStart") : Color("NightGradientStart"),
                            isDayTime ? Color("DayGradientEnd") : Color("NightGradientEnd")
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .edgesIgnoringSafeArea(.all)
                    
                    // Weather overlay effects
                    if isRaining {
                        RainEffect()
                            .opacity(0.7)
                    }
                    
                    if isSnowing {
                        SnowEffect()
                            .opacity(0.7)
                    }
                }
            }
            
            // Main content
            ScrollView {
                // Pull to refresh indicator
                ZStack(alignment: .center) {
                    if refreshOffset > 50 || isRefreshing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.3)
                            .frame(width: 40, height: 40)
                            .offset(y: -50)
                    }
                }
                
                VStack(spacing: 0) {
                    // Header with dashboard title and weather
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Dashboard")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            
                            Text("Welcome back, \(viewModel.driverName)")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundColor(.white.opacity(0.8))
                        }
                        
                        Spacer()
                        
                        // Weather widget
                        ZStack {
                            RoundedRectangle(cornerRadius: 15)
                                .fill(Color.white.opacity(0.15))
                                .frame(width: 50, height: 50)
                                .blur(radius: 1)
                            
                            Image(systemName: weatherIcon)
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                        }
                        .onTapGesture {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                                weatherIcon = ["sun.max.fill", "cloud.sun.fill", "cloud.fill", "cloud.rain.fill", "cloud.snow.fill"].randomElement()!
                                isDayTime.toggle()
                                isRaining = weatherIcon == "cloud.rain.fill"
                                isSnowing = weatherIcon == "cloud.snow.fill"
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 15)
                    .opacity(isHeaderVisible ? 1 : 0)
                    .offset(y: isHeaderVisible ? 0 : -30)
                    .onAppear {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.1)) {
                            isHeaderVisible = true
                        }
                    }
                    
                    // Stats cards
                    HStack(spacing: 15) {
                        // Deliveries stat
                        StatCard(
                            icon: "shippingbox.fill",
                            title: "Deliveries",
                            value: "\(viewModel.stats.deliveries.total)",
                            trend: "+6% this week",
                            trendPositive: true,
                            gradientColors: [Color("OrangeGradientStart"), Color("OrangeGradientEnd")]
                        )
                        
                        // Earnings stat
                        StatCard(
                            icon: "dollarsign.circle.fill",
                            title: "Earnings",
                            value: "$\(viewModel.earnings.week)",
                            trend: "+12% this week",
                            trendPositive: true,
                            gradientColors: [Color("GreenGradientStart"), Color("GreenGradientEnd")]
                        )
                    }
                    .padding(.horizontal, 20)
                    .opacity(isStatsVisible ? 1 : 0)
                    .offset(y: isStatsVisible ? 0 : 30)
                    .onAppear {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2)) {
                            isStatsVisible = true
                        }
                    }
                    
                    // Active job section
                    VStack(spacing: 15) {
                        // Section header
                        HStack {
                            Text("Active Job")
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Text(viewModel.activeJob != nil ? "In progress" : "No active job")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(viewModel.activeJob != nil ? Color("GreenText") : Color("SecondaryText"))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(viewModel.activeJob != nil ? Color("GreenBackground").opacity(0.3) : Color.white.opacity(0.1))
                                )
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 25)
                        
                        // Active job card or empty state
                        if let activeJob = viewModel.activeJob {
                            EnhancedActiveJobCard(
                                job: activeJob,
                                onViewDetails: { viewModel.navigateToJobDetails(activeJob.id) },
                                onUpdateStatus: { viewModel.navigateToUpdateStatus(activeJob.id) }
                            )
                            .padding(.horizontal, 20)
                        } else {
                            // Empty state with hover animation
                            EmptyStateView(
                                icon: "truck.fill",
                                title: "No Active Job",
                                message: "You don't have any active jobs. Accept a job from the available jobs below."
                            )
                            .padding(.horizontal, 20)
                        }
                    }
                    .opacity(isActiveJobVisible ? 1 : 0)
                    .offset(y: isActiveJobVisible ? 0 : 30)
                    .onAppear {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.3)) {
                            isActiveJobVisible = true
                        }
                    }
                    
                    // Map section
                    VStack(spacing: 15) {
                        // Section header
                        HStack {
                            Text("Route Map")
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Button(action: {
                                withAnimation {
                                    viewModel.centerMapOnUserLocation()
                                }
                            }) {
                                Image(systemName: "location.fill")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white)
                                    .padding(10)
                                    .background(
                                        Circle()
                                            .fill(Color("PrimaryColor"))
                                    )
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        
                        // Enhanced map view
                        EnhancedMapView(
                            activeJob: viewModel.activeJob,
                            availableJobs: viewModel.availableJobs,
                            userLocation: viewModel.userLocation,
                            selectedJobId: $viewModel.selectedJobId
                        )
                        .frame(height: 300)
                        .cornerRadius(20)
                        .padding(.horizontal, 20)
                        .shadow(color: Color.black.opacity(0.2), radius: 15, x: 0, y: 5)
                    }
                    .opacity(isMapVisible ? 1 : 0)
                    .offset(y: isMapVisible ? 0 : 30)
                    .onAppear {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.4)) {
                            isMapVisible = true
                        }
                    }
                    
                    // Available jobs section
                    VStack(spacing: 15) {
                        // Section header with animation
                        HStack {
                            Text("Available Jobs")
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Text("\(viewModel.availableJobs.count) jobs")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(Color("PrimaryColor"))
                                        .opacity(viewModel.availableJobs.isEmpty ? 0.5 : 1)
                                )
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 25)
                        
                        if viewModel.availableJobs.isEmpty {
                            // Empty state
                            EmptyStateView(
                                icon: "magnifyingglass",
                                title: "No Available Jobs",
                                message: "No jobs available at the moment. Check back soon!"
                            )
                            .padding(.horizontal, 20)
                        } else {
                            // Jobs carousel
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(viewModel.availableJobs) { job in
                                        EnhancedJobCard(
                                            job: job,
                                            isAccepting: viewModel.acceptingJobId == job.id,
                                            onAccept: { 
                                                viewModel.acceptJob(job.id)
                                                hapticFeedback(.medium)
                                            }
                                        )
                                        .frame(width: 300)
                                        .shadow(color: Color.black.opacity(0.15), radius: 15, x: 0, y: 5)
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            withAnimation {
                                                viewModel.selectedJobId = job.id
                                            }
                                            hapticFeedback(.light)
                                        }
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.bottom, 20)
                            }
                            .scrollIndicators(.hidden)
                        }
                    }
                    .opacity(isAvailableJobsVisible ? 1 : 0)
                    .offset(y: isAvailableJobsVisible ? 0 : 30)
                    .onAppear {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.5)) {
                            isAvailableJobsVisible = true
                        }
                    }
                    
                    // Bottom spacer
                    Spacer(minLength: 100)
                }
                .background(GeometryReader { geo -> Color in
                    DispatchQueue.main.async {
                        refreshOffset = geo.frame(in: .global).minY
                        
                        if refreshOffset > 70 && !isRefreshing {
                            isRefreshing = true
                            hapticFeedback(.medium)
                            
                            Task {
                                await viewModel.refreshData()
                                withAnimation {
                                    isRefreshing = false
                                }
                            }
                        }
                    }
                    return Color.clear
                })
            }
        }
        // Floating action button for quick access
        .overlay(
            FloatingActionButton(items: [
                FABItem(icon: "plus", color: Color("PrimaryColor"), action: { viewModel.showNewJobAlert = true }),
                FABItem(icon: "bell.fill", color: Color("OrangeGradientEnd"), action: { viewModel.showNotifications = true }),
                FABItem(icon: "arrow.clockwise", color: Color("GreenGradientEnd"), action: { 
                    Task { 
                        hapticFeedback(.medium)
                        await viewModel.refreshData() 
                    }
                })
            ])
            .padding(.trailing, 20)
            .padding(.bottom, 80),
            alignment: .bottomTrailing
        )
        .overlay(
            // Loading overlay
            Group {
                if viewModel.isLoading {
                    ZStack {
                        Color.black.opacity(0.4)
                            .edgesIgnoringSafeArea(.all)
                        
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 120, height: 120)
                            .blur(radius: 1)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(Color("CardBackground").opacity(0.6))
                                    .frame(width: 120, height: 120)
                                    .blur(radius: 2)
                            )
                        
                        VStack(spacing: 10) {
                            LottieAnimationView(name: "truck-loading", loopMode: .loop)
                                .frame(width: 80, height: 80)
                            
                            Text("Loading...")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(.white)
                        }
                    }
                    .transition(.opacity)
                }
            }
        )
        .alert(isPresented: $viewModel.showError) {
            Alert(
                title: Text("Error"),
                message: Text(viewModel.errorMessage ?? "An unknown error occurred"),
                dismissButton: .default(Text("OK"))
            )
        }
        .onAppear {
            // Change weather based on time of day
            let hour = Calendar.current.component(.hour, from: Date())
            isDayTime = hour >= 6 && hour <= 18
            
            if !isDayTime {
                weatherIcon = "moon.stars.fill"
            }
            
            viewModel.fetchData()
        }
    }
    
    // Provide haptic feedback
    func hapticFeedback(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
}

// Enhanced Job Card with rich animations and interactions
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
                        Text(job.shipment?.shipmentType ?? "Standard")
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
                    .background(Color("DividerColor"))
                    .padding(.horizontal, 20)
                
                // Animated route visualization
                VStack(spacing: 25) {
                    RouteVisualization(
                        pickup: job.shipment?.pickupCity ?? "Pickup",
                        delivery: job.shipment?.deliveryCity ?? "Delivery",
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
                        backgroundColor: Color("BlueBackground"),
                        isPulsing: isHovered
                    )
                    
                    // Date with calendar animation
                    JobDetailItem(
                        icon: "calendar",
                        value: formatDate(job.shipment?.createdAt),
                        color: Color("PurpleText"),
                        backgroundColor: Color("PurpleBackground"),
                        isPulsing: false
                    )
                    
                    // Package type with 3D rotation
                    JobDetailItem(
                        icon: "shippingbox.fill",
                        value: job.shipment?.shipmentType ?? "Standard",
                        color: Color("OrangeText"),
                        backgroundColor: Color("OrangeBackground"),
                        is3D: isHovered
                    )
                }
                .padding(.top, 20)
                .padding(.horizontal, 20)
                
                // Quote amount with blur reveal animation
                HStack {
                    Spacer()
                    
                    // Price with glowing effect on hover
                    Text("$\(job.shipment?.quoteAmount?.description ?? "0.00")")
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
    
    private func formatDate(_ date: Date?) -> String {
        guard let date = date else { return "Today" }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
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

// Rain effect
struct RainEffect: View {
    let raindrops = 100
    
    var body: some View {
        ZStack {
            ForEach(0..<raindrops, id: \.self) { i in
                RainDrop(size: .random(in: 2...6), speed: .random(in: 0.7...1.5))
                    .offset(x: .random(in: -UIScreen.main.bounds.width/2...UIScreen.main.bounds.width/2), 
                            y: .random(in: -100...UIScreen.main.bounds.height))
            }
        }
    }
}

struct RainDrop: View {
    let size: CGFloat
    let speed: Double
    
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .fill(Color.white.opacity(0.2))
            .frame(width: size, height: size * 4)
            .offset(y: isAnimating ? UIScreen.main.bounds.height + 100 : -100)
            .animation(
                Animation.linear(duration: speed * 5)
                    .repeatForever(autoreverses: false)
                    .delay(.random(in: 0...3)),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

// Snow effect
struct SnowEffect: View {
    let snowflakes = 100
    
    var body: some View {
        ZStack {
            ForEach(0..<snowflakes, id: \.self) { i in
                Snowflake(size: .random(in: 3...8), speed: .random(in: 2...8))
                    .offset(x: .random(in: -UIScreen.main.bounds.width/2...UIScreen.main.bounds.width/2), 
                            y: .random(in: -100...UIScreen.main.bounds.height))
            }
        }
    }
}

struct Snowflake: View {
    let size: CGFloat
    let speed: Double
    
    @State private var isAnimating = false
    @State private var rotation = 0.0
    
    var body: some View {
        Image(systemName: "snowflake")
            .font(.system(size: size))
            .foregroundColor(.white.opacity(0.8))
            .rotationEffect(.degrees(rotation))
            .offset(y: isAnimating ? UIScreen.main.bounds.height + 100 : -100)
            .animation(
                Animation.linear(duration: speed)
                    .repeatForever(autoreverses: false)
                    .delay(.random(in: 0...3)),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
                withAnimation(Animation.linear(duration: 2).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
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

// Scale button style
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
} 