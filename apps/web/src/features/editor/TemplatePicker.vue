<template>
  <fieldset class="template-picker" :class="{ 'template-picker--showcase': props.showcase }">
    <legend class="section-label">{{ props.label }}</legend>
    <div class="template-picker__grid">
      <label
        v-for="option in options"
        :key="option.id"
        class="template-picker__option"
        :class="{
          'template-picker__option--active': option.id === model,
          'template-picker__option--custom': option.isCustom,
        }"
      >
        <input
          v-model="model"
          class="visually-hidden"
          type="radio"
          :name="name"
          :value="option.id"
        />
        <span v-if="option.isCustom" class="template-picker__custom" aria-hidden="true">
          <AppIcon name="plus" :size="props.showcase ? 28 : 22" />
          <span>{{ customPrice }}</span>
        </span>
        <span v-else class="template-picker__thumb">
          <PlaquePreview
            :design="option.design"
            :glow="props.showcase && option.id === model"
            decorative
          />
        </span>
        <span class="template-picker__label">
          {{ option.label }}
          <span v-if="option.isCustom && !props.showcase" class="visually-hidden"
            >дизайн, {{ customPrice }}</span
          >
        </span>
        <span v-if="props.showcase" class="template-picker__hint">{{ option.hint }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { PlaqueDesign, TemplateId } from '@brorepack/shared';
import { formatPrice, getTemplate, TEMPLATES } from '@brorepack/shared';
import { computed, useId, watch } from 'vue';

import { CUSTOM_TEMPLATE_ID } from '@/entities/plaque/constants';
import PlaquePreview from '@/entities/plaque/PlaquePreview.vue';
import { useTelegram } from '@/shared/telegram/useTelegram';
import AppIcon from '@/shared/ui/AppIcon.vue';

const model = defineModel<TemplateId>({ required: true });

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    label?: string;
    /** Витрина на стартовом экране: крупные карточки в две колонки с подписями */
    showcase?: boolean;
  }>(),
  { label: 'Шаблон', showcase: false },
);

const telegram = useTelegram();

const name = `template-${useId()}`;
const customPrice = `+${formatPrice(getTemplate(CUSTOM_TEMPLATE_ID).extraPrice)}`;

const options = computed(() =>
  TEMPLATES.map((template) => {
    const isCustom = template.id === CUSTOM_TEMPLATE_ID;
    return {
      id: template.id,
      label: isCustom && !props.showcase ? 'Свой' : template.name,
      hint: isCustom ? `по твоей идее · ${customPrice}` : 'входит в цену',
      isCustom,
      design: { ...props.design, templateId: template.id },
    };
  }),
);

watch(model, () => telegram.haptic.selection());
</script>

<style scoped>
.template-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.template-picker--showcase .template-picker__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.template-picker__option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 8px;
  border: 1.5px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.template-picker--showcase .template-picker__option {
  gap: 4px;
  padding: 16px 14px 12px;
  border-radius: var(--radius-card);
}

.template-picker__option--custom {
  border-style: dashed;
}

.template-picker__option--active {
  border-color: var(--color-accent);
  border-style: solid;
  color: var(--color-text);
}

.template-picker__option:has(:focus-visible) {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}

.template-picker__thumb {
  width: 100%;
}

.template-picker--showcase .template-picker__thumb,
.template-picker--showcase .template-picker__custom {
  width: 78%;
  margin-bottom: 8px;
}

.template-picker__custom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  aspect-ratio: 210 / 297;
  border-radius: 8px;
  background: var(--color-surface-2);
  color: var(--color-accent-hi);
  font-size: 11px;
  font-weight: 600;
}

.template-picker--showcase .template-picker__custom {
  font-size: 13px;
}

.template-picker__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-picker--showcase .template-picker__label {
  font-size: 15px;
}

.template-picker__hint {
  color: var(--color-faint);
  font-size: 12px;
  text-align: center;
}
</style>
