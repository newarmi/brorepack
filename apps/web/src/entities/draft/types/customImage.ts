import type { PlaqueImageTransform } from '@brorepack/shared';

/** Картинка клиента на «Своём дизайне»: размер файла в пикселях и положение на плашке. Сам файл — в IndexedDB */
export interface CustomImagePlacement {
  width: number;
  height: number;
  transform: PlaqueImageTransform;
}
