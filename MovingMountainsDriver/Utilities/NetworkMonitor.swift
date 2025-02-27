import Foundation
import Network
import Combine
import SwiftUI

/// Represents a network request that can be cached and retried
struct RetryableRequest: Identifiable, Codable {
    let id: UUID
    let endpoint: String
    let method: String
    let body: Data?
    let timestamp: Date
    let retryCount: Int
    let maxRetries: Int
    let requestType: String
    
    init(endpoint: String, method: String = "GET", body: Data? = nil, 
         requestType: String, retryCount: Int = 0, maxRetries: Int = 3) {
        self.id = UUID()
        self.endpoint = endpoint
        self.method = method
        self.body = body
        self.timestamp = Date()
        self.retryCount = retryCount
        self.maxRetries = maxRetries
        self.requestType = requestType
    }
    
    var canRetry: Bool {
        return retryCount < maxRetries
    }
    
    func incrementRetryCount() -> RetryableRequest {
        return RetryableRequest(
            endpoint: endpoint,
            method: method,
            body: body,
            requestType: requestType,
            retryCount: retryCount + 1,
            maxRetries: maxRetries
        )
    }
}

/// Enumeration of network connectivity states
enum NetworkStatus {
    case connected
    case disconnected
    case requiresConnection
    case unsatisfied
    
    var description: String {
        switch self {
        case .connected:
            return "Connected"
        case .disconnected:
            return "No connection"
        case .requiresConnection:
            return "Connection required"
        case .unsatisfied:
            return "Connection unsatisfied"
        }
    }
    
    var isConnected: Bool {
        return self == .connected
    }
}

/// Centralized network monitoring class that provides real-time connectivity updates
class NetworkMonitor: ObservableObject {
    // Singleton instance
    static let shared = NetworkMonitor()
    
    // Published properties for observing network status
    @Published var status: NetworkStatus = .connected
    @Published var isConnected = true
    @Published var connectionType: NWInterface.InterfaceType = .other
    @Published var pendingRequests: [RetryableRequest] = []
    @Published var showOfflineIndicator = false
    
    // Private properties
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitorQueue")
    private var cancellables = Set<AnyCancellable>()
    private var hasShownOfflineAlert = false
    private var isRetrying = false
    
    // Notification names
    static let networkStatusChangedNotification = Notification.Name("networkStatusChanged")
    static let connectivityRestoredNotification = Notification.Name("connectivityRestored")
    
    // UserDefaults key for storing pending requests
    private let pendingRequestsKey = "com.movingmountains.pendingNetworkRequests"
    
    private init() {
        // Load any cached pending requests from UserDefaults
        loadPendingRequests()
        
        // Set up monitoring
        setupNetworkMonitoring()
        
        // React to changes in connected status
        $isConnected
            .dropFirst() // Skip the initial value
            .receive(on: RunLoop.main)
            .sink { [weak self] connected in
                guard let self = self else { return }
                
                if connected {
                    // Connection restored
                    self.handleConnectionRestored()
                } else {
                    // Connection lost
                    self.handleConnectionLost()
                }
            }
            .store(in: &cancellables)
    }
    
    private func setupNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self = self else { return }
                
                // Update connectionType to more specific type if available
                if path.usesInterfaceType(.wifi) {
                    self.connectionType = .wifi
                } else if path.usesInterfaceType(.cellular) {
                    self.connectionType = .cellular
                } else if path.usesInterfaceType(.wiredEthernet) {
                    self.connectionType = .wiredEthernet
                } else {
                    self.connectionType = .other
                }
                
                // Update connection status
                let previousStatus = self.status
                
                switch path.status {
                case .satisfied:
                    self.status = .connected
                    self.isConnected = true
                case .unsatisfied:
                    self.status = .unsatisfied
                    self.isConnected = false
                case .requiresConnection:
                    self.status = .requiresConnection
                    self.isConnected = false
                @unknown default:
                    self.status = .disconnected
                    self.isConnected = false
                }
                
