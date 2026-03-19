<template>
  <Dialog
    :options="{ title: 'New Task' }"
    :disableOutsideClickToClose="disableOutsideClickToClose"
    v-model="showDialog"
  >
    <template #body-content>
      <div class="space-y-4" v-if="newTask">
        <FormControl
          label="Title"
          v-model="newTask.doc.title"
          autocomplete="off"
          required
          ref="titleInput"
          @keydown.enter="onCreateClick"
        />
        <FormControl
          label="Description"
          type="textarea"
          v-model="newTask.doc.description"
          @keydown.enter="onCreateClick"
        />
        <div class="grid gap-2 sm:grid-cols-2">
          <Combobox
            placeholder="Assign a user"
            :options="assignableUsers"
            v-model="newTask.doc.assigned_to"
          />
          <DatePicker
            v-model="newTask.doc.due_date"
            placeholder="Set due date"
            format="D MMM, YYYY"
          />
          <Combobox
            placeholder="Select space"
            :options="spaceOptions"
            v-model="newTask.doc.project"
          />
          <Dropdown class="w-full" :options="statusOptions()">
            <Button>
              <template #prefix v-if="newTask.doc.status">
                <TaskStatusIcon :status="newTask.doc.status" />
              </template>
              {{ newTask.doc.status }}
            </Button>
          </Dropdown>
          <Combobox
            placeholder="Select epic"
            :options="epicOptions"
            :modelValue="newTask.doc.om_epic"
            @update:modelValue="changeEpic"
          />
          <Combobox
            placeholder="Select sprint"
            :options="sprintOptions"
            :modelValue="newTask.doc.om_sprint"
            @update:modelValue="changeSprint"
          />
          <Combobox
            placeholder="Select repository"
            :options="repositoryOptions"
            :modelValue="newTask.doc.om_repository"
            @update:modelValue="changeRepository"
          />
          <Dropdown class="w-full" :options="priorityOptions()">
            <Button>
              <template #prefix v-if="newTask.doc.priority">
                <TaskPriorityIcon :priority="newTask.doc.priority" />
              </template>
              {{ newTask.doc.priority || 'Set priority' }}
            </Button>
          </Dropdown>
        </div>
        <ErrorMessage class="mt-2" :message="newTask.error" />
      </div>
    </template>
    <template #actions>
      <Button class="w-full relative" variant="solid" @click="onCreateClick">
        Create
        <div class="absolute right-0 top-0 h-7 pr-2 flex items-center justify-center">
          <KeyboardShortcut ctrl> Enter </KeyboardShortcut>
        </div>
      </Button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { computed, h, useTemplateRef, watch } from 'vue'
import { Dialog, FormControl, Dropdown, Combobox, DatePicker } from 'frappe-ui'
import TaskStatusIcon from './TaskStatusIcon.vue'
import TaskPriorityIcon from '@/components/icons/TaskPriorityIcon.vue'
import { activeUsers } from '@/data/users'
import { GPTask } from '@/types/doctypes'
import { showDialog, newTask, _onSuccess } from './state'
import { useGroupedSpaceOptions } from '@/data/groupedSpaces'
import KeyboardShortcut from '../KeyboardShortcut.vue'
import { omEpics, omRepositories, omSprints } from '@/data/opsMaturity'

const titleInput = useTemplateRef('titleInput')
let spaceOptions = useGroupedSpaceOptions({ filterFn: (space) => !space.archived_at })

function statusOptions() {
  return (['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'] as GPTask['status'][]).map(
    (status) => {
      return {
        icon: () => h(TaskStatusIcon, { status }),
        label: status,
        onClick: () => {
          if (newTask.value) {
            newTask.value.doc.status = status
          }
        },
      }
    },
  )
}

function priorityOptions() {
  return (['Low', 'Medium', 'High'] as Exclude<GPTask['priority'], ''>[]).map((priority) => ({
    icon: () => h(TaskPriorityIcon, { priority }),
    label: priority,
    onClick: () => {
      if (newTask.value) {
        newTask.value.doc.priority = priority
      }
    },
  }))
}

const assignableUsers = computed(() => {
  return activeUsers.value.map((user) => ({
    label: user.full_name,
    value: user.name,
  }))
})

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

function changeEpic(value: string) {
  if (!newTask.value) return
  newTask.value.doc.om_epic = value || ''
}

function changeSprint(value: string) {
  if (!newTask.value) return
  newTask.value.doc.om_sprint = value || ''
}

function changeRepository(value: string) {
  if (!newTask.value) return
  newTask.value.doc.om_repository = value || ''
}

function onCreateClick(e: KeyboardEvent) {
  if (e instanceof KeyboardEvent && !(e.ctrlKey || e.metaKey)) {
    return
  }

  if (!newTask.value) return
  if (!newTask.value.doc.title) {
    newTask.value.error = new Error('Task title is required')
    return
  }

  return newTask.value.submit().then((doc) => {
    showDialog.value = false
    _onSuccess.value(doc)
  })
}

let disableOutsideClickToClose = computed(() => {
  return newTask.value?.loading || newTask.value?.doc?.title != ''
})

watch(showDialog, (val) => {
  if (val) {
    setTimeout(() => {
      titleInput.value.$el?.querySelector('input')?.focus()
    }, 100)
  }
})
</script>
