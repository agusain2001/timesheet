const SAFE_TEXT_REGEX = /^[a-zA-Z0-9 \-&'().,]+$/;

/**
 * Validates a text field to ensure it doesn't contain dangerous special characters.
 * Useful for checking entity names like Client Name, Project Title, Employee Name, etc.
 * @param value The text input value.
 * @param fieldName Human-readable name of the field.
 * @param maxLen Maximum characters allowed.
 * @returns Error message if invalid, or null if valid.
 */
export function validateSafeText(value: string | undefined | null, fieldName: string, maxLen: number = 100): string | null {
    if (!value || !value.trim()) return `${fieldName} is required.`;
    const trimmed = value.trim();
    if (trimmed.length < 2) return `${fieldName} must be at least 2 characters.`;
    if (trimmed.length > maxLen) return `${fieldName} must be ${maxLen} characters or fewer.`;
    if (!SAFE_TEXT_REGEX.test(trimmed)) {
        return `${fieldName} can only contain letters, numbers, spaces, and basic punctuation (- & ' . , ()).`;
    }
    return null;
}
