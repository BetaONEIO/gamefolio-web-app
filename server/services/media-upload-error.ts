/** Storage authentication failures are server configuration issues, not bad images. */
export function mediaUploadError(error: unknown, development = false) {
  const message = error instanceof Error ? error.message : (error as { message?: string } | null)?.message || "";
  if (/legacy api keys are disabled|invalid api key|api key.*(?:invalid|disabled|expired)/i.test(message)) {
    return {
      status: 503,
      code: "MEDIA_STORAGE_NOT_CONFIGURED",
      message: development
        ? "Banner storage credentials are disabled or invalid. Update the local Supabase API keys and restart the preview. Your image has not been saved."
        : "Banner uploads are temporarily unavailable. Your image has not been saved. Please try again later.",
    };
  }
  return { status: 500, code: "BANNER_UPLOAD_FAILED", message: "Could not save your banner. Please try again." };
}
