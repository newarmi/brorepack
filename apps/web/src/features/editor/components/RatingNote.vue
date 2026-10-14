<template>
  <p class="rating-note">
    <AppIcon name="check" :size="16" />
    <span>
      <span class="mono">{{ props.level }} lvl · {{ props.elo }} elo</span>
      — из FACEIT, изменить нельзя
    </span>
  </p>
</template>

<script setup lang="ts">
import { AppIcon } from '@/shared/ui';

const props = defineProps<{ level: number; elo: number }>();
</script>

<style scoped>
.rating-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: -8px;
  color: var(--color-muted);
  font-size: 13px;
}

.rating-note :deep(svg) {
  flex-shrink: 0;
  color: var(--color-ok);
}

.rating-note .mono {
  color: var(--color-text);
}
</style>
