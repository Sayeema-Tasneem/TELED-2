/**
 * Facility Status Service
 * Determines if a facility is currently open or closed based on operating hours
 */

/**
 * Parse operating hours string and determine if open now
 * Supports formats like:
 * - "24/7"
 * - "09:00 - 21:00"
 * - "Mon-Fri: 09:00 - 18:00, Sat: 10:00 - 16:00"
 */
export function isCurrentlyOpen(operatingHours, currentDate = new Date()) {
  if (!operatingHours) {
    return null; // Unknown status
  }

  const hours = operatingHours.trim();

  // Check for 24/7
  if (hours.toLowerCase().includes('24/7')) {
    return true;
  }

  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  const currentTime = currentHour * 100 + currentMinute; // e.g., 14:30 = 1430

  // Parse simple time range like "09:00 - 21:00"
  const timeRangeMatch = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (timeRangeMatch) {
    const openHour = parseInt(timeRangeMatch[1]);
    const openMin = parseInt(timeRangeMatch[2]);
    const closeHour = parseInt(timeRangeMatch[3]);
    const closeMin = parseInt(timeRangeMatch[4]);

    const openTime = openHour * 100 + openMin;
    const closeTime = closeHour * 100 + closeMin;

    if (closeTime < openTime) {
      // Night shift (e.g., 22:00 - 06:00)
      return currentTime >= openTime || currentTime < closeTime;
    }
    return currentTime >= openTime && currentTime < closeTime;
  }

  // If we can't parse it, assume open
  return null;
}

/**
 * Get human-readable status with timing info
 */
export function getStatusLabel(operatingHours, currentDate = new Date()) {
  const isOpen = isCurrentlyOpen(operatingHours, currentDate);

  if (isOpen === true) {
    return 'Open';
  } else if (isOpen === false) {
    return 'Closed';
  }
  return 'Hours Unknown';
}

/**
 * Get status color (green for open, red for closed)
 */
export function getStatusColor(operatingHours, currentDate = new Date()) {
  const isOpen = isCurrentlyOpen(operatingHours, currentDate);

  if (isOpen === true) {
    return '#43A047'; // Green
  } else if (isOpen === false) {
    return '#E53935'; // Red
  }
  return '#FF9800'; // Orange for unknown
}

/**
 * Get next time facility will open/close
 */
export function getNextStatusChange(operatingHours) {
  const hours = operatingHours?.trim();

  if (!hours || hours.toLowerCase().includes('24/7')) {
    return null;
  }

  // Simple case: fixed time range
  const timeRangeMatch = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (timeRangeMatch) {
    const openHour = parseInt(timeRangeMatch[1]);
    const openMin = parseInt(timeRangeMatch[2]);
    const closeHour = parseInt(timeRangeMatch[3]);
    const closeMin = parseInt(timeRangeMatch[4]);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 100 + currentMinute;

    const openTime = openHour * 100 + openMin;
    const closeTime = closeHour * 100 + closeMin;

    if (currentTime < openTime) {
      return `Opens at ${formatTime(openHour, openMin)}`;
    } else if (currentTime < closeTime) {
      return `Closes at ${formatTime(closeHour, closeMin)}`;
    } else {
      return `Opens tomorrow at ${formatTime(openHour, openMin)}`;
    }
  }

  return null;
}

/**
 * Format time as HH:MM
 */
function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default {
  isCurrentlyOpen,
  getStatusLabel,
  getStatusColor,
  getNextStatusChange,
};
