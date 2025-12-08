/**
 * Platform detection utilities
 */

/**
 * Detects if the user is on a Mac platform
 * Uses userAgentData API with fallbacks to deprecated platform and userAgent
 */
export const isMacPlatform = (): boolean => {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  
  // Prefer userAgentData if available
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toUpperCase().includes('MAC');
  }
  
  // Fallback to platform
  if (navigator.platform) {
    return navigator.platform.toUpperCase().includes('MAC');
  }
  
  // Final fallback to userAgent
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
};
