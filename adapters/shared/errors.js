export const serializeError = (error) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  // For objects, attempt JSON serialization for better debuggability
  if (typeof error === 'object' && error !== null) {
    try {
      return { message: JSON.stringify(error) };
    } catch (e) {
      return { message: String(error) };
    }
  }

  return { message: String(error) };
};
