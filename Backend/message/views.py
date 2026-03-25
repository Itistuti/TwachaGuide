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
from .models import ChatMessage, UserProfile, PartnershipRequest, SkinCareRoutine

ADMIN_EMAIL = 'admin@gmail.com'
ADMIN_PASSWORD = 'admin123'

def is_admin(user):
    try:
        return UserProfile.objects.get(user=user).role == 'admin'
    except UserProfile.DoesNotExist:
        return False

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
        nmc_certificate = request.FILES.get('nmc_certificate')
        pan_card = request.FILES.get('pan_card')
        partner_pan_card = request.FILES.get('partner_pan_card')

        if not email or not password or not name or not address or not role:
            return Response({'error': 'Name, email, address, password, and role are required'}, status=400)
        
        if role not in ['customer', 'dermatologist', 'partner']:
            return Response({'error': 'Invalid role. Must be customer, dermatologist, or partner'}, status=400)

        if role == 'dermatologist' and (not nmc_certificate or not pan_card):
            return Response({'error': 'NMC certificate and PAN card are required for dermatologists'}, status=400)

        if role == 'partner' and not partner_pan_card:
            return Response({'error': 'PAN card is required for partners'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=400)
        
        user = User.objects.create_user(username=email, email=email, password=password)
        verification_status = 'pending' if role == 'dermatologist' else 'approved'
        UserProfile.objects.create(
            user=user,
            role=role,
            name=name,
            address=address,
            nmc_certificate=nmc_certificate,
            pan_card=pan_card,
            partner_pan_card=partner_pan_card,
            verification_status=verification_status
        )
        
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

        if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            user, _ = User.objects.get_or_create(username=email, defaults={'email': email})
            if not user.email:
                user.email = email
            if not user.check_password(password):
                user.set_password(password)
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.role != 'admin':
                profile.role = 'admin'
                profile.verification_status = 'approved'
                profile.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'Logged in successfully',
                'email': user.email,
                'role': 'admin',
                'token': token.key
            }, status=200)

        user = authenticate(request, username=email, password=password)
        if user is not None:
            token, created = Token.objects.get_or_create(user=user)
            
            try:
                profile = UserProfile.objects.get(user=user)
                role = profile.role
                verification_status = profile.verification_status
            except UserProfile.DoesNotExist:
                role = 'customer'
                verification_status = 'approved'

            if role == 'dermatologist' and verification_status != 'approved':
                if verification_status == 'rejected':
                    return Response({'error': 'Dermatologist verification rejected'}, status=403)
                return Response({'error': 'Dermatologist verification pending'}, status=403)
            
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
            'address': profile.address,
            'verification_status': profile.verification_status
        }, status=200)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# -----------------
# Admin: list all users
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_admin_users(request):
    if not is_admin(request.user):
        return Response({'error': 'Forbidden'}, status=403)

    users = User.objects.all().select_related('profile')
    data = []
    for user in users:
        try:
            profile = UserProfile.objects.get(user=user)
            data.append({
                'id': user.id,
                'email': user.email,
                'role': profile.role,
                'name': profile.name,
                'address': profile.address,
                'verification_status': profile.verification_status
            })
        except UserProfile.DoesNotExist:
            data.append({
                'id': user.id,
                'email': user.email,
                'role': 'unknown',
                'name': '',
                'address': '',
                'verification_status': 'unknown'
            })
    return Response({'users': data}, status=200)

# -----------------
# Admin: list dermatologist registrations (queue)
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_admin_dermatologist_queue(request):
    if not is_admin(request.user):
        return Response({'error': 'Forbidden'}, status=403)

    status = request.query_params.get('status', 'pending')
    dermatologists = UserProfile.objects.filter(role='dermatologist', verification_status=status).select_related('user')

    def full_url(file_field):
        if not file_field:
            return None
        return request.build_absolute_uri(file_field.url)

    data = [{
        'user_id': p.user.id,
        'email': p.user.email,
        'name': p.name,
        'address': p.address,
        'verification_status': p.verification_status,
        'nmc_certificate': full_url(p.nmc_certificate),
        'pan_card': full_url(p.pan_card)
    } for p in dermatologists]
    return Response({'dermatologists': data}, status=200)

