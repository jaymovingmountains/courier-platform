/*
 This file serves as a reference for creating the Core Data model in Xcode.
 
 To create the actual Core Data model:
 1. In Xcode, go to File > New > File...
 2. Select "Data Model" under the "Core Data" section
 3. Name it "MovingMountainsDriver" and save it in the CoreData folder
 4. Add the entities and attributes as described below
 
 Core Data Model: MovingMountainsDriver.xcdatamodeld
 
 Entity: JobEntity
 Attributes:
 - id: Int64
 - shipmentId: Int64
 - driverId: Int64
 - status: String
 - assignedAt: Date (optional)
 - completedAt: Date (optional)
 - province: String (optional)
 
 Entity: ShipmentEntity
 Attributes:
 - id: Int64
 - shipperId: Int64
 - driverId: Int64 (optional)
 - vehicleId: Int64 (optional)
 - shipmentType: String
 - pickupAddress: String
 - pickupCity: String
 - pickupPostalCode: String
 - deliveryAddress: String
 - deliveryCity: String
 - deliveryPostalCode: String
 - status: String
 - quoteAmount: Double
 - createdAt: Date
 - province: String (optional)
 - invoiceUrl: String (optional)
 
 Entity: VehicleEntity
 Attributes:
 - id: Int64
 - vehicleName: String
 - licensePlate: String
 
 Relationships:
 - JobEntity to ShipmentEntity: one-to-one (optional)
 - ShipmentEntity to VehicleEntity: many-to-one (optional)
*/ 