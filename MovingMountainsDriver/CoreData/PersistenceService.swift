import CoreData

class PersistenceService {
    static let shared = PersistenceService()
    
    let container: NSPersistentContainer
    
    init() {
        container = NSPersistentContainer(name: "MovingMountainsDriver")
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Failed to load Core Data stack: \(error)")
            }
        }
    }
    
    // MARK: - Job Operations
    
    // Save jobs to Core Data
    func saveJobs(_ jobs: [Job]) {
        let context = container.viewContext
        
        for job in jobs {
            // Check if we already have this job
            let fetchRequest: NSFetchRequest<JobEntity> = JobEntity.fetchRequest()
            fetchRequest.predicate = NSPredicate(format: "id == %lld", Int64(job.id))
            
            do {
                let results = try context.fetch(fetchRequest)
                let jobEntity: JobEntity
                
                if let existingJob = results.first {
                    // Update existing
                    jobEntity = existingJob
                } else {
                    // Create new
                    jobEntity = JobEntity(context: context)
                    jobEntity.id = Int64(job.id)
                }
                
                // Update properties
                jobEntity.status = job.status
                jobEntity.driverId = Int64(job.assignedTo)
                
                // Convert dates
                if let createdAt = job.createdAt {
                    jobEntity.assignedAt = createdAt
                }
                
                if job.isCompleted, let updatedAt = job.updatedAt {
                    jobEntity.completedAt = updatedAt
                }
                
                // Extract province from address if available
                let addressComponents = job.address.components(separatedBy: ",")
                if addressComponents.count >= 2 {
                    let trimmedProvince = addressComponents[addressComponents.count - 2].trimmingCharacters(in: .whitespacesAndNewlines)
                    jobEntity.province = trimmedProvince
                }
                
                // Save context
                try context.save()
            } catch {
                print("Error saving job: \(error)")
            }
        }
    }
    
    // Fetch jobs from Core Data
    func fetchJobs() -> [JobEntity] {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<JobEntity> = JobEntity.fetchRequest()
        
        do {
            let results = try context.fetch(fetchRequest)
            return results
        } catch {
            print("Error fetching jobs: \(error)")
            return []
        }
    }
    
    // Convert JobEntity to Job model
    func convertToJobModel(_ entity: JobEntity) -> Job? {
        // This is a simplified conversion - you'll need to adapt it to your Job model
        // and handle relationships with shipments
        return nil // Placeholder - implement based on your Job model
    }
    
    // MARK: - Shipment Operations
    
    // Save shipment to Core Data
    func saveShipment(_ shipment: Shipment, context: NSManagedObjectContext? = nil) {
        let ctx = context ?? container.viewContext
        
        // Check if we already have this shipment
        let fetchRequest: NSFetchRequest<ShipmentEntity> = ShipmentEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %lld", Int64(shipment.id))
        
        do {
            let results = try ctx.fetch(fetchRequest)
            let shipmentEntity: ShipmentEntity
            
            if let existingShipment = results.first {
                // Update existing
                shipmentEntity = existingShipment
            } else {
                // Create new
                shipmentEntity = ShipmentEntity(context: ctx)
                shipmentEntity.id = Int64(shipment.id)
            }
            
            // Update properties
            shipmentEntity.shipperId = Int64(shipment.shipperId)
            shipmentEntity.driverId = shipment.driverId != nil ? Int64(shipment.driverId!) : nil
            shipmentEntity.vehicleId = shipment.vehicleId != nil ? Int64(shipment.vehicleId!) : nil
            shipmentEntity.shipmentType = shipment.shipmentType
            shipmentEntity.pickupAddress = shipment.pickupAddress
            shipmentEntity.pickupCity = shipment.pickupCity
            shipmentEntity.pickupPostalCode = shipment.pickupPostalCode
            shipmentEntity.deliveryAddress = shipment.deliveryAddress
            shipmentEntity.deliveryCity = shipment.deliveryCity
            shipmentEntity.deliveryPostalCode = shipment.deliveryPostalCode
            shipmentEntity.status = shipment.status
            shipmentEntity.quoteAmount = shipment.quoteAmount
            shipmentEntity.createdAt = shipment.createdAt
            shipmentEntity.province = shipment.province
            shipmentEntity.invoiceUrl = shipment.invoiceUrl
            
            // Save context if we're not using an external context
            if context == nil {
                try ctx.save()
            }
        } catch {
            print("Error saving shipment: \(error)")
        }
    }
    
    // Fetch shipments from Core Data
    func fetchShipments() -> [ShipmentEntity] {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<ShipmentEntity> = ShipmentEntity.fetchRequest()
        
        do {
            let results = try context.fetch(fetchRequest)
            return results
        } catch {
            print("Error fetching shipments: \(error)")
            return []
        }
    }
    
    // MARK: - Vehicle Operations
    
    // Save vehicle to Core Data
    func saveVehicle(_ vehicle: Vehicle, context: NSManagedObjectContext? = nil) {
        let ctx = context ?? container.viewContext
        
        // Check if we already have this vehicle
        let fetchRequest: NSFetchRequest<VehicleEntity> = VehicleEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %lld", Int64(vehicle.id))
        
        do {
            let results = try ctx.fetch(fetchRequest)
            let vehicleEntity: VehicleEntity
            
            if let existingVehicle = results.first {
                // Update existing
                vehicleEntity = existingVehicle
            } else {
                // Create new
                vehicleEntity = VehicleEntity(context: ctx)
                vehicleEntity.id = Int64(vehicle.id)
            }
            
            // Update properties
            vehicleEntity.vehicleName = vehicle.vehicleName
            vehicleEntity.licensePlate = vehicle.licensePlate
            
            // Save context if we're not using an external context
            if context == nil {
                try ctx.save()
            }
        } catch {
            print("Error saving vehicle: \(error)")
        }
    }
    
    // Fetch vehicles from Core Data
    func fetchVehicles() -> [VehicleEntity] {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<VehicleEntity> = VehicleEntity.fetchRequest()
        
        do {
            let results = try context.fetch(fetchRequest)
            return results
        } catch {
            print("Error fetching vehicles: \(error)")
            return []
        }
    }
    
    // MARK: - Utility Methods
    
    // Clear all data
    func clearAllData() {
        let entities = ["JobEntity", "ShipmentEntity", "VehicleEntity"]
        
        let context = container.viewContext
        
        for entityName in entities {
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
            let batchDeleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            
            do {
                try context.execute(batchDeleteRequest)
                try context.save()
            } catch {
                print("Error clearing \(entityName): \(error)")
            }
        }
    }
} 