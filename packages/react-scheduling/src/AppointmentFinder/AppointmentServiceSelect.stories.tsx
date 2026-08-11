// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { HealthcareService } from '@medplum/fhirtypes';
import { Document } from '@medplum/react';
import type { Meta } from '@storybook/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { withFixtures } from '../stories/decorators';
import { MainClinic, SchedulingFixtures } from '../stories/scheduling';
import { AppointmentServiceSelect } from './AppointmentServiceSelect';

export default {
  title: 'Medplum/AppointmentServiceSelect',
  component: AppointmentServiceSelect,
  decorators: [withFixtures(SchedulingFixtures)],
} as Meta;

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
    <Document>
      <AppointmentServiceSelect service={service} onChange={setService} />
      <Text size="sm" c="dimmed" mt="md">
        {service ? `Chose ${service.id}` : 'Nothing chosen yet'}
      </Text>
    </Document>
  );
};

/**
 * A site chosen earlier narrows what is on offer, and the field says so.
 * @returns The story.
 */
export const NarrowedToASite = (): JSX.Element => {
  const [service, setService] = useState<WithId<HealthcareService>>();
  return (
    <Document>
      <AppointmentServiceSelect service={service} onChange={setService} location={MainClinic} />
    </Document>
  );
};

export const Disabled = (): JSX.Element => (
  <Document>
    <AppointmentServiceSelect service={undefined} onChange={() => undefined} disabled />
  </Document>
);
