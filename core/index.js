/**
 * VUE CORE v0.1 — browser/Node compatible, dependency-free domain foundation.
 * Shared contracts and flow orchestration; domain-specific rules live in adapters.
 * No API keys, persistence, tracking or hidden network calls.
 */
export const CORE_VERSION = "0.1.0";
export const MEDIA_LIMITS = Object.freeze({ image: 10 * 1024 * 1024, video: 50 * 1024 * 1024 });
export const IMAGE_TYPES = Object.freeze(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);
export const LANGUAGES = Object.freeze(["en","sv","es","hi","zh-CN","ru","ar"]);
export const SEVERITIES = Object.freeze(["normal","monitor","professional","emergency"]);

export class VueCoreError extends Error {
  constructor(code, message) { super(message); this.name = "VueCoreError"; this.code = code; }
}

export function validateMedia(file, kind) {
  if (!["image","video"].includes(kind)) throw new VueCoreError("invalid_kind","Unknown media kind");
  if (!file || typeof file.size !== "number" || typeof file.type !== "string")
    return { ok:false, code:"invalid_file", message:"Invalid file." };
  const validType = kind === "image" ? IMAGE_TYPES.includes(file.type.toLowerCase()) : file.type.toLowerCase().startsWith("video/");
  if (!validType) return { ok:false, code:"unsupported_type", message:"Unsupported file type." };
  if (file.size <= 0) return { ok:false, code:"empty_file", message:"File is empty." };
  if (file.size > MEDIA_LIMITS[kind]) return { ok:false, code:"too_large", message:"File exceeds size limit." };
  return { ok:true, code:null, message:null };
}

export function normalizeAssessment(assessment) {
  if (!assessment || typeof assessment !== "object") throw new VueCoreError("invalid_assessment","Missing assessment");
  if (!SEVERITIES.includes(assessment.severity)) throw new VueCoreError("invalid_severity","Unknown severity");
  if (typeof assessment.summary !== "string" || !assessment.summary.trim()) throw new VueCoreError("invalid_summary","Missing summary");
  return Object.freeze({
    severity:assessment.severity,
    summary:assessment.summary.trim(),
    observations:Array.isArray(assessment.observations) ? assessment.observations.filter(x=>typeof x==="string") : [],
    recommendations:Array.isArray(assessment.recommendations) ? assessment.recommendations.filter(x=>typeof x==="string") : [],
    followUpQuestions:Array.isArray(assessment.followUpQuestions) ? assessment.followUpQuestions.filter(x=>typeof x==="string") : [],
    limitations:Array.isArray(assessment.limitations) ? assessment.limitations.filter(x=>typeof x==="string") : []
  });
}

/** Domain adapters specialize this base contract; do not weaken its validation or safety gates. */
export class VueDomain {
  constructor({ id, name, capabilities = {} }) {
    if (!/^[a-z][a-z0-9-]*$/.test(id || "")) throw new VueCoreError("invalid_domain","Domain id required");
    this.id=id; this.name=name || id.toUpperCase();
    this.capabilities=Object.freeze({ imageAnalysis:false, videoAnalysis:false, ...capabilities });
  }
  async assess(_context) { throw new VueCoreError("not_implemented","Domain must implement assess()"); }
  emergencyCheck(_context) { return null; }
}

export class VueFlow {
  constructor(domain) {
    if (!(domain instanceof VueDomain)) throw new VueCoreError("invalid_domain","Expected VueDomain");
    this.domain=domain;
  }
  async run({ category, symptoms = [], description = "", media = [], language = "en" } = {}) {
    if (!LANGUAGES.includes(language)) throw new VueCoreError("invalid_language","Unsupported language");
    if (!Array.isArray(symptoms) || !Array.isArray(media)) throw new VueCoreError("invalid_input","Expected arrays");
    if (typeof description !== "string" || description.length > 2000) throw new VueCoreError("invalid_description","Invalid description");
    for (const asset of media) {
      if (!asset || !["image","video"].includes(asset.kind)) throw new VueCoreError("invalid_media","Invalid media asset");
      const result=validateMedia(asset.file,asset.kind);
      if (!result.ok) throw new VueCoreError(result.code,result.message);
    }
    const context={ category, symptoms:[...symptoms], description, media:[...media], language };
    // Deterministic emergency handling takes precedence over all AI/other assessments.
    const emergency=await this.domain.emergencyCheck(context);
    if (emergency) {
      const assessed=normalizeAssessment(emergency);
      if (assessed.severity !== "emergency") throw new VueCoreError("invalid_emergency","Emergency check must return emergency severity");
      return { domain:this.domain.id, assessment:assessed, source:"safety-rule", mediaAnalyzed:false };
    }
    const assessed=normalizeAssessment(await this.domain.assess(context));
    return { domain:this.domain.id, assessment:assessed, source:"domain", mediaAnalyzed:false };
  }
}
