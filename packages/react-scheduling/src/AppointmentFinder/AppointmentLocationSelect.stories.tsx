// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { Document } from '@medplum/react';
import type { Meta } from '@storybook/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { withFixtures } from '../stories/decorators';
import { MainClinic, SatelliteClinic } from '../stories/scheduling';
import { AppointmentLocationSelect } from './AppointmentLocationSelect';

/**
 * Two sites of the same name at different addresses, and a third somewhere else,
 * which is the case the second line of each option exists for.
 *
 * Only the clinics are seeded, not the rooms inside them, since a room is not
 * somewhere an appointment is booked at.
 */
const SITES: WithId<Location>[] = [
  { ...MainClinic, address: { city: 'Springfield', state: 'IL' } },
  { ...MainClinic, id: 'main-clinic-north', address: { city: 'Shelbyville', state: 'IL' } },
  SatelliteClinic,
];

export default {
  title: 'Medplum/AppointmentLocationSelect',
  component: AppointmentLocationSelect,
  decorators: [withFixtures(SITES)],
} as Meta;

/**
 * Focusing the field offers every site, and typing narrows them, so a practice
 * with more sites than fit on screen is still answered in one field.
 * @returns The story.
 */
export const Basic = (): JSX.Element => {
  const [location, setLocation] = useState<WithId<Location>>();
  return (
    <Document>
      <AppointmentLocationSelect location={location} onChange={setLocation} />
      <Text size="sm" c="dimmed" mt="md">
        {location ? `Chose ${location.id}` : 'Nowhere chosen yet'}
      </Text>
    </Document>
  );
};

/**
 * A site carried in from elsewhere, such as the clinic the booking started at.
 * @returns The story.
 */
export const AlreadyChosen = (): JSX.Element => {
  const [location, setLocation] = useState<WithId<Location> | undefined>(SITES[0]);
  return (
    <Document>
      <AppointmentLocationSelect location={location} onChange={setLocation} />
    </Document>
  );
};

export const Disabled = (): JSX.Element => (
  <Document>
    <AppointmentLocationSelect location={SITES[0]} onChange={() => undefined} disabled />
  </Document>
);
