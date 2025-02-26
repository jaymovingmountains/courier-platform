import Foundation
import Combine
import CoreLocation
import MapKit

class JobDetailsViewModel: ObservableObject {
    // Published properties for UI updates
    @Published var job: Job? = nil
    @Published var shipments: [Shipment] = []
    @Published var vehicle: Vehicle? = nil
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var isOfflineMode = false
    @Published var showOptionsMenu = false
    
    // Map-related properties
    @Published var pickupCoordinate: CLLocationCoordinate2D?
    @Published var deliveryCoordinate: CLLocationCoordinate2D?
    @Published var userLocation: CLLocationCoordinate2D = .defaultLocation
    @Published var directionsRoute: MKRoute?
    
    private var cancellables = Set<AnyCancellable>()
    private let apiClient: APIClient
    private let syncService: SyncService
    private let locationManager = CLLocationManager()
    
    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
        self.syncService = SyncService(apiClient: apiClient)
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
    }
    
    func fetchJobDetails(_ jobId: Int) {
        loadJob(jobId: jobId)
    }
    
    func loadJob(jobId: Int) {
        isLoading = true
        error = nil
        
        // Check if we're online
        let isConnected = NetworkMonitor().isConnected
        isOfflineMode = !isConnected
        
        Task {
            do {
                // Try to get job details from API
                if isConnected {
                    let job = try await apiClient.getJobDetails(id: jobId)
                    
                    DispatchQueue.main.async {
                        self.job = job
                        self.isLoading = false
                        
                        // Set mock coordinates for demo purposes
                        // In a real app, you would geocode the addresses
                        self.setMockCoordinates()
                    }
                    
                    // Load shipments after getting job details
                    await self.loadShipments(for: job)
                    
                    // Load vehicle information
                    await self.loadVehicleInfo()
                } else {
                    // If offline, try to get from local storage
                    let jobEntities = PersistenceService.shared.fetchJobs()
                    let matchingJob = jobEntities.first { Int($0.id) == jobId }
                    
                    if let matchingJob = matchingJob {
                        // Convert to domain model (placeholder)
                        // let job = matchingJob.toDomainModel()
                        
                        DispatchQueue.main.async {
                            // self.job = job
                            self.isLoading = false
                            self.error = "Showing cached data (offline mode)"
                            
                            // Set mock coordinates for demo purposes
                            self.setMockCoordinates()
                        }
                    } else {
                        DispatchQueue.main.async {
                            self.isLoading = false
                            self.error = "Job details not available offline"
                        }
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.isLoading = false
                    if let apiError = error as? APIError {
                        self.error = apiError.localizedDescription
                    } else {
                        self.error = error.localizedDescription
                    }
                }
            }
        }
    }
    
    private func loadShipments(for job: Job) async {
        guard !job.shipments.isEmpty else {
            return
        }
        
        // Check if we're online
        let isConnected = NetworkMonitor().isConnected
        
        // If offline, don't try to load shipments
        if !isConnected {
            DispatchQueue.main.async {
                self.error = "Shipment details not available offline"
            }
            return
        }
        
        DispatchQueue.main.async {
            self.isLoading = true
        }
        
        do {
            var loadedShipments: [Shipment] = []
            
            // Load each shipment individually
            for shipmentId in job.shipments {
                do {
                    let shipment = try await apiClient.getShipmentDetails(id: shipmentId)
                    loadedShipments.append(shipment)
                } catch {
                    print("Failed to load shipment \(shipmentId): \(error.localizedDescription)")
                }
            }
            
            DispatchQueue.main.async {
                self.shipments = loadedShipments
                self.isLoading = false
            }
        } catch {
            DispatchQueue.main.async {
                self.isLoading = false
                if let apiError = error as? APIError {
                    self.error = apiError.localizedDescription
                } else {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    private func loadVehicleInfo() async {
        // In a real app, you would fetch the vehicle assigned to this job
        // For demo purposes, we'll create a mock vehicle
        let mockVehicle = Vehicle(
            id: "V12345",
            make: "Ford",
            model: "Transit",
            year: 2023,
            licensePlate: "MMT-1234",
            vin: "1FTYE2CM3HKA12345",
            type: .box,
            capacity: 450.0,
            maxWeight: 3500.0,
            currentStatus: .inUse,
            maintenanceHistory: []
        )
        
        DispatchQueue.main.async {
            self.vehicle = mockVehicle
        }
    }
    
    func updateJobStatus(status: String, notes: String? = nil) async throws -> JobResponse {
        guard let job = job else {
            throw APIError.unknown
        }
        
        DispatchQueue.main.async {
            self.isLoading = true
            self.error = nil
        }
        
        // Check if we're online
        if !NetworkMonitor().isConnected {
            DispatchQueue.main.async {
                self.isOfflineMode = true
            }
            
            // Queue the update for later when we're back online
            syncService.queueJobStatusUpdate(jobId: job.id, status: status, notes: notes)
            
            // Update local job status optimistically
            DispatchQueue.main.async {
                // Create a mutable copy of the job
                var updatedJob = job
                // This is a simplified update - you might need to handle this differently
                // depending on your Job model structure
                // updatedJob.status = status
                
                self.job = updatedJob
                self.isLoading = false
                self.error = "Job status will be updated when you're back online"
            }
            
            // Return a mock response
            return JobResponse(message: "Job status will be updated when you're back online", status: status, invoiceUrl: nil)
        }
        
        do {
            let response = try await apiClient.updateJobStatus(id: job.id, status: status, notes: notes)
            
            // Reload job to get updated status
            loadJob(jobId: job.id)
            
            return response
        } catch {
            DispatchQueue.main.async {
                self.isLoading = false
                if let apiError = error as? APIError {
                    self.error = apiError.localizedDescription
                } else {
                    self.error = error.localizedDescription
                }
            }
            throw error
        }
    }
    
    func completeJob(notes: String? = nil, photos: [URL]? = nil) async throws -> JobResponse {
        guard let job = job else {
            throw APIError.unknown
        }
        
        DispatchQueue.main.async {
            self.isLoading = true
            self.error = nil
        }
        
        // Check if we're online - completing a job with photos requires network
        if !NetworkMonitor().isConnected {
            DispatchQueue.main.async {
                self.isOfflineMode = true
            }
            
            // If there are photos, we can't complete offline
            if photos != nil && !(photos?.isEmpty ?? true) {
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.error = "Cannot complete job with photos while offline"
                }
                throw APIError.networkError(NSError(domain: "Offline", code: 0, userInfo: [NSLocalizedDescriptionKey: "Cannot complete job with photos while offline"]))
            }
            
            // Queue the completion for later
            syncService.queueJobStatusUpdate(jobId: job.id, status: "completed", notes: notes)
            
            // Update local job status optimistically
            DispatchQueue.main.async {
                // Create a mutable copy of the job
                var updatedJob = job
                // This is a simplified update - you might need to handle this differently
                // depending on your Job model structure
                // updatedJob.status = "completed"
                
                self.job = updatedJob
                self.isLoading = false
                self.error = "Job will be marked as completed when you're back online"
            }
            
            // Return a mock response
            return JobResponse(message: "Job will be marked as completed when you're back online", status: "completed", invoiceUrl: nil)
        }
        
        do {
            let response = try await apiClient.completeJob(id: job.id, notes: notes, photos: photos)
            
            // Reload job to get updated status
            loadJob(jobId: job.id)
            
            return response
        } catch {
            DispatchQueue.main.async {
                self.isLoading = false
                if let apiError = error as? APIError {
                    self.error = apiError.localizedDescription
                } else {
                    self.error = error.localizedDescription
                }
            }
            throw error
        }
    }
    
    // MARK: - Navigation Methods
    
    func navigateToUpdateStatus(_ jobId: Int) {
        // In a real app, this would navigate to the update status screen
        print("Navigating to update status for job \(jobId)")
    }
    
    func startNavigation() {
        // In a real app, this would open Maps or another navigation app
        if let deliveryCoordinate = deliveryCoordinate {
            let placemark = MKPlacemark(coordinate: deliveryCoordinate)
            let mapItem = MKMapItem(placemark: placemark)
            mapItem.name = "Delivery Location"
            mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
        }
    }
    
    func contactSupport() {
        // In a real app, this would open a chat or phone call
        print("Contacting support")
    }
    
    func shareJobDetails() {
        // In a real app, this would share job details via the share sheet
        print("Sharing job details")
    }
    
    func downloadInvoice() {
        // In a real app, this would download and display the invoice
        print("Downloading invoice")
    }
    
    func reportIssue() {
        // In a real app, this would open a form to report an issue
        print("Reporting issue")
    }
    
    func viewCompletionDetails() {
        // In a real app, this would show completion details
        print("Viewing completion details")
    }
    
    // MARK: - Map Methods
    
    func getDirections() {
        guard let pickupCoordinate = pickupCoordinate,
              let deliveryCoordinate = deliveryCoordinate else {
            return
        }
        
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: pickupCoordinate))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: deliveryCoordinate))
        request.transportType = .automobile
        
        let directions = MKDirections(request: request)
        directions.calculate { [weak self] response, error in
            guard let self = self, let route = response?.routes.first else {
                return
            }
            
            DispatchQueue.main.async {
                self.directionsRoute = route
            }
        }
    }
    
    // For demo purposes only - in a real app, you would geocode the addresses
    private func setMockCoordinates() {
        // Set mock coordinates based on user location
        let userLat = userLocation.latitude
        let userLng = userLocation.longitude
        
        // Pickup location - slightly north of user
        pickupCoordinate = CLLocationCoordinate2D(
            latitude: userLat + 0.01,
            longitude: userLng - 0.01
        )
        
        // Delivery location - slightly east of user
        deliveryCoordinate = CLLocationCoordinate2D(
            latitude: userLat - 0.01,
            longitude: userLng + 0.02
        )
    }
}

