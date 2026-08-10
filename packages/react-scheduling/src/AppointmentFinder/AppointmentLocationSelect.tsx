// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { ComboboxItem } from '@mantine/core';
import { Group, Loader, Select, Stack, Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { getDisplayString, isOk, normalizeErrorString } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import { IconCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useMemo } from 'react';

/**
 * How many sites are offered. High enough to be every site a practice has, so
 * that the field is answered from one search rather than a page at a time.
 */
const LOCATION_COUNT = 100;

/**
 * Every site at once, named in order. Sorting is the server's, so the order holds
 * across the whole set rather than only the page that came back.
 */
const LOCATION_QUERY = { _count: LOCATION_COUNT, _sort: 'name' };

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
  const [locations, loading, outcome] = useSearchResources('Location', LOCATION_QUERY);
  const pending = loading || locations === undefined;

  // A site that has been chosen stays on the list even if it is not among the
  // ones loaded, so that the field shows what it holds rather than reading empty.
  const rows = useMemo(() => withSelected(locations ?? [], location), [locations, location]);
  const data = useMemo(() => rows.map((row) => ({ value: row.id, label: getDisplayString(row) })), [rows]);
  const addresses = useMemo(() => new Map(rows.map((row) => [row.id, formatAddress(row)])), [rows]);

  return (
    <Select
      label={label}
      required
      searchable
      allowDeselect={false}
      disabled={disabled || pending}
      error={outcome && !isOk(outcome) ? normalizeErrorString(outcome) : undefined}
      value={location?.id ?? null}
      data={data}
      placeholder={pending ? 'Loading sites…' : 'Select a location'}
      nothingFoundMessage={pending ? 'Loading sites…' : 'No sites found.'}
      rightSection={pending ? <Loader size="xs" /> : undefined}
      renderOption={({ option, checked }) => (
        <LocationOption option={option} address={addresses.get(option.value)} checked={checked} />
      )}
      onChange={(id) => onChange(rows.find((row) => row.id === id))}
    />
  );
}

/**
 * One site on the list, named over the town it is in.
 *
 * Supplying this replaces Mantine's own option, which draws the tick itself, so
 * the tick is drawn here too.
 *
 * @param props - The React props.
 * @param props.option - The option being drawn.
 * @param props.address - Where the site is, when it is recorded.
 * @param props.checked - Whether this is the site currently chosen.
 * @returns The option.
 */
function LocationOption(props: {
  readonly option: ComboboxItem;
  readonly address: string | undefined;
  readonly checked?: boolean;
}): JSX.Element {
  return (
    <Group gap="sm" wrap="nowrap" flex={1}>
      <Stack gap={0} flex={1} miw={0}>
        <Text size="sm" truncate>
          {props.option.label}
        </Text>
        {props.address && (
          <Text size="xs" c="dimmed" truncate>
            {props.address}
          </Text>
        )}
      </Stack>
      {props.checked && <IconCheck size={16} stroke={2} />}
    </Group>
  );
}

function withSelected(
  items: readonly WithId<Location>[],
  selected: WithId<Location> | undefined
): readonly WithId<Location>[] {
  if (!selected || items.some((item) => item.id === selected.id)) {
    return items;
  }
  return [selected, ...items];
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
