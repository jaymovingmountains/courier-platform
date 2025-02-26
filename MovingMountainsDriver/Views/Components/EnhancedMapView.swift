import SwiftUI
import MapKit

struct EnhancedMapView: View {
    let activeJob: Job?
    let availableJobs: [Job]
    let userLocation: CLLocationCoordinate2D
    @Binding var selectedJobId: Int?
    
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    
    @State private var isAnimating = false
    @State private var showRoute = false
    
    var body: some View {
        ZStack {
            // Map view
            Map(coordinateRegion: $region, showsUserLocation: true, annotationItems: mapAnnotations()) { annotation in
                MapAnnotation(coordinate: annotation.coordinate) {
                    JobAnnotation(
                        job: annotation.job,
                        isActive: annotation.isActive,
                        isSelected: selectedJobId == annotation.job.id,
                        onTap: {
                            withAnimation {
                                selectedJobId = annotation.job.id
                            }
                        }
                    )
                }
            }
            
            // Map controls
            VStack {
                HStack {
                    Spacer()
                    
                    VStack(spacing: 12) {
                        // Zoom in button
                        Button(action: {
                            withAnimation {
                                region.span.latitudeDelta *= 0.8
                                region.span.longitudeDelta *= 0.8
                            }
                        }) {
                            Image(systemName: "plus")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 40, height: 40)
                                .background(
                                    Circle()
                                        .fill(Color("PrimaryColor").opacity(0.8))
                                        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
                                )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        
                        // Zoom out button
                        Button(action: {
                            withAnimation {
                                region.span.latitudeDelta /= 0.8
                                region.span.longitudeDelta /= 0.8
                            }
                        }) {
                            Image(systemName: "minus")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 40, height: 40)
                                .background(
                                    Circle()
                                        .fill(Color("PrimaryColor").opacity(0.8))
                                        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
                                )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        
                        // Center on user button
                        Button(action: {
                            withAnimation {
                                region.center = userLocation
                            }
                        }) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 40, height: 40)
                                .background(
                                    Circle()
                                        .fill(Color("BlueText"))
                                        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
                                )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        
                        // Show/hide route button
                        if activeJob != nil {
                            Button(action: {
                                withAnimation {
                                    showRoute.toggle()
                                }
                            }) {
                                Image(systemName: showRoute ? "map.fill" : "map")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 40, height: 40)
                                    .background(
                                        Circle()
                                            .fill(showRoute ? Color("GreenText") : Color("PrimaryColor").opacity(0.8))
                                            .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
                                    )
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.black.opacity(0.2))
                            .blur(radius: 1)
                    )
                    .padding(.trailing, 16)
                    .padding(.top, 16)
                }
                
                Spacer()
            }
        }
        .onAppear {
            // Center map on user location initially
            region.center = userLocation
            
            // If there's an active job, adjust the region to show it
            if let activeJob = activeJob {
                // In a real app, we would geocode the address to get coordinates
                // For now, we'll just use a random location near the user
                let jobLocation = CLLocationCoordinate2D(
                    latitude: userLocation.latitude + Double.random(in: -0.02...0.02),
                    longitude: userLocation.longitude + Double.random(in: -0.02...0.02)
                )
                
                // Calculate the center point between user and job
                let centerLatitude = (userLocation.latitude + jobLocation.latitude) / 2
                let centerLongitude = (userLocation.longitude + jobLocation.longitude) / 2
                
                // Calculate the span to include both points
                let latDelta = abs(userLocation.latitude - jobLocation.latitude) * 2.5
                let lonDelta = abs(userLocation.longitude - jobLocation.longitude) * 2.5
                
                withAnimation {
                    region = MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: centerLatitude, longitude: centerLongitude),
                        span: MKCoordinateSpan(latitudeDelta: max(0.02, latDelta), longitudeDelta: max(0.02, lonDelta))
                    )
                }
            }
        }
        .onChange(of: selectedJobId) { newValue in
            if let jobId = newValue, let job = findJob(id: jobId) {
                // In a real app, we would geocode the address to get coordinates
                // For now, we'll just use a random location near the user
                let jobLocation = CLLocationCoordinate2D(
                    latitude: userLocation.latitude + Double.random(in: -0.02...0.02),
                    longitude: userLocation.longitude + Double.random(in: -0.02...0.02)
                )
                
                withAnimation {
                    region.center = jobLocation
                    region.span = MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                }
            }
        }
    }
    
    private func findJob(id: Int) -> Job? {
        if let activeJob = activeJob, activeJob.id == id {
            return activeJob
        }
        return availableJobs.first { $0.id == id }
    }
    
    private func mapAnnotations() -> [JobAnnotationItem] {
        var annotations: [JobAnnotationItem] = []
        
        // Add active job annotation
        if let activeJob = activeJob {
            // In a real app, we would geocode the address to get coordinates
            // For now, we'll just use a random location near the user
            let jobLocation = CLLocationCoordinate2D(
                latitude: userLocation.latitude + Double.random(in: -0.02...0.02),
                longitude: userLocation.longitude + Double.random(in: -0.02...0.02)
            )
            
            annotations.append(JobAnnotationItem(
                id: "active-\(activeJob.id)",
                job: activeJob,
                coordinate: jobLocation,
                isActive: true
            ))
        }
        
        // Add available job annotations
        for job in availableJobs {
            // In a real app, we would geocode the address to get coordinates
            // For now, we'll just use random locations near the user
            let jobLocation = CLLocationCoordinate2D(
                latitude: userLocation.latitude + Double.random(in: -0.05...0.05),
                longitude: userLocation.longitude + Double.random(in: -0.05...0.05)
            )
            
            annotations.append(JobAnnotationItem(
                id: "available-\(job.id)",
                job: job,
                coordinate: jobLocation,
                isActive: false
            ))
        }
        
        return annotations
    }
}

