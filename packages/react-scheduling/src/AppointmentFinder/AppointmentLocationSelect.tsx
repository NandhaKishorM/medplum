// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import type { AsyncAutocompleteOption } from '@medplum/react';
import { MultiResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { AppointmentOptionRow } from './AppointmentOptionRow';

/**
 * How many sites one search offers, and the order they come back in.
 */
const LOCATION_SEARCH_CRITERIA = { _count: '100', _sort: 'name' };

export interface AppointmentLocationSelectProps {
  /**
   * The site the appointment is at. Reassigning it moves the field and clearing it empties
   * the field, so a caller holding it in state can set, restore or clear the answer. Every
   * choice the user makes is reported through `onChange`.
   */
  readonly location: WithId<Location> | undefined;
  readonly onChange: (location: WithId<Location> | undefined) => void;
  readonly label?: string;
  readonly error?: string;
  readonly disabled?: boolean;
}

/**
 * Chooses the site an appointment is at.
 * @param props - The React props.
 * @returns The location field.
 */
export function AppointmentLocationSelect(props: AppointmentLocationSelectProps): JSX.Element {
  const { location, onChange, label = 'Location', error, disabled } = props;

  const handleChange = useCallback((locations: WithId<Location>[]) => onChange(locations[0]), [onChange]);

  return (
    <MultiResourceInput<WithId<Location>>
      // `MultiResourceInput` reads its value once, on mount. Keying on the selection
      // remounts it, which is the only way to show a site the caller assigns later.
      key={location?.id ?? 'empty'}
      resourceType="Location"
      name="location"
      label={label}
      placeholder="Search sites"
      required
      maxValues={1}
      error={error}
      disabled={disabled}
      defaultValue={location ? [location] : undefined}
      searchCriteria={LOCATION_SEARCH_CRITERIA}
      itemComponent={LocationItem}
      onChange={handleChange}
    />
  );
}

/**
 * One site on the list, named over the town it is in.
 * @param props - The option to render.
 * @returns The row.
 */
function LocationItem(props: Readonly<AsyncAutocompleteOption<WithId<Location>>>): JSX.Element {
  return <AppointmentOptionRow label={props.label} detail={formatCityState(props.resource)} />;
}

/**
 * Says where a site is, for telling two of the same name apart.
 *
 * Deliberately narrower than `formatAddress` from `@medplum/core`, which includes
 * the street lines and postal code: a dropdown row has space for the town only.
 *
 * @param location - The site to describe.
 * @returns The town and state, or undefined when neither is recorded.
 */
function formatCityState(location: Location): string | undefined {
  const parts = [location.address?.city, location.address?.state].filter(Boolean);
  return parts.join(', ') || undefined;
}
