<template>
  <section class="image-card card" aria-labelledby="image-card-title">
    <div class="image-card__head">
      <span class="image-card__icon" aria-hidden="true">
        <AppIcon name="image" :size="20" />
      </span>
      <span class="image-card__body">
        <span id="image-card-title" class="image-card__title">Своя картинка</span>
        <span class="image-card__details">{{ hint }}</span>
      </span>
    </div>

    <p v-if="errorText" class="image-card__error appear" role="alert">{{ errorText }}</p>

    <template v-if="customImage.hasImage">
      <AppButton variant="primary" icon="move" block @click="editHandler">
        Настроить на плашке
      </AppButton>
      <div class="image-card__row">
        <AppButton icon="image" :loading="isLoading" @click="fileInput?.click()">
          Заменить
        </AppButton>
        <AppButton class="image-card__remove" icon="trash" @click="removeHandler">
          Удалить
        </AppButton>
      </div>
    </template>
    <AppButton
      v-else
      variant="primary"
      icon="image"
      block
      :loading="isLoading"
      @click="fileInput?.click()"
    >
      Загрузить изображение
    </AppButton>

    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      :accept="IMAGE_ACCEPT"
      tabindex="-1"
      aria-hidden="true"
      @change="fileChangeHandler"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import { useCustomImageStore } from '@/entities/draft';
import { ROUTE_NAMES } from '@/shared/config';
import { useTelegram } from '@/shared/telegram';
import { AppButton, AppIcon } from '@/shared/ui';

import { IMAGE_ACCEPT } from '../constants/image';
import { ImageFileError, readImageFile } from '../utils/imageFile';
import { getFittedTransform } from '../utils/imageTransform';

const customImage = useCustomImageStore();
const telegram = useTelegram();
const router = useRouter();

const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const isLoading = shallowRef(false);
const errorText = shallowRef<string | null>(null);

const hint = computed(() =>
  customImage.hasImage
    ? 'Картинка лежит под надписями и знаком FACEIT. Двигай, масштабируй и поворачивай её на отдельном экране'
    : 'Без картинки дальше не пройти. PNG, JPG или WebP до 20 МБ — она ляжет под надписи и знак FACEIT, а всё, что выйдет за край плашки, обрежется',
);

const editHandler = (): void => {
  void router.push({ name: ROUTE_NAMES.imageEditor });
};

const removeHandler = (): void => {
  errorText.value = null;
  telegram.haptic.impact('light');
  customImage.removeImage();
};

const fileChangeHandler = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Сброс — чтобы повторный выбор того же файла снова вызвал change
  input.value = '';
  if (!file) {
    return;
  }
  isLoading.value = true;
  errorText.value = null;
  try {
    const { blob, width, height } = await readImageFile(file);
    customImage.setImage(blob, { width, height, transform: getFittedTransform({ width, height }) });
    telegram.haptic.notify('success');
    // Сразу на экран правки: после загрузки картинку почти всегда хотят подвинуть
    editHandler();
  } catch (error) {
    errorText.value =
      error instanceof ImageFileError ? error.message : 'Не получилось загрузить картинку';
    telegram.haptic.notify('error');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.image-card {
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
}

.image-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.image-card__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  color: var(--color-accent-hi);
}

.image-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.image-card__title {
  font-size: 15px;
  font-weight: 700;
}

.image-card__details {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.35;
}

.image-card__error {
  color: var(--color-danger);
  font-size: 13px;
}

.image-card__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.image-card__row :deep(.app-button) {
  padding: 0 10px;
  font-size: var(--text-sm);
}

.image-card__remove {
  color: var(--color-danger);
}
</style>
