<template>
  <fieldset class="template-picker">
    <legend class="section-label">{{ props.label }}</legend>
    <!-- Лента прокручивается вбок: шаблонов больше, чем помещается на экране -->
    <div class="template-picker__strip">
      <label
        v-for="option in options"
        :key="option.id"
        class="template-picker__option"
        :class="{
          'template-picker__option--active': option.id === model,
          'template-picker__option--custom': option.isCustom,
        }"
      >
        <input v-model="model" class="visually-hidden" type="radio" :name :value="option.id" />
        <span v-if="option.isCustom" class="template-picker__custom" aria-hidden="true">
          <AppIcon name="plus" :size="22" />
          <span>{{ customPrice }}</span>
        </span>
        <span v-else class="template-picker__thumb">
          <PlaquePreview :design="option.design" decorative />
        </span>
        <span class="template-picker__label">
          {{ option.label }}
          <span v-if="option.isCustom" class="visually-hidden">, {{ customPrice }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, useId, watch } from 'vue';

import type { PlaqueDesign, TemplateId } from '@brorepack/shared';
import { formatPrice, getTemplate, TEMPLATES } from '@brorepack/shared';

import { CUSTOM_TEMPLATE_ID, PlaquePreview } from '@/entities/plaque';
import { useTelegram } from '@/shared/telegram';
import { AppIcon } from '@/shared/ui';

const model = defineModel<TemplateId>({ required: true });

const props = withDefaults(defineProps<{ design: PlaqueDesign; label?: string }>(), {
  label: 'Шаблон',
});

const telegram = useTelegram();

const name = `template-${useId()}`;
const customPrice = `+${formatPrice(getTemplate(CUSTOM_TEMPLATE_ID).extraPrice)}`;

const options = computed(() =>
  TEMPLATES.map((template) => ({
    id: template.id,
    label: template.name,
    isCustom: template.id === CUSTOM_TEMPLATE_ID,
    design: { ...props.design, templateId: template.id },
  })),
);

watch(model, () => telegram.haptic.selection());
</script>

<style scoped>
.template-picker__strip {
  display: flex;
  gap: 10px;
  margin: 0 calc(-1 * var(--screen-padding));
  padding: 4px var(--screen-padding) 8px;
  overflow-x: auto;
  scroll-padding-inline: var(--screen-padding);
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.template-picker__strip::-webkit-scrollbar {
  display: none;
}

.template-picker__option {
  position: relative;
  display: flex;
  flex: 0 0 100px;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 10px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.template-picker__option:active {
  transform: scale(var(--press-scale));
}

.template-picker__option--custom {
  border-style: dashed;
}

.template-picker__option--active {
  border-color: var(--color-accent);
  border-style: solid;
  box-shadow: var(--glow-accent);
  color: var(--color-text);
  animation: select-pop var(--duration-base) var(--ease-out);
}

.template-picker__option:has(:focus-visible) {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}

.template-picker__thumb {
  width: 100%;
}

.template-picker__custom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  aspect-ratio: 148 / 210;
  border-radius: 4px;
  background: var(--color-surface-2);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
}

.template-picker__label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
}
</style>
