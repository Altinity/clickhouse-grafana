/**
 * ClickHouse Error Handling Utilities
 * Provides centralized error detection and handling for permission-related errors
 */

// Known ClickHouse permission-related error codes
const PERMISSION_ERROR_CODES = [
  497,  // ACCESS_DENIED
  516,  // AUTHENTICATION_FAILED
  192,  // UNKNOWN_USER
  193,  // WRONG_PASSWORD
  194,  // REQUIRED_PASSWORD
  195,  // IP_ADDRESS_NOT_ALLOWED
  291,  // DATABASE_ACCESS_DENIED
  482,  // DICTIONARY_ACCESS_DENIED
  673,  // RESOURCE_ACCESS_DENIED
  711,  // FILECACHE_ACCESS_DENIED
];

// Text patterns that indicate permission errors
const PERMISSION_ERROR_PATTERNS = [
  'ACCESS_DENIED',
  'Not enough privileges',
  'access denied',
  'AUTHENTICATION_FAILED',
  'UNKNOWN_USER',
  'WRONG_PASSWORD',
  'REQUIRED_PASSWORD',
  'IP_ADDRESS_NOT_ALLOWED',
  'DATABASE_ACCESS_DENIED',
  'DICTIONARY_ACCESS_DENIED',
  'RESOURCE_ACCESS_DENIED',
];

/**
 * Checks if an error is related to permissions/access denial
 * @param error - The error object to check
 * @returns true if the error is permission-related, false otherwise
 */
export function isPermissionError(error: any): boolean {
  if (!error) {
    return false;
  }

  // Check for error codes in various locations
  const errorCode = error?.status || error?.data?.status;
  if (errorCode && PERMISSION_ERROR_CODES.includes(errorCode)) {
    return true;
  }

  // Check for error message patterns
  const errorMessage = error?.data?.exception || error?.message || '';
  if (!errorMessage) {
    return false;
  }

  // Check if message contains any permission error patterns
  const messageContainsPattern = PERMISSION_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern)
  );

  // Also check for "Code: XXX" format in error messages
  const containsErrorCode = PERMISSION_ERROR_CODES.some(code => 
    errorMessage.includes(`Code: ${code}`)
  );

  return messageContainsPattern || containsErrorCode;
}

/**
 * Context-specific error messages for better logging
 */
export const PermissionErrorContext = {
  ADHOC_KEYS: 'adhoc-keys',
  ADHOC_VALUES: 'adhoc-values',
  AUTOCOMPLETE: 'autocomplete',
  DATABASES: 'databases',
  TABLES: 'tables',
  COLUMNS: 'columns',
  QUERY_BUILDER: 'query-builder',
  SYSTEM_DATABASES: 'system-databases',
} as const;

export type PermissionErrorContextType = typeof PermissionErrorContext[keyof typeof PermissionErrorContext];

/**
 * Gets an appropriate log message for a permission error based on context
 * @param context - The context where the error occurred
 * @param datasourceId - Optional datasource identifier for more specific logging
 * @returns A user-friendly log message
 */
export function getPermissionErrorMessage(
  context: PermissionErrorContextType,
  datasourceId?: string
): string {
  const messages: Record<PermissionErrorContextType, string> = {
    [PermissionErrorContext.ADHOC_KEYS]: 'System.columns table inaccessible - ad-hoc filters disabled',
    [PermissionErrorContext.ADHOC_VALUES]: 'System.columns table inaccessible - cannot fetch tag values',
    [PermissionErrorContext.AUTOCOMPLETE]: 'System tables inaccessible - autocomplete disabled',
    [PermissionErrorContext.DATABASES]: 'System table access denied for DATABASES query - returning empty result',
    [PermissionErrorContext.TABLES]: 'System table access denied for TABLES query - returning empty result',
    [PermissionErrorContext.COLUMNS]: 'System table access denied for COLUMNS query - returning empty result',
    [PermissionErrorContext.QUERY_BUILDER]: 'System table access denied - returning empty result',
    [PermissionErrorContext.SYSTEM_DATABASES]: 'System tables inaccessible - system database list disabled',
  };

  const baseMessage = messages[context] || 'Permission denied - returning empty result';
  
  if (datasourceId) {
    return `${baseMessage} for datasource: ${datasourceId}`;
  }
  
  return baseMessage;
}

/**
 * Handles a permission error by logging it appropriately and returning a safe default value
 * @param error - The error to handle
 * @param context - The context where the error occurred
 * @param datasourceId - Optional datasource identifier
 * @param defaultValue - The default value to return (default: [])
 * @returns The default value
 */
export function handlePermissionError<T = any[]>(
  error: any,
  context: PermissionErrorContextType,
  datasourceId?: string,
  defaultValue: T = [] as any
): T {
  if (isPermissionError(error)) {
    console.info(getPermissionErrorMessage(context, datasourceId));
    return defaultValue;
  }
  
  // If it's not a permission error, re-throw it
  throw error;
}
