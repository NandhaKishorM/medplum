// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text } from '@mantine/core';
import type { JSX } from 'react';

export interface AppointmentOptionRowProps {
  readonly label: string;
  /** What tells this option apart from one of the same name. Omitted when there is nothing on file. */
  readonly detail?: string;
}

/**
 * One option in an appointment pick list: what it is called, over what tells it
 * apart from the others.
 *
 * Shared by the patient, location and visit type fields so that a dropdown row
 * reads the same whichever of them is being filled in — the second line differs
 * by resource type, the shape of the row does not.
 *
 * @param props - The React props.
 * @returns The row.
 */
export function AppointmentOptionRow(props: AppointmentOptionRowProps): JSX.Element {
  return (
    <Stack gap={0}>
      <Text size="sm">{props.label}</Text>
      {props.detail && (
        <Text size="xs" c="dimmed">
          {props.detail}
        </Text>
      )}
    </Stack>
  );
}
