import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import type { TTSService } from "./service";

function createClient() {
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  const pool = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const provider = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  if (projectNumber && serviceAccount && pool && provider) {
    const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account", audience, subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
      subject_token_supplier: { getSubjectToken: getVercelOidcToken }
    });
    if (!authClient) throw new Error("Could not initialize Google Workload Identity Federation.");
    return new TextToSpeechClient({ projectId, authClient });
  }
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!key) return new TextToSpeechClient({ projectId });
  try {
    const credentials = JSON.parse(key) as { client_email: string; private_key: string };
    if (!credentials.client_email || !credentials.private_key) throw new Error("missing service-account fields");
    return new TextToSpeechClient({ projectId, credentials });
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain a valid service-account JSON key.");
  }
}

export class GoogleCloudTTSService implements TTSService {
  private client = createClient();
  async generateSpeech(text: string) {
    const [response] = await this.client.synthesizeSpeech({ input: { text }, voice: { languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE || "en-US", name: process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-F" }, audioConfig: { audioEncoding: "MP3" } });
    if (!response.audioContent) throw new Error("Google TTS returned no audio.");
    return Buffer.from(response.audioContent as Uint8Array);
  }
}
