<template>
  <span class="toggle-switch">
    <input
      :id="props.id"
      v-model="model"
      class="toggle-switch__input"
      type="checkbox"
      role="switch"
      :aria-label="props.label"
    />
    <span class="toggle-switch__track" aria-hidden="true">
      <span class="toggle-switch__thumb" />
    </span>
  </span>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true });

const props = withDefaults(defineProps<{ id?: string; label?: string }>(), {
  id: undefined,
  label: undefined,
});
</script>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 52px;
  height: 32px;
}

.toggle-switch__input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.toggle-switch__track {
  width: 100%;
  height: 100%;
  padding: 3px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-line);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.toggle-switch__thumb {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-text);
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.toggle-switch__input:checked + .toggle-switch__track {
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: var(--glow-accent);
}

.toggle-switch__input:checked + .toggle-switch__track .toggle-switch__thumb {
  background: var(--color-on-accent);
}

.toggle-switch__input:checked + .toggle-switch__track .toggle-switch__thumb {
  transform: translateX(20px);
}

.toggle-switch__input:focus-visible + .toggle-switch__track {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}
</style>
