<template>
  <div class="space-y-4" data-agile-board>
    <div
      v-if="tasks.loading && !(tasks.data?.length || 0)"
      class="flex min-h-[18rem] items-center justify-center rounded-xl border bg-surface-menu-bar"
    >
      <div class="flex items-center gap-3 text-sm text-ink-gray-5">
        <LoadingIndicator class="h-5 w-5 text-ink-gray-5" />
        <span>Loading agile work...</span>
      </div>
    </div>

    <div v-else class="flex gap-3 overflow-x-auto pb-2">
      <section
        v-for="status in statuses"
        :key="status"
        :data-agile-column="status"
        class="flex w-72 min-w-[18rem] shrink-0 flex-col rounded-xl border bg-surface-menu-bar/80"
        :class="{ 'ring-2 ring-outline-gray-3': hoverStatus === status }"
        @dragover.prevent="hoverStatus = status"
        @dragleave="onDragLeave(status)"
        @drop.prevent="handleDrop(status)"
      >
        <header class="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 class="text-sm font-semibold text-ink-gray-7">{{ status }}</h3>
            <p class="text-xs text-ink-gray-5">{{ tasksByStatus[status].length }} cards</p>
          </div>
          <div
            class="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-white px-2 text-xs font-medium text-ink-gray-6"
          >
            {{ tasksByStatus[status].length }}
          </div>
        </header>

        <div class="flex flex-1 flex-col gap-3 p-3">
          <button
            v-for="task in tasksByStatus[status]"
            :key="task.name"
            type="button"
            class="agile-task-card group rounded-xl border bg-surface-white p-3 text-left shadow-sm transition hover:border-outline-gray-3 hover:shadow"
            :class="{
              'ring-2 ring-outline-gray-4': isSelected(task),
              'opacity-60': dragTaskId === String(task.name),
            }"
            draggable="true"
            @dragstart="onDragStart(task)"
            @dragend="onDragEnd"
            @click="selectTask(task)"
          >
            <div class="flex items-start gap-2">
              <Tooltip text="Change status">
                <Dropdown :options="statusOptions(String(task.name))">
                  <button
                    type="button"
                    class="mt-0.5 rounded-full"
                    @click.stop
                  >
                    <TaskStatusIcon :status="normalizeStatus(task.status)" />
                  </button>
                </Dropdown>
              </Tooltip>

              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-ink-gray-8">
                  {{ task.title }}
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-if="task.project_title"
                    class="inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-6"
                  >
                    {{ task.project_title }}
                  </span>
                  <span
                    v-if="task.om_epic"
                    class="inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-6"
                  >
                    {{ task.om_epic }}
                  </span>
                  <span
                    v-if="task.om_helpdesk_ticket"
                    class="inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-6"
                  >
                    HD-{{ task.om_helpdesk_ticket }}
                  </span>
                  <span
                    v-if="task.om_github_issue_number"
                    data-agile-github-issue
                    class="inline-flex rounded-full bg-surface-gray-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-6"
                  >
                    Issue #{{ task.om_github_issue_number }}
                  </span>
                  <span
                    v-if="task.om_github_pr_number"
                    data-agile-github-pr
                    class="inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-ink-gray-6"
                  >
                    PR #{{ task.om_github_pr_number }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-gray-5">
              <span class="font-mono">{{ task.name }}</span>
              <span v-if="task.assigned_to">{{ $user(task.assigned_to).full_name }}</span>
              <span v-if="task.due_date">{{ dayjsLocal(task.due_date).format('D MMM') }}</span>
              <span v-if="task.priority" class="inline-flex items-center gap-1">
                <span class="h-2 w-2 rounded-full" :class="priorityClass(task.priority)"></span>
                {{ task.priority }}
              </span>
            </div>
          </button>

          <div
            v-if="!tasksByStatus[status].length"
            class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-outline-gray-2 px-4 py-10 text-sm text-ink-gray-5"
          >
            <div class="text-center">
              <p class="font-medium text-ink-gray-7">{{ columnEmptyState(status).title }}</p>
              <p class="mt-1 text-xs">{{ columnEmptyState(status).description }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <EmptyStateBox v-if="!tasks.loading && !(tasks.data?.length || 0)">
      <LucideCoffee class="h-7 w-7 text-ink-gray-4" />
      <p class="mt-3 text-base font-medium text-ink-gray-7">{{ emptyStateLabel.title }}</p>
      <p class="mt-1 max-w-lg text-center text-sm text-ink-gray-5">{{ emptyStateLabel.description }}</p>
    </EmptyStateBox>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { dayjsLocal, Dropdown, LoadingIndicator, Tooltip, useList } from 'frappe-ui'
import EmptyStateBox from '@/components/EmptyStateBox.vue'
import TaskStatusIcon from '@/components/NewTaskDialog/TaskStatusIcon.vue'
import { GPTask } from '@/types/doctypes'

interface AgileTask extends GPTask {
  project_title?: string
}

interface Props {
  scope: 'active' | 'backlog'
  activeSprintName?: string | null
  selectedTaskId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  activeSprintName: null,
  selectedTaskId: null,
})

const emit = defineEmits<{
  select: [taskId: string]
  taskUpdated: [taskId: string]
  boardLoaded: []
}>()

