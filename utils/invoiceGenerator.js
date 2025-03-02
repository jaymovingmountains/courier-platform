const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Canadian tax rates by province
const PROVINCE_TAXES = {
  'AB': { gst: 5, pst: 0, name: 'Alberta' },
  'BC': { gst: 5, pst: 7, name: 'British Columbia' },
  'MB': { gst: 5, pst: 7, name: 'Manitoba' },
  'NB': { hst: 15, name: 'New Brunswick' },
  'NL': { hst: 15, name: 'Newfoundland and Labrador' },
  'NS': { hst: 15, name: 'Nova Scotia' },
  'NT': { gst: 5, name: 'Northwest Territories' },
  'NU': { gst: 5, name: 'Nunavut' },
  'ON': { hst: 13, name: 'Ontario' },
  'PE': { hst: 15, name: 'Prince Edward Island' },
  'QC': { gst: 5, qst: 9.975, name: 'Quebec' },
  'SK': { gst: 5, pst: 6, name: 'Saskatchewan' },
  'YT': { gst: 5, name: 'Yukon' }
};

/**
 * Generates a PDF invoice for a shipment
 * @param {Object} shipment - The shipment object
 * @param {number} shipment.id - Shipment ID
 * @param {string} shipment.senderName - Name of the sender
 * @param {string} shipment.pickupAddress - Pickup address
 * @param {string} shipment.recipientName - Name of the recipient
 * @param {string} shipment.deliveryAddress - Delivery address
 * @param {number} shipment.cost - Cost of the shipment
 * @returns {string} The file path of the generated invoice
 */
function generateInvoice(shipment) {
  // Create invoices directory if it doesn't exist
  const invoicesDir = path.join(__dirname, '../invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });
  
  // Define the file path
  const filePath = path.join(invoicesDir, `invoice-${shipment.id}.pdf`);
  
  // Pipe the PDF to a file
  doc.pipe(fs.createWriteStream(filePath));

  // Set document metadata
  doc.info.Title = `Invoice for Shipment #${shipment.id}`;
  doc.info.Author = 'Courier Platform';
  
  // Add a light gray background rectangle behind the logo
  doc.rect(40, 40, 120, 80)
     .fill('#f0f0f0');
  
  // Logo
  const logoPath = path.join(__dirname, '../public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 50, { width: 100 });
  } else {
    // If logo doesn't exist, use text instead
    doc.fontSize(24).fillColor('#3498db').text('COURIER PLATFORM', 50, 50);
  }
  
  // Add company info
  doc.fontSize(10)
     .fillColor('#666666')
     .text('Courier Platform Inc.', 200, 50, { align: 'right' })
     .text('1234 Delivery Lane', 200, 65, { align: 'right' })
     .text('Vancouver, BC V6B 1A1', 200, 80, { align: 'right' })
     .text('contact@courierplatform.com', 200, 95, { align: 'right' })
     .text('(604) 555-1234', 200, 110, { align: 'right' });
  
  // Add a horizontal line
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(50, 140)
     .lineTo(550, 140)
     .stroke();
  
  // Title - Updated to use Helvetica-Bold and blue color (#0000FF)
  doc.font('Helvetica-Bold')
     .fontSize(24)
     .fillColor('#0000FF')
     .text('INVOICE', 50, 160);
  
  // Invoice details
  doc.font('Helvetica')
     .fontSize(12)
     .fillColor('#666666')
     .text(`Invoice #: INV-${shipment.id}`, 400, 160)
     .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 180)
     .text(`Shipment ID: ${shipment.id}`, 400, 200);
  
  // Add another horizontal line
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(50, 230)
     .lineTo(550, 230)
     .stroke();
  
  // Shipment details section with border
  doc.rect(50, 250, 500, 120)
     .stroke('#cccccc');
  
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#3498db')
     .text('Shipment Details', 50, 250, { align: 'center', width: 500 });
  
  // Sender and recipient information in two columns
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .fillColor('#333333');
  
  // Left column - Sender
  doc.text('Sender:', 70, 280)
     .font('Helvetica')
     .fontSize(10)
     .text(shipment.senderName, 70, 300)
     .text(shipment.pickupAddress, 70, 315, { width: 180 });
  
  // Right column - Recipient
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .text('Recipient:', 320, 280)
     .font('Helvetica')
     .fontSize(10)
     .text(shipment.recipientName, 320, 300)
     .text(shipment.deliveryAddress, 320, 315, { width: 180 });
  
  // Add another horizontal line
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(50, 390)
     .lineTo(550, 390)
     .stroke();
  
  // Cost breakdown section with border
  doc.rect(50, 410, 500, 120)
     .stroke('#cccccc');
  
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#3498db')
     .text('Cost Breakdown', 50, 410, { align: 'center', width: 500 });
  
  // Table header
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor('#333333')
     .text('Description', 70, 440)
     .text('Amount', 450, 440, { align: 'right' });
  
  // Line under the header
  doc.strokeColor('#cccccc')
     .lineWidth(0.5)
     .moveTo(70, 455)
     .lineTo(530, 455)
     .stroke();
  
  // Table content
  doc.font('Helvetica')
     .fontSize(10)
     .text('Shipping Fee', 70, 470)
     .text(`$${(shipment.cost * 0.8).toFixed(2)}`, 450, 470, { align: 'right' })
     .text('Handling Fee', 70, 490)
     .text(`$${(shipment.cost * 0.2).toFixed(2)}`, 450, 490, { align: 'right' });
  
  // Calculate taxes based on province
  const baseAmount = shipment.cost;
  const province = shipment.province || 'ON';
  const taxes = calculateTaxes(baseAmount, province);
  const totalWithTax = baseAmount + taxes.totalTaxAmount;
  
  let currentY = 510;
  
  // Add tax information to the invoice
  if (taxes.hst > 0) {
    doc.font('Helvetica')
       .fontSize(10)
       .text(`HST (${taxes.hstRate}%)`, 70, currentY)
       .text(`$${taxes.hst.toFixed(2)}`, 450, currentY, { align: 'right' });
    currentY += 20;
  }
  
  if (taxes.gst > 0) {
    doc.font('Helvetica')
       .fontSize(10)
       .text(`GST (${taxes.gstRate}%)`, 70, currentY)
       .text(`$${taxes.gst.toFixed(2)}`, 450, currentY, { align: 'right' });
    currentY += 20;
  }
  
  if (taxes.pst > 0) {
    doc.font('Helvetica')
       .fontSize(10)
       .text(`PST (${taxes.pstRate}%)`, 70, currentY)
       .text(`$${taxes.pst.toFixed(2)}`, 450, currentY, { align: 'right' });
    currentY += 20;
  }
  
  if (taxes.qst > 0) {
    doc.font('Helvetica')
       .fontSize(10)
       .text(`QST (${taxes.qstRate}%)`, 70, currentY)
       .text(`$${taxes.qst.toFixed(2)}`, 450, currentY, { align: 'right' });
    currentY += 20;
  }
  
  // Line before total
  doc.strokeColor('#cccccc')
     .lineWidth(0.5)
     .moveTo(70, currentY)
     .lineTo(530, currentY)
     .stroke();
  
  currentY += 20;
  
  // Total with tax
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('TOTAL', 400, doc.y)
     .text(`$${totalWithTax.toFixed(2)}`, 500, doc.y, { align: 'right' });
  
  // Add a note
  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#666666')
     .text('Thank you for choosing Courier Platform for your shipping needs.', 50, doc.y + 40);
  
  doc.text('Payment is due within 30 days of invoice date.', 50, doc.y + 15);
  
  // Footer
  doc.fontSize(10)
     .fillColor('#666666')
     .text('Courier Platform - 1234 Delivery Lane, Vancouver, BC - contact@courierplatform.com', 50, 700, { align: 'center' });
  
  // Finalize the PDF
  doc.end();
  
  return filePath;
}

