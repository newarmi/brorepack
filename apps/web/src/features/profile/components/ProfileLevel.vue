<template>
  <div class="profile-level">
    <div class="profile-level__main">
      <LevelGauge :level="props.level" :size="104" />
      <div>
        <p class="profile-level__caption mono">ELO</p>
        <p class="profile-level__elo mono">{{ props.elo }}</p>
        <p class="profile-level__label" :style="{ color }">{{ props.level }} уровень FACEIT</p>
      </div>
    </div>

    <div v-if="progress.nextLevelMinElo !== null" class="profile-level__progress">
      <div class="profile-level__progress-head">
        <span>До {{ nextLevel }} уровня</span>
        <span class="mono profile-level__left">{{ progress.eloToNextLevel }} ELO</span>
      </div>
      <div
        class="profile-level__bar"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(progress.progress * 100)"
        :aria-label="`Прогресс до ${nextLevel} уровня`"
      >
        <span
          class="profile-level__bar-fill"
          :style="{ width: progressPercent, background: color }"
        />
      </div>
      <div class="profile-level__bounds mono">
        <span>{{ progress.levelMinElo }} · lvl {{ progress.level }}</span>
        <span>{{ progress.nextLevelMinElo }} · lvl {{ nextLevel }}</span>
      </div>
    </div>
    <p v-else class="profile-level__max">Максимальный уровень</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { getLevelColor, getLevelProgress } from '@brorepack/shared';

import LevelGauge from './LevelGauge.vue';

const props = defineProps<{ level: number; elo: number }>();

const color = computed(() => getLevelColor(props.level));
const progress = computed(() => getLevelProgress(props.elo));
const nextLevel = computed(() => progress.value.level + 1);
const progressPercent = computed(() => `${Math.round(progress.value.progress * 100)}%`);
</script>

<style scoped>
.profile-level__main {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-level__caption {
  color: var(--color-muted);
  font-size: 12px;
  letter-spacing: 0.2em;
}

.profile-level__elo {
  font-size: var(--text-display);
  font-weight: 700;
  line-height: 1;
}

.profile-level__label {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 400;
}

.profile-level__progress {
  margin-top: 18px;
}

.profile-level__progress-head {
  display: flex;
  justify-content: space-between;
  color: var(--color-muted);
  font-size: 13px;
}

.profile-level__left {
  color: var(--color-text);
  font-weight: 700;
}

.profile-level__bar {
  height: 6px;
  margin: 8px 0;
  overflow: hidden;
  border-radius: var(--radius-chip);
  background: var(--color-surface-2);
}

.profile-level__bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.profile-level__bounds {
  display: flex;
  justify-content: space-between;
  color: var(--color-faint);
  font-size: 11px;
}

.profile-level__max {
  margin-top: 16px;
  color: var(--color-muted);
  font-size: 13px;
}
</style>
