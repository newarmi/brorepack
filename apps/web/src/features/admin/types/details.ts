/** Строка карточки «подпись — значение» в админке */
export interface DetailsItem {
  label: string;
  value: string;
  /** Значение можно выделить и скопировать (адрес, телефон, трек-номер) */
  selectable?: boolean;
}
