import { z } from 'zod'
import { handleWebhook, isTelegramUpdate } from './bot'
import { describeError } from './errors'
import { handleApiRequest, toErrorEnvelope, type ApiEnvelope } from './handlers'

// Тексты ошибок zod — по-русски (свои тексты из схем shared важнее).
// jitless: zod не пытается собирать валидаторы через new Function — в Apps Script это лишний риск.
z.config(z.locales.ru())
z.config({ jitless: true })

function jsonOutput(envelope: ApiEnvelope): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(envelope)).setMimeType(ContentService.MimeType.JSON)
}

/** GET /exec — проверка, что развёртывание живо */
export function doGet(_e?: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return jsonOutput({ ok: true, data: { ok: true } })
}

/**
 * POST /exec. Тело с update_id — апдейт Telegram (ответ — HtmlService: он отдаёт 200 без редиректа,
 * а на редирект ContentService Telegram считает доставку неудачной). Иначе — запрос API `{ action, auth, params }`.
 */
export function doPost(
  e?: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
  let body: unknown
  try {
    const raw = e?.postData?.contents ?? ''
    body = raw.trim() === '' ? {} : JSON.parse(raw)
  } catch {
    return jsonOutput({ ok: false, status: 400, error: 'bad_request', message: 'Некорректный JSON' })
  }

  if (isTelegramUpdate(body)) {
    handleWebhook(e, body)
    return HtmlService.createHtmlOutput('ok')
  }

  try {
    return jsonOutput(handleApiRequest(body))
  } catch (error) {
    // handleApiRequest сам не бросает; сюда попадём, только если не сериализовался ответ
    console.error(`doPost: ${describeError(error)}`)
    return jsonOutput(toErrorEnvelope(error, 'doPost'))
  }
}

export { checkConfig, deleteWebhook, setMenuButton, setup, setWebhook } from './setup'
