<template>
  <div class="flex h-full flex-1" v-if="task.doc" :class="{ 'flex-col': embedded }">
    <div class="w-full min-w-0 flex-1">
      <div class="relative p-3 sm:p-6">
        <div class="absolute right-0 top-0 p-6" v-show="task.setValue.loading">
          <LoadingText v-if="!task.setValue.error" text="Saving..." />
          <ErrorMessage :message="task.setValue.error" />
        </div>
        <div class="mb-2 flex items-center justify-between space-x-2">
          <input
            type="text"
            placeholder="Title"
            class="-ml-0.5 w-full rounded-sm border-none p-0.5 text-2xl bg-surface-white font-semibold text-ink-gray-8 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
            @blur="persistTitle"
            v-model="task.doc.title"
            v-focus
          />
          <DropdownMoreOptions
            placement="right"
            :options="[
              {
                label: 'Delete',
                onClick: () => {
                  $dialog({
                    title: 'Delete task',
                    message: 'Are you sure you want to delete this task?',
                    actions: [
                      {
                        label: 'Delete',
                        theme: 'red',
                        variant: 'solid',
                        onClick({ close }) {
                          return task.delete.submit().then(() => {
                            close()
                            $router.back()
                          })
                        },
                      },
                    ],
                  })
                },
              },
            ]"
          />
        </div>
        <TextEditor
          ref="description"
          editor-class="prose-sm max-w-none focus-within:ring-2 focus-within:ring-outline-gray-3 rounded-sm p-0.5 -ml-0.5 min-h-[4rem]"
          placeholder="Description"
          :content="task.doc.description"
          :bubbleMenu="true"
          :floatingMenu="true"
          @blur="persistDescription"
        />

        <div v-if="embedded" class="mt-6 rounded-2xl border bg-surface-menu-bar p-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Assignee</div>
              <Combobox
                placeholder="Assign a user"
                :options="assignableUsers"
                v-model="task.doc.assigned_to"
                @update:modelValue="changeAssignee"
              />
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Due Date</div>
              <DatePicker
                v-model="task.doc.due_date"
                variant="subtle"
                placeholder="Due date"
                format="D MMM, YYYY"
                @update:modelValue="(value) => setTaskValue({ due_date: value || '' })"
              />
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Space</div>
              <Combobox
                placeholder="Select space"
                :options="spaceOptions"
                :modelValue="task.doc.project"
                @update:modelValue="changeSpace"
              />
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Status</div>
              <Dropdown :options="statusOptions">
                <Button>
                  <template #prefix>
                    <TaskStatusIcon :status="task.doc.status" />
                  </template>
                  {{ task.doc.status || 'Set status' }}
                </Button>
              </Dropdown>
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Priority</div>
              <Dropdown :options="priorityOptions">
                <Button>
                  <template v-if="task.doc.priority" #prefix>
                    <TaskPriorityIcon :priority="task.doc.priority" />
                  </template>
                  {{ task.doc.priority || 'Set priority' }}
                </Button>
              </Dropdown>
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Epic</div>
              <Combobox
                placeholder="Select epic"
                :options="epicOptions"
                :modelValue="task.doc.om_epic"
                @update:modelValue="changeEpic"
              />
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Sprint</div>
              <Combobox
                placeholder="Select sprint"
                :options="sprintOptions"
                :modelValue="task.doc.om_sprint"
                @update:modelValue="changeSprint"
              />
            </div>
            <div>
              <div class="mb-2 text-sm text-ink-gray-5">Repository</div>
              <Combobox
                placeholder="Select repository"
                :options="repositoryOptions"
                :modelValue="task.doc.om_repository"
                @update:modelValue="changeRepository"
              />
            </div>
            <div class="sm:col-span-2">
              <div class="mb-2 text-sm text-ink-gray-5">GitHub</div>
              <GitHubConnectionBadge :redirect-after="$route.fullPath" />
              <div class="mt-3">
                <GitDeliveryPanel :task-name="taskId" />
              </div>
            </div>
          </div>

          <div v-if="linkedRecordPills.length" class="mt-4 border-t border-outline-gray-1 pt-4">
            <div class="mb-2 text-sm text-ink-gray-5">Linked work</div>
            <div class="flex flex-wrap gap-2">
              <template v-for="pill in linkedRecordPills" :key="pill.label">
                <a
                  v-if="pill.href"
                  data-linked-pill
                  :href="pill.href"
                  :target="pill.external ? '_blank' : undefined"
                  :rel="pill.external ? 'noreferrer' : undefined"
                  class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
                >
                  {{ pill.label }}
                </a>
                <span
                  v-else
                  data-linked-pill
                  class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7"
                >
                  {{ pill.label }}
                </span>
              </template>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-2 sm:hidden" v-if="!embedded">
          <Combobox
            placeholder="Assign a user"
            :options="assignableUsers"
            v-model="task.doc.assigned_to"
            @update:modelValue="changeAssignee"
          />
          <DatePicker
            v-model="task.doc.due_date"
            variant="subtle"
            placeholder="Due date"
            format="D MMM, YYYY"
            @update:modelValue="(value) => setTaskValue({ due_date: value || '' })"
          />
          <Dropdown :options="statusOptions">
            <Button>
              <template #prefix>
                <TaskStatusIcon :status="task.doc.status" />
              </template>
              {{ task.doc.status || 'Set status' }}
            </Button>
          </Dropdown>
          <Dropdown :options="priorityOptions">
            <Button>
              <template v-if="task.doc.priority" #prefix>
                <TaskPriorityIcon :priority="task.doc.priority" />
              </template>
              {{ task.doc.priority || 'Set priority' }}
            </Button>
          </Dropdown>
          <Combobox
            placeholder="Select space"
            :options="spaceOptions"
            :modelValue="task.doc.project"
            @update:modelValue="changeSpace"
          />
          <Combobox
            placeholder="Select epic"
            :options="epicOptions"
            :modelValue="task.doc.om_epic"
            @update:modelValue="changeEpic"
          />
          <Combobox
            placeholder="Select sprint"
            :options="sprintOptions"
            :modelValue="task.doc.om_sprint"
            @update:modelValue="changeSprint"
          />
          <Combobox
            placeholder="Select repository"
            :options="repositoryOptions"
            :modelValue="task.doc.om_repository"
            @update:modelValue="changeRepository"
          />
        </div>

        <div v-if="!embedded && linkedRecordPills.length" class="mt-4 flex flex-wrap gap-2 sm:hidden">
          <template v-for="pill in linkedRecordPills" :key="pill.label">
            <a
              v-if="pill.href"
              data-linked-pill
              :href="pill.href"
              :target="pill.external ? '_blank' : undefined"
              :rel="pill.external ? 'noreferrer' : undefined"
              class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
            >
              {{ pill.label }}
            </a>
            <span
              v-else
              data-linked-pill
              class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7"
            >
              {{ pill.label }}
            </span>
          </template>
        </div>

        <section
          v-if="hasGitHubContext"
          data-github-panel
          class="mt-6 rounded-2xl border bg-surface-menu-bar p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.12em] text-ink-gray-5">GitHub</p>
              <h3 class="mt-1 text-base font-semibold text-ink-gray-8">Repository & code context</h3>
              <p class="mt-1 text-sm text-ink-gray-6">
                Review the synced issue, PR, and recent webhook deliveries without leaving Gameplan.
              </p>
            </div>
            <a
              v-if="primaryGitHubHref"
              :href="primaryGitHubHref"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center rounded-md border bg-surface-white px-3 py-1.5 text-sm font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
            >
              Open on GitHub
            </a>
          </div>

          <div class="mt-4 grid gap-3">
            <div v-if="githubContextData.repository" class="rounded-xl border bg-surface-white p-3">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs uppercase tracking-[0.08em] text-ink-gray-5">Repository</p>
                  <div class="mt-1 flex items-center gap-2">
                    <p class="truncate text-sm font-medium text-ink-gray-8">
                      {{ githubContextData.repository.label }}
                    </p>
                    <span
                      :class="statusBadgeClass(githubContextData.repository.connected ? 'connected' : 'pending')"
                    >
                      {{ githubContextData.repository.connected ? 'Connected' : 'Install App' }}
                    </span>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <a
                    v-if="githubContextData.repository.url"
                    data-github-repository-link
                    :href="githubContextData.repository.url"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
                  >
                    Repository
                  </a>
                  <a
                    v-if="githubContextData.repository.install_url"
                    data-github-install-link
                    :href="githubContextData.repository.install_url"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
                  >
                    Install App
                  </a>
                </div>
              </div>
            </div>

            <div v-if="githubContextData.issue || githubContextData.pull_request" class="grid gap-3 lg:grid-cols-2">
              <a
                v-if="githubContextData.issue"
                data-github-issue-link
                :href="githubContextData.issue.url || '#'"
                :class="[
                  'rounded-xl border bg-surface-white p-3 transition',
                  githubContextData.issue.url ? 'hover:bg-surface-gray-2' : 'pointer-events-none opacity-70',
                ]"
                :target="githubContextData.issue.url ? '_blank' : undefined"
                :rel="githubContextData.issue.url ? 'noreferrer' : undefined"
              >
                <p class="text-xs uppercase tracking-[0.08em] text-ink-gray-5">Issue</p>
                <div class="mt-1 flex items-center gap-2">
                  <p class="text-sm font-medium text-ink-gray-8">#{{ githubContextData.issue.number }}</p>
                  <span
                    v-if="githubContextData.issue.state"
                    :class="stateBadgeClass(githubContextData.issue.state)"
                  >
                    {{ githubContextData.issue.state }}
                  </span>
                </div>
                <p class="mt-2 text-xs text-ink-gray-5">Open the linked issue in GitHub.</p>
              </a>

              <a
                v-if="githubContextData.pull_request"
                data-github-pr-link
                :href="githubContextData.pull_request.url || '#'"
                :class="[
                  'rounded-xl border bg-surface-white p-3 transition',
                  githubContextData.pull_request.url ? 'hover:bg-surface-gray-2' : 'pointer-events-none opacity-70',
                ]"
                :target="githubContextData.pull_request.url ? '_blank' : undefined"
                :rel="githubContextData.pull_request.url ? 'noreferrer' : undefined"
              >
                <p class="text-xs uppercase tracking-[0.08em] text-ink-gray-5">Pull Request</p>
                <div class="mt-1 flex items-center gap-2">
                  <p class="text-sm font-medium text-ink-gray-8">#{{ githubContextData.pull_request.number }}</p>
                  <span
                    v-if="githubContextData.pull_request.state"
                    :class="stateBadgeClass(githubContextData.pull_request.state)"
                  >
                    {{ githubContextData.pull_request.state }}
                  </span>
                </div>
                <p class="mt-2 text-xs text-ink-gray-5">Open the linked PR in GitHub.</p>
              </a>
            </div>
          </div>

          <div v-if="githubContextData.events.length" class="mt-4 border-t border-outline-gray-1 pt-4">
            <div class="mb-2">
              <p class="text-sm font-medium text-ink-gray-8">Recent sync activity</p>
              <p class="text-xs text-ink-gray-5">Latest inbound GitHub deliveries for this task.</p>
            </div>

            <div class="space-y-2">
              <component
                :is="event.url ? 'a' : 'div'"
                v-for="event in githubContextData.events"
                :key="event.name"
                data-github-sync-event
                :href="event.url || undefined"
                :target="event.url ? '_blank' : undefined"
                :rel="event.url ? 'noreferrer' : undefined"
                class="block rounded-xl border bg-surface-white px-3 py-2 transition hover:bg-surface-gray-2"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="statusBadgeClass(event.status)">
                    {{ event.status }}
                  </span>
                  <span class="text-sm font-medium text-ink-gray-8">{{ event.summary }}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-gray-5">
                  <span>{{ prettifyEventType(event.event_type) }}</span>
                  <span v-if="event.delivery_id">Delivery {{ event.delivery_id }}</span>
                  <span>{{ formatGitHubEventTime(event.processed_at || event.modified) }}</span>
                </div>
                <p v-if="event.error_message" class="mt-2 text-xs text-red-600">
                  {{ event.error_message }}
                </p>
              </component>
            </div>
          </div>
        </section>

        <CommentsList class="mt-8" doctype="GP Task" :name="taskId" />
      </div>
    </div>
    <div class="hidden w-[21rem] shrink-0 border-l sm:block" v-if="!embedded">
      <div class="grid grid-cols-2 items-start gap-y-6 p-6 text-base text-ink-gray-6">
        <div>Assignee</div>
        <div>
          <Combobox
            placeholder="Assign a user"
            :options="assignableUsers"
            v-model="task.doc.assigned_to"
            @update:modelValue="changeAssignee"
            placement="end"
          />
        </div>
        <div>Due Date</div>
        <div>
          <DatePicker
            v-model="task.doc.due_date"
            variant="subtle"
            placeholder="Due date"
            format="D MMM, YYYY"
            @update:modelValue="(value) => setTaskValue({ due_date: value || '' })"
          />
        </div>
        <div>Space</div>
        <div>
          <Combobox
            placeholder="Select space"
            :options="spaceOptions"
            :modelValue="task.doc.project"
            @update:modelValue="changeSpace"
          />
        </div>
        <div>Status</div>
        <div>
          <Dropdown :options="statusOptions">
            <Button>
              <template #prefix>
                <TaskStatusIcon :status="task.doc.status" />
              </template>
              {{ task.doc.status || 'Set status' }}
            </Button>
          </Dropdown>
        </div>
        <div>Priority</div>
        <div>
          <Dropdown :options="priorityOptions">
            <Button>
              <template v-if="task.doc.priority" #prefix>
                <TaskPriorityIcon :priority="task.doc.priority" />
              </template>
              {{ task.doc.priority || 'Set priority' }}
            </Button>
          </Dropdown>
        </div>
        <div>Epic</div>
        <div>
          <Combobox
            placeholder="Select epic"
            :options="epicOptions"
            :modelValue="task.doc.om_epic"
            @update:modelValue="changeEpic"
            placement="end"
          />
        </div>
        <div>Sprint</div>
        <div>
          <Combobox
            placeholder="Select sprint"
            :options="sprintOptions"
            :modelValue="task.doc.om_sprint"
            @update:modelValue="changeSprint"
            placement="end"
          />
        </div>
        <div>Repository</div>
        <div>
          <Combobox
            placeholder="Select repository"
            :options="repositoryOptions"
            :modelValue="task.doc.om_repository"
            @update:modelValue="changeRepository"
            placement="end"
          />
        </div>
        <div class="col-span-2 border-t pt-4">
          <div class="mb-2 text-sm text-ink-gray-5">GitHub</div>
          <GitHubConnectionBadge :redirect-after="$route.fullPath" />
          <div class="mt-3">
            <GitDeliveryPanel :task-name="taskId" />
          </div>
        </div>
        <div class="col-span-2 border-t pt-4" v-if="linkedRecordPills.length">
          <div class="mb-2 text-sm text-ink-gray-5">Linked work</div>
          <div class="flex flex-wrap gap-2">
            <template v-for="pill in linkedRecordPills" :key="pill.label">
              <a
                v-if="pill.href"
                data-linked-pill
                :href="pill.href"
                :target="pill.external ? '_blank' : undefined"
                :rel="pill.external ? 'noreferrer' : undefined"
                class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7 transition hover:bg-surface-gray-2"
              >
                {{ pill.label }}
              </a>
              <span
                v-else
                data-linked-pill
                class="inline-flex items-center rounded-full border bg-surface-white px-3 py-1 text-xs font-medium text-ink-gray-7"
              >
                {{ pill.label }}
              </span>
            </template>
          </div>
        </div>
        <div class="col-span-2 border-t pt-4" v-if="workContextRelated.length" data-related-work-panel>
          <div class="mb-2 text-sm text-ink-gray-5">Related work</div>
          <div class="space-y-2">
            <template v-for="item in workContextRelated" :key="item.name">
              <a
                v-if="item.href"
                :href="item.href"
                class="flex items-start gap-2 rounded-lg border bg-surface-white px-3 py-2 text-sm transition hover:bg-surface-gray-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-ink-gray-8 truncate">{{ item.title }}</div>
                  <div class="mt-0.5 flex items-center gap-2 text-xs text-ink-gray-5">
                    <span>{{ item.typeLabel }}</span>
                    <span v-if="item.status" class="rounded-full bg-surface-gray-2 px-1.5 py-0.5">{{ item.status }}</span>
                    <span v-if="item.via" class="truncate">via {{ item.via }}</span>
                  </div>
                </div>
              </a>
              <div
                v-else
                class="flex items-start gap-2 rounded-lg border bg-surface-white px-3 py-2 text-sm"
              >
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-ink-gray-8 truncate">{{ item.title }}</div>
                  <div class="mt-0.5 flex items-center gap-2 text-xs text-ink-gray-5">
                    <span>{{ item.typeLabel }}</span>
                    <span v-if="item.status" class="rounded-full bg-surface-gray-2 px-1.5 py-0.5">{{ item.status }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
        <div class="col-span-2 border-t pt-4" v-if="workContextTimeline.length" data-timeline-panel>
          <div class="mb-2 text-sm text-ink-gray-5">Recent activity</div>
          <div class="space-y-1.5">
            <div
              v-for="event in workContextTimeline.slice(0, 5)"
              :key="event.id || event.name"
              class="flex items-start gap-2 text-xs"
            >
              <div class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" :class="event.type === 'relationship' ? 'bg-blue-400' : 'bg-green-400'"></div>
              <div class="min-w-0 flex-1">
                <div class="text-ink-gray-7">{{ event.summary }}</div>
                <div class="text-ink-gray-4" v-if="event.timestamp">{{ formatTimelineTime(event.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, computed, useTemplateRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { dayjsLocal } from 'frappe-ui'
import TextEditor from '@/components/TextEditor.vue'
import CommentsList from '@/components/CommentsList.vue'
import TaskStatusIcon from '@/components/NewTaskDialog/TaskStatusIcon.vue'
import TaskPriorityIcon from '@/components/icons/TaskPriorityIcon.vue'
import DropdownMoreOptions from './DropdownMoreOptions.vue'
import GitHubConnectionBadge from '@/components/GitHubConnectionBadge.vue'
import GitDeliveryPanel from '@/components/GitDeliveryPanel.vue'
import { Dropdown, LoadingText, DatePicker, Button, Combobox } from 'frappe-ui'
import { vFocus } from '@/directives'
import { activeUsers } from '@/data/users'
import { useGroupedSpaceOptions } from '@/data/groupedSpaces'
import { useTask } from '@/data/tasks'
import { GPTask } from '@/types/doctypes'
import {
  omEpics,
  omRepositories,
  omSprints,
  prettifyEventType,
  routeInfoToHref,
  useGitHubTaskContext,
  useTaskNavigation,
  useWorkContext,
  friendlyDoctype,
} from '@/data/opsMaturity'

const props = withDefaults(
  defineProps<{
    taskId: string
    embedded?: boolean
    preserveRoute?: boolean
  }>(),
  {
    embedded: false,
    preserveRoute: false,
  },
)

const emit = defineEmits<{
  updated: [values: Partial<GPTask>]
}>()

const router = useRouter()
const route = useRoute()
const description = useTemplateRef<any>('description')

const task = useTask(() => props.taskId)
const taskNavigation = useTaskNavigation(() => task.doc?.name || props.taskId)
const githubTaskContext = useGitHubTaskContext(() => task.doc?.name || props.taskId)
const workContext = useWorkContext('GP Task', () => task.doc?.name || props.taskId)

function refreshNavigation() {
  if (task.doc?.name) {
    taskNavigation.submit({ doctype: 'GP Task', name: String(task.doc.name) })
  }
}

async function setTaskValue(values: Partial<GPTask>) {
  const response = await task.setValue.submit(values)
  emit('updated', values)
  refreshNavigation()
  return response
}

task.onSuccess((doc) => {
  if (['Task', 'SpaceTask'].includes(route.name as string) && route.params.taskId === doc.name) {
    task.trackVisit.submit()
  }
})

const assignableUsers = computed<{ label: string; value: string }[]>(() => {
  return [
    {
      label: 'Unassigned',
      value: '<no_assignee>',
    },
  ].concat(
    ...activeUsers.value.map((user) => ({
      label: user.full_name,
      value: user.name,
    })),
  )
})

const workContextRelated = computed(() => {
  const ctx = workContext.data
  if (!ctx) return []
  const items: Array<{name: string; title: string; typeLabel: string; status?: string; href?: string; via?: string}> = []
  const seen = new Set<string>()
  // Add transitive related items
  for (const r of ctx.related || []) {
    const key = r.doctype + ':' + r.name
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      name: String(r.name),
      title: r.title || String(r.name),
      typeLabel: friendlyDoctype(r.doctype),
      status: r.status || undefined,
      href: routeInfoToHref(r.route_info) || undefined,
      via: r.via_title || undefined,
    })
  }
  // Add graph links not already in direct links
  for (const gl of ctx.graph_links || []) {
    const key = (gl.counterparty_doctype || '') + ':' + (gl.counterparty_name || '')
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      name: String(gl.counterparty_name || gl.name),
      title: String(gl.counterparty_name || gl.name),
      typeLabel: friendlyDoctype(gl.counterparty_doctype),
      href: routeInfoToHref(gl.counterparty_route_info) || undefined,
    })
  }
  return items.slice(0, 8)
})

