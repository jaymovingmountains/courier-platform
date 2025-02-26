import SwiftUI
import MapKit

struct InteractiveMapView: View {
    let pickupCoordinate: CLLocationCoordinate2D?
    let deliveryCoordinate: CLLocationCoordinate2D?
    let userLocation: CLLocationCoordinate2D
    let directionsRoute: MKRoute?
    let showDirections: Bool
    
    @State private var region: MKCoordinateRegion
    @State private var mapType: MKMapType = .standard
    @State private var isAnimating = false
    
    init(
        pickupCoordinate: CLLocationCoordinate2D?,
        deliveryCoordinate: CLLocationCoordinate2D?,
        userLocation: CLLocationCoordinate2D,
        directionsRoute: MKRoute?,
        showDirections: Bool
    ) {
        self.pickupCoordinate = pickupCoordinate
        self.deliveryCoordinate = deliveryCoordinate
        self.userLocation = userLocation
        self.directionsRoute = directionsRoute
        self.showDirections = showDirections
        
        // Calculate initial region to show all points
        let initialRegion: MKCoordinateRegion
        
        if let pickup = pickupCoordinate, let delivery = deliveryCoordinate {
            // Calculate center point between pickup and delivery
            let centerLatitude = (pickup.latitude + delivery.latitude) / 2
            let centerLongitude = (pickup.longitude + delivery.longitude) / 2
            
            // Calculate span to include both points with some padding
            let latDelta = abs(pickup.latitude - delivery.latitude) * 1.5
            let lonDelta = abs(pickup.longitude - delivery.longitude) * 1.5
            
            initialRegion = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: centerLatitude, longitude: centerLongitude),
                span: MKCoordinateSpan(latitudeDelta: max(0.02, latDelta), longitudeDelta: max(0.02, lonDelta))
            )
        } else {
            // Default to user location with a reasonable zoom level
            initialRegion = MKCoordinateRegion(
                center: userLocation,
                span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
            )
        }
        
        self._region = State(initialValue: initialRegion)
    }
    
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Map view
            Map(coordinateRegion: $region, showsUserLocation: true, userTrackingMode: .none, annotationItems: mapAnnotations()) { annotation in
                MapAnnotation(coordinate: annotation.coordinate) {
                    LocationAnnotationView(
                        type: annotation.type,
                        title: annotation.title,
                        color: annotation.color,
                        isAnimating: isAnimating && annotation.type == .delivery
                    )
                }
            }
            .overlay(
                // Route overlay if directions are shown
                showDirections && directionsRoute != nil ? AnyView(
                    RouteOverlay(route: directionsRoute!)
                        .stroke(Color("AccentColor"), lineWidth: 4)
                        .opacity(0.8)
                        .shadow(color: Color.black.opacity(0.3), radius: 3, x: 0, y: 2)
                ) : AnyView(EmptyView())
            )
            .onAppear {
                isAnimating = true
            }
            
            // Map controls
            VStack(spacing: 10) {
                // Map type toggle
                Button(action: {
                    mapType = mapType == .standard ? .hybrid : .standard
                }) {
                    Image(systemName: mapType == .standard ? "network" : "map")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(
                            Circle()
                                .fill(Color("AccentColor"))
                                .shadow(color: Color.black.opacity(0.3), radius: 5, x: 0, y: 2)
                        )
                }
                .buttonStyle(ScalableButtonStyle())
                
                // Center on user location
                Button(action: {
                    withAnimation {
                        region.center = userLocation
                        region.span = MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                    }
                }) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(
                            Circle()
                                .fill(Color("AccentColor"))
                                .shadow(color: Color.black.opacity(0.3), radius: 5, x: 0, y: 2)
                        )
                }
                .buttonStyle(ScalableButtonStyle())
                
                // Show all points
                Button(action: {
                    withAnimation {
                        if let pickup = pickupCoordinate, let delivery = deliveryCoordinate {
                            // Calculate center point between pickup and delivery
                            let centerLatitude = (pickup.latitude + delivery.latitude) / 2
                            let centerLongitude = (pickup.longitude + delivery.longitude) / 2
                            
                            // Calculate span to include both points with some padding
                            let latDelta = abs(pickup.latitude - delivery.latitude) * 1.5
                            let lonDelta = abs(pickup.longitude - delivery.longitude) * 1.5
                            
                            region = MKCoordinateRegion(
                                center: CLLocationCoordinate2D(latitude: centerLatitude, longitude: centerLongitude),
                                span: MKCoordinateSpan(latitudeDelta: max(0.02, latDelta), longitudeDelta: max(0.02, lonDelta))
                            )
                        }
                    }
                }) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(
                            Circle()
                                .fill(Color("AccentColor"))
                                .shadow(color: Color.black.opacity(0.3), radius: 5, x: 0, y: 2)
                        )
                }
                .buttonStyle(ScalableButtonStyle())
            }
            .padding(12)
        }
    }
    
    // Generate map annotations for pickup, delivery, and user location
    private func mapAnnotations() -> [MapAnnotation] {
        var annotations: [MapAnnotation] = []
        
        if let pickup = pickupCoordinate {
            annotations.append(
                MapAnnotation(
                    id: "pickup",
                    coordinate: pickup,
                    type: .pickup,
                    title: "Pickup",
                    color: Color("PickupColor")
                )
            )
        }
        
        if let delivery = deliveryCoordinate {
            annotations.append(
                MapAnnotation(
                    id: "delivery",
                    coordinate: delivery,
                    type: .delivery,
                    title: "Delivery",
                    color: Color("DeliveryColor")
                )
            )
        }
        
        return annotations
    }
}

