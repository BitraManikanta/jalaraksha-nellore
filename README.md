# JalaRaksha Nellore (student CSP project, untested build)

## Deploy (free)
1. Supabase: new project. SQL Editor: run supabase/migrations/001_schema.sql, then 002_ratelimit.sql.
2. Supabase > Authentication > Users > Add user (your admin email + password). Copy that user's UID, then run in SQL Editor:
   insert into public.admin_users (user_id) values ('PASTE-UID');
3. Supabase > Project Settings > API: copy Project URL, anon key, service_role key (service_role is SECRET).
4. GitHub: upload this folder (the .gitignore keeps secrets out). Do not upload any .env file.
5. Vercel: Add New > Project > import the repo. In Environment Variables add every name from .env.example:
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HASH_SECRET (long random text), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
   Leave MUNICIPAL_EMAIL_TO, RESEND_API_KEY empty until the municipal address is verified. Deploy.
6. Replace YOUR-SITE.vercel.app in public/sitemap.xml and public/robots.txt with your real URL, commit, redeploy.
7. Test: submit a report, track it, open /admin and sign in, change a status, open the PDF on your phone.

## Local check
npm install, npm run build, npm run dev
