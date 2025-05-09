# Ansh & Riley Full-Stack Template

This is a full-stack template project for Software Composers to create  applications with AI.

## Getting started
To create a new project, you go to `/paths`, choose from our list of Paths, and then use Cursor's Composer feature to quickly scaffold your project!

You can also edit the Path's prompt template to be whatever you like!

## Technologies used
This doesn't really matter, but is useful for the AI to understand more about this project. We are using the following technologies
- React with Next.js 14 App Router
- TailwindCSS
- Firebase Auth, Storage, and Database
- Multiple AI endpoints including OpenAI, Anthropic, and Replicate using Vercel's AI SDK

## Environment Variables Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables in `.env.local`:
- Firebase Configuration: Get these from your Firebase Console
- OpenAI API Key: Get from OpenAI Dashboard
- Replicate API Token: Get from Replicate Dashboard
- Resend API Key: Get from Resend Dashboard
- Deepgram API Key: Get from Deepgram Dashboard

3. Never commit `.env.local` to version control

## Development

```bash
npm install
npm run dev
```