# Remembrance Day poppy field

A static, accessible memorial page with a PHP/MySQL API for a shared field of dedications. The page uses paths relative to its own location, so its CSS and JavaScript also load when GitHub Pages serves it below a repository URL path.

## What is included

- `index.html`, `styles.css`, and `app.js`: the static site.
- `api/index.php`: read and create endpoints at `GET /api/poppies` and `POST /api/poppies`.
- `api/schema.sql`: MySQL table definition, including a unique index on the normalized name.
- `api/moderation.php`: a small, editable server-side blocklist.

The page does not store dedications in the browser. Until an API URL is configured and the API/database are deployed, the page clearly reports that the shared field is unavailable and does not accept a dedication.

## Deploy the PHP API and MySQL database

GitHub Pages only hosts static files; it cannot run this PHP API or connect a browser directly to MySQL. Use a PHP 8.1+ host with HTTPS, PDO MySQL, `mbstring`, and `intl` enabled, together with a MySQL 8 database. A PHP/MySQL web host can provide both; alternatively, use a PHP application host and a managed MySQL 8 service with network access restricted to that application.

1. Create a database and a dedicated database user. Grant the user only `SELECT` and `INSERT` on the `poppies` table; the API does not need update or delete privileges.
2. Import `api/schema.sql` into that database.
3. Deploy the contents of `api/` to the PHP host's `/api/` directory, preserving `.htaccess` and enabling Apache `mod_rewrite` and `.htaccess` overrides. The public endpoint should resolve as `https://YOUR-API-HOST.example/api/poppies`. If your host does not support `.htaccess`, configure its equivalent rewrite from `/api/poppies` to `api/index.php`.
4. Configure these environment variables on the API host. Use the private/internal database hostname when available:

   - `POPPY_DB_HOST`
   - `POPPY_DB_NAME`
   - `POPPY_DB_USER`
   - `POPPY_DB_PASSWORD`
   - `POPPY_ALLOWED_ORIGINS`: comma-separated, exact HTTPS origin(s) of the published site, with no path; for example `https://YOUR-ACCOUNT.github.io`. Add a custom domain origin too if the site uses one.

   Keep credentials on the API host; never put them in the static page. Do not use `*` for allowed origins. The API accepts only `GET`, `POST`, and CORS preflight `OPTIONS`; there is no update or delete endpoint. The database unique index is authoritative for concurrent duplicate submissions.
5. Test `GET https://YOUR-API-HOST.example/api/poppies` and a valid `POST` with JSON `{"name":"Example Veteran"}` over HTTPS. Confirm that the second equivalent name (case/spacing variation) returns HTTP 409.

The API's `api/moderation.php` contains a deliberately small list of exact offensive terms, checked as whole words after Unicode normalization and case folding. Maintain that list as needed. A basic blocklist cannot catch every offensive term or context and is not a substitute for human moderation.

## Publish the page with GitHub Pages

1. Put the contents of this folder in the directory that your GitHub Pages source publishes. In the repository, open **Settings → Pages** and select the appropriate branch and source folder (`/(root)` or `/docs`), then save. GitHub Pages does not publish an arbitrary subfolder directly as a source folder; if this folder remains nested in the repository, publish the repository root or move/copy these page files into the selected root or `/docs` directory.
2. In `index.html`, set `<meta name="poppy-api-url" content="">` to the full HTTPS API base URL, without a trailing slash; for example `<meta name="poppy-api-url" content="https://YOUR-API-HOST.example/api">`. Keep the API URL public, but do not add database credentials or private keys.
3. Publish and load the page at its actual GitHub Pages URL. The page's local asset URLs are relative, and its API URL is explicitly configured, so neither assumes the repository is hosted at the domain root.
4. Check the visible connection status, add a test dedication, reload, and confirm the same name appears. Also test from a second browser/device and verify a case/spacing duplicate is rejected. Remove any test record directly through an authorized database administration process if needed; the public API has no deletion operation.

If the API or database is not configured or available, the page reports that state rather than using local-only storage or implying that names are shared.
