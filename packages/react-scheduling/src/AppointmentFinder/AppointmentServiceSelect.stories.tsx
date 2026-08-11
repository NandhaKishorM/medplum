// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { HealthcareService } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { Document } from '@medplum/react';
import { MedplumProvider } from '@medplum/react-hooks';
import type { Meta } from '@storybook/react';
import type { JSX, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { MainClinic, SchedulingFixtures } from '../stories/scheduling';
import { AppointmentServiceSelect } from './AppointmentServiceSelect';

export default {
  title: 'Medplum/AppointmentServiceSelect',
  component: AppointmentServiceSelect,
} as Meta;

/**
 * Renders its children against a client holding the scheduling fixtures.
 *
 * The field searches as it mounts, so the fixtures have to be in place first.
 *
 * @param props - The React props.
 * @param props.children - What to render once the fixtures are in place.
 * @returns The seeded provider.
 */
function WithServices(props: { readonly children: ReactNode }): JSX.Element | null {
  const [medplum, setMedplum] = useState<MockClient>();

  useEffect(() => {
    const client = new MockClient();
    Promise.all(SchedulingFixtures.map((resource) => client.createResource(resource)))
      .then(() => setMedplum(client))
      .catch(console.error);
  }, []);

  return medplum ? <MedplumProvider medplum={medplum}>{props.children}</MedplumProvider> : null;
}

/**
 * Visit types are searched on the server, and each is described by its category
 * and how long it takes.
 *
 * Only services carrying SchedulingParameters appear — "Walk-in Clinic" is in the
 * fixtures and is deliberately never offered, because `$find` could not produce
 * times for it.
 *
 * @returns The story.
 */
export const Basic = (): JSX.Element => {
  const [service, setService] = useState<WithId<HealthcareService>>();
  return (
    <WithServices>
      <Document>
        <AppointmentServiceSelect service={service} onChange={setService} />
        <Text size="sm" c="dimmed" mt="md">
          {service ? `Chose ${service.id}` : 'Nothing chosen yet'}
        </Text>
      </Document>
    </WithServices>
  );
};

/**
 * A site chosen earlier narrows what is on offer, and the field says so.
 * @returns The story.
 */
export const NarrowedToASite = (): JSX.Element => {
  const [service, setService] = useState<WithId<HealthcareService>>();
  return (
    <WithServices>
      <Document>
        <AppointmentServiceSelect service={service} onChange={setService} location={MainClinic} />
      </Document>
    </WithServices>
  );
};

export const Disabled = (): JSX.Element => (
  <WithServices>
    <Document>
      <AppointmentServiceSelect service={undefined} onChange={() => undefined} disabled />
    </Document>
  </WithServices>
);
