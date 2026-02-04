# 8byte - Social & Professional Networking Platform

A powerful, feature-rich social networking application built with **Django** and **Vanilla JS**. It combines professional networking features (portfolios, education, skills) with rich social interaction (real-time chat, video calls, media sharing).

## 🚀 Key Features

### 🔐 Advanced Authentication
- **Secure Sign Up/Sign In**: Username/Password authentication with JWT (JSON Web Tokens).
- **Email Verification**: OTP (One-Time Password) verification via Gmail SMTP.
- **Google OAuth**: One-click login with Google.
- **Security**: HttpOnly cookies for token storage and automatic whitespace handling for credentials.

### 💬 Real-Time Communication
- **Direct Messages (1:1)**: End-to-end encrypted messaging with real-time updates.
- **Video & Voice Calls**: High-quality in-browser calls powered by **Agora SDK**.
- **Rich Chat Features**:
  - Emoji picker & WhatsApp-style quick reactions.
  - Message deletion.
  - Read receipts & Unread counts.
  - Online status indicators (Active Now / Last Seen).
- **Global & Community Chat**: Public chat rooms and private community groups.

### 👤 Profile & Portfolio
- **Professional Profile**: Showcase Education, Experience, and Skills. 
- **Social Links**: Integrated Instagram, LinkedIn, and GitHub links.
- **Dynamic Avatar**: Upload custom avatars or use generated fallbacks.
- **Activity Status**: Real-time tracking of user presence.

### 📸 Media & Gallery
- **Photo Gallery**: Upload and share photos with captions.
- **Interactions**: Like and Comment on user photos.
- **Cloud Storage**: Fast and secure media storage using **Supabase (S3-compatible)**.

---

## 🛠️ Tech Stack

- **Backend**: Django 5, Django REST Framework (DRF)
- **Frontend**: HTML5, Tailwind CSS (via CDN/custom), Vanilla JavaScript (ES6+)
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Real-Time Video**: Agora RTC SDK
- **Encryption**: Cryptography (Fernet) for DMs
- **Deployment**: Vercel (Serverless)

---

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/your-repo.git
cd User-Auth
```

### 2. Create Virtual Environment
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# --- Django Core ---
DJANGO_SECRET_KEY=your_secret_key
DEBUG=True

# --- Database (Supabase/Postgres) ---
DATABASE_URL=postgres://user:pass@host:port/db

# --- Authentication (Google OAuth) ---
GOOGLE_CLIENT_ID=your_google_client_id

# --- Email (Gmail SMTP) ---
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_16_char_app_password
DEFAULT_FROM_EMAIL=your_email@gmail.com

# --- Storage (Supabase S3) ---
AWS_ACCESS_KEY_ID=your_supabase_access_key
AWS_SECRET_ACCESS_KEY=your_supabase_secret_key

# --- Real-Time Video (Agora) ---
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# --- Security ---
# Generate a new key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
MESSAGE_ENCRYPTION_KEY=your_generated_key_here
```

### 5. Run Migrations
```bash
python manage.py migrate
```

### 6. Run Server
```bash
python manage.py runserver
```
Visit `http://localhost:8000` to view the app.

---

## ☁️ Deployment

This project is configured for **Vercel** deployment.

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root.
3. Add all the Environment Variables from your `.env` to the Vercel Project Settings.
4. **Important**: For email to work, ensure you use `EMAIL_PORT=465` and `EMAIL_USE_SSL=True`.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
