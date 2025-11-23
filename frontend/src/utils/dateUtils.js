/**
 * Date/Time utilities for consistent Philippines timezone formatting
 * All dates from backend are already in Philippines timezone (Asia/Manila, UTC+8)
 */

const PHILIPPINES_TIMEZONE = 'Asia/Manila';
const LOCALE = 'en-PH';

/**
 * Format datetime to Philippines timezone display
 * @param {string|Date} dateString - Date string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateTimePH = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TIMEZONE,
    ...options
  };
  
  return date.toLocaleString(LOCALE, defaultOptions);
};

/**
 * Format date only (no time) to Philippines timezone
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string (MM/DD/YYYY)
 */
export const formatDatePH = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: PHILIPPINES_TIMEZONE
  });
};

/**
 * Format time only (no date) to Philippines timezone
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted time string
 */
export const formatTimePH = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TIMEZONE
  });
};

/**
 * Get current date in Philippines timezone (for date inputs)
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getTodayPH = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format date for display with long month name
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string (e.g., "January 1, 2024")
 */
export const formatLongDatePH = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PHILIPPINES_TIMEZONE
  });
};

/**
 * Format datetime for PDF reports
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateTimeForPDF = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TIMEZONE
  });
};

/**
 * Get start of day in Philippines timezone (for filtering)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {Date} Date object at start of day
 */
export const getStartOfDayPH = (dateString) => {
  const date = new Date(dateString);
  // Create a date string in Philippines timezone
  const phDateString = date.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE
  });
  // Create new date at midnight Philippines time
  return new Date(phDateString + 'T00:00:00');
};

/**
 * Get end of day in Philippines timezone (for filtering)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {Date} Date object at end of day
 */
export const getEndOfDayPH = (dateString) => {
  const date = new Date(dateString);
  // Create a date string in Philippines timezone
  const phDateString = date.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE
  });
  // Create new date at end of day Philippines time
  return new Date(phDateString + 'T23:59:59.999');
};

/**
 * Compare two dates (date only, ignoring time)
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDatesPH = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const d1Str = d1.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE
  });
  const d2Str = d2.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE
  });
  
  if (d1Str < d2Str) return -1;
  if (d1Str > d2Str) return 1;
  return 0;
};

/**
 * Get current datetime in Philippines timezone
 * @returns {Date} Current date/time
 */
export const getNowPH = () => {
  return new Date();
};

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINES_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format relative time (e.g., "2 hours ago", "just now")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTimePH = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  
  return formatDatePH(dateString);
};