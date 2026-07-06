# Indismart Internal Financial Dashboard (Frontend)

Next.js 16 frontend for the Indismart financial dashboard.

## Running locally

```bash
npm install
npm run dev
```

### Backend connection
This frontend requires the backend API to be running or a valid `API_URL` pointing to production.
1. Start the Express server in the `backend/` directory on port 4000 for local development.
2. The frontend connects to it using the `API_URL` specified in `.env.local` (which defaults to Railway production if set).
