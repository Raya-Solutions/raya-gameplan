import { createResource } from 'frappe-ui'
import { computed, ref, type Ref } from 'vue'

/**
 * Reactive composable for sprint-level release, deployment, and communication operations.
 */
export function useReleaseDelivery(sprintName: Ref<string> | (() => string)) {
  const resolvedName = typeof sprintName === 'function' ? computed(sprintName) : sprintName

  const validateReadiness = createResource({
    url: 'ops_maturity.api.validate_sprint_release_readiness',
  })
  const createRC = createResource({
    url: 'ops_maturity.api.create_release_candidate',
  })
  const getRC = createResource({
    url: 'ops_maturity.api.get_release_candidate',
  })
  const getRCForSprint = createResource({
    url: 'ops_maturity.api.get_release_candidate_for_sprint',
  })
  const handoff = createResource({
    url: 'ops_maturity.api.handoff_to_press',
  })
  const updateStatus = createResource({
    url: 'ops_maturity.api.update_deployment_status',
  })
  const updateChecklist = createResource({
    url: 'ops_maturity.api.update_verification_checklist',
  })
  const pressInfo = createResource({
    url: 'ops_maturity.api.get_press_deploy_info',
    auto: true,
    cache: ['press-deploy-info'],
  })

  const getCommunication = createResource({
    url: 'ops_maturity.api.get_release_communication',
  })
  const prepareCommunication = createResource({
    url: 'ops_maturity.api.prepare_release_communication',
  })
  const sendCommunication = createResource({
    url: 'ops_maturity.api.send_release_communication',
  })
  const updateAdoptionChecklist = createResource({
    url: 'ops_maturity.api.update_release_adoption_checklist',
  })
  const getCommunicationHistory = createResource({
    url: 'ops_maturity.api.get_release_communication_history',
  })

  const readinessResult = ref<any>(null)
  const releaseCandidate = ref<any>(null)
  const releaseCommunication = ref<any>(null)
  const releaseCommunicationHistory = ref<any[]>([])

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
      await doLoadReleaseCommunicationHistory()
    }
    return result
  }

  async function doLoadReleaseCandidate(rcName: string) {
    const result = await getRC.submit({ release_candidate_name: rcName })
    releaseCandidate.value = result?.name ? result : null
    if (releaseCandidate.value?.name) {
      await doLoadReleaseCommunication()
    } else {
      releaseCommunication.value = null
    }
    return releaseCandidate.value
  }

  async function doLoadReleaseCandidateForSprint() {
    const sprint = resolvedName.value
    if (!sprint) {
      releaseCandidate.value = null
      return null
    }

    const result = await getRCForSprint.submit({ sprint_name: sprint })
    releaseCandidate.value = result?.exists === false || !result?.name ? null : result
    if (releaseCandidate.value?.name) {
      await doLoadReleaseCommunication()
    } else {
      releaseCommunication.value = null
    }
    return releaseCandidate.value
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

  async function doLoadReleaseCommunication(communicationName?: string) {
    const rcName = releaseCandidate.value?.name
    if (!communicationName && !rcName) {
      releaseCommunication.value = null
      return null
    }

    const result = await getCommunication.submit(
      communicationName
        ? { communication_name: communicationName }
        : { release_candidate_name: rcName },
    )
    releaseCommunication.value = result?.exists === false || !result?.name ? null : result
    return releaseCommunication.value
  }

  async function doPrepareReleaseCommunication() {
    if (!releaseCandidate.value?.name) return null
    const result = await prepareCommunication.submit({
      release_candidate: releaseCandidate.value.name,
    })
    if (result?.communication) {
      await doLoadReleaseCommunication(result.communication)
      await doLoadReleaseCommunicationHistory()
    }
    return result
  }

  async function doSendReleaseCommunication() {
    if (!releaseCommunication.value?.name) return null
    const result = await sendCommunication.submit({
      communication_name: releaseCommunication.value.name,
    })
    await doLoadReleaseCommunication(releaseCommunication.value.name)
    await doLoadReleaseCommunicationHistory()
    return result
  }

  async function doUpdateAdoptionChecklist(communicationName: string, checklist: any[]) {
    const result = await updateAdoptionChecklist.submit({
      communication_name: communicationName,
      checklist_json: JSON.stringify(checklist),
    })
    releaseCommunication.value = result?.name ? result : releaseCommunication.value
    await doLoadReleaseCommunicationHistory()
    return result
  }

  async function doLoadReleaseCommunicationHistory(limit = 6) {
    const result = await getCommunicationHistory.submit({
      limit,
      sprint_name: resolvedName.value || undefined,
    })
    releaseCommunicationHistory.value = result?.items ?? []
    return releaseCommunicationHistory.value
  }

  async function doInitializeReleasePanel() {
    await doLoadReleaseCandidateForSprint()
    await doLoadReleaseCommunicationHistory()
    return {
      releaseCandidate: releaseCandidate.value,
      releaseCommunication: releaseCommunication.value,
      releaseCommunicationHistory: releaseCommunicationHistory.value,
    }
  }

  return {
    readinessResult,
    releaseCandidate,
    releaseCommunication,
    releaseCommunicationHistory,
    pressInfo,
    isReady: computed(() => readinessResult.value?.is_ready ?? false),
    blockerCount: computed(() => readinessResult.value?.blocker_count ?? 0),
    blockers: computed(() => readinessResult.value?.blockers ?? []),
    pressDeployUrl: computed(() => pressInfo.data?.press_deploy_url || ''),
    isPressConfigured: computed(() => pressInfo.data?.is_configured ?? false),
    doValidateReadiness,
    doCreateReleaseCandidate,
    doLoadReleaseCandidate,
    doLoadReleaseCandidateForSprint,
    doHandoffToPress,
    doUpdateDeploymentStatus,
    doUpdateChecklist,
    doLoadReleaseCommunication,
    doPrepareReleaseCommunication,
    doSendReleaseCommunication,
    doUpdateAdoptionChecklist,
    doLoadReleaseCommunicationHistory,
    doInitializeReleasePanel,
    isValidating: computed(() => validateReadiness.loading),
    isCreatingRC: computed(() => createRC.loading),
    isLoadingRC: computed(() => getRC.loading || getRCForSprint.loading),
    isHandingOff: computed(() => handoff.loading),
    isUpdatingStatus: computed(() => updateStatus.loading),
    isUpdatingChecklist: computed(() => updateChecklist.loading),
    isLoadingCommunication: computed(() => getCommunication.loading),
    isPreparingCommunication: computed(() => prepareCommunication.loading),
    isSendingCommunication: computed(() => sendCommunication.loading),
    isUpdatingAdoptionChecklist: computed(() => updateAdoptionChecklist.loading),
    isLoadingCommunicationHistory: computed(() => getCommunicationHistory.loading),
  }
}
