// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import type { RenderResult } from '@testing-library/react';
import {
  clickAutocompleteOption,
  installAutocompleteTimers,
  settleAutocomplete,
  typeInAutocomplete,
} from '../test-utils/asyncAutocomplete';
import { fireEvent, renderWithMedplum, screen, waitFor } from '../test-utils/render';
import type { AppointmentPatientSelectProps } from './AppointmentPatientSelect';
import { AppointmentPatientSelect } from './AppointmentPatientSelect';

const medplum = new MockClient();

const MR_TYPE = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] };

const HOMER: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'homer',
  name: [{ given: ['Homer'], family: 'Bookworm' }],
  birthDate: '1956-05-12',
  identifier: [
    // Something nobody should be reading out, listed first.
    { system: 'http://hl7.org/fhir/sid/us-ssn', value: '111-22-3333' },
    { type: MR_TYPE, system: 'http://example.com/mrn', value: 'MRN-0042' },
  ],
};

const MARGE: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'marge',
  name: [{ given: ['Marge'], family: 'Bookworm' }],
};

// Older than Homer, and enrolled under a plain system rather than a typed MRN.
const ABE: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'abe',
  name: [{ given: ['Abe'], family: 'Bookworm' }],
  birthDate: '1927-04-01',
  identifier: [{ system: 'http://example.com/mrn', value: 'MRN-0001' }],
};

// Carries `MR` under a system of the project's own. Kept out of the Bookworm family
// so the searches above are unaffected.
const NED: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'ned',
  name: [{ given: ['Ned'], family: 'Leftorium' }],
  birthDate: '1954-03-02',
  identifier: [{ type: { coding: [{ system: 'http://example.org/codes', code: 'MR' }] }, value: 'LOCAL-9' }],
};

function setup(props: Partial<AppointmentPatientSelectProps> = {}, key?: string): RenderResult {
  return renderWithMedplum(<AppointmentPatientSelect key={key} onChange={vi.fn()} {...props} />, medplum);
}

describe('AppointmentPatientSelect', () => {
  beforeAll(async () => {
    await medplum.createResource(HOMER);
    await medplum.createResource(MARGE);
    await medplum.createResource(ABE);
    await medplum.createResource(NED);
  });

  installAutocompleteTimers();

  test('Searches by name and reports the patient that was picked', async () => {
    const onChange = vi.fn();
    setup({ onChange });

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Bookworm');
    await clickAutocompleteOption('Homer Bookworm');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'homer' }));
  });

  test('Identifies each match by birth date and MRN, which is how two people with one name are told apart', async () => {
    setup();

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Bookworm');

    expect(await screen.findByText('Homer Bookworm')).toBeInTheDocument();
    expect(screen.getByText('Born 5/12/1956 · MRN MRN-0042')).toBeInTheDocument();
    // The MRN is the identifier that says it is one. The SSN sitting ahead of it
    // is not something to put on screen.
    expect(screen.queryByText(/111-22-3333/)).not.toBeInTheDocument();
    // Marge has neither on file, so there is nothing to tell her apart by.
    expect(screen.getByText('Marge Bookworm')).toBeInTheDocument();
    expect(screen.getAllByText(/Born/)).toHaveLength(2);
  });

  test('Lists a patient with only one of the two by that one alone', async () => {
    setup();

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Bookworm');

    // Abe's identifier is untyped, so without a system to look under there is no
    // MRN to show and the birth date stands on its own.
    expect(await screen.findByText('Born 4/1/1927')).toBeInTheDocument();
  });

  test('Passes over an MR code minted under some other system', async () => {
    setup();

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Leftorium');

    expect(await screen.findByText('Born 3/2/1954')).toBeInTheDocument();
    expect(screen.queryByText(/LOCAL-9/)).not.toBeInTheDocument();
  });

  test('Reads MRNs from a named system, for a project that does not type them', async () => {
    setup({ mrnSystem: 'http://example.com/mrn' });

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Bookworm');

    expect(await screen.findByText('Born 4/1/1927 · MRN MRN-0001')).toBeInTheDocument();
  });

  test('Leads with the oldest match', async () => {
    setup();

    await typeInAutocomplete(screen.getByPlaceholderText('Search by name'), 'Bookworm');
    await screen.findByText('Abe Bookworm');

    // Names collide most among the elderly, so the oldest match is the one most
    // worth putting first.
    const listed = screen.getAllByText(/Bookworm$/).map((element) => element.textContent);
    expect(listed).toStrictEqual(['Abe Bookworm', 'Homer Bookworm', 'Marge Bookworm']);
  });

  // The field it is given is resolved before the input renders, so the patient
  // carried in appears a tick after mount rather than on the first paint.
  test('Starts on the patient it was given', async () => {
    setup({ defaultValue: HOMER });
    expect(await screen.findByText('Homer Bookworm')).toBeInTheDocument();
  });

  // The field is uncontrolled, so moving it from outside is the caller's job and the key
  // is how it is done. These two cover the pattern callers are told to follow.
  test('Moves to a patient the caller keys it onto', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, defaultValue: HOMER }, HOMER.id);
    await screen.findByText('Homer Bookworm');

    rerender(<AppointmentPatientSelect key={MARGE.id} defaultValue={MARGE} onChange={onChange} />);

    expect(await screen.findByText('Marge Bookworm')).toBeInTheDocument();
    expect(screen.queryByText('Homer Bookworm')).not.toBeInTheDocument();
  });

  test('Empties when the caller keys it onto no patient', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, defaultValue: HOMER }, HOMER.id);
    await screen.findByText('Homer Bookworm');

    rerender(<AppointmentPatientSelect key="empty" defaultValue={undefined} onChange={onChange} />);

    await waitFor(() => expect(screen.queryByText('Homer Bookworm')).not.toBeInTheDocument());
    // Clearing from outside is the caller's decision, not a new answer to report back.
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Ignores a patient reassigned without a new key', async () => {
    const onChange = vi.fn();
    const { rerender } = setup({ onChange, defaultValue: HOMER });
    await screen.findByText('Homer Bookworm');

    rerender(<AppointmentPatientSelect defaultValue={MARGE} onChange={onChange} />);
    await settleAutocomplete();

    // The contract the prop name promises: read once, at mount.
    expect(screen.getByText('Homer Bookworm')).toBeInTheDocument();
    expect(screen.queryByText('Marge Bookworm')).not.toBeInTheDocument();
  });

  test('Reports nothing chosen when the patient is cleared', async () => {
    const onChange = vi.fn();
    setup({ onChange, defaultValue: HOMER });

    fireEvent.click(await screen.findByTitle('Clear all'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
