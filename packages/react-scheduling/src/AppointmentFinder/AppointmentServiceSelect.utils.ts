// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { getExtensions, isDefined, schedulingDurationToMinutes, SchedulingParametersURI } from '@medplum/core';
import type { HealthcareService } from '@medplum/fhirtypes';

/**
 * Reads the visit length a service configures for itself, in minutes.
 *
 * Deliberately the service's own parameters only, with no Schedule consulted. This is a
 * label on a pick list, describing a visit type before any calendar is in play — a
 * Schedule can override the length for its own actor, and the length that ends up on the
 * appointment is whatever `$find` resolves at booking time. Reading a Schedule here would
 * be guessing at which one, and a client-side approximation of the server's precedence is
 * a thing to drift from it rather than a second source of truth.
 *
 * @param service - The service being described.
 * @returns The configured length in minutes, or undefined when none is configured or the
 * configured duration uses a unit scheduling does not accept.
 */
export function getServiceDurationMinutes(service: HealthcareService): number | undefined {
  return getExtensions(service, [SchedulingParametersURI, 'duration'])
    .map((subextension) => schedulingDurationToMinutes(subextension.valueDuration))
    .find(isDefined);
}