const router = useRouter()
const statuses: Array<GPTask['status']> = ['Backlog', 'Todo', 'In Progress', 'Done']
const dragTaskId = ref<string | null>(null)
const hoverStatus = ref<GPTask['status'] | null>(null)

function buildFilters() {
  if (props.scope === 'backlog') {
    return {
      om_sprint: ['is', 'not set'],
      status: ['not in', ['Done', 'Canceled']],
    }
  }

  if (!props.activeSprintName) {
    return {
      name: ['=', '__no_active_sprint__'],
    }
  }

  return {
    om_sprint: props.activeSprintName,
    status: ['not in', ['Canceled']],
  }
}

const tasks = useList<AgileTask>({
  url: '/api/v2/method/gameplan.gameplan.doctype.gp_task.gp_task.get_list',
  doctype: 'GP Task',
  fields: [
    'name',
    'title',
    'status',
    'priority',
    'due_date',
    'project',
    'assigned_to',
    'om_epic',
    'om_sprint',
    'om_repository',
    'om_helpdesk_ticket',
    'om_github_issue_number',
    'om_github_pr_number',
    'project.title as project_title',
  ],
  filters: buildFilters,
  orderBy: 'modified desc',
  limit: 200,
})

watch(
  () => [props.scope, props.activeSprintName],
  () => {
    tasks.reload()
  },
  { immediate: true },
)

// Notify parent whenever board data finishes loading so it can
// verify selected-task validity against the current view.
watch(
  () => tasks.data,
  () => {
    if (!tasks.loading) {
      emit("boardLoaded")
    }
  },
)

const tasksByStatus = computed(() => {
  const grouped = Object.fromEntries(statuses.map((status) => [status, [] as AgileTask[]])) as Record<
    GPTask['status'],
    AgileTask[]
  >

  for (const task of tasks.data || []) {
    const status = normalizeStatus(task.status)
    if (status === 'Canceled') continue
    grouped[status].push(task)
  }

  return grouped
})

const emptyStateLabel = computed(() => {
  if (props.scope === 'backlog') {
    return {
      title: 'No backlog work is visible yet.',
      description: 'Create a task or adjust the current filters to start shaping upcoming sprint work.',
    }
  }
  return props.activeSprintName
    ? {
        title: 'This sprint has no scheduled work yet.',
        description: 'Pull backlog work into the sprint or create a task so delivery can start from this board.',
      }
    : {
        title: 'No active sprint is available.',
        description: 'Review backlog work first, then schedule the next sprint in Ops Maturity.',
      }
})

function columnEmptyState(status: GPTask['status']) {
  if (status === 'Backlog') {
    return {
      title: props.scope === 'backlog' ? 'Backlog is clear.' : 'No backlog work is attached to this sprint.',
      description:
        props.scope === 'backlog'
          ? 'Create a task to capture upcoming work.'
          : 'Move a task back to backlog when it should leave the sprint plan.',
    }
  }

  if (status === 'Todo') {
    return {
      title: 'Nothing is ready to start.',
      description: 'Move planned work into Todo when it is ready for the team.',
    }
  }

  if (status === 'In Progress') {
    return {
      title: 'Nothing is in flight.',
      description: 'Drag a task here once active delivery starts.',
    }
  }

  return {
    title: 'Nothing is marked done yet.',
    description: 'Completed work will collect here as the sprint progresses.',
  }
}

function normalizeStatus(status?: GPTask['status']) {
  return (status || 'Backlog') as GPTask['status']
}

function isSelected(task: AgileTask) {
  return String(task.name) === String(props.selectedTaskId || '')
}

function priorityClass(priority?: GPTask['priority']) {
  return {
    'bg-surface-red-5': priority === 'High',
    'bg-surface-amber-5': priority === 'Medium',
    'bg-surface-gray-5': priority === 'Low',
  }
}

function selectTask(task: AgileTask) {
  if (window.innerWidth < 1280) {
    router.push({
      name: task.project ? 'SpaceTask' : 'Task',
      params: task.project ? { taskId: task.name, spaceId: task.project } : { taskId: task.name },
    })
    return
  }

  emit('select', String(task.name))
}

function onDragStart(task: AgileTask) {
  dragTaskId.value = String(task.name)
}

function onDragEnd() {
  dragTaskId.value = null
  hoverStatus.value = null
}

function onDragLeave(status: GPTask['status']) {
  if (hoverStatus.value === status) {
    hoverStatus.value = null
  }
}

async function setTaskStatus(taskId: string, status: GPTask['status']) {
  await tasks.setValue.submit({ name: taskId, status })
  await tasks.reload()
  emit('taskUpdated', taskId)
}

async function handleDrop(status: GPTask['status']) {
  if (!dragTaskId.value) return
  const task = (tasks.data || []).find((item) => String(item.name) === dragTaskId.value)
  const draggedTaskId = dragTaskId.value
  dragTaskId.value = null
  hoverStatus.value = null
  if (!task || normalizeStatus(task.status) === status) return
  await setTaskStatus(draggedTaskId, status)
}

function statusOptions(taskId: string) {
  return statuses.map((status) => ({
    icon: () => h(TaskStatusIcon, { status }),
    label: status,
    onClick: () => setTaskStatus(taskId, status),
  }))
}

function hasTask(taskId: string) {
  return (tasks.data || []).some((task) => String(task.name) === String(taskId))
}

async function reload() {
  await tasks.reload()
}

defineExpose({ tasks, hasTask, reload })
</script>
