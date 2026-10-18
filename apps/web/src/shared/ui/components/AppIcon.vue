<template>
  <svg
    class="app-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type IconName =
  | 'search'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-right'
  | 'check'
  | 'share'
  | 'bolt'
  | 'plus'
  | 'pin'
  | 'send'
  | 'phone'
  | 'refresh'
  | 'box'
  | 'image'
  | 'target'
  | 'trash'
  | 'move'
  | 'undo';

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 });

// Контурные иконки 24×24, нарисованы вручную — без сторонних пакетов
const PATHS: Record<IconName, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-3.6-3.6',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-right': 'M9 5l7 7-7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  share: 'M12 15V4m0 0L8 8m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  plus: 'M12 5v14M5 12h14',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  phone:
    'M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0L12 12m0 0 9-4.5M12 12v9',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 5 5m-2-2 3-3 5 5M15 9h.01',
  target: 'M12 3v4m0 10v4M3 12h4m10 0h4m-9-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6m4-6v6',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
};

const path = computed(() => PATHS[props.name]);
</script>

<style scoped>
.app-icon {
  flex-shrink: 0;
}
</style>
