import { API_ERROR_CODES, ApiError, isAbortError } from '../errors';

/** fetch, у которого сетевой сбой превращается в ApiError, а отмена пробрасывается как есть */
export const sendRequest = async (url: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(0, API_ERROR_CODES.networkError);
  }
};

/** Тело ответа как JSON; пустое или битое тело → null */
export const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
