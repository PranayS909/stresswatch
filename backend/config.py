from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY= os.environ["SUPABASE_SERVICE_KEY"]
WEATHER_API_KEY     = os.environ["WEATHER_API_KEY"]
WEATHER_LOCATION    = os.getenv("WEATHER_LOCATION", "Mumbai")
SERIAL_PORT         = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
SERIAL_BAUD         = int(os.getenv("SERIAL_BAUD", "115200"))
MODEL_PATH          = os.getenv("MODEL_PATH", "stress_model.pkl")
FEATURE_NAMES_PATH  = os.getenv("FEATURE_NAMES_PATH", "feature_names.pkl")
GLOBAL_BASELINES_PATH = os.getenv("GLOBAL_BASELINES_PATH", "global_baselines.json")
