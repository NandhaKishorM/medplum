// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import type { AsyncAutocompleteOption } from '@medplum/react';
import { MultiResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback } from 'react';

/**
 * How many sites one search offers, and the order they come back in.
 */
const LOCATION_SEARCH_CRITERIA = { _count: '100', _sort: 'name' };

export interface AppointmentLocationSelectProps {
  readonly location: WithId<Location> | undefined;
  readonly onChange: (location: WithId<Location> | undefined) => void;
  readonly label?: string;
  readonly disabled?: boolean;
}

/**
 * Chooses the site an appointment is at.
 * @param props - The React props.
 * @returns The location field.
 */
export function AppointmentLocationSelect(props: AppointmentLocationSelectProps): JSX.Element {
  const { location, onChange, label = 'Location', disabled } = props;

  const handleChange = useCallback((locations: WithId<Location>[]) => onChange(locations[0]), [onChange]);

  return (
    <MultiResourceInput<WithId<Location>>
      resourceType="Location"
      name="location"
      label={label}
      placeholder="Search sites"
      required
      maxValues={1}
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
function LocationItem(props: AsyncAutocompleteOption<WithId<Location>>): JSX.Element {
  const address = formatAddress(props.resource);

  return (
    <Stack gap={0}>
      <Text size="sm">{props.label}</Text>
      {address && (
        <Text size="xs" c="dimmed">
          {address}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Says where a site is, for telling two of the same name apart.
 * @param location - The site to describe.
 * @returns The town and state, or undefined when neither is recorded.
 */
function formatAddress(location: Location): string | undefined {
  const parts = [location.address?.city, location.address?.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
