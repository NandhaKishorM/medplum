// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
// Sets up MantineProvider for all tests
// See: https://mantine.dev/guides/jest/
import { MantineProvider } from '@mantine/core';
import type { RenderResult } from '@testing-library/react';
import { render as testingLibraryRender } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';

export { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

const theme = {};

export function render(ui: ReactNode, wrapper?: ({ children }: { children: ReactNode }) => JSX.Element): RenderResult {
  return testingLibraryRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      // `env="test"` stops Popover from hiding a dropdown whose target measures
      // 0×0, which everything does in jsdom: without it an opened list is in the
      // document but `display: none`, so queries by role cannot see it.
      <MantineProvider theme={theme} env="test">
        {wrapper ? wrapper({ children }) : children}
      </MantineProvider>
    ),
  });
}