const workContextTimeline = computed(() => {
  const ctx = workContext.data
  if (!ctx) return []
  return (ctx.timeline || []).map(e => ({
    ...e,
    id: e.name || e.id || Math.random().toString(),
  }))
})

function formatTimelineTime(ts?: string | null) {
  if (!ts) return ''
  return dayjsLocal(ts).fromNow()
}

const statusOptions = computed(() =>
  (['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'] as Array<GPTask['status']>).map(
    (status) => ({
      icon: () => h(TaskStatusIcon, { status }),
      label: status,
      onClick: () => setTaskValue({ status }),
    }),
  ),
)

const priorityOptions = computed(() =>
  (['Low', 'Medium', 'High'] as Array<Exclude<GPTask['priority'], ''>>).map((priority) => ({
    icon: () => h(TaskPriorityIcon, { priority }),
    label: priority,
    onClick: () => setTaskValue({ priority }),
  })),
)

const spaceOptions = useGroupedSpaceOptions({ filterFn: (space) => !space.archived_at })

const epicOptions = computed(() => [
  { label: 'No epic', value: '' },
  ...(omEpics.data || []).map((epic) => ({
    label: `${epic.title} (${epic.name})`,
    value: epic.name,
  })),
])

const sprintOptions = computed(() => [
  { label: 'No sprint', value: '' },
  ...(omSprints.data || []).map((sprint) => ({
    label: `${sprint.title} (${sprint.status})`,
    value: sprint.name,
  })),
])

