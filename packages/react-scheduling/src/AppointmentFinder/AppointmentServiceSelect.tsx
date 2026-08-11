// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { formatCodeableConcept, getDisplayString, getReferenceString, hasSchedulingParameters } from '@medplum/core';
import type { HealthcareService, Location } from '@medplum/fhirtypes';
import type { AsyncAutocompleteOption } from '@medplum/react';
import { AsyncAutocomplete } from '@medplum/react';
import { useMedplum } from '@medplum/react-hooks';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { AppointmentOptionRow } from './AppointmentOptionRow';
import { getServiceDurationMinutes } from './AppointmentServiceSelect.utils';

/**
 * How many visit types one search offers, and the order they come back in.
 */
const SERVICE_SEARCH_CRITERIA = { _count: '25', _sort: 'name' };

export interface AppointmentServiceSelectProps {
  /**
   * The visit type the appointment is for. Reassigning it moves the field and clearing it
   * empties the field, so a caller holding it in state can set, restore or clear the answer.
   * Every choice the user makes is reported through `onChange`.
   *
   * Clearing is what a `location` change needs: the new site may not offer the visit type on
   * screen, and only the caller knows that it has to go.
   */
  readonly service: WithId<HealthcareService> | undefined;
  readonly onChange: (service: WithId<HealthcareService> | undefined) => void;
  /** A chosen site, which narrows the services on offer to the ones held there. */
  readonly location?: WithId<Location>;
  readonly label?: string;
  readonly error?: string;
  readonly disabled?: boolean;
}

/**
 * Chooses the service an appointment is for.
 *
 * Only services configured for scheduling are offered. A `HealthcareService`
 * without a `SchedulingParameters` extension has no duration or alignment for
 * `$find` to work from, so booking against it cannot succeed.
 *
 * @param props - The React props.
 * @returns The service field.
 */
export function AppointmentServiceSelect(props: AppointmentServiceSelectProps): JSX.Element {
  const { location, service, onChange, label = 'Service type', error, disabled } = props;
  const medplum = useMedplum();

  const locationReference = location && getReferenceString(location);

  const loadOptions = useCallback(
    async (input: string, signal: AbortSignal): Promise<WithId<HealthcareService>[]> => {
      const searchParams = new URLSearchParams(SERVICE_SEARCH_CRITERIA);
      if (input) {
        searchParams.set('name', input);
      }
      if (locationReference) {
        searchParams.set('location', locationReference);
      }
      const services = await medplum.searchResources('HealthcareService', searchParams, { signal });
      // The scheduling filter is applied here rather than in the search because it
      // reads an extension, which no search parameter covers. Ordering stays with
      // the server via `_sort`, which this filter preserves.
      return services.filter(hasSchedulingParameters);
    },
    [medplum, locationReference]
  );

  const handleChange = useCallback((services: WithId<HealthcareService>[]) => onChange(services[0]), [onChange]);

  return (
    <AsyncAutocomplete<WithId<HealthcareService>>
      // `AsyncAutocomplete` reads its value once, on mount, so the only way to show a visit
      // type assigned later is to mount a new one. Keying on the chosen id does that, and
      // leaves a caller that never reassigns the prop with a key that never moves.
      key={service?.id ?? 'empty'}
      name="service"
      label={label}
      placeholder="Search visit types"
      description={location ? `Showing visit types offered at ${getDisplayString(location)}.` : undefined}
      required
      maxValues={1}
      error={error}
      disabled={disabled}
      defaultValue={service}
      toOption={toOption}
      loadOptions={loadOptions}
      itemComponent={ServiceItem}
      emptyComponent={ServiceEmpty}
      onChange={handleChange}
    />
  );
}

/**
 * Says why the list is empty.
 *
 * A search that matches nothing and a practice with nothing schedulable are
 * different dead ends, and the second one is a configuration problem rather than
 * a typo.
 *
 * @param props - The React props.
 * @param props.search - What was searched for, empty when nothing was typed.
 * @returns The message.
 */
function ServiceEmpty(props: { readonly search: string }): JSX.Element {
  return (
    <Text size="sm" c="dimmed" p="xs">
      {props.search ? 'No visit types match this search.' : 'No schedulable visit types found.'}
    </Text>
  );
}

function toOption(service: WithId<HealthcareService>): AsyncAutocompleteOption<WithId<HealthcareService>> {
  return { value: service.id, label: getDisplayString(service), resource: service };
}

/**
 * One visit type on the list, described by what it is and how long it takes.
 *
 * The length is worth saying up front: it is the difference between two visit
 * types that otherwise read the same, and it decides what the search can offer.
 *
 * @param props - The option to render.
 * @returns The row.
 */
function ServiceItem(props: Readonly<AsyncAutocompleteOption<WithId<HealthcareService>>>): JSX.Element {
  return <AppointmentOptionRow label={props.label} detail={formatServiceDetail(props.resource)} />;
}

function formatServiceDetail(service: WithId<HealthcareService>): string | undefined {
  const category = formatCodeableConcept(service.type?.[0]);
  const duration = getServiceDurationMinutes(service);
  // `!== undefined` rather than a truthiness check: a zero-minute service is configured,
  // and reading as if it were not would hide a misconfiguration `$find` will accept.
  const parts = [category, duration !== undefined ? `${duration} min` : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}
