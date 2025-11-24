# Nautilus Frontend

Next.js frontend for Nautilus email verification.

## Setup

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Set up environment variables:
Create a `.env.local` file in the frontend directory with:
```
NEXT_PUBLIC_NAUTILUS_SERVER=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=your-email@yourdomain.com
```

- `NEXT_PUBLIC_NAUTILUS_SERVER`: The URL of your Nautilus enclave API endpoint (default: http://localhost:3000)
- Get your Resend API key from https://resend.com/api-keys

3. Run development server:
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Features

- **Email Verification** (`/`): Upload .eml email files via drag-and-drop or file picker
  - Select from predefined templates
  - Verify email DKIM signatures via Nautilus enclave
  - Display verification results including:
    - DKIM signature status
    - Regex validation results
    - Signed response with signature

- **Party Invitation** (`/entry`): Send email invitations with secret codes
  - Enter email address
  - Choose party type (main party or after party)
  - Send invitation email via Resend API
  - Each invitation includes a unique 10-character alphanumeric secret code

## Templates

- **Student Email**: Validates sender email ends with .edu
- **Mysten Labs**: Validates sender email contains @mystenlabs.com

## Configuration

The API URL is configured via the `NEXT_PUBLIC_NAUTILUS_SERVER` environment variable in `.env.local`. This defaults to `http://localhost:3000` if not set.