# -----------------
# Admin: approve/reject dermatologist registration
# -----------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_admin_set_dermatologist_status(request, user_id):
    if not is_admin(request.user):
        return Response({'error': 'Forbidden'}, status=403)

    status = request.data.get('status')
    if status not in ['approved', 'rejected']:
        return Response({'error': 'Invalid status'}, status=400)

    try:
        profile = UserProfile.objects.get(user_id=user_id, role='dermatologist')
    except UserProfile.DoesNotExist:
        return Response({'error': 'Dermatologist not found'}, status=404)

    profile.verification_status = status
    profile.save()
    return Response({'message': 'Status updated'}, status=200)

# -----------------
# Admin: list partnership requests (queue)
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_admin_partnership_queue(request):
    if not is_admin(request.user):
        return Response({'error': 'Forbidden'}, status=403)

    status = request.query_params.get('status', 'pending')
    requests = PartnershipRequest.objects.filter(status=status).select_related('user', 'user__profile').order_by('-created_at')

    def full_url(file_field):
        if not file_field:
            return None
        return request.build_absolute_uri(file_field.url)

    data = []
    for pr in requests:
        try:
            partner_pan_card = full_url(pr.user.profile.partner_pan_card)
        except UserProfile.DoesNotExist:
            partner_pan_card = None

        data.append({
            'id': pr.id,
            'user_email': pr.user.email,
            'company_name': pr.company_name,
            'address': pr.address,
            'contact_number': pr.contact_number,
            'email': pr.email,
            'description': pr.description,
            'product_suggestion': pr.product_suggestion,
            'status': pr.status,
            'partner_pan_card': partner_pan_card,
            'created_at': pr.created_at.strftime('%Y-%m-%d %H:%M')
        })

    return Response({'partnership_requests': data}, status=200)

# -----------------
# Admin: approve/reject partnership request
# -----------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_admin_set_partnership_status(request, request_id):
    if not is_admin(request.user):
        return Response({'error': 'Forbidden'}, status=403)

    status = request.data.get('status')
    if status not in ['approved', 'rejected']:
        return Response({'error': 'Invalid status'}, status=400)

    try:
        pr = PartnershipRequest.objects.get(id=request_id)
    except PartnershipRequest.DoesNotExist:
        return Response({'error': 'Partnership request not found'}, status=404)

    pr.status = status
    pr.save()
    return Response({'message': 'Status updated'}, status=200)

# -------------
# User Logout API
# -------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_logout(request):
    # Delete the DRF token when present so it cannot be reused
    if hasattr(request, 'auth') and request.auth is not None:
        try:
            request.auth.delete()
        except Exception:
            pass
    logout(request)
    return Response({'message': 'Logged out successfully'}, status=200)

