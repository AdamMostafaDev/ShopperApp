// Centralized error messages for consistent UX
export const ERROR_MESSAGES = {
  PRODUCT_CAPTURE_FAILED: 'We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.',
  SCRAPER_API_ERROR: 'We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.',
  GENERIC_ERROR: 'We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.'
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;