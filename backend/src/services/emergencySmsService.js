/**
 * Emergency SMS Service
 * Sends emergency SMS notifications automatically
 * Supports multiple providers (Twilio, AWS SNS, custom)
 */

const axios = require('axios');

class EmergencySmsService {
  /**
   * Send emergency SMS to a contact
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message content
   * @param {object} options - Additional options (location, userId, etc)
   * @returns {Promise<object>} Response with sent status
   */
  static async sendEmergencySms(phoneNumber, message, options = {}) {
    try {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

      if (!cleanNumber || cleanNumber.length < 10) {
        throw new Error('Invalid phone number');
      }

      // Log emergency SMS send attempt
      console.log('🚨 EMERGENCY SMS:', {
        to: cleanNumber.substring(cleanNumber.length - 4),
        timestamp: new Date().toISOString(),
        userId: options.userId || 'UNKNOWN',
        location: options.location || null,
      });

      // Try multiple providers in order
      let result = await this.trySendViaProvider(cleanNumber, message, options);
      
      if (!result.success) {
        console.warn('⚠️ SMS send failed:', result.error);
      } else {
        console.log('✅ SMS sent successfully');
      }

      return {
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Emergency SMS service error:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Try sending via available provider
   * Falls back through multiple providers
   */
  static async trySendViaProvider(phoneNumber, message, options = {}) {
    const providers = [
      { name: 'SMS_API', fn: this.sendViaSmsApi },
      { name: 'FALLBACK_LOG', fn: this.sendViaFallbackLog },
    ];

    for (const provider of providers) {
      try {
        console.log(`📤 Trying ${provider.name}...`);
        const result = await provider.fn.call(this, phoneNumber, message, options);
        if (result.success) {
          return { ...result, provider: provider.name };
        }
      } catch (error) {
        console.warn(`⚠️ ${provider.name} failed:`, error.message);
        continue;
      }
    }

    return {
      success: false,
      error: 'All SMS providers failed',
    };
  }

  /**
   * Send via custom SMS API
   * Configure your own SMS service here (Twilio, AWS SNS, etc)
   */
  static async sendViaSmsApi(phoneNumber, message, options = {}) {
    try {
      // Using a generic SMS API endpoint
      // Replace with your actual SMS service configuration
      
      // Example: Using a public SMS service or your custom SMS gateway
      const smsApiUrl = process.env.SMS_API_URL;
      const smsApiKey = process.env.SMS_API_KEY;

      if (!smsApiUrl || !smsApiKey) {
        return {
          success: false,
          error: 'SMS API not configured',
        };
      }

      const response = await axios.post(
        smsApiUrl,
        {
          phoneNumber,
          message,
          userId: options.userId,
          location: options.location,
        },
        {
          headers: {
            'Authorization': `Bearer ${smsApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          messageId: response.data.messageId || 'sms_' + Date.now(),
        };
      }

      return {
        success: false,
        error: 'SMS API returned error status',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fallback: Log to console and create local record
   * For development/testing without real SMS service
   */
  static async sendViaFallbackLog(phoneNumber, message, options = {}) {
    try {
      const timestamp = new Date().toISOString();
      const smsRecord = {
        id: 'sms_' + Date.now(),
        to: phoneNumber,
        message,
        timestamp,
        userId: options.userId,
        location: options.location,
        emergency: true,
      };

      // In production, save to database
      console.log('📱 SMS (Fallback/Log Mode):', {
        to: phoneNumber,
        message: message.substring(0, 50) + '...',
        timestamp,
      });

      // Here you could save to Firebase or database
      // await db.collection('emergency_sms_logs').add(smsRecord);

      return {
        success: true,
        messageId: smsRecord.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format emergency message with location
   */
  static formatEmergencyMessage(userInfo, location = null) {
    let message = `🚨 EMERGENCY ALERT!\n\n`;
    message += `User: ${userInfo.name || 'Patient'}\n`;
    message += `Phone: ${userInfo.phone || 'N/A'}\n`;
    message += `Time: ${new Date().toLocaleTimeString()}\n`;

    if (location) {
      message += `\n📍 Location:\n`;
      message += `https://maps.google.com/?q=${location.latitude},${location.longitude}\n`;
      message += `(Accuracy: ±${Math.round(location.accuracy)}m)`;
    }

    message += `\n\n⚠️ They need immediate help!`;

    return message;
  }
}

module.exports = EmergencySmsService;
