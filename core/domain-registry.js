import { VueDomain, VueCoreError } from './index.js';
import { SPECIALISTS, isRegisteredSpecialist } from './specialists.js';
import { AniVueDomain } from './anivue.js';
import { createInformationalVueClass } from './specialist-factory.js';

/**
 * Shared specialist registry. Every VUE domain is a VueDomain descendant.
 * Safety-critical ANIVUE retains its own specialized emergency implementation.
 * Domain guidance stays in SPECIALISTS; this registry does not pretend that
 * an informational specialist has implemented assessment or image analysis.
 */
export class SpecialistVueDomain extends VueDomain {
  constructor(id, {fetcher = fetch} = {}) {
    if (!isRegisteredSpecialist(id)) throw new VueCoreError('unknown_specialist','Unknown VUE specialist');
    super({id,name:id.toUpperCase(),capabilities:{imageAnalysis:false,videoAnalysis:false}});
    this.profile=SPECIALISTS[id];
    this.fetcher=fetcher;
    // Reuse the same validated VUECORE assessment contract as newly configured VUEs.
    const DomainClass=createInformationalVueClass({id,method:this.profile.method});
    this.adapter=new DomainClass({fetcher});
  }
  async assess(context) {
    return this.adapter.assess(context);
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
    let response;
    try {
      response=await this.fetcher('/api/anyvue',{
        method:'POST',headers:{'Content-Type':'application/json'},
        signal:AbortSignal.timeout(30000),
        body:JSON.stringify({question:description.trim()})
      });
    } catch(error) {
      throw new VueCoreError(error?.name==='TimeoutError'||error?.name==='AbortError'?'service_timeout':'service_unavailable','ANYVUE is unavailable.');
    }
    if(!response || typeof response.json !== 'function')
      throw new VueCoreError('invalid_response','ANYVUE returned no readable response');
    let data;
    try { data=await response.json(); } catch {
      throw new VueCoreError('invalid_response','ANYVUE response could not be read');
    }
    if(!response.ok)throw new VueCoreError('service_unavailable',typeof data?.error==='string'?data.error:'ANYVUE is unavailable.');
    if(!data||typeof data!=='object'||typeof data.synthesis!=='string'||!data.synthesis.trim())
      throw new VueCoreError('invalid_response','ANYVUE returned an invalid assessment');
    return data;
  }
}

export function createSpecialistDomain(id, options) {
  if (id === 'anivue') return new AniVueDomain(options);
  if (id === 'anyvue') return new AnyVueDomain(options);
  return new SpecialistVueDomain(id, options);
}

/**
 * Create a VUECORE-derived informational adapter from a specialist definition.
 * This is deliberately not an automatic public router/UI registration: those
 * require reviewed server routing, policy and frontend configuration.
 */
export function createConfiguredSpecialistDomain(definition, options) {
 const DomainClass=createInformationalVueClass(definition);
 return new DomainClass(options);
}

export function listSpecialistDefinitions() {
 return Object.freeze(Object.entries(SPECIALISTS).map(([id,profile])=>Object.freeze({id,scope:profile.scope,method:profile.method})));
}
