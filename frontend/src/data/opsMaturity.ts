import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { dayjsLocal, useCall, useList } from 'frappe-ui'

export interface OMRouteInfo {
  app?: string | null
  doctype: string
  name: string
  surface: string
  app_route?: string | null
  desk_route?: string[] | null
  web_route?: string | null
}

export interface OMSprint {
  name: string
  title: string
  status: string
  goal?: string
  project?: string
  team?: string
  start_date?: string
  end_date?: string
}

export interface OMEpic {
  name: string
  title: string
  status: string
  repository?: string
}

export interface OMRepository {
  name: string
  full_name?: string
  repository_owner?: string
  repository_name?: string
  repository_url?: string
  github_installation_id?: string | null
}

export interface OMGitHubRepositoryContext {
  name: string
  label: string
  url?: string | null
  route_info?: OMRouteInfo | null
  connected: boolean
  installation_id?: string | null
  install_url?: string | null
}

export interface OMGitHubLinkContext {
  number?: number | null
  url?: string | null
  state?: string | null
}

export interface OMGitHubSyncEvent {
  name: string
  direction: string
  status: string
  event_type: string
  delivery_id?: string | null
  modified?: string | null
  processed_at?: string | null
  error_message?: string | null
  summary: string
  action?: string | null
  entity_type?: string | null
  number?: number | null
  title?: string | null
  url?: string | null
  state?: string | null
}

export interface OMGitHubTaskContext {
  repository?: OMGitHubRepositoryContext | null
  issue?: OMGitHubLinkContext | null
  pull_request?: OMGitHubLinkContext | null
  events: OMGitHubSyncEvent[]
}

export interface OMNavigationContext {
  route_info?: OMRouteInfo | null
  epic?: string | null
  sprint?: string | null
  repository?: string | null
  helpdesk_ticket?: string | null
  epic_route_info?: OMRouteInfo | null
  sprint_route_info?: OMRouteInfo | null
  repository_route_info?: OMRouteInfo | null
  helpdesk_ticket_route_info?: OMRouteInfo | null
  github_issue_number?: number
  github_issue_url?: string | null
  github_issue_state?: string | null
  github_pr_number?: number
  github_pr_url?: string | null
  github_pr_state?: string | null
}

export interface OMNavigationLink {
  name: string
  relation_type: string
  source_doctype: string
  source_name: string
  target_doctype: string
  target_name: string
  repository?: string | null
  counterparty_doctype?: string
  counterparty_name?: string
  counterparty_route_info?: OMRouteInfo | null
}

export interface OMNavigationContract {
  route_info: OMRouteInfo | null
  links: OMNavigationLink[]
  context?: OMNavigationContext | null
}

export const omSprints = useList<OMSprint>({
  doctype: 'OM Sprint',
  fields: ['name', 'title', 'status', 'goal', 'project', 'team', 'start_date', 'end_date'],
  orderBy: 'start_date desc, modified desc',
  limit: 100,
  cacheKey: 'gameplan-om-sprints',
})

export const omEpics = useList<OMEpic>({
  doctype: 'OM Epic',
  fields: ['name', 'title', 'status', 'repository'],
  orderBy: 'modified desc',
  limit: 100,
  cacheKey: 'gameplan-om-epics',
})

export const omRepositories = useList<OMRepository>({
  doctype: 'OM Repository',
  fields: ['name', 'full_name', 'repository_owner', 'repository_name', 'repository_url'],
  orderBy: 'modified desc',
  limit: 100,
  cacheKey: 'gameplan-om-repositories',
})

export const activeSprint = useCall<
  { board_name: string; sprint: OMSprint | null },
  { project?: string; team?: string }
>({
  url: '/api/v2/method/ops_maturity.api.get_active_sprint',
  immediate: false,
})

export function refreshActiveSprint(params: { project?: string; team?: string } = {}) {
  return activeSprint.submit(params)
}

export function useTaskNavigation(taskId: MaybeRefOrGetter<string | null | undefined>) {
  const navigation = useCall<OMNavigationContract, { doctype: string; name: string }>({
    url: '/api/v2/method/ops_maturity.api.get_navigation_contract',
    immediate: false,
  })

  watch(
    () => toValue(taskId),
    (name) => {
      if (!name) return
      navigation.submit({ doctype: 'GP Task', name: String(name) })
    },
    { immediate: true },
  )

  return navigation
}

