import SwiftUI
import MapKit

class JobDetailsViewModel: ObservableObject {
    @Published var job: JobDTO?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var directions: MKDirections.Response?
    
    private let apiClient: APIClient
    private let jobId: Int
    
    init(apiClient: APIClient, jobId: Int) {
        self.apiClient = apiClient
        self.jobId = jobId
    }
    
    func fetchJobDetails() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let job: JobDTO = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)"
                )
                
                DispatchQueue.main.async {
                    self.job = job
                    self.calculateRoute()
                    self.isLoading = false
                }
            } catch let error as APIError {
                DispatchQueue.main.async {
                    self.errorMessage = error.message
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "An unexpected error occurred"
                    self.isLoading = false
                }
            }
        }
    }
    
    func calculateRoute() {
        guard let job = job else { return }
        
        let geocoder = CLGeocoder()
        
        // First, geocode the pickup address
        let pickupAddressString = "\(job.pickupAddress), \(job.pickupCity), \(job.pickupPostalCode)"
        geocoder.geocodeAddressString(pickupAddressString) { [weak self] pickupPlacemarks, pickupError in
            if let pickupError = pickupError {
                print("Pickup geocoding error: \(pickupError.localizedDescription)")
                return
            }
            
            guard let pickupPlacemark = pickupPlacemarks?.first,
                  let pickupLocation = pickupPlacemark.location else {
                print("No pickup location found")
                return
            }
            
            // Then, geocode the delivery address
            let deliveryAddressString = "\(job.deliveryAddress), \(job.deliveryCity), \(job.deliveryPostalCode)"
            geocoder.geocodeAddressString(deliveryAddressString) { [weak self] deliveryPlacemarks, deliveryError in
                if let deliveryError = deliveryError {
                    print("Delivery geocoding error: \(deliveryError.localizedDescription)")
                    return
                }
                
                guard let deliveryPlacemark = deliveryPlacemarks?.first,
                      let deliveryLocation = deliveryPlacemark.location else {
                    print("No delivery location found")
                    return
                }
                
                // Create the route request
                let request = MKDirections.Request()
                request.source = MKMapItem(placemark: MKPlacemark(coordinate: pickupLocation.coordinate))
                request.destination = MKMapItem(placemark: MKPlacemark(coordinate: deliveryLocation.coordinate))
                request.transportType = .automobile
                
                // Calculate the route
                let directions = MKDirections(request: request)
                directions.calculate { [weak self] response, error in
                    if let error = error {
                        print("Route calculation error: \(error.localizedDescription)")
                        return
                    }
                    
                    DispatchQueue.main.async {
                        self?.directions = response
                    }
                }
            }
        }
    }
    
    func updateJobStatus(to status: String) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let updateBody = ["status": status]
                let jsonData = try JSONSerialization.data(withJSONObject: updateBody)
                
                let updatedJob: JobDTO = try await apiClient.fetch(
                    endpoint: "\(APIConstants.jobsEndpoint)/\(jobId)/status",
                    method: "PUT",
                    body: jsonData
                )
                
                DispatchQueue.main.async {
                    self.job = updatedJob
                    self.isLoading = false
                }
            } catch let error as APIError {
                DispatchQueue.main.async {
                    self.errorMessage = error.message
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "An unexpected error occurred"
                    self.isLoading = false
                }
            }
        }
    }
}

struct JobDetailsView: View {
    @StateObject private var viewModel: JobDetailsViewModel
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    
    init(apiClient: APIClient, jobId: Int) {
        _viewModel = StateObject(wrappedValue: JobDetailsViewModel(apiClient: apiClient, jobId: jobId))
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Status section
                if let job = viewModel.job {
                    StatusBadgeView(status: job.status)
                    
                    // Map View
                    MapView(directions: viewModel.directions)
                        .frame(height: 250)
                        .cornerRadius(12)
                    
                    // Address section
                    AddressSection(job: job)
                    
                    // Vehicle section if available
                    if let vehicleName = job.vehicleName, let licensePlate = job.licensePlate {
                        VehicleInfoView(vehicleName: vehicleName, licensePlate: licensePlate)
                    }
                    
                    // Action buttons
                    ActionButtonsView(job: job, onStatusUpdate: { newStatus in
                        viewModel.updateJobStatus(to: newStatus)
                    })
                }
            }
            .padding()
        }
        .navigationTitle("Job #\(viewModel.job?.id ?? 0)")
        .overlay(
            Group {
                if viewModel.isLoading {
                    LoadingView()
                }
            }
        )
        .alert(isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Alert(
                title: Text("Error"),
                message: Text(viewModel.errorMessage ?? "Unknown error"),
                dismissButton: .default(Text("OK"))
            )
        }
        .onAppear {
            viewModel.fetchJobDetails()
        }
    }
}

// Helper Components

struct StatusBadgeView: View {
    let status: String
    
    var statusColor: Color {
        switch status {
        case "pending": return .yellow
        case "accepted": return .blue
        case "in_progress": return .orange
        case "completed": return .green
        case "cancelled": return .red
        default: return .gray
        }
    }
    
