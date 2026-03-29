import { Env } from '../../types/env';
import { IncidentProvider } from '../../types/incidents';
import { PagerDutyIncidentProvider } from './pagerDutyIncidentProvider';
import { OpsgenieIncidentProvider } from './opsgenieIncidentProvider';
import { GenericWebhookIncidentProvider } from './genericWebhookIncidentProvider';

export function getIncidentProvider(providerName: string, env: Env): IncidentProvider | null {
  switch (providerName) {
    case 'pagerduty':
      if (env.PAGERDUTY_ENABLED === 'true' && env.PAGERDUTY_ROUTING_KEY) {
        return new PagerDutyIncidentProvider(env);
      }
      return null;
    case 'opsgenie':
      if (env.OPSGENIE_ENABLED === 'true' && env.OPSGENIE_API_KEY) {
        return new OpsgenieIncidentProvider(env);
      }
      return null;
    case 'generic':
      if (env.GENERIC_WEBHOOK_ENABLED === 'true' && env.GENERIC_WEBHOOK_URL) {
        return new GenericWebhookIncidentProvider(env);
      }
      return null;
    default:
      return null;
  }
}
