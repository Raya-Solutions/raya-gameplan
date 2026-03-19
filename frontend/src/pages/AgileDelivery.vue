<template>
  <div class="flex h-full flex-col">
    <PageHeader>
      <Breadcrumbs class="h-7" :items="[{ label: 'Agile Delivery', route: { name: 'AgileDelivery' } }]" />
      <div class="flex items-center gap-2">
        <Button v-if="showReleasePanel" variant="subtle" @click="releaseDrawerOpen = !releaseDrawerOpen">
          {{ releaseDrawerOpen ? 'Hide Release' : 'Release' }}
        </Button>
        <Button variant="subtle" @click="refreshActiveSprint()">Refresh sprint</Button>
        <Button variant="solid" @click="openNewTaskDialog">
          <template #prefix>
            <LucidePlus class="h-4 w-4" />
          </template>
          Add task
        </Button>
      </div>
    </PageHeader>

    <div class="body-container flex min-h-0 flex-1 flex-col pb-6">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <TabButtons
            :buttons="[
              { label: 'Sprint', value: 'active' },
              { label: 'Backlog', value: 'backlog' },
            ]"
            :modelValue="scope"
            @update:modelValue="setScope"
          />
          <div class="hidden items-center gap-2 text-sm text-ink-gray-6 sm:flex">
            <span class="font-medium text-ink-gray-8">{{ activeSprintSummary.title }}</span>
            <span v-if="activeSprintSummary.window" class="text-ink-gray-4">&middot;</span>
            <span v-if="activeSprintSummary.window">{{ activeSprintSummary.window }}</span>
          </div>
        </div>
        <div class="hidden items-center gap-3 text-xs text-ink-gray-4 xl:flex">
          <span class="inline-flex items-center gap-1">
            <KeyboardShortcut bg>n</KeyboardShortcut> New
          </span>
          <span class="inline-flex items-center gap-1">
            <KeyboardShortcut bg>s</KeyboardShortcut> Sprint
          </span>
          <span class="inline-flex items-center gap-1">
            <KeyboardShortcut bg>b</KeyboardShortcut> Backlog
          </span>
          <span v-if="drawerReady && selectedTaskId" class="inline-flex items-center gap-1">
            <KeyboardShortcut bg>esc</KeyboardShortcut> Close
          </span>
        </div>
      </div>

      <div class="mt-4 min-h-0 flex-1">
        <div
          v-if="scope === 'active' && !activeSprint.data?.sprint"
          class="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed bg-surface-menu-bar px-6 text-center"
        >
          <LucideRadar class="h-8 w-8 text-ink-gray-4" />
          <h2 class="mt-4 text-lg font-semibold text-ink-gray-8">No active sprint is scheduled.</h2>
          <p class="mt-2 max-w-lg text-sm text-ink-gray-6">
            Plan the next sprint in Ops Maturity, or switch to backlog mode to keep refining unscheduled work.
          </p>
          <Button class="mt-4" variant="subtle" @click="setScope('backlog')">Open backlog</Button>
        </div>

        <AgileTaskBoard
          v-else
          ref="boardRef"
          :scope="scope"
          :activeSprintName="activeSprint.data?.sprint?.name || null"
          :selectedTaskId="selectedTaskId"
          @select="selectTask"
          @task-updated="handleTaskMutation"
          @board-loaded="handleBoardLoaded"
        />
      </div>
    </div>

  </div>

    <!-- Teleport backdrop + drawer to body so they escape all scroll/overflow containers -->
    <Teleport to="body">
      <!-- Backdrop overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-active-class="transition-opacity duration-150 ease-in"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="drawerReady && selectedTaskId"
          class="fixed inset-0 z-[60] bg-black/10"
          @click="closeTask"
        />
      </Transition>

      <!-- Slide-over drawer for task -->
      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        leave-active-class="transition-transform duration-150 ease-in"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <aside
          v-if="drawerReady && selectedTaskId"
          data-agile-detail
          class="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l bg-surface-white shadow-2xl sm:w-[28rem] 2xl:w-[34rem]"
        >
          <div class="flex items-center justify-between border-b px-4 py-2.5">
            <router-link
              :to="{ name: 'Task', params: { taskId: selectedTaskId } }"
              class="text-xs font-medium text-ink-gray-5 transition hover:text-ink-gray-8"
            >
              Open full page &rarr;
            </router-link>
            <Button variant="ghost" size="sm" @click="closeTask">
              <LucideX class="h-4 w-4" />
            </Button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <TaskDetail
              :key="selectedTaskId"
              :taskId="selectedTaskId"
              embedded
              preserveRoute
              @updated="handleTaskMutation"
            />
          </div>
        </aside>
      </Transition>

      <!-- Release panel drawer -->
      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        leave-active-class="transition-transform duration-150 ease-in"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <aside
          v-if="releaseDrawerOpen && currentSprintName"
          class="fixed inset-y-0 right-0 z-[59] flex w-full flex-col border-l bg-surface-white shadow-2xl sm:w-[24rem]"
        >
          <div class="flex items-center justify-between border-b px-4 py-2.5">
            <span class="text-sm font-semibold text-ink-gray-8">Sprint Release</span>
            <Button variant="ghost" size="sm" @click="releaseDrawerOpen = false">
              <LucideX class="h-4 w-4" />
            </Button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <SprintReleasePanel :sprint-name="currentSprintName" />
          </div>
        </aside>
      </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { Breadcrumbs, TabButtons, usePageMeta } from 'frappe-ui'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import KeyboardShortcut from '@/components/KeyboardShortcut.vue'