// MARK: - CLLocationManagerDelegate
extension JobDetailsViewModel: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last {
            DispatchQueue.main.async {
                self.userLocation = location.coordinate
            }
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager failed with error: \(error.localizedDescription)")
    }
}

// MARK: - Job Extensions
extension Job {
    var shipment: Shipment? {
        // Mock shipment for demo purposes
        return Shipment(
            id: "S12345",
            jobId: "\(id)",
            description: "Office furniture and equipment",
            weight: 450.0,
            dimensions: Shipment.Dimensions(length: 72, width: 48, height: 36),
            status: .inTransit,
            trackingNumber: "MM\(id)12345",
            specialInstructions: "Handle with care. Fragile items included."
        )
    }
    
    var estimatedDeliveryTime: String? {
        // Calculate estimated delivery time based on scheduled date and duration
        let deliveryDate = scheduledDate.addingTimeInterval(estimatedDuration)
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: deliveryDate)
    }
    
    var distance: String? {
        // Mock distance for demo purposes
        return "\(Int.random(in: 5...30)) mi"
    }
    
    var completedAt: Date? {
        // Mock completion date for demo purposes
        return status == "delivered" ? Date().addingTimeInterval(-3600 * 24) : nil
    }
}

// MARK: - Vehicle Extensions
extension Vehicle {
    var vehicleName: String {
        return "\(year) \(make) \(model)"
    }
    
    var vehicleType: String? {
        switch type {
        case .box:
            return "Box Truck"
        case .van:
            return "Cargo Van"
        case .semi:
            return "Semi Truck"
        case .flatbed:
            return "Flatbed"
        }
    }
} 