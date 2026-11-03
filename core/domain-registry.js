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

/** ANYVUE uses the same registered inheritance chain as other specialists. */
export class AnyVueDomain extends SpecialistVueDomain {
  constructor({fetcher = fetch} = {}) {
    super('anyvue');
    this.fetcher=fetcher;
  }
  async assess({description} = {}) {
    if(typeof description !== 'string' || description.trim().length < 3 || description.length > 3000)
      throw new VueCoreError('invalid_question','Enter a question of 3–3000 characters');
    const response=await this.fetcher('/api/anyvue',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question:description.trim()})
    });
    const data=await response.json();
    if(!response.ok)throw new VueCoreError('service_unavailable',data.error||'ANYVUE is unavailable.');
    return data;
  }
}

export function createSpecialistDomain(id, options) {
  if (id === 'anivue') return new AniVueDomain(options);
  if (id === 'anyvue') return new AnyVueDomain(options);
  return new SpecialistVueDomain(id);
}