const repositoryOptions = computed(() => [
  { label: 'No repository', value: '' },
  ...(omRepositories.data || []).map((repository) => ({
    label: repository.full_name || repository.name,
    value: repository.name,
  })),
])

const linkedRecordPills = computed(() => {
  const pills: Array<{ label: string; href?: string; external?: boolean }> = []
  const context = taskNavigation.data?.context

  if (context?.epic) {
    pills.push({
      label: `Epic ${context.epic}`,
      href: routeInfoToHref(context.epic_route_info),
    })
  }

  if (context?.sprint) {
    pills.push({
      label: `Sprint ${context.sprint}`,
      href: routeInfoToHref(context.sprint_route_info),
    })
  }

  if (context?.repository) {
    pills.push({
      label: `Repo ${context.repository}`,
      href: routeInfoToHref(context.repository_route_info),
    })
  }

  if (context?.helpdesk_ticket) {
    pills.push({
      label: `From ticket ${context.helpdesk_ticket}`,
      href: routeInfoToHref(context.helpdesk_ticket_route_info),
    })
  }

  if (task.doc?.om_github_issue_url && task.doc?.om_github_issue_number) {
    pills.push({
      label: `Issue #${task.doc.om_github_issue_number}`,
      href: task.doc.om_github_issue_url,
      external: true,
    })
  }

  if (task.doc?.om_github_pr_url && task.doc?.om_github_pr_number) {
    pills.push({
      label: `PR #${task.doc.om_github_pr_number}`,
      href: task.doc.om_github_pr_url,
      external: true,
    })
  }

  return pills
})

