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

describe('PlaquePreview', () => {
  it('places the customer image where its transform says', () => {
    const wrapper = mount(PlaquePreview, { props: { design, image } });

    expect(wrapper.html()).toContain('href="blob:photo"');
    expect(wrapper.html()).toContain('translate(210 300) rotate(0) scale(0.7)');
  });
});
