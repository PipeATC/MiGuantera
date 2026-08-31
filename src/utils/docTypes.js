import {
  IdCard,
  Contact,
  FileText,
  ScrollText,
  Wrench,
  Wind,
  ShieldCheck,
} from 'lucide-react';

/**
 * Catálogo de tipos de documento vehicular y personal (contexto chileno).
 * Cada tipo define su etiqueta, subtítulo, icono y si tiene vencimiento.
 */
export const DOC_TYPES = {
  cedula: {
    key: 'cedula',
    label: 'Cédula',
    title: 'Cédula de Identidad',
    subtitle: 'Identidad',
    icon: Contact,
    scope: 'driver', // documento personal del titular, no del vehículo
    hasExpiry: true,
  },
  licencia: {
    key: 'licencia',
    label: 'Licencia',
    title: 'Licencia de Conducir',
    subtitle: 'Conductor',
    icon: IdCard,
    scope: 'driver', // pertenece al conductor, no al vehículo
    hasExpiry: true,
  },
  padron: {
    key: 'padron',
    label: 'Padrón',
    title: 'Padrón',
    subtitle: 'Inscripción',
    icon: FileText,
    scope: 'vehicle',
    hasExpiry: false,
  },
  permiso: {
    key: 'permiso',
    label: 'Permiso',
    title: 'Permiso de Circulación',
    subtitle: 'Circulación',
    icon: ScrollText,
    scope: 'vehicle',
    hasExpiry: true,
  },
  revision: {
    key: 'revision',
    label: 'Revisión',
    title: 'Revisión Técnica',
    subtitle: 'Técnica',
    icon: Wrench,
    scope: 'vehicle',
    hasExpiry: true,
  },
  gases: {
    key: 'gases',
    label: 'Gases',
    title: 'Certificado de Gases',
    subtitle: 'Emisiones',
    icon: Wind,
    scope: 'vehicle',
    hasExpiry: true,
  },
  soap: {
    key: 'soap',
    label: 'SOAP',
    title: 'Seguro SOAP',
    subtitle: 'Seguro Obligatorio',
    icon: ShieldCheck,
    scope: 'vehicle',
    hasExpiry: true,
  },
};

export const DOC_TYPE_LIST = Object.values(DOC_TYPES);

/** Tipos que se muestran por vehículo en la Home. */
export const VEHICLE_DOC_TYPES = DOC_TYPE_LIST.filter((d) => d.scope === 'vehicle');

/** Documentos personales del titular (no asociados a un vehículo). */
export const DRIVER_DOC_TYPES = DOC_TYPE_LIST.filter((d) => d.scope === 'driver');

/** Orden de las pestañas en Modo Control Policial (cédula primero). */
export const INSPECTION_TABS = [
  'cedula',
  'licencia',
  'padron',
  'permiso',
  'revision',
  'gases',
  'soap',
];

export function getDocType(key) {
  return DOC_TYPES[key] || null;
}