const githubContextData = computed(() => githubTaskContext.data || { events: [] })

const hasGitHubContext = computed(() =>
  Boolean(
    githubContextData.value.repository ||
      githubContextData.value.issue ||
      githubContextData.value.pull_request ||
      githubContextData.value.events?.length,
  ),
)

const primaryGitHubHref = computed(
  () =>
    githubContextData.value.pull_request?.url ||
    githubContextData.value.issue?.url ||
    githubContextData.value.repository?.url ||
    githubContextData.value.repository?.install_url ||
    '',
)

function formatGitHubEventTime(value?: string | null) {
  if (!value) return 'Pending'
  return dayjsLocal(value).format('D MMM, h:mm A')
}

function stateBadgeClass(state?: string | null) {
  const normalized = (state || '').toLowerCase()
  if (normalized === 'open') return statusBadgeClass('connected')
  if (normalized === 'merged') return statusBadgeClass('processed')
  if (normalized === 'closed') return statusBadgeClass('failed')
  if (normalized === 'draft') return statusBadgeClass('pending')
  return statusBadgeClass('pending')
}

function statusBadgeClass(status?: string | boolean | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'processed' || normalized === 'connected' || normalized === 'open') {
    return 'inline-flex rounded-full bg-surface-green-2 px-2 py-0.5 text-[11px] font-medium text-green-700'
  }
  if (normalized === 'failed' || normalized === 'closed') {
    return 'inline-flex rounded-full bg-surface-red-2 px-2 py-0.5 text-[11px] font-medium text-red-700'
  }
  if (normalized === 'merged') {
    return 'inline-flex rounded-full bg-surface-blue-2 px-2 py-0.5 text-[11px] font-medium text-blue-700'
  }
  return 'inline-flex rounded-full bg-surface-amber-2 px-2 py-0.5 text-[11px] font-medium text-amber-700'
}

function persistTitle(event: FocusEvent) {
  const title = (event.target as HTMLInputElement | null)?.value || ''
  setTaskValue({ title })
}

function persistDescription() {
  const editor = description.value?.editor?.value
  if (!editor || editor.isEmpty) return
  setTaskValue({ description: editor.getHTML() })
}

function changeAssignee(option: string) {
  if (option === '<no_assignee>') {
    option = ''
  }
  setTaskValue({ assigned_to: option })
}

function changeSpace(option: string) {
  if (!task.doc) return
  task.doc.project = option
  setTaskValue({ project: option }).then(() => {
    if (!props.preserveRoute) {
      updateRoute()
    }
  })
}

function changeEpic(option: string) {
  setTaskValue({ om_epic: option || '' })
}

function changeSprint(option: string) {
  setTaskValue({ om_sprint: option || '' })
}

function changeRepository(option: string) {
  setTaskValue({ om_repository: option || '' })
}

function updateRoute() {
  if (task.doc) {
    router.replace({
      name: task.doc.project ? 'SpaceTask' : 'Task',
      params: task.doc.project
        ? {
            taskId: task.doc.name,
            spaceId: task.doc.project,
          }
        : {
            taskId: task.doc.name,
          },
    })
  }
}
</script>
