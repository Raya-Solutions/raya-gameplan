import { createResource } from 'frappe-ui'
import { computed, ref } from 'vue'

/** Reactive GitHub connection state for the current user. */

const connectionStatus = createResource({
  url: 'ops_maturity.api.github_connection_status',
  auto: true,
  cache: 'github-connection-status',
})

const oauthConfig = createResource({
  url: 'ops_maturity.api.github_oauth_config',
  auto: true,
  cache: 'github-oauth-config',
})

export const isGitHubConnected = computed(() => {
  return connectionStatus.data?.connected === true
})

export const gitHubUsername = computed(() => {
  return connectionStatus.data?.github_username || ''
})

export const connectedAt = computed(() => {
  return connectionStatus.data?.connected_at || null
})

export const isOAuthConfigured = computed(() => {
  return oauthConfig.data?.oauth_configured === true
})

export const isGitHubSyncEnabled = computed(() => {
  return oauthConfig.data?.github_sync_enabled === true
})

export function connectGitHub(redirectAfter?: string) {
  const params = new URLSearchParams()
  if (redirectAfter) {
    params.set('redirect_after', redirectAfter)
  }
  const url = '/api/method/ops_maturity.api.github_authorize?' + params.toString()
  window.location.href = url
}

const disconnectResource = createResource({
  url: 'ops_maturity.api.github_disconnect',
})

export async function disconnectGitHub() {
  await disconnectResource.submit()
  connectionStatus.reload()
}

export function reloadConnectionStatus() {
  connectionStatus.reload()
}

export { connectionStatus, oauthConfig }
