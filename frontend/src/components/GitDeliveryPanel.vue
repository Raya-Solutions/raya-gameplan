<template>
  <div v-if="isGitHubConnected" class="space-y-3" data-git-delivery-panel>
    <!-- Branch Section -->
    <div>
      <div class="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ink-gray-5">Branch</div>
      <div v-if="hasBranch" class="space-y-1.5">
        <a
          v-if="branchUrl"
          :href="branchUrl"
          target="_blank"
          rel="noreferrer"
          class="block rounded-lg border bg-surface-white px-3 py-2 text-sm transition hover:bg-surface-gray-2"
        >
          <div class="flex items-center gap-2">
            <svg class="h-3.5 w-3.5 text-ink-gray-5" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
            </svg>
            <span class="font-mono text-xs text-ink-gray-7 truncate">{{ workingBranch }}</span>
          </div>
          <div class="mt-0.5 text-xs text-ink-gray-4">from {{ baseBranch }}</div>
        </a>
      </div>
      <div v-else class="flex gap-2">
        <button
          class="flex-1 rounded-md border bg-surface-white px-2.5 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2 disabled:opacity-50"
          :disabled="isCreatingBranch"
          @click="handleCreateBranch"
        >
          {{ isCreatingBranch ? 'Creating...' : 'Create Branch' }}
        </button>
        <button
          class="rounded-md border bg-surface-white px-2.5 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
          @click="showLinkInput = !showLinkInput"
        >
          Link
        </button>
      </div>
      <div v-if="showLinkInput" class="mt-2 flex gap-2">
        <input
          v-model="linkBranchName"
          type="text"
          placeholder="branch-name"
          class="flex-1 rounded-md border bg-surface-white px-2.5 py-1.5 text-xs text-ink-gray-7 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
          @keydown.enter="handleLinkBranch"
        />
        <button
          class="rounded-md border bg-surface-white px-2.5 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2 disabled:opacity-50"
          :disabled="!linkBranchName.trim() || isLinkingBranch"
          @click="handleLinkBranch"
        >
          {{ isLinkingBranch ? '...' : 'Go' }}
        </button>
      </div>
    </div>

    <!-- CI Status Section (only when branch exists) -->
    <div v-if="hasBranch">
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-[0.08em] text-ink-gray-5">CI Status</span>
        <button
          class="text-xs text-ink-gray-4 hover:text-ink-gray-7 transition-colors disabled:opacity-50"
          :disabled="isRefreshingCI"
          @click="doRefreshCI"
        >
          {{ isRefreshingCI ? 'Checking...' : 'Refresh' }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <span :class="ciStatusBadgeClass">{{ ciStatusLabel }}</span>
        <a
          v-if="ciStatusUrl"
          :href="ciStatusUrl"
          target="_blank"
          rel="noreferrer"
          class="text-xs text-ink-gray-4 hover:text-ink-gray-7 transition-colors"
        >
          Details
        </a>
      </div>
      <div v-if="ciUpdatedAt" class="mt-0.5 text-xs text-ink-gray-4">
        Updated {{ ciUpdatedAt }}
      </div>
    </div>

    <!-- PR Section (only when branch exists) -->
    <div v-if="hasBranch">
      <div class="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ink-gray-5">Pull Request</div>
      <div v-if="hasPR">
        <a
          :href="prUrl || '#'"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-2 rounded-lg border bg-surface-white px-3 py-2 text-sm transition hover:bg-surface-gray-2"
        >
          <span class="font-medium text-ink-gray-8">#{{ prNumber }}</span>
          <span v-if="prState" :class="prStateBadgeClass">{{ prState }}</span>
        </a>
      </div>
      <div v-else>
        <button
          class="w-full rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50"
          :class="canCreatePR
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'border bg-surface-white text-ink-gray-5 cursor-not-allowed'"
          :disabled="!canCreatePR || isCreatingPR"
          :title="!canCreatePR ? 'CI checks must pass before creating a PR' : ''"
          @click="handleCreatePR"
        >
          {{ isCreatingPR ? 'Creating PR...' : canCreatePR ? 'Create Draft PR' : 'Create PR (CI must pass)' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { isGitHubConnected } from '@/data/githubConnection'
import { useGitDelivery } from '@/data/gitDelivery'

const props = defineProps<{ taskName: string }>()

const {
  workingBranch,
  baseBranch,
  branchUrl,
  ciStatus,
  ciStatusUrl,
  ciUpdatedAt,
  prNumber,
  prUrl,
  prState,
  hasBranch,
  hasPR,
  canCreatePR,
  doCreateBranch,
  doLinkBranch,
  doRefreshCI,
  doCreatePR,
  isCreatingBranch,
  isLinkingBranch,
  isRefreshingCI,
  isCreatingPR,
} = useGitDelivery(() => props.taskName)

const showLinkInput = ref(false)
const linkBranchName = ref('')

async function handleCreateBranch() {
  try {
    await doCreateBranch()
  } catch (e: any) {
    console.error('Create branch failed:', e)
  }
}

async function handleLinkBranch() {
  if (!linkBranchName.value.trim()) return
  try {
    await doLinkBranch(linkBranchName.value.trim())
    showLinkInput.value = false
    linkBranchName.value = ''
  } catch (e: any) {
    console.error('Link branch failed:', e)
  }
}

async function handleCreatePR() {
  try {
    await doCreatePR()
  } catch (e: any) {
    console.error('Create PR failed:', e)
  }
}

const ciStatusLabel = computed(() => {
  const s = ciStatus.value
  if (s === 'passed') return 'Passed'
  if (s === 'failed') return 'Failed'
  if (s === 'pending') return 'Pending'
  return 'No checks'
})

const ciStatusBadgeClass = computed(() => {
  const s = ciStatus.value
  if (s === 'passed')
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  if (s === 'failed')
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  if (s === 'pending')
    return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  return 'inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-5'
})

const prStateBadgeClass = computed(() => {
  const s = prState.value
  if (s === 'merged')
    return 'inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-blue-700'
  if (s === 'open')
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  if (s === 'closed')
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  if (s === 'draft')
    return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  return 'inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-5'
})
</script>
