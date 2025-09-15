# YouTube API Setup for Video Duration Detection

To get accurate video durations for YouTube videos, you can set up a YouTube Data API v3 key.

## Steps to Get YouTube API Key:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. **Create credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. **Set the environment variable**:
   - Create a `.env` file in your project root
   - Add: `REACT_APP_YOUTUBE_API_KEY=your_api_key_here`

## Alternative: Use Without API Key

If you don't want to set up an API key, the system will:
- Try to extract duration from YouTube page HTML (limited success)
- Fall back to a reasonable default duration (4 minutes)
- Allow manual adjustment in the modal

## Security Note

- Never commit your API key to version control
- Add `.env` to your `.gitignore` file
- Consider restricting the API key to your domain in Google Cloud Console

## Current Implementation

The system tries multiple methods in order:
1. **YouTube Data API v3** (if API key is provided) - Most accurate
2. **HTML scraping** (public method) - Limited accuracy
3. **Default duration** (4 minutes) - Fallback option

For Vimeo videos, the system uses the Vimeo oEmbed API which provides accurate duration without requiring an API key.
