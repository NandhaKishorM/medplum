// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { HealthcareService } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import type { RenderResult } from '@testing-library/react';
import { MainClinic, SatelliteClinic, SchedulingFixtures, UltrasoundImagingService } from '../stories/scheduling';
import {
  clickAutocompleteOption,
  installAutocompleteTimers,
  typeInAutocomplete,
} from '../test-utils/asyncAutocomplete';
import { renderWithMedplum, screen, waitFor } from '../test-utils/render';
import type { AppointmentServiceSelectProps } from './AppointmentServiceSelect';
import { AppointmentServiceSelect } from './AppointmentServiceSelect';

const medplum = new MockClient();

/** A second schedulable visit type, for reassigning the field to. */
const BARIATRIC_SURGERY: WithId<HealthcareService> = {
  ...UltrasoundImagingService,
  id: 'bariatric-surgery',
  name: 'Bariatric Surgery',
};

function setup(props: Partial<AppointmentServiceSelectProps> = {}): RenderResult {
  return renderWithMedplum(<AppointmentServiceSelect service={undefined} onChange={vi.fn()} {...props} />, medplum);
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
    const searchResources = vi.spyOn(medplum, 'searchResources');
    setup();

    await typeInAutocomplete(searchBox(), 'Clinic');

    // "Walk-in Clinic" has no SchedulingParameters, so $find could never produce times
    // for it. Checking that the server did return it is what makes its absence below
    // evidence of the filter rather than of a search that had not resolved yet.
    const index = searchResources.mock.calls.findIndex((call) => call[0] === 'HealthcareService');
    const returned = (await searchResources.mock.results[index].value) as HealthcareService[];
    expect(returned.map((service) => service.name)).toContain('Walk-in Clinic');
    expect(screen.queryByText('Walk-in Clinic')).not.toBeInTheDocument();
    searchResources.mockRestore();
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

  test('Starts on the visit type it was given', async () => {
    setup({ service: UltrasoundImagingService });
    expect(await screen.findByText('Ultrasound Imaging')).toBeInTheDocument();
  });

  // The caller owns the selection, which makes these two the contract rather than detail: a
  // field that read `service` only on mount would pass everything else in this file.
  test('Moves to a visit type assigned after mount', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, service: UltrasoundImagingService });
    await screen.findByText('Ultrasound Imaging');

    rerender(<AppointmentServiceSelect service={BARIATRIC_SURGERY} onChange={onChange} />);

    expect(await screen.findByText('Bariatric Surgery')).toBeInTheDocument();
    expect(screen.queryByText('Ultrasound Imaging')).not.toBeInTheDocument();
  });

  // The reason the field has to clear: a site change can invalidate the visit type on screen,
  // and only the caller knows it has to go.
  test('Empties when the visit type is unassigned after a location change', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, service: UltrasoundImagingService, location: MainClinic });
    await screen.findByText('Ultrasound Imaging');

    rerender(<AppointmentServiceSelect service={undefined} onChange={onChange} location={SatelliteClinic} />);

    await waitFor(() => expect(screen.queryByText('Ultrasound Imaging')).not.toBeInTheDocument());
    // Clearing from outside is the caller's decision, not a new answer to report back.
    expect(onChange).not.toHaveBeenCalled();
  });
});
