import { defineComponent, h } from 'vue';

import { mount } from '@vue/test-utils';

/** Запускает composable внутри настоящего компонента, чтобы работали хуки жизненного цикла */
export const withSetup = <T>(composable: () => T) => {
  let result!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable();
        return () => h('div');
      },
    }),
  );
  return { result, wrapper };
};
