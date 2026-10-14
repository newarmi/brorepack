<template>
  <div class="profile-skeleton" aria-busy="true" aria-label="Ищем профиль на FACEIT">
    <div class="profile-skeleton__card card">
      <div class="profile-skeleton__row">
        <SkeletonBlock width="52px" height="52px" radius="50%" />
        <div class="profile-skeleton__lines">
          <SkeletonBlock width="60%" height="18px" />
          <SkeletonBlock width="35%" height="12px" />
        </div>
      </div>
      <div class="profile-skeleton__row">
        <SkeletonBlock width="104px" height="104px" radius="50%" />
        <div class="profile-skeleton__lines">
          <SkeletonBlock width="30%" height="12px" />
          <SkeletonBlock width="70%" height="36px" />
        </div>
      </div>
      <SkeletonBlock height="6px" />
    </div>
    <div class="profile-skeleton__grid">
      <SkeletonBlock v-for="index in 4" :key="index" height="72px" radius="16px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonBlock from '@/shared/ui/SkeletonBlock.vue';
</script>

<style scoped>
.profile-skeleton__card {
  display: grid;
  gap: 20px;
  padding: 20px;
}

.profile-skeleton__row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-skeleton__lines {
  display: grid;
  flex: 1;
  gap: 8px;
}

.profile-skeleton__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
</style>
