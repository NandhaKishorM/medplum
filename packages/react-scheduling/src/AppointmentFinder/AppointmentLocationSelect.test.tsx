// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react-hooks';
import type { JSX, ReactNode } from 'react';
import { MainClinic, SatelliteClinic, SchedulingFixtures } from '../stories/scheduling';
import { act, fireEvent, render, screen } from '../test-utils/render';
import { AppointmentLocationSelect } from './AppointmentLocationSelect';

const medplum = new MockClient();

function setup(onChange: (location: WithId<Location> | undefined) => void, location?: WithId<Location>): void {
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <MedplumProvider medplum={medplum}>{children}</MedplumProvider>
  );
  render(<AppointmentLocationSelect location={location} onChange={onChange} />, wrapper);
}

/**
 * Waits for the sites to load, then opens the list.
 * @returns The field's input, for typing into.
 */
async function openList(): Promise<HTMLElement> {
  const input = await screen.findByRole('textbox');
  await act(async () => {
    expect(input).toBeEnabled();
  });
  await act(async () => {
    fireEvent.click(input);
  });
  return input;
}

describe('AppointmentLocationSelect', () => {
  beforeAll(async () => {
    for (const resource of SchedulingFixtures) {
      await medplum.createResource(resource);
    }
  });

  test('Offers every site', async () => {
    setup(vi.fn());
    await openList();

    expect(screen.getByText('Uro Associates - Main Clinic')).toBeInTheDocument();
    expect(screen.getByText('Uro Associates - Satellite')).toBeInTheDocument();
  });

  test('Asks for every site at once, so the whole set is there to be typed against', async () => {
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup(vi.fn());
    await openList();

    const call = searchResources.mock.calls.at(-1);
    expect(call?.[1]).toStrictEqual({ _count: 100, _sort: 'name' });
    searchResources.mockRestore();
  });

  test('Reports a chosen location', async () => {
    const onChange = vi.fn();
    setup(onChange);
    await openList();

    await act(async () => {
      fireEvent.click(screen.getByText('Uro Associates - Main Clinic'));
    });

    expect(onChange).toHaveBeenCalled();
    expect((onChange.mock.calls[0][0] as WithId<Location>).id).toBe('main-clinic');
  });

  test('Shows the location already chosen', async () => {
    setup(vi.fn(), MainClinic);
    expect(await screen.findByDisplayValue('Uro Associates - Main Clinic')).toBeInTheDocument();
  });

  test('Keeps a chosen site on the list even when it was not among those loaded', async () => {
    const elsewhere: WithId<Location> = { ...SatelliteClinic, id: 'not-loaded', name: 'Uro Associates - Airport' };
    setup(vi.fn(), elsewhere);

    // What is chosen has to stay visible, or the field reads as if nothing is.
    expect(await screen.findByDisplayValue('Uro Associates - Airport')).toBeInTheDocument();
  });

  test('Narrows the list as the user types', async () => {
    setup(vi.fn());
    const input = await openList();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Satellite' } });
    });

    expect(screen.getByText('Uro Associates - Satellite')).toBeInTheDocument();
    expect(screen.queryByText('Uro Associates - Main Clinic')).not.toBeInTheDocument();
  });

  test('Says where a site is, for telling two of the same name apart', async () => {
    const addressed: WithId<Location> = {
      ...SatelliteClinic,
      id: 'addressed',
      name: 'Uro Associates - Downtown',
      address: { city: 'Springfield', state: 'IL' },
    };
    setup(vi.fn(), addressed);
    await openList();

    expect(screen.getByText('Springfield, IL')).toBeInTheDocument();
  });
});
