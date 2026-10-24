import type { BusinessMapProps } from './business-map-types';
import { SchematicMap } from './business-map-schematic';

/** En web no hay mapa nativo: se usa el plano esquemático. */
export function BusinessMap(props: BusinessMapProps) {
  return <SchematicMap {...props} />;
}
