from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Uses service role key — never expose this on the frontend
db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
