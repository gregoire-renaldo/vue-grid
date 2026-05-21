<script setup>
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Please confirm',
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  size: {
    type: String,
    default: 'md',
    validator: value => ['sm', 'md', 'lg'].includes(value),
  },
  confirmVariant: {
    type: String,
    default: 'primary',
    validator: value => ['primary', 'danger'].includes(value),
  },
  cancelVariant: {
    type: String,
    default: 'secondary',
    validator: value => ['secondary', 'ghost'].includes(value),
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

function onBackdropClick() {
  if (!props.closeOnBackdrop) return
  emit('cancel')
}

function onConfirmClick() {
  emit('confirm')
}

function onCancelClick() {
  emit('cancel')
}
</script>

<template>
  <div v-if="props.open" class="modal-overlay" @click.self="onBackdropClick">
    <div
      class="modal-card"
      :class="`size-${props.size}`"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">{{ props.title }}</h2>
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-actions">
        <button
          class="modal-btn"
          :class="props.cancelVariant"
          @click="onCancelClick"
        >
          {{ props.cancelText }}
        </button>
        <button
          class="modal-btn"
          :class="props.confirmVariant"
          @click="onConfirmClick"
        >
          {{ props.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 1rem;
}

.modal-card {
  width: min(420px, 100%);
  background: #121212;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.modal-card.size-sm {
  width: min(340px, 100%);
}

.modal-card.size-md {
  width: min(420px, 100%);
}

.modal-card.size-lg {
  width: min(560px, 100%);
}

.modal-card h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.modal-body {
  margin: 0.8rem 0 0;
  font-size: 0.95rem;
  color: #d9d9d9;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal-btn {
  border: none;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
}

.modal-btn.secondary {
  background: #2b2b2b;
  color: #efefef;
}

.modal-btn.secondary:hover {
  background: #3a3a3a;
}

.modal-btn.danger {
  background: #d62828;
  color: white;
}

.modal-btn.danger:hover {
  background: #f03d3d;
}

.modal-btn.primary {
  background: #1db954;
  color: white;
}

.modal-btn.primary:hover {
  background: #1ed760;
}

.modal-btn.ghost {
  background: transparent;
  color: #d9d9d9;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
