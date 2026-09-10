import "server-only"

import { randomUUID } from "node:crypto"
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

/**
 * Neon Object Storage — the bucket behind profile avatars.
 *
 * Neon speaks the S3 API, so this is the plain AWS SDK client rather than a
 * Neon-specific one. Two things are not optional:
 *
 *  - `forcePathStyle`. Neon addresses buckets as `<endpoint>/<bucket>/<key>`,
 *    not `<bucket>.<endpoint>`; without it every request 404s.
 *  - The endpoint. It is **branch-scoped** — storage branches with the
 *    database, so a preview branch has its own endpoint, its own credential
 *    and its own copy-on-write view of these objects. `AWS_ENDPOINT_URL_S3`
 *    comes from `neonctl env pull`, alongside the branch's key pair, which is
 *    what keeps rows and files on the same branch in step.
 *
 * `server-only` so an import from a Client Component is a build error rather
 * than a leaked key, exactly as `lib/stripe.ts` does. And like that module,
 * missing credentials return `null` instead of throwing: a checkout that says
 * "not configured" beats a dashboard that 500s, and the same holds for an
 * avatar upload.
 */

/** Created with `neonctl buckets create lumen-avatars --access-level public_read`. */
const BUCKET = "lumen-avatars"

/* The bucket is `public_read`, not `private`. An avatar is rendered by the
   sidebar, the app bar and the account menu on every single dashboard view,
   so a presigned URL would mean signing one on every render and handing the
   browser a URL that expires — which defeats both the HTTP cache and any CDN
   put in front of the bucket. The objects are public profile images by
   design; the *write* still needs the branch credential. */

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
}

function endpoint() {
  return process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, "") ?? ""
}

/**
 * The client, or `null` when the branch's storage variables are absent — a
 * fresh clone with no `neonctl env pull` run, say. Callers surface that as
 * "uploads aren't configured" rather than crashing.
 *
 * Credentials are passed explicitly even though the SDK would find these
 * exact names in the environment on its own: reading them here is what lets
 * the "unconfigured" case be detected at all, instead of failing later with
 * an opaque signing error.
 */
function client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey || !endpoint()) return null

  return new S3Client({
    endpoint: endpoint(),
    region: process.env.AWS_REGION ?? "us-east-2",
    credentials: { accessKeyId, secretAccessKey },
    // Required: Neon uses path-style addressing.
    forcePathStyle: true,
  })
}

function publicUrl(key: string) {
  return `${endpoint()}/${BUCKET}/${key}`
}

/**
 * Store one avatar and return the URL to put in `User.image`.
 *
 * Every upload writes a **new** key rather than overwriting the user's old
 * one. A `public_read` object is cached by the browser (and by any CDN put in
 * front of the bucket) against its URL, so overwriting one key would leave
 * the stale image on screen until the cache expired; a fresh key plus a
 * repointed column changes the picture immediately. `deleteAvatar` then
 * collects the old object.
 */
export async function putAvatar(
  userId: string,
  file: { bytes: Uint8Array; contentType: string }
): Promise<string | null> {
  const s3 = client()
  if (!s3) return null

  const extension = EXTENSIONS[file.contentType] ?? "bin"
  const key = `avatars/${userId}/${randomUUID()}.${extension}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.bytes,
      ContentType: file.contentType,
      // Safe to cache hard because the key never gets reused — see above.
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  return publicUrl(key)
}

/**
 * Drop a previously uploaded avatar, given the URL stored in `User.image`.
 *
 * Returns without doing anything unless the URL is one of *ours* under
 * *this* user's prefix. `User.image` is just as likely to hold a Google or
 * GitHub avatar (`updateUserInfoOnLink` copies those across), and a stray
 * value must never turn into a delete against someone else's key.
 */
export async function deleteAvatar(userId: string, imageUrl: string | null) {
  if (!imageUrl) return
  const prefix = `${endpoint()}/${BUCKET}/avatars/${userId}/`
  if (!endpoint() || !imageUrl.startsWith(prefix)) return

  const s3 = client()
  if (!s3) return

  const key = imageUrl.slice(`${endpoint()}/${BUCKET}/`.length)
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch {
    // A leftover object costs pennies; a failed cleanup must not fail the
    // upload that already succeeded.
  }
}

/**
 * The platform's logo and favicon, behind Platform Controls' two upload
 * buttons — `PlatformSetting.logoUrl` and `.faviconUrl`.
 *
 * **Same bucket as the avatars, under a `branding/` prefix**, rather than a
 * second bucket. A Neon bucket is created out-of-band with `neonctl` and
 * branches with the database, so adding one means a new manual step in every
 * environment and a second pair of variables to keep in step; a prefix costs
 * nothing and inherits the branch scoping the avatars already rely on. The
 * bucket's name is the only thing that reads oddly — it is `lumen-avatars`
 * because avatars were the first thing in it, not because it is limited to
 * them.
 *
 * `public_read` is right here for a stronger reason than it is for avatars:
 * the logo and favicon are rendered on every page of the **public** site, by
 * visitors who are not signed in at all, so a presigned URL is not merely
 * wasteful but wrong.
 *
 * A new key per upload, for the reason `putAvatar` gives — these objects are
 * cached `immutable`, so overwriting one would leave the old logo on screen
 * until the cache expired.
 */
export async function putBrandingAsset(
  kind: "logo" | "favicon",
  file: { bytes: Uint8Array; contentType: string }
): Promise<string | null> {
  const s3 = client()
  if (!s3) return null

  const extension = EXTENSIONS[file.contentType] ?? "bin"
  const key = `branding/${kind}/${randomUUID()}.${extension}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.bytes,
      ContentType: file.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  return publicUrl(key)
}

/**
 * Collect the logo or favicon a new upload has just replaced.
 *
 * Scoped to `branding/<kind>/` for the reason `deleteAvatar` is scoped to one
 * user's prefix: the column it comes from is a plain URL string, and a value
 * that did not originate here must never turn into a delete.
 */
export async function deleteBrandingAsset(
  kind: "logo" | "favicon",
  assetUrl: string | null
) {
  if (!assetUrl) return
  const prefix = `${endpoint()}/${BUCKET}/branding/${kind}/`
  if (!endpoint() || !assetUrl.startsWith(prefix)) return

  const s3 = client()
  if (!s3) return

  const key = assetUrl.slice(`${endpoint()}/${BUCKET}/`.length)
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch {
    // As above: a failed cleanup must not fail a successful upload.
  }
}
