const NETWORK_ERROR_PATTERN = /fetch|network|offline|timed?\s*out|econn|enet|dns|socket/i

export function getAgentErrorMessage(error: unknown, networkErrorMessage: string): string {
  const message = error instanceof Error ? error.message : String(error)
  return NETWORK_ERROR_PATTERN.test(message) ? networkErrorMessage : message
}
