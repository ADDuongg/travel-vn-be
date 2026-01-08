export const toBoolean = ({ value }: { value: any }): boolean => {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }

  return false;
};

export const toNumber = ({ value }: { value: any }): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined as any;
  }

  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};