export function useGitHubTaskContext(taskId: MaybeRefOrGetter<string | null | undefined>) {
  const githubContext = useCall<OMGitHubTaskContext, { task_name: string }>({
    url: '/api/v2/method/ops_maturity.api.get_github_task_context',
    immediate: false,
  })

  watch(
    () => toValue(taskId),
    (name) => {
      if (!name) return
      githubContext.submit({ task_name: String(name) })
    },
    { immediate: true },
  )

  return githubContext
}

export function routeInfoToHref(routeInfo?: OMRouteInfo | null) {
  if (!routeInfo) return ''
  if (routeInfo.app_route) return routeInfo.app_route
  if (routeInfo.web_route) return routeInfo.web_route
  const slug = routeInfo.doctype.toLowerCase().replace(/\s+/g, '-')
  return `/app/${slug}/${encodeURIComponent(routeInfo.name)}`
}

export function prettifyEventType(eventType?: string | null) {
  return (eventType || '')
    .split(/[._]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatSprintWindow(sprint?: Pick<OMSprint, 'start_date' | 'end_date'> | null) {
  if (!sprint) return ''
  const parts = [sprint.start_date, sprint.end_date]
    .filter(Boolean)
    .map((value) => dayjsLocal(value as string).format('D MMM'))
  return parts.join(' - ')
}

export const activeSprintSummary = computed(() => {
  if (!activeSprint.data?.sprint) {
    return {
      title: 'No active sprint',
      window: 'Backlog planning is available now.',
      goal: '',
    }
  }

  return {
    title: activeSprint.data.sprint.title,
    window: formatSprintWindow(activeSprint.data.sprint),
    goal: activeSprint.data.sprint.goal || '',
  }
})

// ── Work Context API (Milestone 11) ────────────────────────────

export interface WorkContextIdentity {
  doctype: string
  name: string
  title: string
  status?: string | null
  route_info?: OMRouteInfo | null
  owner?: string
  modified?: string
  modified_by?: string
}

export interface WorkContextDirectLink {
  field: string
  label: string
  doctype: string
  name: string
  title: string
  status?: string | null
  route_info?: OMRouteInfo | null
}

export interface WorkContextRelated {
  doctype: string
  name: string
  title: string
  status?: string | null
  route_info?: OMRouteInfo | null
  via_doctype?: string
  via_name?: string
  via_title?: string
  relation_type?: string
}

export interface WorkContextTimelineEvent {
  type: string
  name?: string
  id?: string
  timestamp?: string
  summary?: string
  relation_type?: string
  counterparty_doctype?: string
  counterparty_name?: string
  counterparty_title?: string
  counterparty_route_info?: OMRouteInfo | null
  event_type?: string
  direction?: string
  status?: string
  error?: string | null
  created_by?: string
  notes?: string | null
}

export interface WorkContextSummary {
  identity: WorkContextIdentity
  direct_links: WorkContextDirectLink[]
  graph_links: OMNavigationLink[]
}

export interface WorkContextFull extends WorkContextSummary {
  timeline: WorkContextTimelineEvent[]
  related: WorkContextRelated[]
  ops_context?: Record<string, unknown> | null
}

export function useWorkContext(
  doctype: MaybeRefOrGetter<string>,
  name: MaybeRefOrGetter<string | null | undefined>,
) {
  const context = useCall<WorkContextFull, { doctype: string; name: string }>({
    url: '/api/v2/method/ops_maturity.work_context.get_work_context',
    immediate: false,
  })

  watch(
    () => toValue(name),
    (n) => {
      if (!n) return
      context.submit({ doctype: toValue(doctype), name: String(n) })
    },
    { immediate: true },
  )

  return context
}

export function useWorkContextSummary(
  doctype: MaybeRefOrGetter<string>,
  name: MaybeRefOrGetter<string | null | undefined>,
) {
  const context = useCall<WorkContextSummary, { doctype: string; name: string }>({
    url: '/api/v2/method/ops_maturity.work_context.get_work_context_summary',
    immediate: false,
  })

  watch(
    () => toValue(name),
    (n) => {
      if (!n) return
      context.submit({ doctype: toValue(doctype), name: String(n) })
    },
    { immediate: true },
  )

  return context
}

export function friendlyDoctype(doctype?: string | null) {
  const map: Record<string, string> = {
    'GP Task': 'Task',
    'HD Ticket': 'Ticket',
    'CRM Deal': 'Deal',
    'CRM Organization': 'Organization',
    'OM Epic': 'Epic',
    'OM Sprint': 'Sprint',
    'OM Repository': 'Repository',
    'Wiki Document': 'Document',
    'Wiki Page': 'Page',
    'Raven Channel': 'Channel',
  }
  return map[doctype || ''] || doctype || 'Record'
}