// Job annotation item for the map
struct JobAnnotationItem: Identifiable {
    let id: String
    let job: Job
    let coordinate: CLLocationCoordinate2D
    let isActive: Bool
}

// Custom job annotation view
struct JobAnnotation: View {
    let job: Job
    let isActive: Bool
    let isSelected: Bool
    let onTap: () -> Void
    
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Pulsing circle for active jobs
            if isActive {
                Circle()
                    .fill(Color("BlueText").opacity(0.3))
                    .frame(width: isAnimating ? 60 : 40, height: isAnimating ? 60 : 40)
                    .opacity(isAnimating ? 0 : 0.6)
                    .animation(
                        Animation.easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: false),
                        value: isAnimating
                    )
            }
            
            // Main pin
            VStack(spacing: 0) {
                ZStack {
                    // Pin background
                    Circle()
                        .fill(isActive ? Color("BlueText") : Color("OrangeText"))
                        .frame(width: isSelected ? 44 : 36, height: isSelected ? 44 : 36)
                        .shadow(color: (isActive ? Color("BlueText") : Color("OrangeText")).opacity(0.4), radius: 5, x: 0, y: 3)
                    
                    // Pin icon
                    Image(systemName: isActive ? "shippingbox.fill" : "mappin.circle.fill")
                        .font(.system(size: isSelected ? 22 : 18, weight: .bold))
                        .foregroundColor(.white)
                }
                
                // Pin triangle
                if isSelected {
                    Image(systemName: "arrowtriangle.down.fill")
                        .font(.system(size: 16))
                        .foregroundColor(isActive ? Color("BlueText") : Color("OrangeText"))
                        .offset(y: -6)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
        }
        .onTapGesture {
            onTap()
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct EnhancedMapView_Previews: PreviewProvider {
    static var previews: some View {
        EnhancedMapView(
            activeJob: Job(
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
            availableJobs: [
                Job(
                    id: 12346,
                    title: "Home Moving",
                    description: "Moving household items",
                    address: "456 Oak St, San Francisco, CA 94102",
                    status: "pending",
                    assignedTo: 1,
                    clientName: "John Smith",
                    clientPhone: "5559876543",
                    scheduledDate: Date(),
                    estimatedDuration: 5400,
                    shipments: ["3"],
                    createdAt: Date(),
                    updatedAt: Date()
                )
            ],
            userLocation: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            selectedJobId: .constant(nil)
        )
        .frame(height: 400)
    }
} 