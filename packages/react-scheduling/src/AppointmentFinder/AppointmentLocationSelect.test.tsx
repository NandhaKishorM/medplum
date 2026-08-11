// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react-hooks';
import type { RenderResult } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { MainClinic, SatelliteClinic, SchedulingFixtures } from '../stories/scheduling';
import { clickAutocompleteOption, typeInAutocomplete } from '../test-utils/asyncAutocomplete';
import { act, fireEvent, render, screen } from '../test-utils/render';
import { AppointmentLocationSelect } from './AppointmentLocationSelect';

const medplum = new MockClient();

function setup(onChange: (location: WithId<Location> | undefined) => void, location?: WithId<Location>): RenderResult {
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <MedplumProvider medplum={medplum}>{children}</MedplumProvider>
  );
  return render(<AppointmentLocationSelect location={location} onChange={onChange} />, wrapper);
}

/**
 * Focuses the field and lets its first search resolve, which is how the sites
 * arrive when nothing has been typed.
 * @returns The field's input, for typing into.
 */
async function openList(): Promise<HTMLElement> {
  const input = screen.getByPlaceholderText('Search sites');
  await act(async () => {
    fireEvent.focus(input);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  return input;
}

describe('AppointmentLocationSelect', () => {
  beforeAll(async () => {
    for (const resource of SchedulingFixtures) {
      await medplum.createResource(resource);
    }
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  test('Offers the sites without anything being typed', async () => {
    setup(vi.fn());
    await openList();

    expect(await screen.findByText('Uro Associates - Main Clinic')).toBeInTheDocument();
    expect(screen.getByText('Uro Associates - Satellite')).toBeInTheDocument();
  });

  test('Asks for every site at once, so focusing the field shows the whole set', async () => {
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup(vi.fn());
    await openList();

    const params = searchResources.mock.calls.at(-1)?.[1] as URLSearchParams;
    expect(params.get('_count')).toBe('100');
    expect(params.get('_sort')).toBe('name');
    searchResources.mockRestore();
  });

  test('Reports a chosen location', async () => {
    const onChange = vi.fn();
    setup(onChange);
    await openList();

    await clickAutocompleteOption('Uro Associates - Main Clinic');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'main-clinic' }));
  });

  test('Starts on the site it was given', async () => {
    setup(vi.fn(), MainClinic);
    expect(await screen.findByText('Uro Associates - Main Clinic')).toBeInTheDocument();
  });

  test('Shows a chosen site that no search would return', async () => {
    const elsewhere: WithId<Location> = { ...SatelliteClinic, id: 'not-loaded', name: 'Uro Associates - Airport' };
    setup(vi.fn(), elsewhere);

    // What is chosen has to stay visible, or the field reads as if nothing is.
    expect(await screen.findByText('Uro Associates - Airport')).toBeInTheDocument();
  });

  // Locks the half-controlled contract this field inherits from MultiResourceInput,
  // so that a later change to a genuinely controlled field is a visible break
  // rather than a silent one.
  test('Holds the site it mounted with when the prop is reassigned', async () => {
    const onChange = vi.fn();
    const { rerender } = setup(onChange, MainClinic);
    await screen.findByText('Uro Associates - Main Clinic');

    rerender(<AppointmentLocationSelect location={SatelliteClinic} onChange={onChange} label="Second site" />);

    // The changed label proves the re-render reached the field, so the site
    // standing still is the contract rather than a no-op.
    expect(screen.getByText('Second site')).toBeInTheDocument();
    expect(screen.getByText('Uro Associates - Main Clinic')).toBeInTheDocument();
    expect(screen.queryByText('Uro Associates - Satellite')).not.toBeInTheDocument();
  });

  test('Reports nothing chosen when the site is cleared', async () => {
    const onChange = vi.fn();
    setup(onChange, MainClinic);

    fireEvent.click(await screen.findByTitle('Clear all'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  test('Narrows the list as the user types', async () => {
    setup(vi.fn());
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
    setup(vi.fn());
    const input = await openList();

    await typeInAutocomplete(input, 'Downtown');

    expect(await screen.findByText('Springfield, IL')).toBeInTheDocument();
  });
});
