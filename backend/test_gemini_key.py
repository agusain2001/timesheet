import google.generativeai as genai

api_key = "AIzaSyBoSNmSGPXxlPr91tRCihkIHeZ7IcqEJQU"
print(f"Testing API key: {api_key[:10]}...")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say 'Test successful!'")
    print("\nSUCCESS!")
    print(f"Response: {response.text}")
except Exception as e:
    print("\nERROR:")
    print(str(e))