    var statusText: String {
        switch status {
        case "pending": return "Pending"
        case "accepted": return "Accepted"
        case "in_progress": return "In Progress"
        case "completed": return "Completed"
        case "cancelled": return "Cancelled"
        default: return status.capitalized
        }
    }
    
    var body: some View {
        Text(statusText)
            .font(.subheadline)
            .fontWeight(.medium)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(8)
    }
}

struct AddressSection: View {
    let job: JobDTO
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Delivery Details")
                .font(.headline)
                .padding(.bottom, 4)
            
            // Pickup Address
            VStack(alignment: .leading, spacing: 4) {
                Text("PICKUP")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(job.pickupAddress)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text("\(job.pickupCity), \(job.pickupPostalCode)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 8)
            
            // Delivery Address
            VStack(alignment: .leading, spacing: 4) {
                Text("DELIVERY")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(job.deliveryAddress)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text("\(job.deliveryCity), \(job.deliveryPostalCode)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // Quote Amount if available
            if let quoteAmount = job.quoteAmount {
                Divider()
                    .padding(.vertical, 8)
                
                HStack {
                    Text("Quote Amount")
                        .font(.subheadline)
                    
                    Spacer()
                    
                    Text("$\(String(format: "%.2f", quoteAmount))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct VehicleInfoView: View {
    let vehicleName: String
    let licensePlate: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vehicle Information")
                .font(.headline)
                .padding(.bottom, 4)
            
            HStack {
                Image(systemName: "car.fill")
                    .foregroundColor(.accentColor)
                
                Text(vehicleName)
                    .font(.body)
            }
            
            HStack {
                Image(systemName: "captions.bubble.fill")
                    .foregroundColor(.accentColor)
                
                Text(licensePlate)
                    .font(.body)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct ActionButtonsView: View {
    let job: JobDTO
    let onStatusUpdate: (String) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Different buttons depending on job status
            switch job.status {
            case "pending":
                Button(action: {
                    onStatusUpdate("accepted")
                }) {
                    ActionButton(title: "Accept Job", iconName: "checkmark.circle", color: .blue)
                }
                
            case "accepted":
                Button(action: {
                    onStatusUpdate("in_progress")
                }) {
                    ActionButton(title: "Start Delivery", iconName: "play.circle", color: .green)
                }
                
            case "in_progress":
                Button(action: {
                    onStatusUpdate("completed")
                }) {
                    ActionButton(title: "Complete Delivery", iconName: "flag.checkered", color: .green)
                }
                
            case "completed":
                Text("This delivery has been completed")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
                
            default:
                EmptyView()
            }
            
            // Navigation button
            if job.status != "completed" && job.status != "cancelled" {
                Link(destination: URL(string: "maps://?daddr=\(job.deliveryAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""),\(job.deliveryCity.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""),\(job.deliveryPostalCode.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!) {
                    ActionButton(title: "Open in Maps", iconName: "map", color: .blue)
                }
            }
        }
    }
}

struct ActionButton: View {
    let title: String
    let iconName: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: iconName)
            Text(title)
                .fontWeight(.semibold)
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding()
        .background(color)
        .cornerRadius(8)
    }
}

struct MapView: UIViewRepresentable {
    var directions: MKDirections.Response?
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations)
        
        if let directions = directions, let route = directions.routes.first {
            mapView.addOverlay(route.polyline)
            
            // Add annotations for source and destination
            if let sourceCoordinate = route.steps.first?.polyline.coordinate,
               let destinationCoordinate = route.steps.last?.polyline.coordinate {
                
                let sourceAnnotation = MKPointAnnotation()
                sourceAnnotation.coordinate = sourceCoordinate
                sourceAnnotation.title = "Pickup"
                
                let destinationAnnotation = MKPointAnnotation()
                destinationAnnotation.coordinate = destinationCoordinate
                destinationAnnotation.title = "Delivery"
                
                mapView.addAnnotations([sourceAnnotation, destinationAnnotation])
            }
            
            // Set the map region to show the entire route
            let padding: CGFloat = 50
            mapView.setVisibleMapRect(route.polyline.boundingMapRect, edgePadding: UIEdgeInsets(top: padding, left: padding, bottom: padding, right: padding), animated: true)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapView
        
        init(_ parent: MapView) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = UIColor.systemBlue
                renderer.lineWidth = 5
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
        
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if annotation is MKUserLocation {
                return nil
            }
            
            let identifier = "pin"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
            
            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
            } else {
                annotationView?.annotation = annotation
            }
            
            // Customize pin color based on title
            if annotation.title == "Pickup" {
                annotationView?.markerTintColor = UIColor.systemGreen
            } else if annotation.title == "Delivery" {
                annotationView?.markerTintColor = UIColor.systemRed
            }
            
            return annotationView
        }
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                ProgressView()
                    .scaleEffect(1.5)
                    .padding()
                
                Text("Loading...")
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(.systemBackground).opacity(0.8))
            )
        }
    }
}

#Preview {
    NavigationView {
        JobDetailsView(apiClient: APIClient(authService: AuthService()), jobId: 123)
    }
} 