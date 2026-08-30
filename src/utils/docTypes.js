import {
  IdCard,
  FileText,
  ScrollText,
  Wrench,
  ShieldCheck,
} from 'lucide-react';

/**
 * Catálogo de tipos de documento vehicular (contexto chileno).
 * Cada tipo define su etiqueta, subtítulo, icono y si tiene vencimiento.
 */
export const DOC_TYPES = {
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

/** Orden de las pestañas en Modo Control Policial. */
export const INSPECTION_TABS = ['licencia', 'padron', 'permiso', 'revision'];

export function getDocType(key) {
  return DOC_TYPES[key] || null;
}
