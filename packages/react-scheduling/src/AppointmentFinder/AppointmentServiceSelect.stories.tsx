// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Button, Text } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { HealthcareService } from '@medplum/fhirtypes';
import { Document } from '@medplum/react';
import type { Meta } from '@storybook/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { withFixtures } from '../stories/decorators';
import { MainClinic, SatelliteClinic, SchedulingFixtures } from '../stories/scheduling';
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
      <AppointmentServiceSelect onChange={setService} />
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
export const NarrowedToASite = (): JSX.Element => (
  <Document>
    <AppointmentServiceSelect onChange={() => undefined} location={MainClinic} />
  </Document>
);

/**
 * Why a caller keys this field. Switching sites can strand a visit type the new site
 * does not offer, and the field cannot clear itself — so the caller drops the visit
 * type and keys the field, which mounts a fresh one on nothing.
 *
 * @returns The story.
 */
export const ClearedByASiteChange = (): JSX.Element => {
  const [location, setLocation] = useState(MainClinic);
  const [service, setService] = useState<WithId<HealthcareService>>();

  return (
    <Document>
      <AppointmentServiceSelect
        key={service?.id ?? 'empty'}
        defaultValue={service}
        onChange={setService}
        location={location}
      />
      <Button
        mt="md"
        onClick={() => {
          setLocation(location.id === MainClinic.id ? SatelliteClinic : MainClinic);
          setService(undefined);
        }}
      >
        Switch site
      </Button>
    </Document>
  );
};

export const Disabled = (): JSX.Element => (
  <Document>
    <AppointmentServiceSelect onChange={() => undefined} disabled />
  </Document>
);
