import Foundation
import Combine
import CoreLocation

class UpdateStatusViewModel: ObservableObject {
    @Published var job: Job? = nil
    @Published var currentLocation: CLLocation? = nil
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var photoURLs: [URL] = []
    @Published var statusUpdateNote: String = ""
    
    private var cancellables = Set<AnyCancellable>()
    private let apiClient: APIClient
    private let locationService: LocationService
    
    init(apiClient: APIClient = APIClient(), locationService: LocationService = LocationService()) {
        self.apiClient = apiClient
        self.locationService = locationService
        setupLocationUpdates()
    }
    
    private func setupLocationUpdates() {
        locationService.locationPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] location in
                self?.currentLocation = location
            }
            .store(in: &cancellables)
    }
    
    func updateJobStatus(jobId: String, status: Job.JobStatus) {
        guard let location = currentLocation else {
            error = "Cannot update job status: Location unavailable"
            return
        }
        
        isLoading = true
        error = nil
        
        let endpoint = "\(Constants.API.jobs)/\(jobId)/status"
        
        var parameters: [String: Any] = [
            "status": status.rawValue,
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "note": statusUpdateNote
        ]
        
        if !photoURLs.isEmpty {
            parameters["photos"] = photoURLs.map { $0.absoluteString }
        }
        
        apiClient.request(endpoint: endpoint, method: .put, parameters: parameters)
            .decode(type: Job.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { [weak self] updatedJob in
                self?.job = updatedJob
                self?.statusUpdateNote = ""
                self?.photoURLs = []
            }
            .store(in: &cancellables)
    }
    
    func addPhoto(url: URL) {
        photoURLs.append(url)
    }
    
    func removePhoto(at index: Int) {
        guard index < photoURLs.count else { return }
        photoURLs.remove(at: index)
    }
} 