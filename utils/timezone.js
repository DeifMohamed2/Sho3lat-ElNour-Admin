// Timezone utility functions for Egypt (Africa/Cairo timezone - EET, UTC+2)
const moment = require('moment-timezone');

const EGYPT_TIMEZONE = 'Africa/Cairo';

/**
 * Convert a date string to Egypt timezone Date object
 * @param {string} dateString - Date string in format "YYYY-MM-DD HH:MM:SS"
 * @returns {Date} Date object adjusted for Egypt timezone
 */
function parseToEgyptTime(dateString) {
  if (!dateString) {
    return getEgyptDate();
  }

  try {
    // ZKTeco format: "2025-01-24 14:30:00"
    // Parse assuming the time from device is already in Egypt timezone
    const normalizedDate = dateString.replace(' ', 'T');
    const momentDate = moment.tz(normalizedDate, 'YYYY-MM-DDTHH:mm:ss', EGYPT_TIMEZONE);
    
    if (!momentDate.isValid()) {
      // Try alternative format
      const altMoment = moment.tz(dateString, EGYPT_TIMEZONE);
      if (!altMoment.isValid()) {
        console.warn(`⚠️ Could not parse date: ${dateString}, using current Egypt time`);
        return getEgyptDate();
      }
      return altMoment.toDate();
    }

    return momentDate.toDate();
  } catch (err) {
    console.error('Error parsing date:', err);
    return getEgyptDate();
  }
}

/**
 * Get current date and time in Egypt timezone
 * @returns {Date} Current date in Egypt timezone
 */
function getEgyptDate() {
  return moment.tz(EGYPT_TIMEZONE).toDate();
}

/**
 * Get start of day in Egypt timezone (00:00:00)
 * @param {Date} date - Optional date, defaults to today
 * @returns {Date} Start of day in Egypt timezone
 */
function getEgyptDayStart(date = null) {
  const targetDate = date ? moment.tz(date, EGYPT_TIMEZONE) : moment.tz(EGYPT_TIMEZONE);
  return targetDate.startOf('day').toDate();
}

/**
 * Get end of day in Egypt timezone (23:59:59.999)
 * @param {Date} date - Optional date, defaults to today
 * @returns {Date} End of day in Egypt timezone
 */
function getEgyptDayEnd(date = null) {
  const targetDate = date ? moment.tz(date, EGYPT_TIMEZONE) : moment.tz(EGYPT_TIMEZONE);
  return targetDate.endOf('day').toDate();
}

/**
 * Format date to Egypt timezone string
 * @param {Date} date - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
function formatEgyptDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  return moment.tz(date, EGYPT_TIMEZONE).format(format);
}

/**
 * Get day boundaries (start and end) in Egypt timezone
 * @param {Date} date - Optional date, defaults to today
 * @returns {Object} Object with start and end dates
 */
function getEgyptDayBoundaries(date = null) {
  return {
    start: getEgyptDayStart(date),
    end: getEgyptDayEnd(date),
  };
}

module.exports = {
  parseToEgyptTime,
  getEgyptDate,
  getEgyptDayStart,
  getEgyptDayEnd,
  formatEgyptDate,
  getEgyptDayBoundaries,
};

