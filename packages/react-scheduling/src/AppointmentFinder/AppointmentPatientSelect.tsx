// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import { HTTP_TERMINOLOGY_HL7_ORG, formatDate, getIdentifier } from '@medplum/core';
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
const MRN_TYPE_SYSTEM = `${HTTP_TERMINOLOGY_HL7_ORG}/CodeSystem/v2-0203`;
const MRN_TYPE_CODE = 'MR';

export interface AppointmentPatientSelectProps {
  /**
   * The patient the appointment is for. Reassigning it moves the field and clearing it
   * empties the field, so a caller holding it in state can set, restore or clear the answer.
   * Every choice the user makes is reported through `onChange`.
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

  // `itemComponent` takes no props beyond the option, so `mrnSystem` has to be closed over.
  const itemComponent = useCallback(
    (option: AsyncAutocompleteOption<WithId<Patient>>): JSX.Element => (
      <AppointmentOptionRow label={option.label} detail={formatPatientDetail(option.resource, mrnSystem)} />
    ),
    [mrnSystem]
  );

  return (
    <MultiResourceInput<WithId<Patient>>
      // `MultiResourceInput` reads its value once, on mount. Keying on the selection
      // remounts it, which is the only way to show a patient the caller assigns later.
      key={patient?.id ?? 'empty'}
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
