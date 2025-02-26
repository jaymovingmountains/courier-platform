import Foundation
import Combine
import CoreLocation

class DashboardViewModel: ObservableObject {
    // Published properties for UI updates
    @Published var jobs: [Job] = []
    @Published var activeJob: Job? = nil
    @Published var availableJobs: [Job] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var selectedJobId: Int? = nil
    @Published var acceptingJobId: Int? = nil
    @Published var userLocation: CLLocationCoordinate2D = .defaultLocation
    @Published var showError = false
    @Published var errorMessage: String? = nil
    @Published var showNewJobAlert = false
    @Published var showNotifications = false
    @Published var isOfflineMode = false
    
    // Dashboard data
    @Published var stats = DashboardStats(
        deliveries: DashboardStats.DeliveryStats(
            total: 24,
            completed: 18,
            pending: 6,
            trend: 6.0
        ),
        rating: 4.8,
        totalDistance: 342.5
    )
    
    @Published var earnings = Earnings(
        day: "120",
        week: "840",
        month: "3,250",
        trend: 12.0
    )
    
    // Driver info
    var driverName: String {
        return "John"
    }
    
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
    
    func fetchData() {
        isLoading = true
        
        Task {
            do {
                // Fetch jobs from API
                let assignedJobs = try await apiClient.getAssignedJobs()
                let availJobs = try await apiClient.getAvailableJobs()
                
                DispatchQueue.main.async {
                    self.jobs = assignedJobs
                    self.availableJobs = availJobs
                    self.activeJob = assignedJobs.first { $0.status == "in_progress" }
                    self.isLoading = false
                    self.isOfflineMode = !NetworkMonitor().isConnected
                }
            } catch {
                DispatchQueue.main.async {
                    self.isLoading = false
                    if let apiError = error as? APIError {
                        self.errorMessage = apiError.localizedDescription
                    } else {
                        self.errorMessage = error.localizedDescription
                    }
                    self.showError = true
                    
                    // If we're offline, try to get cached data
                    if !NetworkMonitor().isConnected {
                        self.isOfflineMode = true
                        Task {
                            let cachedJobs = await self.syncService.getJobs()
                            DispatchQueue.main.async {
                                if !cachedJobs.isEmpty {
                                    self.jobs = cachedJobs
                                    self.activeJob = cachedJobs.first { $0.status == "in_progress" }
                                    self.errorMessage = "Showing cached data (offline mode)"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    func refreshData() async {
        DispatchQueue.main.async {
            self.isLoading = true
        }
        
        do {
            // Fetch jobs from API
            let assignedJobs = try await apiClient.getAssignedJobs()
            let availJobs = try await apiClient.getAvailableJobs()
            
            DispatchQueue.main.async {
                self.jobs = assignedJobs
                self.availableJobs = availJobs
                self.activeJob = assignedJobs.first { $0.status == "in_progress" }
                self.isLoading = false
                self.isOfflineMode = !NetworkMonitor().isConnected
            }
        } catch {
            DispatchQueue.main.async {
                self.isLoading = false
                if let apiError = error as? APIError {
                    self.errorMessage = apiError.localizedDescription
                } else {
                    self.errorMessage = error.localizedDescription
                }
                self.showError = true
                
                // If we're offline, try to get cached data
                if !NetworkMonitor().isConnected {
                    self.isOfflineMode = true
                    Task {
                        let cachedJobs = await self.syncService.getJobs()
                        DispatchQueue.main.async {
                            if !cachedJobs.isEmpty {
                                self.jobs = cachedJobs
                                self.activeJob = cachedJobs.first { $0.status == "in_progress" }
                                self.errorMessage = "Showing cached data (offline mode)"
                            }
                        }
                    }
                }
            }
        }
    }
    
    func acceptJob(_ jobId: Int) {
        guard !isOfflineMode else {
            errorMessage = "Cannot accept jobs while offline"
            showError = true
            return
        }
        
        DispatchQueue.main.async {
            self.acceptingJobId = jobId
        }
        
        Task {
            do {
                let response = try await apiClient.acceptJob(id: jobId)
                
                // Refresh jobs after accepting
                await refreshData()
                
                DispatchQueue.main.async {
                    self.acceptingJobId = nil
                }
            } catch {
                DispatchQueue.main.async {
                    self.acceptingJobId = nil
                    if let apiError = error as? APIError {
                        self.errorMessage = apiError.localizedDescription
                    } else {
                        self.errorMessage = error.localizedDescription
                    }
                    self.showError = true
                }
            }
        }
    }
    
    func navigateToJobDetails(_ jobId: Int) {
        selectedJobId = jobId
    }
    
    func navigateToUpdateStatus(_ jobId: Int) {
        selectedJobId = jobId
    }
    
    func centerMapOnUserLocation() {
        // This would be implemented to center the map on the user's location
        // For now, it's just a placeholder
    }
}

// MARK: - CLLocationManagerDelegate
extension DashboardViewModel: CLLocationManagerDelegate {
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