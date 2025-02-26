import Foundation
import Network
import Combine

class NetworkMonitor: ObservableObject {
    private let networkMonitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    @Published var isConnected = true {
        didSet {
            if oldValue != isConnected {
                // Post notification when connectivity status changes
                NotificationCenter.default.post(
                    name: .connectivityStatusChanged,
                    object: isConnected
                )
            }
        }
    }
    @Published var connectionType: ConnectionType = .unknown
    
    enum ConnectionType {
        case wifi
        case cellular
        case ethernet
        case unknown
    }
    
    init() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = self?.getConnectionType(path) ?? .unknown
            }
        }
        
        networkMonitor.start(queue: queue)
    }
    
    deinit {
        networkMonitor.cancel()
    }
    
    private func getConnectionType(_ path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) {
            return .wifi
        } else if path.usesInterfaceType(.cellular) {
            return .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            return .ethernet
        } else {
            return .unknown
        }
    }
    
    var isExpensive: Bool {
        return connectionType == .cellular
    }
    
    var isConnectionStatusMessage: String {
        if isConnected {
            return "Connected"
        } else {
            return "No Internet Connection"
        }
    }
} 