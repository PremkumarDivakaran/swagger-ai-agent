/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format date to local string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format HTTP method for display
 */
export function formatMethod(method: string): string {
  return method.toUpperCase();
}

/**
 * Get color class for HTTP method
 */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    get: 'text-green-600 bg-green-100',
    post: 'text-blue-600 bg-blue-100',
    put: 'text-yellow-600 bg-yellow-100',
    patch: 'text-orange-600 bg-orange-100',
    delete: 'text-red-600 bg-red-100',
    head: 'text-purple-600 bg-purple-100',
    options: 'text-gray-600 bg-gray-100',
  };
  return colors[method.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

/**
 * Get color class for status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-gray-600 bg-gray-100',
    running: 'text-blue-600 bg-blue-100',
    passed: 'text-green-600 bg-green-100',
    completed: 'text-green-600 bg-green-100',
    failed: 'text-red-600 bg-red-100',
    skipped: 'text-yellow-600 bg-yellow-100',
    cancelled: 'text-orange-600 bg-orange-100',
  };
  return colors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
}
