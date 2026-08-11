// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Location } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { Document } from '@medplum/react';
import { MedplumProvider } from '@medplum/react-hooks';
import type { Meta } from '@storybook/react';
import type { JSX, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppointmentLocationSelect } from './AppointmentLocationSelect';

export default {
  title: 'Medplum/AppointmentLocationSelect',
  component: AppointmentLocationSelect,
} as Meta;

/**
 * Two sites of the same name at different addresses, and a third somewhere else,
 * which is the case the second line of each option exists for.
 */
const SITES: WithId<Location>[] = [
  {
    resourceType: 'Location',
    id: 'main-clinic',
    name: 'Uro Associates - Main Clinic',
    address: { city: 'Springfield', state: 'IL' },
  },
  {
    resourceType: 'Location',
    id: 'main-clinic-north',
    name: 'Uro Associates - Main Clinic',
    address: { city: 'Shelbyville', state: 'IL' },
  },
  { resourceType: 'Location', id: 'satellite-clinic', name: 'Uro Associates - Satellite' },
];

/**
 * Renders its children against a client holding the sites above.
 *
 * The field searches the server, so the fixtures have to be in place before it
 * mounts rather than merely before someone types.
 *
 * @param props - The React props.
 * @param props.children - What to render once the sites are in place.
 * @returns The seeded provider.
 */
function WithSites(props: { readonly children: ReactNode }): JSX.Element | null {
  const [medplum, setMedplum] = useState<MockClient>();

  useEffect(() => {
    const client = new MockClient();
    Promise.all(SITES.map((site) => client.createResource(site)))
      .then(() => setMedplum(client))
      .catch(console.error);
  }, []);

  return medplum ? <MedplumProvider medplum={medplum}>{props.children}</MedplumProvider> : null;
}

/**
 * Focusing the field offers every site, and typing narrows them, so a practice
 * with more sites than fit on screen is still answered in one field.
 * @returns The story.
 */
export const Basic = (): JSX.Element => {
  const [location, setLocation] = useState<WithId<Location>>();
  return (
    <WithSites>
      <Document>
        <AppointmentLocationSelect location={location} onChange={setLocation} />
        <Text size="sm" c="dimmed" mt="md">
          {location ? `Chose ${location.id}` : 'Nowhere chosen yet'}
        </Text>
      </Document>
    </WithSites>
  );
};

/**
 * A site carried in from elsewhere, such as the clinic the booking started at.
 * @returns The story.
 */
export const AlreadyChosen = (): JSX.Element => {
  const [location, setLocation] = useState<WithId<Location> | undefined>(SITES[0]);
  return (
    <WithSites>
      <Document>
        <AppointmentLocationSelect location={location} onChange={setLocation} />
      </Document>
    </WithSites>
  );
};

export const Disabled = (): JSX.Element => (
  <WithSites>
    <Document>
      <AppointmentLocationSelect location={SITES[0]} onChange={() => undefined} disabled />
    </Document>
  </WithSites>
);
