const axios = require('axios');

class Contact {
  /**
   * Submit contact form to API
   * @param {Object} contactData - Contact form data
   * @returns {Promise<Object>}
   */
  static async submitContact(contactData) {
    try {
      const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';
      
      const response = await axios.post(`${API_URL}/api/contact/submit`, {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        message: contactData.message,
        source: 'website',
        timestamp: new Date()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Contact submission error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit contact form'
      };
    }
  }

  /**
   * Get all contact enquiries (for admin)
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  static async getAllContacts(filters = {}) {
    try {
      const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';
      
      const response = await axios.get(`${API_URL}/api/contact/all`, {
        params: filters
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Fetch contacts error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch contacts'
      };
    }
  }

  /**
   * Mark contact as read
   * @param {String} contactId - Contact ID
   * @returns {Promise<Object>}
   */
  static async markAsRead(contactId) {
    try {
      const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';
      
      const response = await axios.patch(`${API_URL}/api/contact/${contactId}/read`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Mark as read error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to mark as read'
      };
    }
  }

  /**
   * Delete contact enquiry
   * @param {String} contactId - Contact ID
   * @returns {Promise<Object>}
   */
  static async deleteContact(contactId) {
    try {
      const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';
      
      const response = await axios.delete(`${API_URL}/api/contact/${contactId}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Delete contact error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete contact'
      };
    }
  }
}

module.exports = Contact;
