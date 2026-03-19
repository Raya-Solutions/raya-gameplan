<template>
  <div v-if="isGitHubConnected" class="space-y-4" data-sprint-release-panel>
    <!-- Release Readiness Section -->
    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-ink-gray-8">Release Readiness</span>
        <button
          class="rounded-md border bg-surface-white px-2.5 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2 disabled:opacity-50"
          :disabled="isValidating"
          @click="handleValidate"
        >
          {{ isValidating ? 'Checking...' : 'Check Readiness' }}
        </button>
      </div>

      <div v-if="readinessResult">
        <div v-if="isReady" class="rounded-lg border border-green-200 bg-surface-green-2 px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-green-700">Release Ready</span>
          </div>
          <div class="mt-1 text-xs text-green-600">
            All {{ readinessResult.total_tasks }} tasks are done with CI passed and PRs merged.
          </div>
        </div>
        <div v-else class="rounded-lg border border-red-200 bg-surface-red-2 px-3 py-2">
          <div class="text-sm font-medium text-red-700">
            {{ blockerCount }} blocker(s)
          </div>
          <ul class="mt-1 space-y-0.5 text-xs text-red-600">
            <li v-for="b in blockers.slice(0, 5)" :key="b.task">
              {{ b.title }}: {{ b.issues.join(', ') }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Release Candidate Section -->
    <div v-if="isReady">
      <div class="mb-2 text-sm font-semibold text-ink-gray-8">Release Candidate</div>

      <div v-if="releaseCandidate">
        <div class="rounded-lg border bg-surface-white px-3 py-2 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-ink-gray-7">{{ releaseCandidate.name }}</span>
            <span :class="rcStatusClass">{{ releaseCandidate.status }}</span>
          </div>
          <div v-if="releaseCandidate.apps_affected" class="text-xs text-ink-gray-5">
            Apps: {{ releaseCandidate.apps_affected }}
          </div>
          <div v-if="releaseCandidate.pr_count" class="text-xs text-ink-gray-5">
            {{ releaseCandidate.pr_count }} merged PR(s)
          </div>

          <!-- Press Handoff Button -->
          <div v-if="releaseCandidate.status === 'Ready' && isPressConfigured">
            <button
              class="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              :disabled="isHandingOff"
              @click="handleHandoff"
            >
              {{ isHandingOff ? 'Handing off...' : 'Hand Off to Press' }}
            </button>
          </div>

          <!-- Press Deploy Link -->
          <div v-if="releaseCandidate.press_deploy_url && releaseCandidate.status === 'Handed Off'">
            <a
              :href="releaseCandidate.press_deploy_url"
              target="_blank"
              rel="noreferrer"
              class="block w-full rounded-md bg-green-600 px-3 py-1.5 text-center text-xs font-medium text-white transition hover:bg-green-700"
            >
              Open Press Dashboard
            </a>
            <div class="mt-1 text-center text-[11px] text-ink-gray-4">
              Deploy from Press, then update status below
            </div>
          </div>

          <!-- Deployment Status Updates -->
          <div v-if="releaseCandidate.status === 'Handed Off' && releaseCandidate.deployment_log" class="flex gap-2">
            <button
              class="flex-1 rounded-md border bg-surface-white px-2 py-1 text-xs font-medium text-ink-gray-7 hover:bg-surface-gray-2 disabled:opacity-50"
              :disabled="isUpdatingStatus"
              @click="handleDeployStatus('Deploying')"
            >
              Mark Deploying
            </button>
          </div>
          <div v-if="releaseCandidate.status === 'Deploying' && releaseCandidate.deployment_log" class="flex gap-2">
            <button
              class="flex-1 rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              :disabled="isUpdatingStatus"
              @click="handleDeployStatus('Deployed')"
            >
              Mark Deployed
            </button>
            <button
              class="rounded-md border bg-surface-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              :disabled="isUpdatingStatus"
              @click="handleDeployStatus('Failed')"
            >
              Failed
            </button>
          </div>

          <!-- Verification Checklist -->
          <div v-if="releaseCandidate.status === 'Deployed' && verificationChecklist.length">
            <div class="mb-1 text-xs font-medium text-ink-gray-5">Post-Deploy Verification</div>
            <div class="space-y-1">
              <label
                v-for="(item, idx) in verificationChecklist"
                :key="idx"
                class="flex items-start gap-2 text-xs text-ink-gray-7 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="item.checked"
                  class="mt-0.5 rounded border-gray-300"
                  @change="handleChecklistToggle(idx)"
                />
                <span :class="{ 'line-through text-ink-gray-4': item.checked }">{{ item.label }}</span>
              </label>
            </div>
          </div>

          <!-- Verified / Failed Status -->
          <div v-if="releaseCandidate.status === 'Verified'" class="text-xs text-green-600 font-medium">
            Verified {{ releaseCandidate.verified_at ? 'at ' + releaseCandidate.verified_at : '' }}
          </div>
          <div v-if="releaseCandidate.status === 'Failed'" class="text-xs text-red-600 font-medium">
            Failed
          </div>
        </div>
      </div>
      <div v-else>
        <button
          class="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          :disabled="isCreatingRC"
          @click="handleCreateRC"
        >
          {{ isCreatingRC ? 'Creating...' : 'Create Release Candidate' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { isGitHubConnected } from '@/data/githubConnection'
import { useReleaseDelivery } from '@/data/releaseDelivery'

const props = defineProps<{ sprintName: string }>()

const {
  readinessResult,
  releaseCandidate,
  isReady,
  blockerCount,
  blockers,
  isPressConfigured,
  doValidateReadiness,
  doCreateReleaseCandidate,
  doLoadReleaseCandidate,
  doHandoffToPress,
  doUpdateDeploymentStatus,
  doUpdateChecklist,
  isValidating,
  isCreatingRC,
  isHandingOff,
  isUpdatingStatus,
  isUpdatingChecklist,
} = useReleaseDelivery(() => props.sprintName)

const verificationChecklist = ref<any[]>([])

watch(
  () => releaseCandidate.value?.verification_checklist_json,
  (val) => {
    if (val) {
      try {
        verificationChecklist.value = JSON.parse(val)
      } catch {
        verificationChecklist.value = []
      }
    }
  },
  { immediate: true }
)

async function handleValidate() {
  try {
    await doValidateReadiness()
  } catch (e: any) {
    console.error('Validation failed:', e)
  }
}

async function handleCreateRC() {
  try {
    await doCreateReleaseCandidate()
  } catch (e: any) {
    console.error('Create RC failed:', e)
  }
}

async function handleHandoff() {
  if (!releaseCandidate.value?.name) return
  try {
    await doHandoffToPress(releaseCandidate.value.name)
  } catch (e: any) {
    console.error('Handoff failed:', e)
  }
}

async function handleDeployStatus(status: string) {
  const dlName = releaseCandidate.value?.deployment_log
  if (!dlName) return
  try {
    await doUpdateDeploymentStatus(dlName, status)
    // Reload the release candidate to get updated state
    await doLoadReleaseCandidate(releaseCandidate.value.name)
  } catch (e: any) {
    console.error('Status update failed:', e)
  }
}

async function handleChecklistToggle(idx: number) {
  const list = [...verificationChecklist.value]
  list[idx] = { ...list[idx], checked: !list[idx].checked }
  verificationChecklist.value = list
  try {
    await doUpdateChecklist(releaseCandidate.value.name, list)
  } catch (e: any) {
    console.error('Checklist update failed:', e)
  }
}

const rcStatusClass = computed(() => {
  const s = releaseCandidate.value?.status
  if (s === 'Verified')
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  if (s === 'Failed')
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  if (s === 'Deployed' || s === 'Deploying')
    return 'inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-blue-700'
  if (s === 'Handed Off')
    return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  return 'inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-5'
})
</script>
