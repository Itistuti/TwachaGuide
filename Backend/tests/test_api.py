import requests
import json
from requests.auth import HTTPBasicAuth
import time

API = 'http://localhost:8000'
session = requests.Session()

# Register customer 1
print("=" * 50)
print("Registering customer...")
resp = requests.post(f'{API}/register/', json={
    'email': 'customer1@test.com',
    'password': 'test123',
    'name': 'Test Customer',
    'address': '123 Main St',
    'role': 'customer'
})
print(f'Status: {resp.status_code}')
print(f'Response: {resp.json()}')

# Register dermatologist
print("\n" + "=" * 50)
print("Registering dermatologist...")
resp = requests.post(f'{API}/register/', json={
    'email': 'doc1@test.com',
    'password': 'test123',
    'name': 'Dr. Smith',
    'address': '456 Oak Ave',
    'role': 'dermatologist'
})
print(f'Status: {resp.status_code}')
print(f'Response: {resp.json()}')

# Login customer
print("\n" + "=" * 50)
print("Logging in customer...")
resp = session.post(f'{API}/login/', json={
    'email': 'customer1@test.com',
    'password': 'test123'
})
print(f'Status: {resp.status_code}')
print(f'Response: {resp.json()}')

# Test sending message
print("\n" + "=" * 50)
print("Sending message to dermatologist...")
resp = session.post(f'{API}/api/send_message/', json={
    'message': 'Hello doctor, I have a skin concern',
    'recipient_email': 'doc1@test.com'
})
print(f'Status: {resp.status_code}')
print(f'Response: {resp.json()}')

# Get chat history
print("\n" + "=" * 50)
print("Getting chat history...")
resp = session.get(f'{API}/api/chat_history/?with=doc1@test.com')
print(f'Status: {resp.status_code}')
print(f'Response: {resp.json()}')

print("\n" + "=" * 50)
print("Test completed!")
