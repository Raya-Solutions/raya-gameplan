import { createResource } from 'frappe-ui'
import { computed, ref, type Ref } from 'vue'

/**
 * Reactive composable for sprint-level release and deployment operations:
 * release readiness validation, release candidate creation, Press handoff,
 * deployment status tracking, and post-deploy verification.
 */

export function useReleaseDelivery(sprintName: Ref<string> | (() => string)) {
  const resolvedName = typeof sprintName === 'function' ? computed(sprintName) : sprintName

  // Release readiness check
  const validateReadiness = createResource({
    url: 'ops_maturity.api.validate_sprint_release_readiness',
  })

  // Release candidate CRUD
  const createRC = createResource({
    url: 'ops_maturity.api.create_release_candidate',
  })

  const getRC = createResource({
    url: 'ops_maturity.api.get_release_candidate',
  })

  // Press handoff
  const handoff = createResource({
    url: 'ops_maturity.api.handoff_to_press',
  })

  // Deployment status
  const updateStatus = createResource({
    url: 'ops_maturity.api.update_deployment_status',
  })

  // Verification checklist
  const updateChecklist = createResource({
    url: 'ops_maturity.api.update_verification_checklist',
  })

  // Press config
  const pressInfo = createResource({
    url: 'ops_maturity.api.get_press_deploy_info',
    auto: true,
    cache: ['press-deploy-info'],
  })

  // State
  const readinessResult = ref<any>(null)
  const releaseCandidate = ref<any>(null)

  async function doValidateReadiness() {
    const result = await validateReadiness.submit({ sprint_name: resolvedName.value })
    readinessResult.value = result
    return result
  }

  async function doCreateReleaseCandidate(notes?: string) {
    const result = await createRC.submit({
      sprint_name: resolvedName.value,
      notes: notes || undefined,
    })
    if (result?.release_candidate) {
      await doLoadReleaseCandidate(result.release_candidate)
    }
    return result
  }

  async function doLoadReleaseCandidate(rcName: string) {
    const result = await getRC.submit({ release_candidate_name: rcName })
    releaseCandidate.value = result
    return result
  }

  async function doHandoffToPress(rcName: string) {
    const result = await handoff.submit({ release_candidate_name: rcName })
    if (result?.release_candidate) {
      await doLoadReleaseCandidate(result.release_candidate)
    }
    return result
  }

  async function doUpdateDeploymentStatus(dlName: string, status: string, errorMessage?: string) {
    const result = await updateStatus.submit({
      deployment_log_name: dlName,
      status,
      error_message: errorMessage || undefined,
    })
    return result
  }

  async function doUpdateChecklist(rcName: string, checklist: any[]) {
    const result = await updateChecklist.submit({
      release_candidate_name: rcName,
      checklist_json: JSON.stringify(checklist),
    })
    if (result?.release_candidate) {
      await doLoadReleaseCandidate(result.release_candidate)
    }
    return result
  }

  return {
    // Data
    readinessResult,
    releaseCandidate,
    pressInfo,
    // Computed
    isReady: computed(() => readinessResult.value?.is_ready ?? false),
    blockerCount: computed(() => readinessResult.value?.blocker_count ?? 0),
    blockers: computed(() => readinessResult.value?.blockers ?? []),
    pressDeployUrl: computed(() => pressInfo.data?.press_deploy_url || ''),
    isPressConfigured: computed(() => pressInfo.data?.is_configured ?? false),
    // Actions
    doValidateReadiness,
    doCreateReleaseCandidate,
    doLoadReleaseCandidate,
    doHandoffToPress,
    doUpdateDeploymentStatus,
    doUpdateChecklist,
    // Loading states
    isValidating: computed(() => validateReadiness.loading),
    isCreatingRC: computed(() => createRC.loading),
    isLoadingRC: computed(() => getRC.loading),
    isHandingOff: computed(() => handoff.loading),
    isUpdatingStatus: computed(() => updateStatus.loading),
    isUpdatingChecklist: computed(() => updateChecklist.loading),
  }
}
