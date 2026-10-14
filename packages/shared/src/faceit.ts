// Уровни FACEIT для CS2: нижняя граница ELO каждого уровня.
// 10 уровень — 2001 и выше, без верхней границы.
export const FACEIT_LEVEL_MIN_ELO: Record<number, number> = {
  1: 100,
  2: 501,
  3: 751,
  4: 901,
  5: 1051,
  6: 1201,
  7: 1351,
  8: 1531,
  9: 1751,
  10: 2001,
}

export const MAX_FACEIT_LEVEL = 10

/** Фирменные цвета уровней FACEIT: серый, зелёный, жёлтый, оранжевый, красный */
export function getLevelColor(level: number): string {
  if (level >= 10) return '#FE1F00'
  if (level >= 8) return '#FF6309'
  if (level >= 4) return '#FFC800'
  if (level >= 2) return '#1CE400'
  return '#EEEEEE'
}

export function getLevelByElo(elo: number): number {
  let level = 1
  for (let candidate = 1; candidate <= MAX_FACEIT_LEVEL; candidate++) {
    if (elo >= (FACEIT_LEVEL_MIN_ELO[candidate] ?? Infinity)) level = candidate
  }
  return level
}

export interface LevelProgress {
  level: number
  levelMinElo: number
  /** null на 10 уровне — дальше расти некуда */
  nextLevelMinElo: number | null
  eloToNextLevel: number | null
  /** 0–1, доля пути до следующего уровня */
  progress: number
}

export function getLevelProgress(elo: number): LevelProgress {
  const level = getLevelByElo(elo)
  const levelMinElo = FACEIT_LEVEL_MIN_ELO[level] ?? 0
  const nextLevelMinElo = level < MAX_FACEIT_LEVEL ? (FACEIT_LEVEL_MIN_ELO[level + 1] ?? null) : null

  if (nextLevelMinElo === null) {
    return { level, levelMinElo, nextLevelMinElo, eloToNextLevel: null, progress: 1 }
  }

  const progress = Math.min(1, Math.max(0, (elo - levelMinElo) / (nextLevelMinElo - levelMinElo)))
  return { level, levelMinElo, nextLevelMinElo, eloToNextLevel: nextLevelMinElo - elo, progress }
}

export function getDefaultCaption(level: number, elo: number): string {
  return `for reaching ${level} lvl · ${elo} elo`
}

/** Ник FACEIT: латиница, цифры, «-» и «_» */
export const FACEIT_NICKNAME_PATTERN = /^[A-Za-z0-9_-]{2,32}$/