# -----------------
# Get messages for current user
# -----------------
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_messages(request):
    messages = ChatMessage.objects.filter(
        Q(user=request.user) | Q(recipient=request.user)
    ).order_by('-timestamp')[:50]

    def get_role(user):
        try:
            return UserProfile.objects.get(user=user).role
        except UserProfile.DoesNotExist:
            return None

    filtered = []
    for msg in reversed(messages):
        sender_role = get_role(msg.user)
        recipient_role = get_role(msg.recipient) if msg.recipient else None
        if {sender_role, recipient_role} == {'customer', 'dermatologist'}:
            filtered.append({
                'email': msg.user.email,
                'username': msg.user.first_name or msg.user.email,
                'message': msg.message,
                'recipient_email': msg.recipient.email if msg.recipient else None,
                'timestamp': msg.timestamp.strftime('%H:%M'),
                'isFromMe': msg.user == request.user
            })

    return Response({'messages': filtered})

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

    if not recipient_email:
        return Response({'error': 'Recipient email is required'}, status=400)
    
    try:
        recipient = User.objects.get(email=recipient_email)
    except User.DoesNotExist:
        return Response({'error': 'Recipient not found'}, status=404)

    def get_role(user):
        try:
            return UserProfile.objects.get(user=user).role
        except UserProfile.DoesNotExist:
            return None

    def get_profile(user):
        try:
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return None

    sender_role = get_role(request.user)
    recipient_role = get_role(recipient)
    if sender_role == 'customer' and recipient_role != 'dermatologist':
        return Response({'error': 'Customers can only message dermatologists'}, status=400)
    if sender_role == 'customer' and recipient_role == 'dermatologist':
        recipient_profile = get_profile(recipient)
        if not recipient_profile or recipient_profile.verification_status != 'approved':
            return Response({'error': 'You can only message approved dermatologists'}, status=403)
    if sender_role == 'dermatologist' and recipient_role != 'customer':
        return Response({'error': 'Dermatologists can only message customers'}, status=400)

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
        dermatologists = UserProfile.objects.filter(
            role='dermatologist',
            verification_status='approved'
        ).select_related('user').exclude(user=request.user)
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
    
    def get_role(user):
        try:
            return UserProfile.objects.get(user=user).role
        except UserProfile.DoesNotExist:
            return None

    def get_profile(user):
        try:
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return None

    sender_role = get_role(request.user)
    other_role = get_role(other_user)
    if sender_role == 'customer' and other_role != 'dermatologist':
        return Response({'error': 'Invalid recipient'}, status=403)
    if sender_role == 'customer' and other_role == 'dermatologist':
        other_profile = get_profile(other_user)
        if not other_profile or other_profile.verification_status != 'approved':
            return Response({'error': 'Invalid recipient'}, status=403)
    if sender_role == 'dermatologist' and other_role != 'customer':
        return Response({'error': 'Invalid recipient'}, status=403)

    messages = ChatMessage.objects.filter(
        Q(user=request.user, recipient=other_user) |
        Q(user=other_user, recipient=request.user)
    ).order_by('timestamp')
    def get_display_name(user):
        try:
            return UserProfile.objects.get(user=user).name or user.email
        except UserProfile.DoesNotExist:
            return user.email

    data = [{
        'sender_email': msg.user.email,
        'username': get_display_name(msg.user),
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
    """Get list of customers who have chatted with this dermatologist"""
    try:
        # Get users from messages sent TO this dermatologist
        received_from = ChatMessage.objects.filter(recipient=request.user).values_list('user', flat=True)
        # Get users this dermatologist has sent messages TO
        sent_to = ChatMessage.objects.filter(user=request.user, recipient__isnull=False).values_list('recipient', flat=True)
        
        patient_ids = set(received_from) | set(sent_to)
        patient_ids.discard(request.user.id)
        
        patients = []
        for user_id in patient_ids:
            user = User.objects.get(id=user_id)
            try:
                profile = UserProfile.objects.get(user=user)
                if profile.role != 'customer':
                    continue
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

# -----------------
# Partnership Request API
# -----------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_partnership(request):
    try:
        company_name = request.data.get('companyName')
        address = request.data.get('address')
        contact_number = request.data.get('contactNumber')
        email = request.data.get('email')
        description = request.data.get('description')
        product_suggestion = request.data.get('productSuggestion')

        if not all([company_name, address, contact_number, email, description, product_suggestion]):
            return Response({'error': 'All fields are required'}, status=400)

        PartnershipRequest.objects.create(
            user=request.user,
            company_name=company_name,
            address=address,
            contact_number=contact_number,
            email=email,
            description=description,
            product_suggestion=product_suggestion,
            status='pending'
        )
        return Response({'message': 'Partnership request submitted successfully'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# -----------------
# Skincare Routine API
# -----------------
@csrf_exempt
@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def api_skincare_routine(request):
    """Get, create, or update skincare routine for the authenticated user"""
    try:
        if request.method == 'GET':
            # Get the user's routine
            try:
                routine = SkinCareRoutine.objects.get(user=request.user)
                return Response({
                    'id': routine.id,
                    'routine_data': routine.routine_data,
                    'created_at': routine.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'updated_at': routine.updated_at.strftime('%Y-%m-%d %H:%M:%S')
                }, status=200)
            except SkinCareRoutine.DoesNotExist:
                return Response({
                    'routine_data': [],
                    'message': 'No routine found for this user'
                }, status=200)
        
        elif request.method == 'POST' or request.method == 'PUT':
            # Create or update routine
            routine_data = request.data.get('routine_data')
            
            if routine_data is None:
                return Response({'error': 'routine_data is required'}, status=400)
            
            routine, created = SkinCareRoutine.objects.get_or_create(user=request.user)
            routine.routine_data = routine_data
            routine.save()
            
            from .serializers import SkinCareRoutineSerializer
            serializer = SkinCareRoutineSerializer(routine)
            return Response(serializer.data, status=201 if created else 200)
    
    except Exception as e:
        return Response({'error': str(e)}, status=500)

