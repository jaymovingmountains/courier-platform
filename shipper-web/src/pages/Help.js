import React, { useState } from 'react';
import './Help.css';

const Help = () => {
  const [activeSection, setActiveSection] = useState('faq');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I create a new shipment?',
      answer: 'To create a new shipment, click on the "Create Shipment" button in the navigation menu. Fill in the required details including pickup and delivery addresses, package information, and any special handling instructions.'
    },
    {
      id: 2,
      question: 'How can I track my shipments?',
      answer: 'You can track your shipments by clicking on the "Track Shipments" link in the navigation menu. This will show you a list of all your shipments with their current status and location.'
    },
    {
      id: 3,
      question: 'How do I manage my client list?',
      answer: 'Navigate to the "Manage Clients" section from the main menu. Here you can add new clients, edit existing client information, and view your client history.'
    },
    {
      id: 4,
      question: 'What do the different shipment statuses mean?',
      answer: 'Shipment statuses include: Pending (awaiting processing), Quoted (price provided), Approved (ready for pickup), Assigned (driver assigned), Picked Up (in transit), and Delivered (completed).'
    },
    {
      id: 5,
      question: 'How can I update my account settings?',
      answer: 'Click on your profile picture in the top right corner and select "Settings" from the dropdown menu. Here you can update your profile information, notification preferences, and security settings.'
    }
  ];

  const supportChannels = [
    {
      icon: 'fa-envelope',
      title: 'Email Support',
      description: 'Send us an email at support@courierplatform.com',
      action: 'mailto:support@courierplatform.com'
    },
    {
      icon: 'fa-phone',
      title: 'Phone Support',
      description: 'Call us at 1-800-COURIER (268-7437)',
      action: 'tel:18002687437'
    },
    {
      icon: 'fa-comments',
      title: 'Live Chat',
      description: 'Chat with our support team (24/7)',
      action: '#chat'
    },
    {
      icon: 'fa-book',
      title: 'Documentation',
      description: 'Browse our detailed documentation',
      action: '#docs'
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="help-container">
      <div className="help-header">
        <h1>Help & Support</h1>
        <div className="section-tabs">
          <button
            className={`tab-button ${activeSection === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveSection('faq')}
          >
            FAQs
          </button>
          <button
            className={`tab-button ${activeSection === 'support' ? 'active' : ''}`}
            onClick={() => setActiveSection('support')}
          >
            Support
          </button>
        </div>
      </div>

      {activeSection === 'faq' && (
        <div className="faq-section">
          <div className="faq-list">
            {faqs.map((faq) => (
              <div 
                key={faq.id} 
                className={`faq-item ${expandedFaq === faq.id ? 'expanded' : ''}`}
                onClick={() => toggleFaq(faq.id)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <i className={`fas fa-chevron-${expandedFaq === faq.id ? 'up' : 'down'}`}></i>
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'support' && (
        <div className="support-section">
          <div className="support-grid">
            {supportChannels.map((channel, index) => (
              <a 
                key={index}
                href={channel.action}
                className="support-card"
                target={channel.action.startsWith('http') ? '_blank' : '_self'}
                rel={channel.action.startsWith('http') ? 'noopener noreferrer' : ''}
              >
                <div className="support-icon">
                  <i className={`fas ${channel.icon}`}></i>
                </div>
                <h3>{channel.title}</h3>
                <p>{channel.description}</p>
              </a>
            ))}
          </div>

          <div className="support-note">
            <i className="fas fa-clock"></i>
            <p>Our support team is available 24/7 to assist you with any questions or concerns.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Help; 