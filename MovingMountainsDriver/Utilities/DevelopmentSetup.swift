import Foundation
import SwiftUI

#if DEBUG
// MARK: - Mock Data Generator
class MockDataGenerator {
    static func createMockJobs(count: Int = 5) -> [JobDTO] {
        var jobs: [JobDTO] = []
        
        for i in 1...count {
            let job = JobDTO(
                id: i,
                shipperId: i,
                driverId: i % 2 == 0 ? 1 : nil,
                status: JobStatus(rawValue: i % 4 == 0 ? "assigned" : 
                       i % 4 == 1 ? "picked_up" : 
                       i % 4 == 2 ? "in_transit" : "delivered") ?? .pending,
                shipmentType: i % 2 == 0 ? "Standard" : "Express",
                pickupAddress: "\(100 + i) Pickup Street",
                pickupCity: "San Francisco",
                pickupPostalCode: "9410\(i)",
                deliveryAddress: "\(200 + i) Delivery Avenue",
                deliveryCity: "Oakland",
                deliveryPostalCode: "9460\(i)",
                quoteAmount: Double(50 + (i * 10)),
                createdAt: "2023-05-\(10 + i)T14:30:00Z",
                province: "CA",
                vehicleId: i % 3 == 0 ? i : nil,
                vehicleName: i % 3 == 0 ? "Van \(i)" : nil,
                licensePlate: i % 3 == 0 ? "ABC-12\(i)" : nil
            )
            jobs.append(job)
        }
        
        return jobs
    }
}

// MARK: - Mock API Client
class MockAPIClient: APIClient {
    override func fetch<T: Decodable>(endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        if endpoint.contains("/jobs") {
            if T.self == [JobDTO].self {
                return MockDataGenerator.createMockJobs() as! T
            } else if T.self == JobDTO.self {
                // Single job fetch
                let jobId = Int(endpoint.components(separatedBy: "/").last ?? "1") ?? 1
                let jobs = MockDataGenerator.createMockJobs()
                if let job = jobs.first(where: { $0.id == jobId }) {
                    return job as! T
                }
            }
        }
        
        throw APIError.unknown
    }
}

// MARK: - Preview Providers
extension DashboardView {
    static var previews: some View {
        let mockAPIClient = MockAPIClient(authService: AuthService())
        let authService = AuthService()
        return DashboardView(apiClient: mockAPIClient)
            .environmentObject(authService)
    }
}

extension JobDetailsView {
    static var previews: some View {
        let mockAPIClient = MockAPIClient(authService: AuthService())
        return JobDetailsView(apiClient: mockAPIClient, jobId: 1, onDismiss: {})
    }
}

extension UpdateStatusView {
    static var previews: some View {
        let mockAPIClient = MockAPIClient(authService: AuthService())
        return UpdateStatusView(apiClient: mockAPIClient, jobId: 1, onDismiss: {
            print("Preview dismiss action")
        })
    }
}
#endif 
