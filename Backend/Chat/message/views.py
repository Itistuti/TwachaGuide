# views.py
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import ChatMessage, UserProfile

# ---------------------
# User Registration API
# ---------------------
@csrf_exempt
@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def api_register(request):
    if request.method == 'OPTIONS':
        return Response(status=200)
        
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        name = request.data.get('name')
        address = request.data.get('address')
        role = request.data.get('role')

        if not email or not password or not name or not address or not role:
            return Response({'error': 'Name, email, address, password, and role are required'}, status=400)
        
        if role not in ['customer', 'dermatologist']:
            return Response({'error': 'Invalid role. Must be customer or dermatologist'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=400)
        
        user = User.objects.create_user(username=email, email=email, password=password)
        UserProfile.objects.create(user=user, role=role, name=name, address=address)
        
        return Response({'message': 'Account created successfully'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# -------------
# User Login API
# -------------
@csrf_exempt
@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def api_login(request):
    if request.method == 'OPTIONS':
        return Response(status=200)
        
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=400)

        user = authenticate(request, username=email, password=password)
        if user is not None:
            token, created = Token.objects.get_or_create(user=user)
            
            try:
                profile = UserProfile.objects.get(user=user)
                role = profile.role
            except UserProfile.DoesNotExist:
                role = 'customer'
            
            return Response({
                'message': 'Logged in successfully',
                'email': user.email,
                'role': role,
                'token': token.key
            }, status=200)
        else:
            return Response({'error': 'Invalid credentials'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Get user profile
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_profile(request):
    try:
        user = request.user
        profile = UserProfile.objects.get(user=user)
        return Response({
            'email': user.email,
            'role': profile.role,
            'name': profile.name,
            'address': profile.address
        }, status=200)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# -------------
# User Logout API
# -------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    logout(request)
    return Response({'message': 'Logged out successfully'}, status=200)

# -----------------
# Get last 50 messages
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_messages(request):
    messages = ChatMessage.objects.all().order_by('-timestamp')[:50]
    data = [{
        'email': msg.user.email,
        'username': msg.user.first_name or msg.user.email,
        'message': msg.message,
        'timestamp': msg.timestamp.strftime('%H:%M')
    } for msg in reversed(messages)]
    return Response({'messages': data})

# -----------------
# Send a new message
# -----------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_send_message(request):
    message_text = request.data.get('message')
    recipient_email = request.data.get('recipient_email')
    
    if not message_text:
        return Response({'error': 'Message is required'}, status=400)
    
    recipient = None
    if recipient_email:
        try:
            recipient = User.objects.get(email=recipient_email)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=404)
    
    msg = ChatMessage.objects.create(
        user=request.user, 
        message=message_text,
        recipient=recipient
    )
    return Response({
        'email': msg.user.email,
        'username': msg.user.first_name or msg.user.email,
        'message': msg.message,
        'timestamp': msg.timestamp.strftime('%H:%M')
    }, status=201)

# -----------------
# Get dermatologists list
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_dermatologists(request):
    try:
        dermatologists = UserProfile.objects.filter(role='dermatologist').select_related('user')
        data = [{
            'email': doc.user.email,
            'name': doc.name,
            'address': doc.address
        } for doc in dermatologists]
        return Response({'dermatologists': data}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# -----------------
# Get chat history with a specific user
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_chat_history(request):
    other_user_email = request.query_params.get('with')
    if not other_user_email:
        return Response({'error': 'Specify user with "with" parameter'}, status=400)
    
    try:
        other_user = User.objects.get(email=other_user_email)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    
    messages = ChatMessage.objects.filter(
        Q(user=request.user, recipient=other_user) |
        Q(user=other_user, recipient=request.user)
    ).order_by('timestamp')
    
    data = [{
        'sender_email': msg.user.email,
        'message': msg.message,
        'timestamp': msg.timestamp.strftime('%H:%M'),
        'isFromMe': msg.user == request.user
    } for msg in messages]
    return Response({'messages': data}, status=200)

# -----------------
# Get patients list (dermatologist's perspective)
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_patients(request):
    """Get list of customers who have messaged this dermatologist"""
    try:
        # Get all messages where the current user (dermatologist) is the recipient
        patient_messages = ChatMessage.objects.filter(recipient=request.user).values_list('user', flat=True).distinct()
        
        patients = []
        for user_id in patient_messages:
            user = User.objects.get(id=user_id)
            try:
                profile = UserProfile.objects.get(user=user)
                patients.append({
                    'email': user.email,
                    'name': profile.name,
                    'address': profile.address
                })
            except UserProfile.DoesNotExist:
                patients.append({
                    'email': user.email,
                    'name': user.first_name or user.email,
                    'address': ''
                })
        
        return Response(patients, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
