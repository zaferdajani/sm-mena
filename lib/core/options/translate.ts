/** The slice of a translator the option builders need: a namespace-bound `t`. Any i18n library can supply it. */
export type Translate = (key: string, values?: Record<string, string | number | Date>) => string;
