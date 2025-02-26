const { generateInvoice } = require('./invoiceGenerator');

// Test data
const testShipment = {
  id: 12345,
  senderName: 'John Doe',
  pickupAddress: '123 Pickup St\nVancouver, BC V6B 1A1',
  recipientName: 'Jane Smith',
  deliveryAddress: '456 Delivery Ave\nToronto, ON M5V 2H1',
  cost: 99.99
};

// Generate a test invoice
const filePath = generateInvoice(testShipment);
console.log(`Invoice generated successfully at: ${filePath}`); 