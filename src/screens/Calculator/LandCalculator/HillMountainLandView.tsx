import type { LandConverter } from '../../../features/land';
import { LandCalculator } from './LandCalculator';
import { HILL_LAND_CONFIG } from './landFamilyConfig';

interface HillMountainLandViewProps {
  /** The conversion service; the default is the app's real one. */
  service?: LandConverter;
}

/**
 * The Hill / Mountain land calculator: the shared calculator with the Hill
 * configuration (Ropani, Aana, Paisa, Daam).
 */
export function HillMountainLandView({
  service,
}: HillMountainLandViewProps = {}) {
  return <LandCalculator config={HILL_LAND_CONFIG} service={service} />;
}
