// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import { formatDate, getIdentifier } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import type { AsyncAutocompleteOption } from '@medplum/react';
import { MultiResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { AppointmentOptionRow } from './AppointmentOptionRow';

/**
 * How many patients one search offers, and the order they come back in.
 */
const PATIENT_SEARCH_CRITERIA = { _count: '20', _sort: 'birthdate' };

/**
 * The v2-0203 coding marking an identifier as a medical record number.
 */
const MRN_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0203';
const MRN_TYPE_CODE = 'MR';

export interface AppointmentPatientSelectProps {
  /**
   * The patient the field starts on. Read once, on mount: reassigning it does not move the
   * field, since `MultiResourceInput` takes it as a `defaultValue`. Every choice after that
   * is reported through `onChange`.
   */
  readonly patient: WithId<Patient> | undefined;
  readonly onChange: (patient: WithId<Patient> | undefined) => void;
  readonly label?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly mrnSystem?: string;
}

/**
 * Chooses the patient an appointment is for.
 * @param props - The React props.
 * @returns The patient field.
 */
export function AppointmentPatientSelect(props: AppointmentPatientSelectProps): JSX.Element {
  const { patient, onChange, label = 'Patient', error, disabled, mrnSystem } = props;

  const handleChange = useCallback((patients: WithId<Patient>[]) => onChange(patients[0]), [onChange]);

  // `MultiResourceInput` chooses what to render an option with rather than what to
  // render it from, so the MRN system has to be closed over.
  const itemComponent = useCallback(
    (option: AsyncAutocompleteOption<WithId<Patient>>): JSX.Element => (
      <AppointmentOptionRow label={option.label} detail={formatPatientDetail(option.resource, mrnSystem)} />
    ),
    [mrnSystem]
  );

  return (
    <MultiResourceInput<WithId<Patient>>
      resourceType="Patient"
      name="patient"
      label={label}
      placeholder="Search by name"
      required
      maxValues={1}
      error={error}
      disabled={disabled}
      defaultValue={patient ? [patient] : undefined}
      searchCriteria={PATIENT_SEARCH_CRITERIA}
      itemComponent={itemComponent}
      onChange={handleChange}
    />
  );
}

/**
 * Identifies a patient by the two things the person booking checks against — a birth
 * date against the caller, an MRN against whatever else is open on the desk.
 * @param patient - The patient to describe.
 * @param mrnSystem - The system MRNs are issued under, when they are not typed.
 * @returns The birth date and MRN, or whichever of them is on file.
 */
function formatPatientDetail(patient: WithId<Patient>, mrnSystem: string | undefined): string | undefined {
  const mrn = getMrn(patient, mrnSystem);
  const parts = [patient.birthDate && `Born ${formatDate(patient.birthDate)}`, mrn && `MRN ${mrn}`].filter(Boolean);
  return parts.join(' · ') || undefined;
}

/**
 * Reads a patient's medical record number.
 * @param patient - The patient to read.
 * @param system - The system MRNs are issued under, for a project that does not type them.
 * @returns The MRN, or undefined when the patient carries nothing that says it is one.
 */
function getMrn(patient: Patient, system: string | undefined): string | undefined {
  if (system) {
    return getIdentifier(patient, system);
  }
  return patient.identifier?.find((identifier) =>
    identifier.type?.coding?.some((coding) => coding.system === MRN_TYPE_SYSTEM && coding.code === MRN_TYPE_CODE)
  )?.value;
}
