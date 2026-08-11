// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import type { RenderResult } from '@testing-library/react';
import { MainClinic, SatelliteClinic, SchedulingFixtures } from '../stories/scheduling';
import {
  clickAutocompleteOption,
  focusAutocomplete,
  installAutocompleteTimers,
  typeInAutocomplete,
} from '../test-utils/asyncAutocomplete';
import { fireEvent, renderWithMedplum, screen, waitFor } from '../test-utils/render';
import type { AppointmentLocationSelectProps } from './AppointmentLocationSelect';
import { AppointmentLocationSelect } from './AppointmentLocationSelect';

const medplum = new MockClient();

function setup(props: Partial<AppointmentLocationSelectProps> = {}): RenderResult {
  return renderWithMedplum(<AppointmentLocationSelect location={undefined} onChange={vi.fn()} {...props} />, medplum);
}

/**
 * Opens the list, which is how the sites arrive when nothing has been typed.
 * @returns The field's input, for typing into.
 */
async function openList(): Promise<HTMLElement> {
  const input = screen.getByPlaceholderText('Search sites');
  await focusAutocomplete(input);
  return input;
}

describe('AppointmentLocationSelect', () => {
  beforeAll(async () => {
    for (const resource of SchedulingFixtures) {
      await medplum.createResource(resource);
    }
  });

  installAutocompleteTimers();

  test('Offers the sites without anything being typed', async () => {
    setup();
    await openList();

    expect(await screen.findByText('Uro Associates - Main Clinic')).toBeInTheDocument();
    expect(screen.getByText('Uro Associates - Satellite')).toBeInTheDocument();
  });

  test('Asks for every site at once, so focusing the field shows the whole set', async () => {
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup();
    await openList();

    const params = searchResources.mock.calls.at(-1)?.[1] as URLSearchParams;
    expect(params.get('_count')).toBe('100');
    expect(params.get('_sort')).toBe('name');
    searchResources.mockRestore();
  });

  test('Reports a chosen location', async () => {
    const onChange = vi.fn();
    setup({ onChange });
    await openList();

    await clickAutocompleteOption('Uro Associates - Main Clinic');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'main-clinic' }));
  });

  test('Starts on the site it was given', async () => {
    setup({ location: MainClinic });
    expect(await screen.findByText('Uro Associates - Main Clinic')).toBeInTheDocument();
  });

  test('Shows a chosen site that no search would return', async () => {
    const elsewhere: WithId<Location> = { ...SatelliteClinic, id: 'not-loaded', name: 'Uro Associates - Airport' };
    setup({ location: elsewhere });

    // What is chosen has to stay visible, or the field reads as if nothing is.
    expect(await screen.findByText('Uro Associates - Airport')).toBeInTheDocument();
  });

  // The caller owns the selection, which makes these two the contract rather than detail: a
  // field that read `location` only on mount would pass everything else in this file.
  test('Moves to a site assigned after mount', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, location: MainClinic });
    await screen.findByText('Uro Associates - Main Clinic');

    rerender(<AppointmentLocationSelect location={SatelliteClinic} onChange={onChange} />);

    expect(await screen.findByText('Uro Associates - Satellite')).toBeInTheDocument();
    expect(screen.queryByText('Uro Associates - Main Clinic')).not.toBeInTheDocument();
  });

  test('Empties when the site is unassigned after mount', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, location: MainClinic });
    await screen.findByText('Uro Associates - Main Clinic');

    rerender(<AppointmentLocationSelect location={undefined} onChange={onChange} />);

    await waitFor(() => expect(screen.queryByText('Uro Associates - Main Clinic')).not.toBeInTheDocument());
    // Clearing from outside is the caller's decision, not a new answer to report back.
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Reports nothing chosen when the site is cleared', async () => {
    const onChange = vi.fn();
    setup({ onChange, location: MainClinic });

    fireEvent.click(await screen.findByTitle('Clear all'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  test('Narrows the list as the user types', async () => {
    setup();
    const input = await openList();

    await typeInAutocomplete(input, 'Satellite');

    expect(await screen.findByText('Uro Associates - Satellite')).toBeInTheDocument();
    expect(screen.queryByText('Uro Associates - Main Clinic')).not.toBeInTheDocument();
  });

  test('Says where a site is, for telling two of the same name apart', async () => {
    const addressed: WithId<Location> = {
      resourceType: 'Location',
      id: 'addressed',
      name: 'Uro Associates - Downtown',
      address: { city: 'Springfield', state: 'IL' },
    };
    await medplum.createResource(addressed);
    setup();
    const input = await openList();

    await typeInAutocomplete(input, 'Downtown');

    expect(await screen.findByText('Springfield, IL')).toBeInTheDocument();
  });
});
