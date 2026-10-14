<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="bottom-sheet" @click.self="closeHandler">
        <section
          ref="panel"
          class="bottom-sheet__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <span class="bottom-sheet__grabber" aria-hidden="true" />
          <h2 :id="titleId" class="bottom-sheet__title">{{ props.title }}</h2>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue';

const emits = defineEmits<{ close: [] }>();

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ title: string; dismissible?: boolean }>(), {
  dismissible: true,
});

const titleId = `sheet-${useId()}`;
const panelRef = useTemplateRef<HTMLElement>('panel');
let previouslyFocused: HTMLElement | null = null;

const closeHandler = (): void => {
  if (!props.dismissible) {
    return;
  }
  open.value = false;
  emits('close');
};

const keydownHandler = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closeHandler();
  }
};

// Открытая шторка ловит Escape и забирает фокус, закрытая — возвращает его туда, где он был
const focusPanel = async (): Promise<void> => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.addEventListener('keydown', keydownHandler);
  await nextTick();
  panelRef.value?.focus();
};

const restoreFocus = (): void => {
  document.removeEventListener('keydown', keydownHandler);
  previouslyFocused?.focus();
  previouslyFocused = null;
};

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void focusPanel();
      return;
    }
    restoreFocus();
  },
  { immediate: true },
);

onBeforeUnmount(() => document.removeEventListener('keydown', keydownHandler));
</script>

<style scoped>
.bottom-sheet {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(4 7 14 / 72%);
}

.bottom-sheet__panel {
  width: 100%;
  max-width: 480px;
  max-height: calc(var(--viewport-height) - 40px);
  overflow-y: auto;
  padding: 10px var(--screen-padding) calc(24px + var(--safe-bottom));
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
}

.bottom-sheet__panel:focus-visible {
  outline: none;
}

.bottom-sheet__grabber {
  display: block;
  width: 40px;
  height: 4px;
  margin: 0 auto 16px;
  border-radius: var(--radius-chip);
  background: var(--color-line);
}

.bottom-sheet__title {
  margin-bottom: 16px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: background-color 220ms ease;
}

.sheet-enter-active .bottom-sheet__panel,
.sheet-leave-active .bottom-sheet__panel {
  transition: transform 220ms ease;
}

.sheet-enter-from,
.sheet-leave-to {
  background-color: transparent;
}

.sheet-enter-from .bottom-sheet__panel,
.sheet-leave-to .bottom-sheet__panel {
  transform: translateY(100%);
}
</style>
