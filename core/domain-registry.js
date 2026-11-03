import { VueDomain, VueCoreError } from './index.js';
import { SPECIALISTS } from './specialists.js';
import { AniVueDomain } from './anivue.js';

/**
 * Shared specialist registry. Every VUE domain is a VueDomain descendant.
 * Safety-critical ANIVUE retains its own specialized emergency implementation.
 * Domain guidance stays in SPECIALISTS; this registry does not pretend that
 * an informational specialist has implemented assessment or image analysis.
 */
export class SpecialistVueDomain extends VueDomain {
  constructor(id) {
    if (!Object.hasOwn(SPECIALISTS,id)) throw new VueCoreError('unknown_specialist','Unknown VUE specialist');
    super({id,name:id.toUpperCase(),capabilities:{imageAnalysis:false,videoAnalysis:false}});
    this.profile=SPECIALISTS[id];
  }
  async assess() {
    throw new VueCoreError('not_implemented','Specialist assessment must be supplied by the specialist adapter');
  }
}

export function createSpecialistDomain(id) {
  if (id === 'anivue') return new AniVueDomain();
  return new SpecialistVueDomain(id);
}
