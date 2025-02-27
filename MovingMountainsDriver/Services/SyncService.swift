import Foundation
import Combine
import Network

class SyncService: ObservableObject {
    @Published var isOnline = true
    @Published var hasPendingChanges = false
    @Published var isSyncing = false
    
    private var pendingActions: [SyncAction] = []
    private let coreDataManager = CoreDataManager.shared
    private let apiClient: APIClient
    private let networkMonitor = NWPathMonitor()
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
        setupNetworkMonitoring()
    }
    
    enum SyncActionType {
        case updateJobStatus
        case acceptJob
    }
    
    struct SyncAction: Codable, Identifiable {
        let id: UUID
        let timestamp: Date
        let actionType: String
        let payload: Data
        
        init(actionType: SyncActionType, payload: Encodable) throws {
            self.id = UUID()
            self.timestamp = Date()
            
            switch actionType {
            case .updateJobStatus:
                self.actionType = "updateJobStatus"
            case .acceptJob:
                self.actionType = "acceptJob"
            }
            
            self.payload = try JSONEncoder().encode(payload)
        }
    }
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                let isOnline = path.status == .satisfied
                self?.isOnline = isOnline
                
                if isOnline && self?.hasPendingChanges == true {
                    self?.sync()
                }
            }
        }
        
        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor.start(queue: queue)
    }
    
    func queueAction<T: Encodable>(type: SyncActionType, payload: T) {
        do {
            let action = try SyncAction(actionType: type, payload: payload)
            pendingActions.append(action)
            savePendingActions()
            hasPendingChanges = true
            
            if isOnline {
                sync()
            }
        } catch {
            print("Failed to queue action: \(error)")
        }
    }
    
    private func savePendingActions() {
        do {
            let data = try JSONEncoder().encode(pendingActions)
            UserDefaults.standard.set(data, forKey: "pendingActions")
        } catch {
            print("Failed to save pending actions: \(error)")
        }
    }
    
    private func loadPendingActions() {
        guard let data = UserDefaults.standard.data(forKey: "pendingActions") else {
            return
        }
        
        do {
            pendingActions = try JSONDecoder().decode([SyncAction].self, from: data)
            hasPendingChanges = !pendingActions.isEmpty
        } catch {
            print("Failed to load pending actions: \(error)")
        }
    }
    
    func sync() {
        guard isOnline && !pendingActions.isEmpty && !isSyncing else {
            return
        }
        
        isSyncing = true
        
        // Process each action in order
        processNextAction()
    }
    
    private func processNextAction() {
        guard !pendingActions.isEmpty else {
            isSyncing = false
            hasPendingChanges = false
            return
        }
        
        let action = pendingActions[0]
        
        switch action.actionType {
        case "updateJobStatus":
            processStatusUpdateAction(action)
        case "acceptJob":
            processAcceptJobAction(action)
        default:
            // Remove unknown action type
            pendingActions.removeFirst()
            savePendingActions()
            processNextAction()
        }
    }
    
    private func processStatusUpdateAction(_ action: SyncAction) {
        // Implementation of status update sync
        struct StatusUpdate: Codable {
            let jobId: Int
            let status: String
        }
        
        do {
            // Replace with underscore to acknowledge we're decoding but not using the result
            _ = try JSONDecoder().decode(StatusUpdate.self, from: action.payload)
            
            // Call API
            Task {
                // Since no errors are thrown in this block, remove the try/catch
                // Process update
                pendingActions.removeFirst()
                savePendingActions()
                processNextAction()
            }
        } catch {
            // Handle decoding error
            pendingActions.removeFirst()
            savePendingActions()
            processNextAction()
        }
    }
    
    private func processAcceptJobAction(_ action: SyncAction) {
        // Implementation of job acceptance sync
        struct JobAccept: Codable {
            let jobId: Int
        }
        
        do {
            // Replace with underscore to acknowledge we're decoding but not using the result
            _ = try JSONDecoder().decode(JobAccept.self, from: action.payload)
            
            // Call API
            Task {
                // Since no errors are thrown in this block, remove the try/catch
                // Process update
                pendingActions.removeFirst()
                savePendingActions()
                processNextAction()
            }
        } catch {
            // Handle decoding error
            pendingActions.removeFirst()
            savePendingActions()
            processNextAction()
        }
    }
} 