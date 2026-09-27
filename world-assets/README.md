# Separate world storage on R2

The application and the generated world have independent deployments. Git contains
source, configuration, source receipts and follow-ups. R2 holds the published web
files and the matching recovery/test archive. Neither raw GIS surveys nor Blender
scenes are uploaded by this workflow.

`release.json` pins the world ID, archive checksum, bucket and delivery origin.
The asset Worker exposes only GET, HEAD and OPTIONS under `/<world-id>/`; it has
no upload, listing or administration endpoint. R2 is private to its Worker binding.
Existing objects have immutable cache headers, correct types and public CORS;
missing objects and failures are not cached. The initial endpoint is
`https://vanbeaches-world.alex-zvaniga.workers.dev`.

## Publish a world explicitly

1. Enable R2 in the Cloudflare account, then run `pnpm exec wrangler login`.
2. Create the bucket once with `pnpm exec wrangler r2 bucket create vanbeaches-world`.
3. Deploy the read-only service with `pnpm coast:r2:deploy`.
4. Restore/build and verify the desired local world and `3d/output/coast-web.tar.gz`.
5. Update `release.json` for a new version. Run `pnpm coast:r2:plan` to inspect the
   exact uploads, then `pnpm coast:r2:publish` to publish. Uploads use four concurrent
   requests; they do not start Blender or regenerate GIS.
6. Check the public manifest, world build record, archive SHA-256, CORS, decoder
   loading and representative tile hashes. Update the pinned URLs/checksum in
   `.github/workflows/deploy.yml` in the same source change.

The publisher verifies local files and the archive before uploading. It writes
`world-build.json` and then `manifest.json` after the referenced files, and refuses
to replace a published version with different manifest bytes. A failed partial
upload can be resumed by running the same verified release again. Do not manually
overwrite a published version's objects; publish a new world ID instead.

## Application deployment and rollback

Production builds set `VITE_COAST_MANIFEST_URL` to the immutable remote manifest.
The build verifies its content-derived identity and copies only application icons
and headers from `client/public`, even if a developer has a complete local world.
The deployment job rejects a `client/dist/coast-assets` directory. Browser CI
separately restores the matching checksum-pinned R2 archive into its test workspace.

Ordinary application releases do not write R2 or deploy this Worker. Changes to
the delivery service require a separate `pnpm coast:r2:deploy`; changes to geometry
require an explicit publish. To roll back, deploy the earlier application revision
with its original immutable world URL and retain that R2 version. Never point an
old world URL at new files.

Local development without `VITE_COAST_MANIFEST_URL` continues to use
`client/public/coast-assets`. The old bundled-assets build remains available for
local/offline inspection. `3d/COMPLETION.md` records the original local validation;
it is not evidence of a later production deployment.

R2 setup follows [Cloudflare's Worker binding documentation](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/).

## Manually disable asset delivery

`WORLD_ASSETS_ENABLED` defaults to enabled, and the checked-in Worker configuration sets
it to the string `"true"`. Setting it to exactly `"false"` makes GET and HEAD return
`503` with `Cache-Control: no-store` before any R2 read. CORS preflight remains available.

From the repository root, deploy the disabled setting:

```sh
pnpm exec wrangler deploy --config world-assets/wrangler.toml --var WORLD_ASSETS_ENABLED:false
```

Re-enable delivery:

```sh
pnpm exec wrangler deploy --config world-assets/wrangler.toml --var WORLD_ASSETS_ENABLED:true
```

This is an availability switch, not a spending cap. It does not stop storage charges,
erase incurred charges, or stop uploads through separate credentials. Worker requests
still reach the service. The change requires a successful deployment and is not an
instant cutoff; already cached or loaded assets can remain visible. Disabling delivery
also prevents hosted builds and archive-based CI from fetching the world.

The command overrides that deployment's setting. A later normal deployment using the
checked-in `"true"` configuration re-enables delivery; keep the configuration synchronized
if a shutdown should persist across future deployments.
