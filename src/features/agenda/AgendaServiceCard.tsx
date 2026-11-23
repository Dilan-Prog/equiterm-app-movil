import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ServiceCard } from '../../ui';
import type { AgendaService } from './types';
import { createReportFor, durationMinutes, formatDuration, openDirections, serviceDescription, toCardService } from './utils';

/** `ServiceCard` con las acciones de la agenda: "Cómo llegar" y "Crear reporte". */
export function AgendaServiceCard({
  service,
  canCreateReport = true,
  style,
}: {
  service: AgendaService;
  canCreateReport?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const address = service.address?.trim();
  return (
    <ServiceCard
      service={toCardService(service)}
      duration={formatDuration(durationMinutes(service.estimated_duration))}
      description={serviceDescription(service)}
      onDirections={address ? () => openDirections(address) : undefined}
      onCreateReport={canCreateReport ? () => createReportFor(service) : undefined}
      style={style}
    />
  );
}
