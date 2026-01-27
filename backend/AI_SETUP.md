# AI Agent Setup Guide

## Overview
The AI Agent uses Google's GROQ API to generate flashcards from text input. It's free up to 1.5M tokens per month.

## Setup Instructions

### 1. Get GROQ API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Backend
Add the API key to your `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=your-api-key-here
```

Or set it as an environment variable:
```bash
export GROQ_API_KEY=your-api-key-here
```

### 3. Install Dependencies
The GROQ SDK is already in `requirements.txt`. Install it:

```bash
cd backend
pip install -r requirements.txt
```

### 4. Restart Backend Server
After setting the API key, restart your FastAPI server:

```bash
uvicorn app.main:app --reload
```

### 5. Verify Setup
The frontend will show a status indicator:
- ✅ Green: AI service is available
- ❌ Red: AI service is not configured

## Usage

1. Navigate to "AI Agent" in the navigation menu
2. Paste or type your text content
3. Optionally provide a deck title
4. Click "Generate Deck"
5. The AI will analyze the text and create flashcards
6. You'll be redirected to the new deck automatically

## Features

- **Text Analysis**: Extracts key concepts, facts, and definitions
- **Smart Card Generation**: Creates question-answer pairs automatically
- **Customizable**: Optional deck title, AI generates description
- **Instant Study**: Generated decks are ready to study immediately

## API Endpoints

- `POST /api/ai/text-to-deck` - Generate deck from text
- `GET /api/ai/status` - Check AI service availability
