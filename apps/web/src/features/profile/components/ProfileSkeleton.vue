<template>
  <!-- Повторяет раскладку ProfileDetails: блоки тех же размеров на тех же местах, поэтому после загрузки
       ничего не сдвигается. Меняешь ProfileHeader, ProfileLevel или ProfileStats — поправь и скелетон -->
  <div class="profile-skeleton" aria-busy="true" aria-label="Ищем профиль на FACEIT">
    <div class="profile-skeleton__card card">
      <div class="profile-skeleton__header">
        <SkeletonBlock width="52px" height="52px" radius="50%" />
        <div class="profile-skeleton__lines">
          <SkeletonBlock width="60%" height="18px" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
        <SkeletonBlock width="84px" height="28px" radius="var(--radius-chip)" />
      </div>

      <hr class="profile-skeleton__divider" />

      <div class="profile-skeleton__level">
        <SkeletonBlock width="104px" height="104px" radius="50%" />
        <div class="profile-skeleton__lines">
          <SkeletonBlock width="32px" height="12px" />
          <SkeletonBlock width="112px" height="36px" />
          <SkeletonBlock width="128px" height="14px" />
        </div>
      </div>

      <div class="profile-skeleton__progress">
        <div class="profile-skeleton__row">
          <SkeletonBlock width="96px" height="12px" />
          <SkeletonBlock width="64px" height="12px" />
        </div>
        <SkeletonBlock class="profile-skeleton__bar" height="6px" radius="var(--radius-chip)" />
        <div class="profile-skeleton__row profile-skeleton__row--small">
          <SkeletonBlock width="72px" height="10px" />
          <SkeletonBlock width="72px" height="10px" />
        </div>
      </div>
    </div>

    <div class="profile-skeleton__stats">
      <div v-for="index in 4" :key="index" class="profile-skeleton__stat">
        <SkeletonBlock width="50%" height="12px" />
        <SkeletonBlock width="40%" height="20px" />
      </div>
    </div>

    <div class="profile-skeleton__note">
      <SkeletonBlock width="16px" height="16px" radius="50%" />
      <SkeletonBlock width="60%" height="12px" />
    </div>

    <div class="profile-skeleton__actions">
      <SkeletonBlock width="150px" height="14px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SkeletonBlock } from '@/shared/ui';
</script>

<style scoped>
/* Отступы и высоты строк — те же, что у загруженного профиля (ProfileDetails и его части) */
.profile-skeleton__card {
  padding: 20px;
}

.profile-skeleton__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-skeleton__lines {
  display: grid;
  flex: 1;
  gap: 8px;
}

.profile-skeleton__divider {
  height: 1px;
  margin: 16px 0 18px;
  border: 0;
  background: var(--color-line);
}

.profile-skeleton__level {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-skeleton__progress {
  margin-top: 18px;
}

/* Высота строки текста 13px, у подписей под шкалой — 11px */
.profile-skeleton__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 18px;
}

.profile-skeleton__row--small {
  height: 15px;
}

.profile-skeleton__bar {
  margin: 8px 0;
}

.profile-skeleton__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

/* Плитка как в ProfileStats, внутри — подпись и значение */
.profile-skeleton__stat {
  display: grid;
  align-content: center;
  gap: 10px;
  height: 78px;
  padding: 0 16px;
  border-radius: 16px;
  background: var(--color-surface);
}

.profile-skeleton__note {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 18px;
  margin-top: 16px;
}

.profile-skeleton__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin-top: 8px;
}
</style>
