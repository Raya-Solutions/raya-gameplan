<template>
  <div v-if="isGitHubConnected" class="space-y-4" data-sprint-release-panel>
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

          <div v-if="releaseCandidate.status === 'Ready' && isPressConfigured">
            <button
              class="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              :disabled="isHandingOff"
              @click="handleHandoff"
            >
              {{ isHandingOff ? 'Handing off...' : 'Hand Off to Press' }}
            </button>
          </div>

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

    <div v-if="releaseCandidate">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-ink-gray-8">Release Communication</span>
        <span v-if="releaseCommunication" :class="communicationStatusClass">{{ releaseCommunication.status_label }}</span>
      </div>

      <div class="rounded-lg border bg-surface-white p-3 space-y-3" data-release-communication-panel>
        <div v-if="communicationError" class="rounded-md border border-red-200 bg-surface-red-2 px-3 py-2 text-xs text-red-700">
          {{ communicationError }}
        </div>
        <div v-else-if="communicationNotice" class="rounded-md border border-green-200 bg-surface-green-2 px-3 py-2 text-xs text-green-700">
          {{ communicationNotice }}
        </div>

        <div v-if="isLoadingCommunication" class="rounded-md bg-surface-gray-2 px-3 py-2 text-xs text-ink-gray-5">
          Loading release communication package...
        </div>

        <template v-else-if="releaseCommunication">
          <div class="space-y-1">
            <div class="text-sm font-medium text-ink-gray-8">{{ releaseCommunication.title }}</div>
            <div class="text-xs text-ink-gray-5">{{ releaseCommunication.summary }}</div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs text-ink-gray-6 md:grid-cols-4">
            <div class="rounded-md bg-surface-gray-2 px-2.5 py-2">
              <div class="text-[11px] uppercase tracking-wide text-ink-gray-4">Customers</div>
              <div class="mt-1 font-medium text-ink-gray-8">{{ releaseCommunication.customer_count }}</div>
            </div>
            <div class="rounded-md bg-surface-gray-2 px-2.5 py-2">
              <div class="text-[11px] uppercase tracking-wide text-ink-gray-4">Tickets</div>
              <div class="mt-1 font-medium text-ink-gray-8">{{ releaseCommunication.ticket_count }}</div>
            </div>
            <div class="rounded-md bg-surface-gray-2 px-2.5 py-2">
              <div class="text-[11px] uppercase tracking-wide text-ink-gray-4">Prepared</div>
              <div class="mt-1 font-medium text-ink-gray-8">{{ formatTimestamp(releaseCommunication.prepared_at) }}</div>
            </div>
            <div class="rounded-md bg-surface-gray-2 px-2.5 py-2">
              <div class="text-[11px] uppercase tracking-wide text-ink-gray-4">Adoption</div>
              <div class="mt-1 font-medium text-ink-gray-8">{{ adoptionProgressLabel }}</div>
            </div>
          </div>

          <div class="rounded-md border border-surface-gray-3 px-3 py-3" data-release-impact>
            <div class="mb-2 flex items-center justify-between gap-3">
              <div class="text-xs font-medium uppercase tracking-wide text-ink-gray-4">Customer Impact</div>
              <div v-if="releaseCommunication.customer_impact_preview?.unresolved_ticket_count" class="text-[11px] text-amber-700">
                {{ releaseCommunication.customer_impact_preview.unresolved_ticket_count }} ticket{{ releaseCommunication.customer_impact_preview.unresolved_ticket_count === 1 ? '' : 's' }} need customer mapping
              </div>
            </div>
            <div class="text-xs text-ink-gray-5">{{ releaseCommunication.customer_impact_summary }}</div>
            <div
              v-if="releaseCommunication.customer_impact_preview?.customers?.length"
              class="mt-3 space-y-2"
            >
              <div
                v-for="customer in releaseCommunication.customer_impact_preview.customers"
                :key="customer.organization_name"
                data-release-impact-customer
                class="rounded-md bg-surface-gray-2 px-3 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <a
                    v-if="routeHref(customer.route_info)"
                    :href="routeHref(customer.route_info)"
                    class="text-xs font-medium text-ink-gray-8 transition hover:text-blue-700"
                  >
                    {{ customer.organization_name }}
                  </a>
                  <div v-else class="text-xs font-medium text-ink-gray-8">{{ customer.organization_name }}</div>
                  <div class="text-[11px] text-ink-gray-5">
                    {{ customer.ticket_count }} ticket{{ customer.ticket_count === 1 ? '' : 's' }}
                  </div>
                </div>
                <div v-if="customer.tickets?.length" class="mt-2 flex flex-wrap gap-2">
                  <a
                    v-for="ticket in customer.tickets"
                    :key="ticket.ticket"
                    :href="routeHref(ticket.route_info) || undefined"
                    class="inline-flex max-w-full items-center rounded-full border border-surface-gray-3 bg-surface-white px-2 py-0.5 text-[11px] text-ink-gray-6 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    {{ ticket.subject }}
                  </a>
                </div>
              </div>
              <div v-if="releaseCommunication.customer_impact_preview.has_more_customers" class="text-[11px] text-ink-gray-5">
                Additional impacted customers are available in the release notes and admin record.
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              class="rounded-md border bg-surface-white px-3 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2 disabled:opacity-50"
              :disabled="isPreparingCommunication"
              data-release-communication-prepare
              @click="handlePrepareCommunication"
            >
              {{ isPreparingCommunication ? 'Refreshing...' : 'Refresh Package' }}
            </button>
            <button
              class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              :disabled="isSendingCommunication"
              data-release-communication-send
              @click="handleSendCommunication"
            >
              {{ isSendingCommunication ? 'Sending...' : 'Send Updates' }}
            </button>
            <a
              v-if="routeHref(releaseCommunication.wiki_route_info)"
              :href="routeHref(releaseCommunication.wiki_route_info)"
              target="_blank"
              rel="noreferrer"
              data-release-notes-link
              class="rounded-md border bg-surface-white px-3 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
            >
              Open Release Notes
            </a>
            <a
              v-if="releaseCommunication.desk_url"
              :href="releaseCommunication.desk_url"
              target="_blank"
              rel="noreferrer"
              class="rounded-md border bg-surface-white px-3 py-1.5 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
            >
              Open Admin Record
            </a>
          </div>

          <div v-if="releaseCommunication.last_error_message" class="rounded-md border border-red-200 bg-surface-red-2 px-3 py-2 text-xs text-red-700">
            {{ releaseCommunication.last_error_message }}
          </div>

          <div>
            <div class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-gray-4">Channel Status</div>
            <div class="space-y-2">
              <div
                v-for="channel in releaseCommunication.delivery_channels"
                :key="channel.key"
                :data-release-channel="channel.key"
                class="rounded-md border border-surface-gray-3 px-3 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-ink-gray-8">{{ channel.label }}</div>
                    <div v-if="channel.delivery_target" class="mt-0.5 text-xs text-ink-gray-5">
                      {{ channel.delivery_target_label || channel.delivery_target }}
                    </div>
                  </div>
                  <span :class="channelStatusClass(channel.status)">{{ humanizeStatus(channel.status) }}</span>
                </div>
                <div v-if="channel.error_message" class="mt-2 text-xs text-red-600">
                  {{ channel.error_message }}
                </div>
                <div v-else-if="channel.notes" class="mt-2 text-xs text-ink-gray-5">
                  {{ channel.notes }}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <div class="text-xs font-medium uppercase tracking-wide text-ink-gray-4">Adoption Checklist</div>
              <div class="text-xs text-ink-gray-5">{{ adoptionProgressLabel }}</div>
            </div>
            <div
              v-if="adoptionSummary"
              data-release-adoption-summary
              class="mb-3 rounded-md border px-3 py-3"
              :class="adoptionSummaryClass"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-xs font-medium text-ink-gray-8">{{ adoptionSummary.customer_follow_up_label }}</div>
                  <div class="mt-1 text-[11px] text-ink-gray-5">{{ adoptionSummary.status_label }}</div>
                </div>
                <span class="rounded-full bg-surface-white px-2 py-0.5 text-[11px] font-medium text-ink-gray-6">
                  {{ adoptionProgressLabel }}
                </span>
              </div>
              <div
                class="mt-2 text-xs text-ink-gray-6"
                data-release-adoption-next
              >
                {{ adoptionSummary.is_complete ? 'All tracked follow-up is complete.' : `Next: ${adoptionSummary.next_action_label}` }}
              </div>
              <div v-if="adoptionSummary.pending_items?.length" class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="pending in adoptionSummary.pending_items"
                  :key="pending.key || pending.label"
                  class="inline-flex items-center rounded-full border border-surface-gray-3 bg-surface-white px-2 py-0.5 text-[11px] text-ink-gray-6"
                >
                  {{ pending.label }}
                </span>
              </div>
            </div>
            <div class="space-y-2" data-release-adoption-checklist>
              <label
                v-for="(item, idx) in adoptionChecklist"
                :key="item.key"
                class="flex items-start gap-2 rounded-md border border-surface-gray-3 px-3 py-2 text-xs text-ink-gray-7"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 rounded border-gray-300"
                  :checked="item.status === 'complete'"
                  :disabled="item.status === 'not_required' || isUpdatingAdoptionChecklist"
                  @change="handleAdoptionToggle(idx)"
                />
                <span class="flex-1" :class="{ 'line-through text-ink-gray-4': item.status === 'complete' }">
                  {{ item.label }}
                  <span v-if="item.status === 'not_required'" class="ml-1 text-[11px] uppercase tracking-wide text-ink-gray-4">Not required</span>
                </span>
              </label>
            </div>
          </div>
        </template>

        <div v-else class="space-y-3">
          <div class="rounded-md bg-surface-gray-2 px-3 py-2 text-xs text-ink-gray-6">
            Prepare a customer-facing package from this release candidate before announcing the rollout.
          </div>
          <button
            class="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="isPreparingCommunication"
            data-release-communication-prepare
            @click="handlePrepareCommunication"
          >
            {{ isPreparingCommunication ? 'Preparing...' : 'Prepare Communication Package' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="releaseCommunicationHistory.length">
      <div class="mb-2 text-sm font-semibold text-ink-gray-8">Release History</div>
      <div class="rounded-lg border bg-surface-white p-3" data-release-history>
        <div class="space-y-3">
          <div
            v-for="item in releaseCommunicationHistory"
            :key="item.name"
            class="rounded-md border border-surface-gray-3 px-3 py-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-ink-gray-8">{{ item.title }}</div>
                <div class="mt-0.5 text-xs text-ink-gray-5">
                  {{ item.last_sent_at ? 'Sent ' + formatTimestamp(item.last_sent_at) : 'Prepared ' + formatTimestamp(item.prepared_at) }}
                </div>
              </div>
              <span :class="historyStatusClass(item.status)">{{ item.status_label }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2 text-xs text-ink-gray-5">
              <span>{{ item.customer_count }} customers</span>
              <span>{{ item.ticket_count }} tickets</span>
              <span>{{ item.adoption_progress.completed }}/{{ item.adoption_progress.total || 0 }} adoption steps</span>
              <span v-if="item.adoption_summary">{{ item.adoption_summary.status_label }}</span>
            </div>
            <div class="mt-2 text-xs text-ink-gray-5">{{ item.customer_impact_summary }}</div>
            <div v-if="item.adoption_summary" class="mt-2 text-[11px] text-ink-gray-5">
              {{ item.adoption_summary.is_complete ? 'All customer follow-up is complete.' : `Next: ${item.adoption_summary.next_action_label}` }}
            </div>
            <div
              v-if="item.customer_impact_preview?.customers?.length"
              class="mt-2 flex flex-wrap gap-2"
            >
              <a
                v-for="customer in item.customer_impact_preview.customers"
                :key="customer.organization_name"
                :href="routeHref(customer.route_info) || undefined"
                class="inline-flex items-center rounded-full border border-surface-gray-3 bg-surface-gray-2 px-2 py-0.5 text-[11px] text-ink-gray-6 transition hover:border-blue-200 hover:text-blue-700"
              >
                {{ customer.organization_name }}
              </a>
              <span
                v-if="item.customer_impact_preview.has_more_customers"
                class="inline-flex items-center rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] text-ink-gray-5"
              >
                More customers
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <a
                v-if="routeHref(item.wiki_route_info)"
                :href="routeHref(item.wiki_route_info)"
                target="_blank"
                rel="noreferrer"
                class="text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                Open notes
              </a>
              <a
                v-if="routeHref(item.release_candidate_route_info)"
                :href="routeHref(item.release_candidate_route_info)"
                class="text-xs font-medium text-ink-gray-7 hover:text-ink-gray-8"
              >
                Open release candidate
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isGitHubConnected } from '@/data/githubConnection'
import { useReleaseDelivery } from '@/data/releaseDelivery'

const props = defineProps<{ sprintName: string }>()

const {
  readinessResult,
  releaseCandidate,
  releaseCommunication,
  releaseCommunicationHistory,
  isReady,
  blockerCount,
  blockers,
  isPressConfigured,
  doValidateReadiness,
  doCreateReleaseCandidate,
  doInitializeReleasePanel,
  doHandoffToPress,
  doUpdateDeploymentStatus,
  doUpdateChecklist,
  doPrepareReleaseCommunication,
  doSendReleaseCommunication,
  doUpdateAdoptionChecklist,
  isValidating,
  isCreatingRC,
  isHandingOff,
  isUpdatingStatus,
  isUpdatingChecklist,
  isLoadingCommunication,
  isPreparingCommunication,
  isSendingCommunication,
  isUpdatingAdoptionChecklist,
} = useReleaseDelivery(() => props.sprintName)

const verificationChecklist = ref<any[]>([])
const adoptionChecklist = ref<any[]>([])
const communicationError = ref('')
const communicationNotice = ref('')

watch(
  () => releaseCandidate.value?.verification_checklist_json,
  (val) => {
    if (!val) {
      verificationChecklist.value = []
      return
    }
    try {
      verificationChecklist.value = JSON.parse(val)
    } catch {
      verificationChecklist.value = []
    }
  },
  { immediate: true },
)

watch(
  () => releaseCommunication.value?.adoption_checklist,
  (val) => {
    adoptionChecklist.value = Array.isArray(val) ? val.map((item) => ({ ...item })) : []
  },
  { immediate: true },
)

watch(
  () => props.sprintName,
  async () => {
    communicationError.value = ''
    communicationNotice.value = ''
    try {
      await doInitializeReleasePanel()
    } catch (e: any) {
      communicationError.value = e?.message || 'Failed to load release panel state.'
      console.error('Release panel initialization failed:', e)
    }
  },
  { immediate: true },
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
    communicationError.value = ''
    communicationNotice.value = ''
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

async function handlePrepareCommunication() {
  if (!releaseCandidate.value?.name) return
  communicationError.value = ''
  communicationNotice.value = ''
  try {
    const result = await doPrepareReleaseCommunication()
    communicationNotice.value = result?.created === false
      ? 'Release communication package refreshed.'
      : 'Release communication package prepared.'
  } catch (e: any) {
    communicationError.value = e?.message || 'Failed to prepare release communication package.'
    console.error('Prepare communication failed:', e)
  }
}

async function handleSendCommunication() {
  if (!releaseCommunication.value?.name) return
  communicationError.value = ''
  communicationNotice.value = ''
  try {
    const result = await doSendReleaseCommunication()
    if (result?.ok) {
      communicationNotice.value = 'Release updates sent across configured channels.'
    } else {
      communicationError.value = (result?.errors || []).join(' ') || 'Some release communication channels failed.'
    }
  } catch (e: any) {
    communicationError.value = e?.message || 'Failed to send release communication.'
    console.error('Send communication failed:', e)
  }
}

async function handleAdoptionToggle(idx: number) {
  const current = adoptionChecklist.value[idx]
  if (!current || current.status === 'not_required' || !releaseCommunication.value?.name) return

  const nextStatus = current.status === 'complete' ? 'pending' : 'complete'
  const nextChecklist = adoptionChecklist.value.map((item, itemIdx) =>
    itemIdx === idx ? { ...item, status: nextStatus } : item,
  )
  adoptionChecklist.value = nextChecklist
  communicationError.value = ''
  communicationNotice.value = ''

  try {
    const result = await doUpdateAdoptionChecklist(releaseCommunication.value.name, nextChecklist)
    communicationNotice.value = result?.adoption_progress?.is_complete
      ? 'Adoption checklist complete.'
      : 'Adoption checklist updated.'
  } catch (e: any) {
    communicationError.value = e?.message || 'Failed to update adoption checklist.'
    console.error('Update adoption checklist failed:', e)
  }
}

function routeHref(routeInfo?: any) {
  return routeInfo?.web_route || routeInfo?.app_route || null
}

function formatTimestamp(value?: string) {
  if (!value) return 'Not available'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function humanizeStatus(value?: string) {
  return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (part) => part.toUpperCase()) : 'Unknown'
}

function channelStatusClass(status?: string) {
  if (status === 'sent' || status === 'complete') {
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  }
  if (status === 'failed') {
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  }
  if (status === 'pending_manual') {
    return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  }
  if (status === 'not_required' || status === 'skipped') {
    return 'inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-5'
  }
  return 'inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-blue-700'
}

function historyStatusClass(status?: string) {
  return channelStatusClass(status)
}

const rcStatusClass = computed(() => {
  const s = releaseCandidate.value?.status
  if (s === 'Verified') {
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  }
  if (s === 'Failed') {
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  }
  if (s === 'Deployed' || s === 'Deploying') {
    return 'inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-blue-700'
  }
  if (s === 'Handed Off') {
    return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  }
  return 'inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-5'
})

const communicationStatusClass = computed(() => historyStatusClass(releaseCommunication.value?.status))
const adoptionSummary = computed(() => releaseCommunication.value?.adoption_summary || null)
const adoptionSummaryClass = computed(() => {
  if (!adoptionSummary.value) {
    return 'border-surface-gray-3 bg-surface-gray-2'
  }
  if (adoptionSummary.value.is_complete) {
    return 'border-green-200 bg-surface-green-2'
  }
  return 'border-amber-200 bg-surface-amber-2'
})
const adoptionProgressLabel = computed(() => {
  const progress = releaseCommunication.value?.adoption_progress
  if (!progress) {
    return '0/0 complete'
  }
  return `${progress.completed}/${progress.total || 0} complete`
})
</script>
