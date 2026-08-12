import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';

/** What the browser needs to put a file in the bucket, and where it lands. */
export interface SignedUpload {
  /** Single-use, expires in two hours — the browser PUTs the file here. */
  uploadUrl: string;
  /** Where the image will be readable once the upload finishes. */
  publicUrl: string;
}

/**
 * The one place that talks to Supabase Storage.
 *
 * Deliberately a `fetch` against two documented endpoints rather than the
 * Supabase SDK: this needs to sign an upload and name a public URL, and
 * pulling in a client that also carries auth, realtime and PostgREST would
 * add a dependency whose other three quarters this project must never use —
 * the database is reached through Drizzle and sessions are our own.
 *
 * The service key is a full-access credential, so it stays here and is never
 * handed to a caller: the browser only ever receives a URL scoped to one
 * object, for two hours.
 */
@Injectable()
export class SupabaseStorageClient {
  private readonly logger = new Logger(SupabaseStorageClient.name);
  private readonly url: string | undefined;
  private readonly serviceKey: string | undefined;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('SUPABASE_URL', { infer: true })?.replace(/\/+$/, '');
    this.serviceKey = config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
    this.bucket = config.get('SUPABASE_MEDIA_BUCKET', { infer: true });

    if (!this.configured && config.get('NODE_ENV', { infer: true }) === 'production') {
      // Loud at boot rather than at the moment a master picks a photo: an
      // unconfigured deploy is a deploy problem, and it should be visible
      // before anyone tries to use the feature.
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — image upload is disabled',
      );
    }
  }

  private get configured(): boolean {
    return Boolean(this.url && this.serviceKey);
  }

  async createSignedUpload(objectPath: string, contentType: string): Promise<SignedUpload> {
    if (!this.url || !this.serviceKey) {
      throw new ServiceUnavailableException('Загрузка файлов не настроена на этом сервере');
    }

    const response = await fetch(
      `${this.url}/storage/v1/object/upload/sign/${this.bucket}/${objectPath}`,
      {
        method: 'POST',
        headers: {
          // Оба заголовка намеренно: ключ проекта бывает двух поколений —
          // легаси-JWT `service_role` и новый `sb_secret_…`. Первый Storage
          // принимает как Bearer, второму нужен ещё и `apikey`. Отправлять оба
          // дешевле, чем привязывать развёртывание к поколению ключа.
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
          'Content-Type': 'application/json',
        },
        // Storage enforces the bucket's own mime whitelist against this, so a
        // type that slipped past validation is still refused at the upload.
        body: JSON.stringify({ contentType }),
      },
    );

    if (!response.ok) {
      // The body can carry the service key back in an error echo, so only the
      // status is logged and nothing of it reaches the caller.
      this.logger.error(`Storage refused to sign an upload: ${response.status}`);
      throw new ServiceUnavailableException('Хранилище недоступно, попробуйте ещё раз');
    }

    // `url` comes back relative to /storage/v1 and carries the token.
    const { url } = (await response.json()) as { url: string };

    return {
      uploadUrl: `${this.url}/storage/v1${url}`,
      publicUrl: `${this.url}/storage/v1/object/public/${this.bucket}/${objectPath}`,
    };
  }
}
