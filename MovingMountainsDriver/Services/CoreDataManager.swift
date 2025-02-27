import CoreData
import Foundation

class CoreDataManager {
    static let shared = CoreDataManager()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "MovingMountainsDriver")
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Unable to load persistent stores: \(error)")
            }
        }
        return container
    }()
    
    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
    
    func saveContext() {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                print("Error saving context: \(error)")
            }
        }
    }
    
    // MARK: - Job Operations
    
    /// Save a job to Core Data
    func saveJob(id: Int64, shipmentId: Int64, status: String, assignedAt: Date?, completedAt: Date?, province: String?) {
        // Check if job already exists
        if let existingJob = fetchJob(withId: id) {
            // Update existing job
            existingJob.status = status
            existingJob.assignedAt = assignedAt
            existingJob.completedAt = completedAt
            existingJob.province = province
        } else {
            // Create new job
            let job = NSEntityDescription.insertNewObject(forEntityName: "Job", into: context) as! Job
            job.id = id
            job.shipmentId = shipmentId
            job.status = status
            job.assignedAt = assignedAt
            job.completedAt = completedAt
            job.province = province
        }
        
        saveContext()
    }
    
    /// Fetch a specific job by ID
    func fetchJob(withId id: Int64) -> Job? {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %lld", id)
        
        do {
            let results = try context.fetch(fetchRequest)
            return results.first
        } catch {
            print("Error fetching job: \(error)")
            return nil
        }
    }
    
    /// Fetch all jobs
    func fetchAllJobs() -> [Job] {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching all jobs: \(error)")
            return []
        }
    }
    
    /// Fetch jobs by status
    func fetchJobs(withStatus status: String) -> [Job] {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "status == %@", status)
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching jobs by status: \(error)")
            return []
        }
    }
    
    /// Delete a job
    func deleteJob(withId id: Int64) {
        if let job = fetchJob(withId: id) {
            context.delete(job)
            saveContext()
        }
    }
    
    // MARK: - Shipment Operations
    
    /// Save a shipment to Core Data
    func saveShipment(
        id: Int64,
        shipperId: Int64,
        driverId: Int64,
        vehicleId: Int64,
        shipmentType: String,
        pickupAddress: String,
        pickupCity: String,
        pickupPostalCode: String,
        deliveryAddress: String,
        deliveryCity: String,
        deliveryPostalCode: String,
        status: String,
        quoteAmount: Double?,
        createdAt: Date,
        province: String?
    ) {
        // Check if shipment already exists
        if let existingShipment = fetchShipment(withId: id) {
            // Update existing shipment
            existingShipment.shipperId = shipperId
            existingShipment.driverId = driverId
            existingShipment.vehicleId = vehicleId
            existingShipment.shipmentType = shipmentType
            existingShipment.pickupAddress = pickupAddress
            existingShipment.pickupCity = pickupCity
            existingShipment.pickupPostalCode = pickupPostalCode
            existingShipment.deliveryAddress = deliveryAddress
            existingShipment.deliveryCity = deliveryCity
            existingShipment.deliveryPostalCode = deliveryPostalCode
            existingShipment.status = status
            if let quoteAmount = quoteAmount {
                existingShipment.quoteAmount = quoteAmount
            }
            existingShipment.createdAt = createdAt
            existingShipment.province = province
        } else {
            // Create new shipment
            let shipment = NSEntityDescription.insertNewObject(forEntityName: "Shipment", into: context) as! Shipment
            shipment.id = id
            shipment.shipperId = shipperId
            shipment.driverId = driverId
            shipment.vehicleId = vehicleId
            shipment.shipmentType = shipmentType
            shipment.pickupAddress = pickupAddress
            shipment.pickupCity = pickupCity
            shipment.pickupPostalCode = pickupPostalCode
            shipment.deliveryAddress = deliveryAddress
            shipment.deliveryCity = deliveryCity
            shipment.deliveryPostalCode = deliveryPostalCode
            shipment.status = status
            if let quoteAmount = quoteAmount {
                shipment.quoteAmount = quoteAmount
            }
            shipment.createdAt = createdAt
            shipment.province = province
        }
        
        saveContext()
    }
    
    /// Fetch a specific shipment by ID
    func fetchShipment(withId id: Int64) -> Shipment? {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %lld", id)
        
        do {
            let results = try context.fetch(fetchRequest)
            return results.first
        } catch {
            print("Error fetching shipment: \(error)")
            return nil
        }
    }
    
    /// Fetch all shipments
    func fetchAllShipments() -> [Shipment] {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching all shipments: \(error)")
            return []
        }
    }
    
    /// Fetch shipments by status
    func fetchShipments(withStatus status: String) -> [Shipment] {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "status == %@", status)
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching shipments by status: \(error)")
            return []
        }
    }
    
    /// Fetch shipments for a specific driver
    func fetchShipments(forDriverId driverId: Int64) -> [Shipment] {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "driverId == %lld", driverId)
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching shipments for driver: \(error)")
            return []
        }
    }
    
    /// Delete a shipment
    func deleteShipment(withId id: Int64) {
        if let shipment = fetchShipment(withId: id) {
            context.delete(shipment)
            saveContext()
        }
    }
    
    // MARK: - Vehicle Operations
    
    /// Save a vehicle to Core Data
    func saveVehicle(id: Int64, vehicleName: String, licensePlate: String) {
        // Check if vehicle already exists
        if let existingVehicle = fetchVehicle(withId: id) {
            // Update existing vehicle
            existingVehicle.vehicleName = vehicleName
            existingVehicle.licensePlate = licensePlate
        } else {
            // Create new vehicle
            let vehicle = NSEntityDescription.insertNewObject(forEntityName: "Vehicle", into: context) as! Vehicle
            vehicle.id = id
            vehicle.vehicleName = vehicleName
            vehicle.licensePlate = licensePlate
        }
        
        saveContext()
    }
    
    /// Fetch a specific vehicle by ID
    func fetchVehicle(withId id: Int64) -> Vehicle? {
        let fetchRequest: NSFetchRequest<Vehicle> = Vehicle.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %lld", id)
        
        do {
            let results = try context.fetch(fetchRequest)
            return results.first
        } catch {
            print("Error fetching vehicle: \(error)")
            return nil
        }
    }
    
    /// Fetch all vehicles
    func fetchAllVehicles() -> [Vehicle] {
        let fetchRequest: NSFetchRequest<Vehicle> = Vehicle.fetchRequest()
        
        do {
            return try context.fetch(fetchRequest)
        } catch {
            print("Error fetching all vehicles: \(error)")
            return []
        }
    }
    
    /// Delete a vehicle
    func deleteVehicle(withId id: Int64) {
        if let vehicle = fetchVehicle(withId: id) {
            context.delete(vehicle)
            saveContext()
        }
    }
    
    // MARK: - Relationship Operations
    
    /// Link a job to its shipment
    func linkJobToShipment(jobId: Int64, shipmentId: Int64) {
        guard let job = fetchJob(withId: jobId),
              let shipment = fetchShipment(withId: shipmentId) else {
            return
        }
        
        job.shipment = shipment
        saveContext()
    }
    
    /// Link a shipment to its vehicle
    func linkShipmentToVehicle(shipmentId: Int64, vehicleId: Int64) {
        guard let shipment = fetchShipment(withId: shipmentId),
              let vehicle = fetchVehicle(withId: vehicleId) else {
            return
        }
        
        shipment.vehicle = vehicle
        saveContext()
    }
    
    // MARK: - Utility Operations
    
    /// Clear all data from Core Data
    func clearAllData() {
        let entities = persistentContainer.managedObjectModel.entities
        for entity in entities {
            guard let entityName = entity.name else { continue }
            
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            
            do {
                try persistentContainer.persistentStoreCoordinator.execute(deleteRequest, with: context)
            } catch {
                print("Error clearing \(entityName) data: \(error)")
            }
        }
        
        saveContext()
    }
    
    /// Sync data from API to Core Data
    func syncJobsAndShipments(jobs: [APIJob], shipments: [APIShipment], vehicles: [APIVehicle]) {
        // First, save all vehicles
        for vehicle in vehicles {
            saveVehicle(
                id: Int64(vehicle.id),
                vehicleName: vehicle.vehicleName,
                licensePlate: vehicle.licensePlate
            )
        }
        
        // Next, save all shipments
        for shipment in shipments {
            saveShipment(
                id: Int64(shipment.id),
                shipperId: Int64(shipment.shipperId),
                driverId: Int64(shipment.driverId),
                vehicleId: Int64(shipment.vehicleId),
                shipmentType: shipment.shipmentType,
                pickupAddress: shipment.pickupAddress,
                pickupCity: shipment.pickupCity,
                pickupPostalCode: shipment.pickupPostalCode,
                deliveryAddress: shipment.deliveryAddress,
                deliveryCity: shipment.deliveryCity,
                deliveryPostalCode: shipment.deliveryPostalCode,
                status: shipment.status,
                quoteAmount: shipment.quoteAmount,
                createdAt: shipment.createdAt,
                province: shipment.province
            )
            
            // Link shipment to vehicle
            linkShipmentToVehicle(shipmentId: Int64(shipment.id), vehicleId: Int64(shipment.vehicleId))
        }
        
        // Finally, save all jobs and link to shipments
        for job in jobs {
            saveJob(
                id: Int64(job.id),
                shipmentId: Int64(job.shipmentId),
                status: job.status,
                assignedAt: job.assignedAt,
                completedAt: job.completedAt,
                province: job.province
            )
            
            // Link job to shipment
            linkJobToShipment(jobId: Int64(job.id), shipmentId: Int64(job.shipmentId))
        }
    }
    
    // MARK: - DTO Operations
    
    /// Save a JobDTO to Core Data
    func saveJob(_ jobDTO: JobDTO) {
        let job = fetchJob(withId: Int64(jobDTO.id)) ?? NSEntityDescription.insertNewObject(forEntityName: "Job", into: context) as! Job
        
        job.id = Int64(jobDTO.id)
        job.shipmentId = Int64(jobDTO.shipmentId)
        job.status = jobDTO.status
        job.province = jobDTO.province
        
        saveContext()
    }
    
    /// Fetch a specific JobDTO by ID
    func getJob(id: Int) -> JobDTO? {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %d", id)
        
        do {
            if let job = try context.fetch(fetchRequest).first {
                return convertJobToDTO(job)
            }
        } catch {
            print("Error fetching job: \(error)")
        }
        
        return nil
    }
    
    /// Convert Job entity to JobDTO
    private func convertJobToDTO(_ job: Job) -> JobDTO {
        let shipment = job.shipment
        
        return JobDTO(
            id: Int(job.id),
            shipmentId: Int(job.shipmentId),
            driverId: nil,
            status: job.status ?? "",
            shipmentType: shipment?.shipmentType,
            pickupAddress: shipment?.pickupAddress ?? "",
            pickupCity: shipment?.pickupCity ?? "",
            pickupPostalCode: shipment?.pickupPostalCode ?? "",
            deliveryAddress: shipment?.deliveryAddress ?? "",
            deliveryCity: shipment?.deliveryCity ?? "",
            deliveryPostalCode: shipment?.deliveryPostalCode ?? "",
            quoteAmount: shipment?.quoteAmount,
            createdAt: shipment?.createdAt?.description ?? "",
            province: job.province,
            vehicleId: shipment?.vehicleId != 0 ? Int(shipment?.vehicleId ?? 0) : nil,
            vehicleName: shipment?.vehicle?.vehicleName,
            licensePlate: shipment?.vehicle?.licensePlate
        )
    }
    
    /// Fetch all JobDTOs
    func getAllJobs() -> [JobDTO] {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        
        do {
            let jobs = try context.fetch(fetchRequest)
            return jobs.map { convertJobToDTO($0) }
        } catch {
            print("Error fetching jobs: \(error)")
            return []
        }
    }
    
    /// Fetch JobDTOs by status
    func getJobs(withStatus status: String) -> [JobDTO] {
        let fetchRequest: NSFetchRequest<Job> = Job.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "status == %@", status)
        
        do {
            let jobs = try context.fetch(fetchRequest)
            return jobs.map { convertJobToDTO($0) }
        } catch {
            print("Error fetching jobs by status: \(error)")
            return []
        }
    }
    
    /// Save a ShipmentDTO to Core Data
    func saveShipment(_ shipmentDTO: ShipmentDTO) {
        // Create a shipment ID from the string ID
        let idInt = Int64(shipmentDTO.id) ?? 0
        let shipment = fetchShipment(withId: idInt) ?? NSEntityDescription.insertNewObject(forEntityName: "Shipment", into: context) as! Shipment
        
        shipment.id = idInt
        shipment.status = shipmentDTO.status.rawValue
        
        // Set address fields
        shipment.pickupAddress = shipmentDTO.pickupAddress.street
        shipment.pickupCity = shipmentDTO.pickupAddress.city
        shipment.pickupPostalCode = shipmentDTO.pickupAddress.zipCode
        
        shipment.deliveryAddress = shipmentDTO.deliveryAddress.street
        shipment.deliveryCity = shipmentDTO.deliveryAddress.city
        shipment.deliveryPostalCode = shipmentDTO.deliveryAddress.zipCode
        
        // Set date field
        shipment.createdAt = shipmentDTO.createdAt
        
        saveContext()
    }
    
    /// Fetch a specific ShipmentDTO by ID
    func getShipment(id: Int) -> ShipmentDTO? {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %d", id)
        
        do {
            if let shipment = try context.fetch(fetchRequest).first {
                return convertShipmentToDTO(shipment)
            }
        } catch {
            print("Error fetching shipment: \(error)")
        }
        
        return nil
    }
    
    /// Convert Shipment entity to ShipmentDTO
    private func convertShipmentToDTO(_ shipment: Shipment) -> ShipmentDTO? {
        // Create pickup address
        let pickupAddress = Address(
            street: shipment.pickupAddress ?? "",
            city: shipment.pickupCity ?? "",
            state: "",
            zipCode: shipment.pickupPostalCode ?? "",
            country: "",
            latitude: nil,
            longitude: nil
        )
        
        // Create delivery address
        let deliveryAddress = Address(
            street: shipment.deliveryAddress ?? "",
            city: shipment.deliveryCity ?? "",
            state: "",
            zipCode: shipment.deliveryPostalCode ?? "",
            country: "",
            latitude: nil,
            longitude: nil
        )
        
        // Get status
        let statusValue = shipment.status ?? "pending"
        let status = ShipmentStatus(rawValue: statusValue) ?? .pending
        
        return ShipmentDTO(
            id: String(shipment.id),
            trackingNumber: "",
            status: status,
            description: "",
            weight: nil,
            dimensions: nil,
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            createdAt: shipment.createdAt ?? Date(),
            updatedAt: Date(),
            estimatedDeliveryTime: nil
        )
    }
    
    /// Fetch all ShipmentDTOs
    func getAllShipments() -> [ShipmentDTO] {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        
        do {
            let shipments = try context.fetch(fetchRequest)
            return shipments.compactMap { convertShipmentToDTO($0) }
        } catch {
            print("Error fetching shipments: \(error)")
            return []
        }
    }
    
    /// Fetch ShipmentDTOs by status
    func getShipments(withStatus status: String) -> [ShipmentDTO] {
        let fetchRequest: NSFetchRequest<Shipment> = Shipment.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "status == %@", status)
        
        do {
            let shipments = try context.fetch(fetchRequest)
            return shipments.compactMap { convertShipmentToDTO($0) }
        } catch {
            print("Error fetching shipments by status: \(error)")
            return []
        }
    }
    
    /// Define VehicleDTO structure here to resolve missing type error
    struct VehicleDTO: Identifiable, Codable {
        let id: Int
        let vehicleName: String
        let licensePlate: String
        
        enum CodingKeys: String, CodingKey {
            case id
            case vehicleName = "vehicle_name"
            case licensePlate = "license_plate"
        }
    }
    
    /// Save a VehicleDTO to Core Data
    func saveVehicle(_ vehicleDTO: VehicleDTO) {
        let vehicle = fetchVehicle(withId: Int64(vehicleDTO.id)) ?? NSEntityDescription.insertNewObject(forEntityName: "Vehicle", into: context) as! Vehicle
        
        vehicle.id = Int64(vehicleDTO.id)
        vehicle.vehicleName = vehicleDTO.vehicleName
        vehicle.licensePlate = vehicleDTO.licensePlate
        
        saveContext()
    }
    
    /// Fetch a specific VehicleDTO by ID
    func getVehicle(id: Int) -> VehicleDTO? {
        let fetchRequest: NSFetchRequest<Vehicle> = Vehicle.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %d", id)
        
        do {
            if let vehicle = try context.fetch(fetchRequest).first {
                return convertVehicleToDTO(vehicle)
            }
        } catch {
            print("Error fetching vehicle: \(error)")
        }
        
        return nil
    }
    
    /// Convert Vehicle entity to VehicleDTO
    private func convertVehicleToDTO(_ vehicle: Vehicle) -> VehicleDTO {
        return VehicleDTO(
            id: Int(vehicle.id),
            vehicleName: vehicle.vehicleName ?? "",
            licensePlate: vehicle.licensePlate ?? ""
        )
    }
    
    /// Fetch all VehicleDTOs
    func getAllVehicles() -> [VehicleDTO] {
        let fetchRequest: NSFetchRequest<Vehicle> = Vehicle.fetchRequest()
        
        do {
            let vehicles = try context.fetch(fetchRequest)
            return vehicles.map { convertVehicleToDTO($0) }
        } catch {
            print("Error fetching vehicles: \(error)")
            return []
        }
    }
}

// MARK: - API Model Structures for Syncing

/// API Job model for syncing with Core Data
struct APIJob {
    let id: Int
    let shipmentId: Int
    let status: String
    let assignedAt: Date?
    let completedAt: Date?
    let province: String?
}

/// API Shipment model for syncing with Core Data
struct APIShipment {
    let id: Int
    let shipperId: Int
    let driverId: Int
    let vehicleId: Int
    let shipmentType: String
    let pickupAddress: String
    let pickupCity: String
    let pickupPostalCode: String
    let deliveryAddress: String
    let deliveryCity: String
    let deliveryPostalCode: String
    let status: String
    let quoteAmount: Double?
    let createdAt: Date
    let province: String?
}

/// API Vehicle model for syncing with Core Data
struct APIVehicle {
    let id: Int
    let vehicleName: String
    let licensePlate: String
} 