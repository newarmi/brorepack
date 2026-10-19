import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getTemplate, normalizeTemplateId } from './catalog'
import { buildLevelRingPath, getSvgInnerMarkup, renderPlaqueSvg, resolveLevelColor } from './plaque'
import type { PlaqueDesign } from './types'

const design: PlaqueDesign = {
  templateId: 'graphite',
  size: 'A5',
  displayName: 'goodlifeee',
  caption: 'for reaching 9 lvl 1809 elo',
  level: 9,
  elo: 1809,
}

/** Конечная точка внешней дуги кольца → угол в градусах (SVG, по часовой) */
function getOuterArcEndAngle(level: number): number {
  const [x, y] = buildLevelRingPath(level).split('A')[1]!.split('L')[0]!.trim().split(' ').slice(-2).map(Number)
  const angle = (Math.atan2(y! - 365.79, x! - 209.29) * 180) / Math.PI
  return (angle + 360) % 360
}

describe('кольцо уровня', () => {
  it('совпадает с макетами 7 и 9 уровня', () => {
    assert.ok(Math.abs(getOuterArcEndAngle(7) - 8.2) < 0.5)
    assert.ok(Math.abs(getOuterArcEndAngle(9) - 34.4) < 0.5)
  })

  it('растёт с уровнем и не выходит за 1–10', () => {
    assert.equal(buildLevelRingPath(0), buildLevelRingPath(1))
    assert.equal(buildLevelRingPath(12), buildLevelRingPath(10))
    assert.ok(getOuterArcEndAngle(10) > getOuterArcEndAngle(9))
  })
})

describe('цвета шаблона', () => {
  it('берёт цвет по группе уровня', () => {
    assert.equal(resolveLevelColor({ low: '#111', high: '#222' }, 7), '#111')
    assert.equal(resolveLevelColor({ low: '#111', high: '#222' }, 8), '#222')
    assert.equal(resolveLevelColor('faceit', 9), '#FF5500')
    assert.equal(resolveLevelColor('#000000', 3), '#000000')
  })
})

describe('шаблоны первой версии', () => {
  it('рисуются ближайшими новыми', () => {
    assert.equal(getTemplate('blue' as never).id, 'blue_skin')
    assert.equal(normalizeTemplateId('mono'), 'tech')
    assert.equal(normalizeTemplateId('graphite'), 'graphite')
    assert.equal(normalizeTemplateId('unknown'), null)
  })
})

describe('renderPlaqueSvg', () => {
  it('экранирует надпись игрока', () => {
    const svg = renderPlaqueSvg({ ...design, displayName: '<script>"&' })
    assert.ok(svg.includes('&lt;script&gt;&quot;&amp;'))
    assert.ok(!svg.includes('<script>'))
  })

  it('ставит арт ссылкой в превью и разметкой в печати', () => {
    assert.ok(renderPlaqueSvg(design, { art: { href: '/a.svg' } }).includes('<image href="/a.svg"'))
    const markup = getSvgInnerMarkup('<?xml version="1.0"?><svg viewBox="0 0 1 1"><rect id="x"/></svg>')
    assert.equal(markup, '<rect id="x"/>')
    const print = renderPlaqueSvg(design, { mode: 'print', art: { markup } })
    assert.ok(print.includes('width="148mm" height="210mm"'))
    assert.ok(print.includes('<rect id="x"/>'))
  })

  it('кладёт картинку клиента между фоном и знаком FACEIT, внутри обрезки', () => {
    const image = { href: 'blob:1', width: 200, height: 100, x: 210, y: 300, scale: 2, rotation: 15 }
    const svg = renderPlaqueSvg(design, { art: { href: '/a.svg' }, frontArt: { href: '/front.svg' }, image })
    const imageIndex = svg.indexOf('href="blob:1"')
    assert.ok(svg.indexOf('href="/a.svg"') < imageIndex)
    assert.ok(imageIndex < svg.indexOf('href="/front.svg"'))
    assert.ok(svg.indexOf('clip-path=') < imageIndex)
    assert.ok(svg.includes('translate(210 300) rotate(15) scale(2)'))
    assert.ok(svg.includes('x="-100" y="-50" width="200" height="100"'))
  })

  it('рисует отдельно слой под картинкой клиента и над ней', () => {
    const options = { art: { href: '/a.svg' }, frontArt: { href: '/front.svg' } }
    const back = renderPlaqueSvg(design, { ...options, layer: 'back' })
    assert.ok(back.includes('/a.svg'))
    assert.ok(!back.includes('/front.svg') && !back.includes('</text>'))
    const front = renderPlaqueSvg(design, { ...options, layer: 'front' })
    assert.ok(front.includes('/front.svg') && front.includes('goodlifeee</text>'))
    assert.ok(!front.includes('/a.svg') && !front.includes(getTemplate('graphite').baseColor))
  })

  it('без картинки клиента верхний слой арта не рисует', () => {
    const svg = renderPlaqueSvg(design, { frontArt: { href: '/front.svg' } })
    assert.ok(!svg.includes('/front.svg'))
  })
})

describe('неизвестный уровень', () => {
  it('рисует «?» вместо цифры', () => {
    const svg = renderPlaqueSvg({ ...design, level: 0, caption: '' })
    assert.ok(svg.includes('>?</text>'))
  })
})
