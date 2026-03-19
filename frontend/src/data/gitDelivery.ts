import { createResource } from 'frappe-ui'
import { computed, ref, type Ref } from 'vue'

/**
 * Reactive composable for task-level git delivery operations:
 * branch creation/linking, CI status, PR creation.
 */

export function useGitDelivery(taskName: Ref<string> | (() => string)) {
  const resolvedName = typeof taskName === 'function' ? computed(taskName) : taskName

  const branchInfo = createResource({
    url: 'ops_maturity.api.task_get_branch_info',
    makeParams: () => ({ task_name: resolvedName.value }),
    auto: true,
    cache: ['git-delivery-branch', resolvedName],
  })

  const createBranch = createResource({
    url: 'ops_maturity.api.task_create_branch',
  })

  const linkBranch = createResource({
    url: 'ops_maturity.api.task_link_branch',
  })

  const refreshCI = createResource({
    url: 'ops_maturity.api.task_refresh_ci_status',
  })

  const createPR = createResource({
    url: 'ops_maturity.api.task_create_pull_request',
  })

  const workingBranch = computed(() => branchInfo.data?.working_branch || null)
  const baseBranch = computed(() => branchInfo.data?.base_branch || null)
  const branchUrl = computed(() => branchInfo.data?.branch_url || null)
  const ciStatus = computed(() => branchInfo.data?.ci_status || null)
  const ciStatusUrl = computed(() => branchInfo.data?.ci_status_url || null)
  const ciUpdatedAt = computed(() => branchInfo.data?.ci_updated_at || null)
  const prNumber = computed(() => branchInfo.data?.pr_number || null)
  const prUrl = computed(() => branchInfo.data?.pr_url || null)
  const prState = computed(() => branchInfo.data?.pr_state || null)
  const hasBranch = computed(() => Boolean(workingBranch.value))
  const hasPR = computed(() => Boolean(prNumber.value))
  const canCreatePR = computed(() => hasBranch.value && ciStatus.value === 'passed' && !hasPR.value)

  async function doCreateBranch(branchName?: string, baseBranchName?: string) {
    const result = await createBranch.submit({
      task_name: resolvedName.value,
      branch_name: branchName || undefined,
      base_branch: baseBranchName || undefined,
    })
    branchInfo.reload()
    return result
  }

  async function doLinkBranch(branchName: string) {
    const result = await linkBranch.submit({
      task_name: resolvedName.value,
      branch_name: branchName,
    })
    branchInfo.reload()
    return result
  }

  async function doRefreshCI() {
    const result = await refreshCI.submit({ task_name: resolvedName.value })
    branchInfo.reload()
    return result
  }

  async function doCreatePR(title?: string, body?: string) {
    const result = await createPR.submit({
      task_name: resolvedName.value,
      title: title || undefined,
      body: body || undefined,
      draft: true,
    })
    branchInfo.reload()
    return result
  }

  return {
    branchInfo,
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
    // Loading states
    isCreatingBranch: computed(() => createBranch.loading),
    isLinkingBranch: computed(() => linkBranch.loading),
    isRefreshingCI: computed(() => refreshCI.loading),
    isCreatingPR: computed(() => createPR.loading),
  }
}
