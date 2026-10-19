// Временная диагностика: журнал касаний — куда вёл палец и куда при этом реально ушла картинка.
// Нужен, чтобы увидеть на телефоне, в какой момент картинка перестаёт следовать за пальцем

import type { Point } from './imageTransform';

interface JournalTouch {
  start: Point;
  last: Point;
  time: number;
  imageStart: Point | null;
  lastImage: Point | null;
  moves: number;
  /** move, на которых палец сдвинулся, а картинка нет */
  stalls: number;
  /** Когда картинка впервые встала при движущемся пальце, мс от касания */
  firstStall: number | null;
  maxGap: number;
  lastMoveTime: number;
}

const JOURNAL_LIMIT = 40;
/** Меньше — дрожание пальца, а не движение */
const MOVE_THRESHOLD = 1;

const getPoint = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY });

const getShift = (from: Point | null, to: Point | null): string => {
  if (!from || !to) {
    return '—';
  }
  return `${Math.round(to.x - from.x)},${Math.round(to.y - from.y)}`;
};

const checkMoved = (from: Point | null, to: Point | null, threshold: number): boolean => {
  return Boolean(from && to && Math.hypot(to.x - from.x, to.y - from.y) > threshold);
};

const createTouch = (event: PointerEvent, image: Point | null): JournalTouch => {
  const point = getPoint(event);
  return {
    start: point,
    last: point,
    time: event.timeStamp,
    imageStart: image,
    lastImage: image,
    moves: 0,
    stalls: 0,
    firstStall: null,
    maxGap: 0,
    lastMoveTime: event.timeStamp,
  };
};

interface RecordInput {
  event: PointerEvent;
  touch: JournalTouch;
  count: number;
  fingers: number;
  image: Point | null;
}

const formatRecord = ({ event, touch, count, fingers, image }: RecordInput): string => {
  const time = Math.round(event.timeStamp - touch.time);
  const stall = touch.firstStall === null ? 'нет' : `с ${touch.firstStall}мс`;
  return [
    `#${count} ${event.type} ${time}мс пальцев ${fingers}`,
    `палец ${getShift(touch.start, touch.last)} старт ${getShift({ x: 0, y: 0 }, touch.start)}`,
    `картинка ${getShift(touch.imageStart, image)}`,
    `стоп ${stall} (${touch.stalls}/${touch.moves} move) пауза ${Math.round(touch.maxGap)}мс`,
  ].join(' · ');
};

/** getImagePoint — центр картинки на экране в пикселях, null — картинки нет */
export const createTouchJournal = (getImagePoint: () => Point | null) => {
  const touches = new Map<number, JournalTouch>();
  const records: string[] = [];
  let count = 0;

  const down = (event: PointerEvent): void => {
    touches.set(event.pointerId, createTouch(event, getImagePoint()));
  };

  const move = (event: PointerEvent): void => {
    const touch = touches.get(event.pointerId);
    if (!touch) {
      return;
    }
    const point = getPoint(event);
    const image = getImagePoint();
    const isStalled =
      checkMoved(touch.last, point, MOVE_THRESHOLD) && !checkMoved(touch.lastImage, image, 0.5);
    touch.moves += 1;
    touch.stalls += isStalled ? 1 : 0;
    touch.firstStall ??= isStalled ? Math.round(event.timeStamp - touch.time) : null;
    touch.maxGap = Math.max(touch.maxGap, event.timeStamp - touch.lastMoveTime);
    touch.lastMoveTime = event.timeStamp;
    touch.last = point;
    touch.lastImage = image;
  };

  const end = (event: PointerEvent): void => {
    const touch = touches.get(event.pointerId);
    if (!touch) {
      return;
    }
    touches.delete(event.pointerId);
    count += 1;
    records.push(
      formatRecord({ event, touch, count, fingers: touches.size + 1, image: getImagePoint() }),
    );
    records.splice(0, records.length - JOURNAL_LIMIT);
  };

  return { down, move, end, records };
};
