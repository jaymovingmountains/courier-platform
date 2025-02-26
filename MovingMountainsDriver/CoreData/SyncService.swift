import Foundation
import Combine
import CoreData

class SyncService {
    private let apiClient: APIClient
    private let persistenceService: PersistenceService
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: APIClient, persistenceService: PersistenceService = .shared) {
        self.apiClient = apiClient
        self.persistenceService = persistenceService
    }
    
    // MARK: - Sync Jobs
    
    /// Synchronize jobs from the API to local storage
    func syncJobs() async {
        do {
            // Fetch jobs from API
            let jobs = try await apiClient.getAssignedJobs()
            
            // Save to Core Data
            persistenceService.saveJobs(jobs)
            
            print("Successfully synchronized \(jobs.count) jobs")
        } catch {
            print("Failed to sync jobs: \(error.localizedDescription)")
        }
    }
    
    /// Get jobs from local storage if available, otherwise fetch from API
    func getJobs() async -> [Job] {
        // First try to get from local storage
        let jobEntities = persistenceService.fetchJobs()
        
        // If we have local data, use it
        if !jobEntities.isEmpty {
            // Convert entities to domain models (this is a placeholder - implement based on your model)
            // return jobEntities.compactMap { $0.toDomainModel() }
            
            // For now, try to fetch from API as a fallback
            do {
                let jobs = try await apiClient.getAssignedJobs()
                return jobs
            } catch {
                print("Failed to fetch jobs from API: \(error.localizedDescription)")
                return []
            }
        } else {
            // If no local data, fetch from API and store locally
            do {
                let jobs = try await apiClient.getAssignedJobs()
                
                // Save to Core Data for future offline access
                persistenceService.saveJobs(jobs)
                
                return jobs
            } catch {
                print("Failed to fetch jobs from API: \(error.localizedDescription)")
                return []
            }
        }
    }
    
    // MARK: - Pending Changes Queue
    
    /// Queue a job status update to be sent when online
    func queueJobStatusUpdate(jobId: Int, status: String, notes: String? = nil) {
        // Store the pending update in UserDefaults or Core Data
        // This is a simplified example - you might want to create a PendingUpdate entity in Core Data
        let pendingUpdate: [String: Any] = [
            "type": "jobStatus",
            "jobId": jobId,
            "status": status,
            "notes": notes as Any,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        var pendingUpdates = UserDefaults.standard.array(forKey: "pendingUpdates") as? [[String: Any]] ?? []
        pendingUpdates.append(pendingUpdate)
        UserDefaults.standard.set(pendingUpdates, forKey: "pendingUpdates")
    }
    
    /// Process any pending updates when the app comes online
    func processPendingUpdates() async {
        guard let pendingUpdates = UserDefaults.standard.array(forKey: "pendingUpdates") as? [[String: Any]], !pendingUpdates.isEmpty else {
            return
        }
        
        var remainingUpdates: [[String: Any]] = []
        
        for update in pendingUpdates {
            guard let type = update["type"] as? String else {
                continue
            }
            
            switch type {
            case "jobStatus":
                if let jobId = update["jobId"] as? Int,
                   let status = update["status"] as? String {
                    let notes = update["notes"] as? String
                    
                    do {
                        _ = try await apiClient.updateJobStatus(id: jobId, status: status, notes: notes)
                        print("Successfully processed pending update for job \(jobId)")
                    } catch {
                        print("Failed to process pending update: \(error.localizedDescription)")
                        remainingUpdates.append(update)
                    }
                }
            default:
                print("Unknown pending update type: \(type)")
                remainingUpdates.append(update)
            }
        }
        
        // Save remaining updates that couldn't be processed
        UserDefaults.standard.set(remainingUpdates, forKey: "pendingUpdates")
    }
    
    // MARK: - Network Connectivity
    
    /// Start monitoring for network changes to sync when connection is restored
    func startNetworkMonitoring() {
        NotificationCenter.default.publisher(for: .connectivityStatusChanged)
            .sink { [weak self] notification in
                if let isConnected = notification.object as? Bool, isConnected {
                    print("Network connection restored, processing pending updates")
                    Task {
                        await self?.processPendingUpdates()
                        await self?.syncJobs()
                    }
                }
            }
            .store(in: &cancellables)
    }
}

// MARK: - Notification Extension

extension Notification.Name {
    static let connectivityStatusChanged = Notification.Name("connectivityStatusChanged")
} 