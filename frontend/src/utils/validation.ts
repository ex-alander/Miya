export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function validateDeckTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return "Title is required";
  }
  if (title.length > 200) {
    return "Title must be 200 characters or less";
  }
  return null;
}

export function validateDeckDescription(description: string | null | undefined): string | null {
  if (description && description.length > 1000) {
    return "Description must be 1000 characters or less";
  }
  return null;
}

export function validateDeck(data: { title: string; description?: string | null }): ValidationResult {
  const errors: ValidationError[] = [];

  const titleError = validateDeckTitle(data.title);
  if (titleError) {
    errors.push({ field: "title", message: titleError });
  }

  const descError = validateDeckDescription(data.description);
  if (descError) {
    errors.push({ field: "description", message: descError });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