/**
 * Generates a PDF invoice for a shipment from the database
 * @param {Object} shipmentData - The shipment data from the database
 * @returns {string} The file path of the generated invoice
 */
function generateInvoiceFromDbData(shipmentData) {
  // Map database fields to the format expected by generateInvoice
  const shipment = {
    id: shipmentData.id,
    senderName: shipmentData.shipper_name || 'Shipper',
    pickupAddress: formatAddress(
      shipmentData.pickup_address,
      shipmentData.pickup_city,
      shipmentData.pickup_postal_code,
      shipmentData.province
    ),
    recipientName: 'Recipient',
    deliveryAddress: formatAddress(
      shipmentData.delivery_address,
      shipmentData.delivery_city,
      shipmentData.delivery_postal_code,
      shipmentData.province
    ),
    cost: shipmentData.quote_amount || 0,
    province: shipmentData.province || 'ON' // Add province for tax calculations, default to Ontario
  };
  
  return generateInvoice(shipment);
}

/**
 * Formats an address from individual components
 * @param {string} address - Street address
 * @param {string} city - City
 * @param {string} postalCode - Postal code
 * @param {string} province - Province code
 * @returns {string} Formatted address
 */
function formatAddress(address, city, postalCode, province) {
  const parts = [address];
  
  if (city && postalCode) {
    parts.push(`${city}, ${postalCode}`);
  } else if (city) {
    parts.push(city);
  } else if (postalCode) {
    parts.push(postalCode);
  }
  
  if (province) {
    parts.push(province);
  }
  
  return parts.join('\n');
}

/**
 * Calculate taxes based on province
 * @param {number} amount - Base amount
 * @param {string} province - Province code (2 letters)
 * @returns {Object} Tax breakdown
 */
function calculateTaxes(amount, province) {
  const taxInfo = PROVINCE_TAXES[province] || PROVINCE_TAXES['ON']; // Default to Ontario
  const result = {
    totalTaxAmount: 0,
    gst: 0,
    pst: 0,
    qst: 0,
    hst: 0,
    gstRate: taxInfo.gst || 0,
    pstRate: taxInfo.pst || 0,
    qstRate: taxInfo.qst || 0,
    hstRate: taxInfo.hst || 0
  };
  
  // Calculate GST
  if (taxInfo.gst) {
    result.gst = amount * (taxInfo.gst / 100);
    result.totalTaxAmount += result.gst;
  }
  
  // Calculate PST
  if (taxInfo.pst) {
    result.pst = amount * (taxInfo.pst / 100);
    result.totalTaxAmount += result.pst;
  }
  
  // Calculate QST (different calculation in Quebec)
  if (taxInfo.qst) {
    result.qst = (amount + result.gst) * (taxInfo.qst / 100);
    result.totalTaxAmount += result.qst;
  }
  
  // Calculate HST
  if (taxInfo.hst) {
    result.hst = amount * (taxInfo.hst / 100);
    result.totalTaxAmount += result.hst;
  }
  
  return result;
}

module.exports = {
  generateInvoiceFromDbData,
  calculateTaxes
}; 