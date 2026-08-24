import sys
import os

# Adiciona o diretório backend-python ao sys.path para carregar os módulos
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend-python"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Importa a aplicação FastAPI do backend
from main import app
