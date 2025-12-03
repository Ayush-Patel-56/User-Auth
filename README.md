# Mini Homepage Builder

A Django-based application with a custom homepage builder, user authentication, and gallery features using Supabase for storage.

## How to run the project ?

Follow these steps to set up and run the project locally.

### 1. Clone the repository
```bash
git clone https://github.com/Ayush-Patel-56/User-Auth.git
cd User-Auth
```

### 2. Create and Activate Virtual Environment
It's recommended to use a virtual environment to manage dependencies.

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up Environment Variables
Create a `.env` file in the root directory (same level as `manage.py`) and add your Supabase/AWS credentials.

**`.env` file template:**
```env
DJANGO_SECRET_KEY=your_django_secret_key
DATABASE_URL=your_database_url_if_using_postgres
# If using local sqlite, DATABASE_URL might not be strictly needed if settings.py handles it, but good to check.

# Supabase / AWS S3 Credentials
AWS_ACCESS_KEY_ID=your_supabase_access_key
AWS_SECRET_ACCESS_KEY=your_supabase_secret_key
```
> **Note:** The project uses `AWS_` variable names for compatibility with the storage library, but you should use your Supabase credentials here.

### 5. Run Migrations
Initialize the database.
```bash
python manage.py migrate
```

### 6. Run the Development Server
```bash
python manage.py runserver
```


## Deployment (Render.com)

This project is ready for deployment on Render.

1.  **Create a New Web Service** on Render.
2.  **Connect your GitHub repository.**
3.  **Settings:**
    *   **Runtime:** Python 3
    *   **Build Command:** `./render-build.sh`
    *   **Start Command:** `waitress-serve --listen=*:10000 core.wsgi:application`
4.  **Environment Variables:**
    Add the following variables in the Render dashboard (copy values from your local `.env`):
    *   `DJANGO_SECRET_KEY`
    *   `DATABASE_URL` (You can use a Render PostgreSQL database or your existing one)
    *   `SUPABASE_ACCESS_KEY_ID` (or `AWS_ACCESS_KEY_ID` if you kept the old name)
    *   `SUPABASE_SECRET_ACCESS_KEY` (or `AWS_SECRET_ACCESS_KEY`)
    *   `PYTHON_VERSION`: `3.11.5` (optional, but recommended)
