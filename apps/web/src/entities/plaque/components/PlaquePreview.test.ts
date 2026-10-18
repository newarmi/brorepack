import type { PlaqueDesign, PlaqueImage } from '@brorepack/shared';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PlaquePreview from './PlaquePreview.vue';

const design: PlaqueDesign = {
  templateId: 'custom',
  size: 'A5',
  displayName: 'goodlifeee',
  caption: 'for reaching 9 lvl 1809 elo',
  level: 9,
  elo: 1809,
};

const image: PlaqueImage = {
  href: 'blob:photo',
  width: 600,
  height: 400,
  x: 210,
  y: 300,
  scale: 0.7,
  rotation: 0,
};

const getImageGroup = (element: Element): Element | null =>
  element.querySelector('g[id$="-image"]');

describe('PlaquePreview', () => {
  it('places the customer image where its transform says', () => {
    const wrapper = mount(PlaquePreview, { props: { design, image } });

    expect(getImageGroup(wrapper.element)?.getAttribute('transform')).toBe(
      'translate(210 300) rotate(0) scale(0.7)',
    );
  });

  // Пересборка SVG на каждом кадре жеста отрывала от документа узел под пальцем и перезагружала картинки
  it('moves the image without rebuilding the plaque markup', async () => {
    const wrapper = mount(PlaquePreview, { props: { design, image } });
    const svg = wrapper.element.querySelector('svg');

    await wrapper.setProps({ image: { ...image, x: 250, y: 320, scale: 1.4, rotation: 30 } });

    expect(wrapper.element.querySelector('svg')).toBe(svg);
    expect(getImageGroup(wrapper.element)?.getAttribute('transform')).toBe(
      'translate(250 320) rotate(30) scale(1.4)',
    );
  });

  it('keeps the image position when the plaque is rebuilt for a new nickname', async () => {
    const wrapper = mount(PlaquePreview, { props: { design, image } });

    await wrapper.setProps({ design: { ...design, displayName: 'shinshila' } });

    expect(wrapper.text()).toContain('shinshila');
    expect(getImageGroup(wrapper.element)?.getAttribute('transform')).toBe(
      'translate(210 300) rotate(0) scale(0.7)',
    );
  });
});
