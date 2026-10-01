# Deploy on Render

1. Connect this project to GitHub. Keep the repository private unless `data/database.db` has been removed from Git history; that tracked local database may contain personal data. The Render build deletes its copy, and the service starts with a fresh database on its persistent disk.
2. In Render, choose **New** > **Blueprint**, connect the repository, and select its `render.yaml` file.
3. When prompted, enter a unique admin username and a strong password in Render's dashboard. Do not put these values in Git or send them in chat.
4. Review the service and persistent-disk charges before confirming creation. Persistent disks require a paid Render web service.
5. After the first successful deploy, open the HTTPS `onrender.com` URL from any network and device.

The Blueprint runs one Node service with a persistent disk because the app uses SQLite, in-memory sessions, and SSE clients. Do not scale it to multiple instances. The hosted database is separate from the local `data/database.db`; existing accounts and records need a deliberate migration if they should be carried over.

Generated ID photos/details and profile edits still use browser-local storage and will not follow users across devices yet.