// Map annotation model
struct MapAnnotation: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let type: AnnotationType
    let title: String
    let color: Color
    
    enum AnnotationType {
        case pickup
        case delivery
        case user
    }
}

// Custom annotation view
struct LocationAnnotationView: View {
    let type: MapAnnotation.AnnotationType
    let title: String
    let color: Color
    let isAnimating: Bool
    
    @State private var pulsate = false
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                // Pulsing circle for animation
                if isAnimating {
                    Circle()
                        .fill(color.opacity(0.3))
                        .frame(width: pulsate ? 50 : 30, height: pulsate ? 50 : 30)
                        .opacity(pulsate ? 0 : 0.6)
                        .animation(
                            Animation.easeInOut(duration: 1.5)
                                .repeatForever(autoreverses: false),
                            value: pulsate
                        )
                        .onAppear {
                            pulsate = true
                        }
                }
                
                // Main pin
                ZStack {
                    Circle()
                        .fill(color)
                        .frame(width: 30, height: 30)
                        .shadow(color: color.opacity(0.5), radius: 5, x: 0, y: 3)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                // Pin triangle
                Image(systemName: "arrowtriangle.down.fill")
                    .font(.system(size: 16))
                    .foregroundColor(color)
                    .offset(y: 20)
            }
            
            // Label
            Text(title)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(color.opacity(0.8))
                        .shadow(color: Color.black.opacity(0.3), radius: 3, x: 0, y: 2)
                )
                .offset(y: 10)
        }
    }
    
    private var iconName: String {
        switch type {
        case .pickup:
            return "arrow.up.circle.fill"
        case .delivery:
            return "mappin.circle.fill"
        case .user:
            return "person.circle.fill"
        }
    }
}

// Route overlay for directions
struct RouteOverlay: Shape {
    let route: MKRoute
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let points = route.polyline.points()
        let pointCount = route.polyline.pointCount
        
        guard pointCount > 0 else { return path }
        
        // Convert MKMapPoint to CGPoint
        let startPoint = MKMapPoint(points[0])
        path.move(to: CGPoint(x: startPoint.x, y: startPoint.y))
        
        for i in 1..<pointCount {
            let point = MKMapPoint(points[i])
            path.addLine(to: CGPoint(x: point.x, y: point.y))
        }
        
        return path
    }
}

// Preview
struct InteractiveMapView_Previews: PreviewProvider {
    static var previews: some View {
        InteractiveMapView(
            pickupCoordinate: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            deliveryCoordinate: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4294),
            userLocation: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4244),
            directionsRoute: nil,
            showDirections: false
        )
        .frame(height: 300)
        .previewLayout(.sizeThatFits)
    }
} 