// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MockClient } from '@medplum/mock';
import { MainClinic, SchedulingFixtures } from '../stories/scheduling';
import {
  clickAutocompleteOption,
  installAutocompleteTimers,
  typeInAutocomplete,
} from '../test-utils/asyncAutocomplete';
import { renderWithMedplum, screen } from '../test-utils/render';
import type { AppointmentServiceSelectProps } from './AppointmentServiceSelect';
import { AppointmentServiceSelect } from './AppointmentServiceSelect';

const medplum = new MockClient();

function setup(props: Partial<AppointmentServiceSelectProps> = {}): void {
  renderWithMedplum(<AppointmentServiceSelect service={undefined} onChange={vi.fn()} {...props} />, medplum);
}

function searchBox(): HTMLElement {
  return screen.getByPlaceholderText('Search visit types');
}

describe('AppointmentServiceSelect', () => {
  beforeAll(async () => {
    for (const resource of SchedulingFixtures) {
      await medplum.createResource(resource);
    }
  });

  installAutocompleteTimers();

  test('Only offers services configured for scheduling', async () => {
    setup();

    await typeInAutocomplete(searchBox(), 'Clinic');

    // "Walk-in Clinic" matches the search but has no SchedulingParameters, so
    // $find could never produce times for it.
    expect(screen.queryByText('Walk-in Clinic')).not.toBeInTheDocument();
    expect(await screen.findByText('No visit types match this search.')).toBeInTheDocument();
  });

  test('Says how long each visit type takes', async () => {
    setup();

    await typeInAutocomplete(searchBox(), 'Ultrasound');

    // The length is what tells two otherwise identical visit types apart.
    expect(await screen.findByText(/30 min/)).toBeInTheDocument();
  });

  test('Reports a chosen service', async () => {
    const onChange = vi.fn();
    setup({ onChange });

    await typeInAutocomplete(searchBox(), 'Ultrasound');
    await clickAutocompleteOption('Ultrasound Imaging');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'ultrasound-imaging' }));
  });

  test('Leaves the ordering to the server, so the filter never reshuffles the list', async () => {
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup();

    await typeInAutocomplete(searchBox(), 'Ultrasound');

    const serviceSearch = searchResources.mock.calls.find((call) => call[0] === 'HealthcareService');
    expect((serviceSearch?.[1] as URLSearchParams).get('_sort')).toBe('name');
    searchResources.mockRestore();
  });

  test('Narrows the services to a chosen location', async () => {
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup({ location: MainClinic });

    await typeInAutocomplete(searchBox(), 'Ultrasound');

    const serviceSearch = searchResources.mock.calls.find((call) => call[0] === 'HealthcareService');
    expect((serviceSearch?.[1] as URLSearchParams).get('location')).toBe('Location/main-clinic');
    expect(screen.getByText(/Showing visit types offered at/)).toBeInTheDocument();
    searchResources.mockRestore();
  });
});
