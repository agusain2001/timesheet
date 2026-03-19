from google import genai

api_key = "AIzaSyBoSNmSGPXxlPr91tRCihkIHeZ7IcqEJQU"
print(f"Testing API key: {api_key[:10]}...")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(model='gemini-2.5-flash', contents="Say 'Test successful!'")
    print("\nSUCCESS!")
    print(f"Response: {response.text}")
except Exception as e:
    print("\nERROR:")
    print(str(e))
