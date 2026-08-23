THE HAPPY MART - CLOUD PERSISTENT VERSION

WHAT CHANGED
- The website UI and existing application logic are preserved.
- Browser localStorage is retained as a safety cache.
- The complete application state (orders, inventory, returns, employees, attendance, salaries, warnings and metadata) is also stored in a cloud database.
- Each cloud write creates a backup of the previous state.
- Device/browser changes no longer create separate databases when the same deployed URL is used.

DEPLOYMENT ON VERCEL + SUPABASE
1. Create a Supabase project.
2. Open Supabase SQL Editor and run supabase.sql.
3. In Vercel, open the existing project for the-happy-mart-inventory-management.vercel.app.
4. Add these Production environment variables:
   SUPABASE_URL = your Supabase project URL
   SUPABASE_SERVICE_ROLE_KEY = your Supabase service-role key
5. Deploy this folder to that SAME Vercel project.
6. Keep the same Vercel domain. Do not open index.html as a local file.
7. On the first visit from the computer that currently contains your existing local data, the app migrates that existing browser data to the cloud database if the cloud database is empty.

IMPORTANT
- The SUPABASE_SERVICE_ROLE_KEY must ONLY exist in Vercel environment variables. Never put it inside index.html.
- Use HTTPS and keep Supabase backups/PITR enabled for the production project.
- This design is device-independent, but no software can honestly guarantee zero loss under every possible infrastructure disaster. The database + backups provide the intended durable recovery architecture.
- Existing employee passwords remain stored according to the current application design because the admin UI currently displays them. For a public production system, password hashing should be added as a separate security upgrade.
