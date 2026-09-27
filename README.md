# REALS'M HUB V6 License/Trial Starter

Starter backend for a centralized license system:
- FREE trial key after a LootLabs postback
- one FREE trial per clientId in this starter
- PREMIUM/LIFETIME-ready license model
- license verification endpoint
- simple dashboard
- Roblox verification example

Requires Node.js 18+.

Configuration:
- This starter includes a local `.env` file for easier setup. Keep it PRIVATE and never commit it to a public GitHub repository.
- For Render, prefer adding these in Dashboard → Environment:
  BASE_URL=https://realsm-license.onrender.com
  LOOTLABS_API_TOKEN=YOUR_LOOTLABS_API_TOKEN
  LOOTLABS_POSTBACK_URL=https://realsm-license.onrender.com/api/lootlabs/postback
  TRIAL_SECONDS=3600

Run:
node server.js

LootLabs postback URL:
https://YOUR-DOMAIN/api/lootlabs/postback

The LootLabs API token must stay on the backend, never in the Roblox client.
For production, replace data.json with a real database and protect admin endpoints with authentication/rate limiting.

Official LootLabs docs:
https://help.lootlabs.gg/en/article/postback-api-1ndz3i2/
https://help.lootlabs.gg/en/article/lootlabs-api-documentation-1k0hn73/
