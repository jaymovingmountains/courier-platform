import SwiftUI
import MapKit

struct MapView: UIViewRepresentable {
    var directions: MKDirections.Response?
    var annotations: [MKPointAnnotation] = []
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        // Clear existing overlays and annotations
        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations)
        
        // Add new annotations
        mapView.addAnnotations(annotations)
        
        // Add route if available
        if let directions = directions {
            for route in directions.routes {
                mapView.addOverlay(route.polyline)
                
                // Zoom to show the route
                mapView.setVisibleMapRect(
                    route.polyline.boundingMapRect,
                    edgePadding: UIEdgeInsets(top: 50, left: 50, bottom: 50, right: 50),
                    animated: true
                )
            }
        } else if !annotations.isEmpty {
            // If no directions but we have annotations, zoom to show them
            // First create an array of map rects for each annotation
            let mapRects = annotations.map { 
                MKMapRect(origin: MKMapPoint($0.coordinate), size: MKMapSize(width: 1, height: 1))
            }
            
            // Start with the first map rect
            if let firstRect = mapRects.first {
                var unionRect = firstRect
                
                // Union with the rest of the rects
                for rect in mapRects.dropFirst() {
                    unionRect = unionRect.union(rect)
                }
                
                // Now set the visible rect
                mapView.setVisibleMapRect(
                    unionRect,
                    edgePadding: UIEdgeInsets(top: 50, left: 50, bottom: 50, right: 50),
                    animated: true
                )
            }
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
            // Return custom annotation views
            if annotation is MKUserLocation {
                return nil
            }
            
            let identifier = "CustomPin"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
            
            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
            } else {
                annotationView?.annotation = annotation
            }
            
            // Customize pin color based on title (pickup or delivery)
            if let markerView = annotationView as? MKMarkerAnnotationView {
                if annotation.title == "Pickup" {
                    markerView.markerTintColor = .systemGreen
                } else if annotation.title == "Delivery" {
                    markerView.markerTintColor = .systemRed
                }
            }
            
            return annotationView
        }
    }
}

// Utility functions for working with map annotations and job data
extension JobDTO {
    // Create annotations for pickup and delivery locations
    func createMapAnnotations() -> [MKPointAnnotation] {
        var annotations = [MKPointAnnotation]()
        
        // Create pickup annotation
        let pickupAnnotation = MKPointAnnotation()
        pickupAnnotation.title = "Pickup"
        pickupAnnotation.subtitle = "\(pickupAddress), \(pickupCity), \(pickupPostalCode)"
        
        // Create delivery annotation
        let deliveryAnnotation = MKPointAnnotation()
        deliveryAnnotation.title = "Delivery"
        deliveryAnnotation.subtitle = "\(deliveryAddress), \(deliveryCity), \(deliveryPostalCode)"
        
        annotations.append(pickupAnnotation)
        annotations.append(deliveryAnnotation)
        
        return annotations
    }
}

// Geocoding utilities
class GeocodingService {
    private let geocoder = CLGeocoder()
    
    func geocodeAddresses(for job: JobDTO) async throws -> [MKPointAnnotation] {
        // Create base annotations first
        let annotations = job.createMapAnnotations()
        
        // Geocode pickup address
        let pickupAddress = "\(job.pickupAddress), \(job.pickupCity), \(job.pickupPostalCode)"
        let pickupAnnotation = annotations[0]
        
        // Geocode delivery address
        let deliveryAddress = "\(job.deliveryAddress), \(job.deliveryCity), \(job.deliveryPostalCode)"
        let deliveryAnnotation = annotations[1]
        
        // Use Task group to geocode both addresses concurrently
        try await withThrowingTaskGroup(of: (Int, CLLocation?).self) { group in
            // Add geocoding tasks
            group.addTask {
                let placemarks = try await self.geocoder.geocodeAddressString(pickupAddress)
                return (0, placemarks.first?.location)
            }
            
            group.addTask {
                let placemarks = try await self.geocoder.geocodeAddressString(deliveryAddress)
                return (1, placemarks.first?.location)
            }
            
            // Process results as they complete
            for try await (index, location) in group {
                if let location = location {
                    if index == 0 {
                        pickupAnnotation.coordinate = location.coordinate
                    } else {
                        deliveryAnnotation.coordinate = location.coordinate
                    }
                }
            }
        }
        
        return annotations
    }
    
    // Calculate route between pickup and delivery locations
    func calculateRoute(from pickupAnnotation: MKPointAnnotation, to deliveryAnnotation: MKPointAnnotation) async throws -> MKDirections.Response {
        let request = MKDirections.Request()
        
        let pickupPlacemark = MKPlacemark(coordinate: pickupAnnotation.coordinate)
        let deliveryPlacemark = MKPlacemark(coordinate: deliveryAnnotation.coordinate)
        
        request.source = MKMapItem(placemark: pickupPlacemark)
        request.destination = MKMapItem(placemark: deliveryPlacemark)
        request.transportType = .automobile
        
        let directions = MKDirections(request: request)
        return try await directions.calculate()
    }
} 