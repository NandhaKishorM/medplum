// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Resource } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react-hooks';
import type { JSX, ReactNode } from 'react';
import { useEffect, useState } from 'react';

export interface WithFixturesProps {
  readonly resources: readonly Resource[];
  readonly children: ReactNode;
}

/**
 * Seeds the ambient Storybook client and renders its children once the resources are in place.
 *
 * Fields that search the server search as they mount, so the fixtures have to be
 * stored before the children render rather than merely before someone types.
 *
 * @param props - The React props.
 * @param props.resources - What to store first.
 * @param props.children - What to render once the resources are stored.
 * @returns The children, or nothing while the resources are being stored.
 */
export function WithFixtures(props: WithFixturesProps): JSX.Element | null {
  const medplum = useMedplum();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all(props.resources.map((resource) => medplum.createResource(resource)))
      .then(() => setReady(true))
      .catch(console.error);
  }, [medplum, props.resources]);

  return ready ? <>{props.children}</> : null;
}
