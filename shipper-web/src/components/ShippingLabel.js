import React from 'react';

const ShippingLabel = ({ shipment }) => {
  // Default shipment data if not provided
  const defaultShipment = {
    trackingNumber: `MML${shipment?.id?.toString().padStart(6, '0') || '000000'}`,
    serviceLevel: (shipment?.shipment_type || 'standard').toUpperCase(),
    shipDate: shipment?.created_at ? new Date(shipment.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    
    sender: {
      name: shipment?.shipper_name || 'Shipper',
      company: 'Moving Mountains Logistics',
      address1: shipment?.pickup_address || 'N/A',
      address2: '',
      city: shipment?.pickup_city || 'N/A',
      state: '',
      zip: shipment?.pickup_postal_code || 'N/A',
      country: 'USA'
    },
    
    recipient: {
      name: 'Recipient',
      company: '',
      address1: shipment?.delivery_address || 'N/A',
      address2: '',
      city: shipment?.delivery_city || 'N/A',
      state: '',
      zip: shipment?.delivery_postal_code || 'N/A',
      country: 'USA'
    },
    
    package: {
      weight: shipment?.weight ? `${shipment.weight} kg` : 'N/A',
      dimensions: shipment?.length && shipment?.width && shipment?.height ? 
        `${shipment.length}×${shipment.width}×${shipment.height} in` : 'N/A',
      specialInstructions: shipment?.is_fragile ? 'FRAGILE - Handle with care' : 
                          (shipment?.requires_refrigeration ? 'KEEP REFRIGERATED' : ''),
      routeCode: 'EA-5',
      zoneCode: 'NE-2'
    }
  };
  
  // Merge provided shipment with defaults
  const labelData = shipment ? { ...defaultShipment } : defaultShipment;
  
  // Styles
  const styles = {
    container: {
      border: '2px solid #1e293b',
      width: '384px',
      minHeight: '384px',
      padding: '12px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px',
    },
    serviceBanner: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      padding: '4px 0',
      width: '66%',
    },
    logoContainer: {
      textAlign: 'right',
    },
    logoText: {
      color: '#3b82f6',
      fontWeight: 'bold',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    companyInfo: {
      color: '#3b82f6',
      fontSize: '10px',
      marginTop: '4px',
    },
    addressSection: {
      display: 'flex',
      marginBottom: '16px',
    },
    addressColumn: {
      width: '50%',
    },
    addressLeft: {
      paddingRight: '8px',
    },
    addressRight: {
      paddingLeft: '8px',
    },
    addressLabel: {
      color: '#3b82f6',
      fontWeight: 'bold',
      fontSize: '10px',
      marginBottom: '4px',
    },
    addressText: {
      fontSize: '10px',
    },
    recipientText: {
      fontSize: '10px',
      fontWeight: 'bold',
    },
    packageDetails: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      marginBottom: '16px',
    },
    packageLeft: {
      width: '50%',
    },
    packageRight: {
      width: '50%',
      textAlign: 'right',
    },
    detailLabel: {
      fontWeight: 'bold',
      marginRight: '4px',
    },
    detailItem: {
      marginBottom: '4px',
    },
    trackingSection: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '16px',
    },
    qrCode: {
      width: '96px',
      height: '96px',
      backgroundColor: '#000000',
      padding: '6px',
      marginRight: '16px',
    },
    qrInner: {
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gridTemplateRows: 'repeat(6, 1fr)',
      gap: '2px',
    },
    qrBlack: {
      backgroundColor: '#000000',
    },
    qrWhite: {
      backgroundColor: '#ffffff',
    },
    trackingInfo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    scanText: {
      fontSize: '12px',
      fontWeight: 'bold',
      marginBottom: '4px',
    },
    trackingNumber: {
      fontSize: '10px',
      fontFamily: 'monospace',
    },
    scanInstructions: {
      fontSize: '10px',
      marginTop: '8px',
    },
    specialInstructions: {
      border: '1px solid #9ca3af',
      padding: '4px',
      fontSize: '10px',
      marginBottom: '16px',
    },
    specialTitle: {
      fontWeight: 'bold',
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 'auto',
      paddingTop: '16px',
    },
    dateInfo: {
      fontSize: '10px',
    },
    ecoFriendly: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '4px',
      color: '#10b981',
      fontSize: '10px',
    },
    ecoBox: {
      width: '10px',
      height: '10px',
      backgroundColor: '#10b981',
      marginRight: '4px',
    },
    smallQR: {
      width: '64px',
      height: '64px',
      backgroundColor: '#000000',
      padding: '4px',
    },
    smallQRInner: {
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(4, 1fr)',
      gap: '2px',
    },
  };

  // QR code for tracking (primary)
  const TrackingQRCode = () => (
    <div style={styles.qrCode}>
      <div style={styles.qrInner}>
        {/* Position detection patterns (corners) */}
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrWhite}></div>
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
        
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrBlack}></div>
        
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrWhite}></div>
        <div style={styles.qrWhite}></div>
      </div>
    </div>
  );
  
  // Small QR code for bottom corner
  const SmallQRCode = () => (
    <div style={styles.smallQR}>
      <div style={styles.smallQRInner}>
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
        <div style={styles.qrBlack}></div>
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={styles.qrBlack}></div>
        <div style={{...styles.qrBlack, gridColumn: 'span 2', gridRow: 'span 2'}}></div>
      </div>
    </div>
  );
  
  // Mountain logo
  const MountainLogo = () => (
    <div style={styles.logoText}>
      <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
        <path d="M8 18L0 10L3 7L8 12L21 0L24 3L8 18Z" fill="#3b82f6" />
      </svg>
      <span>MOVING MOUNTAINS</span>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Top section with logo and service level */}
      <div style={styles.header}>
        <div style={styles.serviceBanner}>
          {labelData.serviceLevel}
        </div>
        
        {/* Logo and carrier info */}
        <div style={styles.logoContainer}>
          <MountainLogo />
          <div style={styles.companyInfo}>
            <div>Moving Mountains Logistics</div>
            <div>Delivering Above & Beyond</div>
          </div>
        </div>
      </div>
      
      {/* Address Section */}
      <div style={styles.addressSection}>
        {/* FROM Section */}
        <div style={{...styles.addressColumn, ...styles.addressLeft}}>
          <div style={styles.addressLabel}>FROM:</div>
          <div style={styles.addressText}>
            <div>{labelData.sender.name}</div>
            <div>{labelData.sender.company}</div>
            <div>{labelData.sender.address1}</div>
            {labelData.sender.address2 && <div>{labelData.sender.address2}</div>}
            <div>
              {labelData.sender.city}
              {labelData.sender.state && `, ${labelData.sender.state}`} 
              {labelData.sender.zip}
            </div>
            <div>{labelData.sender.country}</div>
          </div>
        </div>
        
        {/* TO Section */}
        <div style={{...styles.addressColumn, ...styles.addressRight}}>
          <div style={styles.addressLabel}>TO:</div>
          <div style={styles.recipientText}>
            <div>{labelData.recipient.name}</div>
            {labelData.recipient.company && <div>{labelData.recipient.company}</div>}
            <div>{labelData.recipient.address1}</div>
            {labelData.recipient.address2 && <div>{labelData.recipient.address2}</div>}
            <div>
              {labelData.recipient.city}
              {labelData.recipient.state && `, ${labelData.recipient.state}`} 
              {labelData.recipient.zip}
            </div>
            <div>{labelData.recipient.country}</div>
          </div>
        </div>
      </div>
      
      {/* Package Details */}
      <div style={styles.packageDetails}>
        <div style={styles.packageLeft}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Weight:</span> {labelData.package.weight}
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Route:</span> {labelData.package.routeCode}
          </div>
        </div>
        <div style={styles.packageRight}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Dimensions:</span> {labelData.package.dimensions}
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Zone:</span> {labelData.package.zoneCode}
          </div>
        </div>
      </div>
      
      {/* QR Code Tracking Section */}
      <div style={styles.trackingSection}>
        <TrackingQRCode />
        <div style={styles.trackingInfo}>
          <div style={styles.scanText}>SCAN TO TRACK</div>
          <div style={styles.trackingNumber}>{labelData.trackingNumber}</div>
          <div style={styles.scanInstructions}>Scan with your phone's</div>
          <div style={styles.scanInstructions}>camera to track package</div>
        </div>
      </div>
      
      {/* Special Instructions */}
      {labelData.package.specialInstructions && (
        <div style={styles.specialInstructions}>
          <div style={styles.specialTitle}>SPECIAL INSTRUCTIONS:</div>
          <div>{labelData.package.specialInstructions}</div>
        </div>
      )}
      
      {/* Bottom row with small QR code and dates */}
      <div style={styles.footer}>
        <div style={styles.dateInfo}>
          <div>Ship Date: {labelData.shipDate}</div>
          <div style={styles.ecoFriendly}>
            <div style={styles.ecoBox}></div>
            <span>Mountain Pass Eco-Friendly</span>
          </div>
        </div>
        <SmallQRCode />
      </div>
    </div>
  );
};

export default ShippingLabel; 