import TaskDetail from '@/components/TaskDetail.vue'
import SprintReleasePanel from '@/components/SprintReleasePanel.vue'
import AgileTaskBoard from '@/components/agile/AgileTaskBoard.vue'
import { activeSprint, activeSprintSummary, refreshActiveSprint } from '@/data/opsMaturity'
import { isGitHubConnected } from '@/data/githubConnection'
import { showNewTaskDialog } from '@/components/NewTaskDialog'
import { useUser } from '@/data/users'

import LucidePlus from '~icons/lucide/plus'
import LucideRadar from '~icons/lucide/radar'
import LucideX from '~icons/lucide/x'

const route = useRoute()
const router = useRouter()
const boardRef = useTemplateRef<any>('boardRef')

// Release panel state
const releaseDrawerOpen = ref(false)
const currentSprintName = computed(() => activeSprint.data?.sprint?.name || '')
const showReleasePanel = computed(() => isGitHubConnected.value && currentSprintName.value && scope.value === 'active')

// Drawer is only allowed to render after mount completes and any
// persisted ?task= param has been stripped. This prevents a flash
// of the drawer on hard-refresh with a stale URL.
const drawerReady = ref(false)

const scope = computed<'active' | 'backlog'>(() =>
  route.query.scope === 'backlog' ? 'backlog' : 'active',
)

const selectedTaskId = computed(() => {
  const task = route.query.task
  return typeof task === 'string' ? task : null
})

function replaceQuery(next: Record<string, string | undefined | null>) {
  const query = { ...route.query, ...next }
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') {
      delete query[key]
    }
  })
  router.replace({ name: 'AgileDelivery', query })
}

function setScope(value: 'active' | 'backlog') {
  replaceQuery({
    scope: value === 'active' ? undefined : value,
    task: undefined,
  })
}

function selectTask(taskId: string) {
  replaceQuery({ task: taskId })
}

function closeTask() {
  replaceQuery({ task: undefined })
}

function openNewTaskDialog() {
  const sprint = activeSprint.data?.sprint
  showNewTaskDialog({
    defaults: {
      assigned_to: useUser('sessionUser').name,
      status: scope.value === 'active' && sprint ? 'Todo' : 'Backlog',
      om_sprint: scope.value === 'active' && sprint ? sprint.name : '',
      project: scope.value === 'active' && sprint?.project ? sprint.project : '',
    },
    onSuccess(doc) {
      boardRef.value?.reload?.()
      if (window.innerWidth >= 640) {
        selectTask(String(doc.name))
      } else {
        router.push({ name: 'Task', params: { taskId: doc.name } })
      }
    },
  })
}

async function handleTaskMutation() {
  await boardRef.value?.reload?.()
  if (selectedTaskId.value && boardRef.value && !boardRef.value.hasTask(selectedTaskId.value)) {
    closeTask()
  }
}

/**
 * Called by AgileTaskBoard after its data finishes loading.
 * If the URL contains a ?task= that is not in the current board view,
 * silently close the drawer to avoid showing stale/orphan detail.
 */
function handleBoardLoaded() {
  if (selectedTaskId.value && boardRef.value && !boardRef.value.hasTask(selectedTaskId.value)) {
    closeTask()
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  )
}

function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
    return
  }

  const key = event.key.toLowerCase()

  if (key === 'n') {
    event.preventDefault()
    openNewTaskDialog()
    return
  }

  if (key === 's') {
    event.preventDefault()
    setScope('active')
    return
  }

  if (key === 'b') {
    event.preventDefault()
    setScope('backlog')
    return
  }

  if (event.key === 'Escape' && selectedTaskId.value) {
    event.preventDefault()
    closeTask()
  }
}

onMounted(async () => {
  // Strip any persisted ?task= from URL on initial page load.
  // The drawer should only open from explicit user clicks, never from URL restoration.
  if (route.query.task) {
    replaceQuery({ task: undefined })
  }
  // Wait one tick so the route replacement settles before allowing the drawer.
  await nextTick()
  drawerReady.value = true
  refreshActiveSprint()
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

usePageMeta(() => ({
  title: activeSprint.data?.sprint?.title ? `${activeSprint.data.sprint.title} | Agile Delivery` : 'Agile Delivery',
}))
</script>