                if self.status != previousStatus {
                    // Post notification about network status change
                    NotificationCenter.default.post(
                        name: NetworkMonitor.networkStatusChangedNotification,
                        object: nil,
                        userInfo: ["status": self.status]
                    )
                    
                    print("📡 Network status changed: \(self.status.description) (\(self.connectionType))")
                }
            }
        }
        
        // Start monitoring
        monitor.start(queue: queue)
    }
    
    // MARK: - Connection State Handling
    
    private func handleConnectionRestored() {
        print("📡 Connection restored! Using \(connectionType)")
        
        // Reset offline alert flag
        hasShownOfflineAlert = false
        
        // Hide the offline indicator with animation
        withAnimation {
            showOfflineIndicator = false
        }
        
        // Post notification about connectivity restoration
        NotificationCenter.default.post(
            name: NetworkMonitor.connectivityRestoredNotification,
            object: nil
        )
        
        // Process any pending requests
        retryPendingRequests()
    }
    
    private func handleConnectionLost() {
        print("📡 Connection lost!")
        
        // Show offline indicator
        withAnimation {
            showOfflineIndicator = true
        }
        
        // Only show alert once per disconnection
        if !hasShownOfflineAlert {
            hasShownOfflineAlert = true
            
            // Alert will be shown by the UI that's observing showOfflineIndicator
        }
    }
    
    // MARK: - Request Caching and Retrying
    
    /// Add a request to the pending queue for later retry
    func cacheRequest(endpoint: String, method: String = "GET", body: Data? = nil, 
                      requestType: String, maxRetries: Int = 3) {
        
        let request = RetryableRequest(
            endpoint: endpoint,
            method: method,
            body: body,
            requestType: requestType,
            maxRetries: maxRetries
        )
        
        DispatchQueue.main.async {
            self.pendingRequests.append(request)
            self.savePendingRequests()
            
            print("📡 Request cached for later retry: \(endpoint)")
        }
    }
    
    /// Retry all pending requests if we're online
    func retryPendingRequests() {
        guard !pendingRequests.isEmpty && isConnected && !isRetrying else { return }
        
        isRetrying = true
        
        print("📡 Attempting to retry \(pendingRequests.count) pending requests")
        
        // Make a copy of the requests to process
        let requestsToProcess = pendingRequests
        
        // Process requests with a small delay between each
        Task {
            for request in requestsToProcess {
                try? await Task.sleep(nanoseconds: 500_000_000) // 500ms delay
                
                if !isConnected {
                    print("📡 Connection lost during retry process. Stopping.")
                    isRetrying = false
                    return
                }
                
                await processRequest(request)
            }
            
            isRetrying = false
        }
    }
    
    /// Process a single request by sending it to the appropriate service
    private func processRequest(_ request: RetryableRequest) async {
        guard isConnected else { return }
        
        print("📡 Retrying request: \(request.endpoint) (attempt \(request.retryCount + 1)/\(request.maxRetries))")
        
        // Remove the request from the queue
        DispatchQueue.main.async {
            self.pendingRequests.removeAll { $0.id == request.id }
            self.savePendingRequests()
        }
        
        let apiClient = APIClient(authService: AuthService())
        
        do {
            switch request.requestType {
            case "job_details":
                // Extract job ID from endpoint
                if let jobIdString = request.endpoint.split(separator: "/").last,
                   let jobId = Int(jobIdString) {
                    let _: JobDTO = try await apiClient.fetch(endpoint: request.endpoint)
                    print("✅ Successfully retried job details request for job #\(jobId)")
                    
                    // Post notification that job details were updated
                    NotificationCenter.default.post(
                        name: NSNotification.Name("jobDetailsUpdated"),
                        object: nil,
                        userInfo: ["jobId": jobId]
                    )
                }
                
            case "update_job_status":
                if let jobIdString = request.endpoint.split(separator: "/").dropLast().last,
                   let jobId = Int(jobIdString),
                   let body = request.body {
                    let _: JobDTO = try await apiClient.fetch(
                        endpoint: request.endpoint,
                        method: request.method,
                        body: body
                    )
                    print("✅ Successfully retried job status update for job #\(jobId)")
                    
                    // Post notification that job status was updated
                    NotificationCenter.default.post(
                        name: NSNotification.Name("jobStatusUpdated"),
                        object: nil,
                        userInfo: ["jobId": jobId]
                    )
                }
                
            // Add additional request types as needed
            default:
                // Generic fetch for other types
                if let _ = try? await apiClient.fetch(endpoint: request.endpoint) as [String: Any] {
                    print("✅ Successfully retried generic request: \(request.endpoint)")
                }
            }
        } catch let error as APIError {
            print("❌ Failed to retry request: \(error.message)")
            
            // If the request can be retried, add it back to the queue with incremented retry count
            if request.canRetry {
                let updatedRequest = request.incrementRetryCount()
                
                DispatchQueue.main.async {
                    self.pendingRequests.append(updatedRequest)
                    self.savePendingRequests()
                }
                
                // Add exponential backoff for next retry
                let backoffDelay = pow(2.0, Double(updatedRequest.retryCount)) * 0.5
                print("📡 Will retry again in \(backoffDelay) seconds")
            } else {
                print("❌ Max retry attempts reached for request: \(request.endpoint)")
            }
        } catch {
            print("❌ Failed to retry request with unexpected error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Persistence
    
    private func savePendingRequests() {
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(pendingRequests)
            UserDefaults.standard.set(data, forKey: pendingRequestsKey)
        } catch {
            print("❌ Error saving pending requests: \(error.localizedDescription)")
        }
    }
    
    private func loadPendingRequests() {
        guard let data = UserDefaults.standard.data(forKey: pendingRequestsKey) else { return }
        
        do {
            let decoder = JSONDecoder()
            let requests = try decoder.decode([RetryableRequest].self, from: data)
            
            // Filter out requests that are too old (>24 hours)
            let filteredRequests = requests.filter { 
                abs($0.timestamp.timeIntervalSinceNow) < 24 * 60 * 60
            }
            
            pendingRequests = filteredRequests
            
            if filteredRequests.count < requests.count {
                print("📡 Removed \(requests.count - filteredRequests.count) expired request(s)")
                savePendingRequests()
            }
            
            print("📡 Loaded \(pendingRequests.count) pending requests")
        } catch {
            print("❌ Error loading pending requests: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Public API
    
    /// Reset all pending requests and network monitoring
    func reset() {
        pendingRequests.removeAll()
        savePendingRequests()
        
        isRetrying = false
        hasShownOfflineAlert = false
        
        print("📡 Network monitor state has been reset")
    }
    
    /// Manual check to see if we're online
    func checkConnectivity() -> Bool {
        return isConnected
    }
    
    /// Cancel a specific pending request
    func cancelRequest(id: UUID) {
        pendingRequests.removeAll { $0.id == id }
        savePendingRequests()
    }
    
    /// Manually retry a specific request
    func retryRequest(id: UUID) {
        guard let index = pendingRequests.firstIndex(where: { $0.id == id }) else { return }
        
        let request = pendingRequests[index]
        
        Task {
            await processRequest(request)
        }
    }
    
    /// Manually trigger retry of all pending requests
    func forceTriggerRetry() {
        if isConnected {
            retryPendingRequests()
        }
    }
    
    deinit {
        monitor.cancel()
    }
}

// MARK: - View Extensions

/// A view modifier that displays an offline indicator when connectivity is lost
struct OfflineIndicatorModifier: ViewModifier {
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    
    func body(content: Content) -> some View {
        ZStack {
            content
                .disabled(networkMonitor.showOfflineIndicator)
            
            if networkMonitor.showOfflineIndicator {
                VStack {
                    Spacer()
                    
                    HStack {
                        Image(systemName: "wifi.slash")
                            .foregroundColor(.white)
                            .font(.headline)
                        
                        Text("You're offline. Waiting for connection...")
                            .foregroundColor(.white)
                            .font(.headline)
                    }
                    .padding()
                    .background(Color.red.opacity(0.85))
                    .cornerRadius(10)
                    .padding()
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: networkMonitor.showOfflineIndicator)
            }
        }
    }
}

extension View {
    /// Apply an offline indicator to a view
    func withOfflineIndicator() -> some View {
        modifier(OfflineIndicatorModifier())
    }
    
    /// Check if we're online before performing an action
    func checkConnectivity(perform action: @escaping () -> Void) -> some View {
        self.onTapGesture {
            if NetworkMonitor.shared.isConnected {
                action()
            } else {
                // Show a temporary toast or alert
                // This would typically use your app's toast/alert system
                print("Action requires internet connection")
                
                // Here you could trigger a specific UI feedback
                withAnimation {
                    NetworkMonitor.shared.showOfflineIndicator = true
                }
            }
        }
    }
}

// MARK: - API Client Extensions

extension APIClient {
    /// Fetch with automatic offline handling and request caching
    func fetchWithOfflineSupport<T: Decodable>(
        endpoint: String, 
        method: String = "GET", 
        body: Data? = nil,
        requestType: String,
        maxRetries: Int = 3
    ) async throws -> T {
        // Check connectivity
        guard NetworkMonitor.shared.isConnected else {
            // Cache the request for later
            NetworkMonitor.shared.cacheRequest(
                endpoint: endpoint,
                method: method,
                body: body,
                requestType: requestType,
                maxRetries: maxRetries
            )
            
            // Throw offline error
            throw APIError.networkError(NSError(
                domain: NSURLErrorDomain,
                code: NSURLErrorNotConnectedToInternet,
                userInfo: [NSLocalizedDescriptionKey: "You're offline. Request will be retried when connection is restored."]
            ))
        }
        
        do {
            // Try to make the request
            return try await fetch(endpoint: endpoint, method: method, body: body)
        } catch let error as APIError {
            // For network errors, cache the request for later retry
            if case .networkError = error {
                NetworkMonitor.shared.cacheRequest(
                    endpoint: endpoint,
                    method: method,
                    body: body,
                    requestType: requestType,
                    maxRetries: maxRetries
                )
            }
            
            throw error
        }
    }
} 