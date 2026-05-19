export const I18N_SUCCESS_ENVELOPE = Symbol.for('vnTours.i18nSuccessEnvelope');

export type I18nSuccessEnvelope<T = unknown> = {
  readonly [I18N_SUCCESS_ENVELOPE]: true;
  data: T;
  message: string;
  messageKey: string;
};

export function withI18nSuccess<T>(
  data: T,
  message: string,
  messageKey: string,
): I18nSuccessEnvelope<T> {
  return {
    [I18N_SUCCESS_ENVELOPE]: true,
    data,
    message,
    messageKey,
  };
}

export function isI18nSuccessEnvelope(v: unknown): v is I18nSuccessEnvelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as I18nSuccessEnvelope)[I18N_SUCCESS_ENVELOPE] === true
  );
}
