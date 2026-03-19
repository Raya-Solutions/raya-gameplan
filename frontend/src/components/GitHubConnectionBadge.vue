<template>
  <div class="github-connection">
    <!-- Not configured by admin -->
    <div v-if="!isGitHubSyncEnabled || !isOAuthConfigured" class="text-sm text-gray-500">
      GitHub integration not configured
    </div>

    <!-- Connected -->
    <div v-else-if="isGitHubConnected" class="flex items-center gap-2">
      <div class="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-sm text-green-700">
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span class="font-medium">@{{ gitHubUsername }}</span>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-red-500 transition-colors"
        @click="handleDisconnect"
      >
        Disconnect
      </button>
    </div>

    <!-- Not connected -->
    <div v-else>
      <button
        class="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        @click="handleConnect"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        Connect GitHub
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  isGitHubConnected,
  gitHubUsername,
  isGitHubSyncEnabled,
  isOAuthConfigured,
  connectGitHub,
  disconnectGitHub,
} from '@/data/githubConnection'

const props = defineProps<{
  redirectAfter?: string
}>()

function handleConnect() {
  connectGitHub(props.redirectAfter || window.location.pathname)
}

async function handleDisconnect() {
  if (confirm('Disconnect your GitHub account? You will need to re-authorize to use Git features.')) {
    await disconnectGitHub()
  }
}
</script>
