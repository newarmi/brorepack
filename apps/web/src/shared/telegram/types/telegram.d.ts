// Минимальные типы Telegram WebApp — только то, что использует приложение.
// https://core.telegram.org/bots/webapps

export type TelegramInvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

export type TelegramImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

export type TelegramNotificationType = 'error' | 'success' | 'warning';

export interface TelegramMainButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface TelegramMainButton {
  readonly isVisible: boolean;
  readonly isActive: boolean;
  readonly isProgressVisible: boolean;
  setParams(params: TelegramMainButtonParams): TelegramMainButton;
  showProgress(leaveActive?: boolean): TelegramMainButton;
  hideProgress(): TelegramMainButton;
  onClick(callback: () => void): TelegramMainButton;
  offClick(callback: () => void): TelegramMainButton;
}

export interface TelegramBackButton {
  readonly isVisible: boolean;
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: TelegramImpactStyle): TelegramHapticFeedback;
  notificationOccurred(type: TelegramNotificationType): TelegramHapticFeedback;
  selectionChanged(): TelegramHapticFeedback;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id: number;
}

export type TelegramRequestContactResponse =
  | {
      status: 'sent';
      response: string;
      responseUnsafe: { auth_date: string; contact: TelegramContact; hash: string };
    }
  | { status: 'cancelled' };

export interface TelegramInitDataUnsafe {
  start_param?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
}

export interface TelegramWebApp {
  readonly initData: string;
  readonly initDataUnsafe: TelegramInitDataUnsafe;
  readonly version: string;
  readonly platform: string;
  readonly MainButton: TelegramMainButton;
  readonly BackButton: TelegramBackButton;
  readonly HapticFeedback: TelegramHapticFeedback;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  /** Bot API 7.10+ */
  setBottomBarColor?(color: string): void;
  /** Bot API 7.7+ */
  disableVerticalSwipes?(): void;
  /** Bot API 7.7+ */
  readonly isVerticalSwipesEnabled?: boolean;
  openInvoice(url: string, callback?: (status: TelegramInvoiceStatus) => void): void;
  requestContact(
    callback?: (isShared: boolean, response?: TelegramRequestContactResponse) => void,
  ): void;
  openTelegramLink(url: string): void;
  openLink(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
