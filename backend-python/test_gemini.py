import os
# pyrefly: ignore [missing-import]
import google.generativeai as genai
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
print(f"Testando chave: {api_key[:10]}..." if api_key else "Chave não encontrada no .env")
if api_key:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-3.6-flash')
        response = model.generate_content("Responda apenas 'OK' se estiver funcionando.")
        print(f"\n✅ SUCESSO! A chave é válida e o Gemini respondeu: {response.text.strip()}")
    except Exception as e:
        print(f"\n❌ ERRO: A chave não funcionou.\nMotivo: {str(e)}")
