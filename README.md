<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1cRhmqrcvu-FqrBln6A8If5rKEbjw77YL

https://github.com/user-attachments/assets/4aa03093-bc9b-4e56-9325-bc600ad47179

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set your API key. For the Vite frontend set `VITE_API_KEY=your-api-key`. For server-side usage set `API_KEY=your-api-key`.
   - Do NOT commit `.env.local` to source control.

3. Run the app:
   `npm run dev`
