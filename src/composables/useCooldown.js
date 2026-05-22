import { computed, onBeforeUnmount, ref } from 'vue'

export function useCooldown(durationMs = 5000) {
  const remainingMs = ref(0)
  let timerId = null

  const isCoolingDown = computed(() => remainingMs.value > 0)
  const label = computed(() => {
    if (!isCoolingDown.value) return 'Refresh'
    return `Refresh (${Math.ceil(remainingMs.value / 1000)}s)`
  })

  function startCooldown() {
    remainingMs.value = durationMs

    if (timerId) {
      clearInterval(timerId)
    }

    timerId = setInterval(() => {
      remainingMs.value = Math.max(0, remainingMs.value - 1000)

      if (remainingMs.value === 0 && timerId) {
        clearInterval(timerId)
        timerId = null
      }
    }, 1000)
  }

  onBeforeUnmount(() => {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  })

  return {
    isCoolingDown,
    remainingMs,
    label,
    startCooldown,
  }
}
