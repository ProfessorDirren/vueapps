import { VueCoreError } from "./index.js";

/** Shared AI adapter contract; implementations live behind trusted server endpoints. */
export class VueAnalysisAdapter {
  constructor({ supportsImage = false, supportsVideo = false } = {}) {
    this.supportsImage = supportsImage;
    this.supportsVideo = supportsVideo;
  }
  async analyze(_input) {
    throw new VueCoreError("not_implemented", "AI adapter must implement analyze()");
  }
}

/**
 * Secure client adapter for a same-origin serverless endpoint.
 * The API key must only exist on the server. No client-side OpenAI calls.
 * Response is a domain-owned structured assessment validated by VUE CORE.
 */
export class VueHttpAnalysisAdapter extends VueAnalysisAdapter {
  constructor({ endpoint, supportsImage = true, supportsVideo = false, timeoutMs = 30000, fetchImpl = globalThis.fetch } = {}) {
    super({ supportsImage, supportsVideo });
    if (typeof endpoint !== "string" || !/^\/api\/[a-z0-9/-]+$/i.test(endpoint))
      throw new VueCoreError("invalid_endpoint", "Use a same-origin /api/ endpoint.");
    if (typeof fetchImpl !== "function") throw new VueCoreError("missing_fetch", "Fetch is unavailable.");
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }
  async analyze({ image, video, category, symptoms = [], description = "", language = "en" } = {}) {
    if (video) throw new VueCoreError("video_not_supported", "Video AI analysis is not implemented.");
    if (!this.supportsImage || typeof image !== "string" || !/^data:image\/(jpeg|png|webp|heic|heif);base64,[a-z0-9+/]+=*$/i.test(image))
      throw new VueCoreError("invalid_image", "A supported base64 image is required.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, category, symptoms, description, language }),
        signal: controller.signal
      });
      if (!response.ok) throw new VueCoreError("http_" + response.status, "Analysis endpoint returned " + response.status);
      const data = await response.json();
      if (!data || typeof data !== "object") throw new VueCoreError("invalid_response", "Invalid analysis response.");
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new VueCoreError("timeout", "Analysis timed out.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
