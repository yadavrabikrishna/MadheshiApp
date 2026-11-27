import type { LandConverter } from '../../../features/land';
import { LandCalculator } from './LandCalculator';
import { TERAI_LAND_CONFIG } from './landFamilyConfig';

interface TeraiLandViewProps {
  /** The conversion service; the default is the app's real one. */
  service?: LandConverter;
}

/** The Terai land calculator: the shared calculator with the Terai config. */
export function TeraiLandView({ service }: TeraiLandViewProps = {}) {
  return <LandCalculator config={TERAI_LAND_CONFIG} service={service} />;
}
