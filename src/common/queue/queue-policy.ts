import { JobsOptions } from 'bullmq';

export const DEFAULT_QUEUE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export function buildStableJobId(...parts: Array<string | number | undefined>) {
  return parts
    .filter((part) => part !== undefined && part !== '')
    .map((part) => String(part).replace(/\s+/g, '_'))
    .join(':');
}
