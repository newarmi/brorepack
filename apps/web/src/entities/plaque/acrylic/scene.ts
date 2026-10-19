import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Object3D, Texture, WebGPURenderer } from 'three/webgpu';
import {
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
} from 'three/webgpu';

import { CAMERA } from './config';

export interface AcrylicScene {
  scene: Scene;
  camera: PerspectiveCamera;
  /**
   * Размер холста в CSS-пикселях и масштаб: сколько метров сцены в одном пикселе.
   * Масштаб берётся из места, которое предмет занимает в вёрстке, — 3D совпадает с CSS-версией
   */
  setViewport: (width: number, height: number, metersPerPixel: number) => void;
  dispose: () => void;
}

/**
 * Окружение для бликов: без него у акрила нечего отражать, и clearcoat не виден.
 * RoomEnvironment — процедурная комната, без внешних HDR-файлов
 */
const createEnvironment = (renderer: WebGPURenderer): Texture => {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, 0.04).texture;
  room.dispose();
  generator.dispose();
  return environment;
};

/** Мягкий свет без теней: небо/пол и один направленный источник сверху справа */
const createLights = (): Object3D[] => {
  const hemisphere = new HemisphereLight(0xffffff, 0x202020, 1.1);
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(0.3, 0.5, 0.6);
  return [hemisphere, key];
};

export const createAcrylicScene = (renderer: WebGPURenderer, content: Object3D): AcrylicScene => {
  const scene = new Scene();
  const environment = createEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.6;
  scene.add(...createLights(), content);

  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);

  const setViewport = (width: number, height: number, metersPerPixel: number): void => {
    camera.aspect = width / height;
    // Дистанция, на которой высота кадра в плоскости предмета равна высоте холста в метрах
    const visibleHeight = height * metersPerPixel;
    const distance = visibleHeight / 2 / Math.tan(MathUtils.degToRad(CAMERA.fov / 2));
    const elevation = distance * Math.tan(MathUtils.degToRad(CAMERA.elevationDegrees));
    camera.position.set(0, elevation, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const dispose = (): void => {
    environment.dispose();
    scene.clear();
  };

  return { scene, camera, setViewport, dispose };
};
