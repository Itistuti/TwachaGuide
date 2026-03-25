from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.api_register, name='register'),
    path('login/', views.api_login, name='login'),
    path('logout/', views.api_logout, name='logout'),
    path('profile/', views.api_get_profile, name='get_profile'),
    path('api/messages/', views.api_get_messages, name='get_messages'),
    path('api/send_message/', views.api_send_message, name='api_send_message'),
    path('api/dermatologists/', views.api_get_dermatologists, name='get_dermatologists'),
    path('api/chat_history/', views.api_get_chat_history, name='chat_history'),
    path('api/patients/', views.api_get_patients, name='get_patients'),
    path('api/partnership/', views.api_partnership, name='api_partnership'),
    path('api/skincare_routine/', views.api_skincare_routine, name='skincare_routine'),
    path('api/admin/users/', views.api_admin_users, name='admin_users'),
    path('api/admin/dermatologists/', views.api_admin_dermatologist_queue, name='admin_derm_queue'),
    path('api/admin/dermatologists/<int:user_id>/status/', views.api_admin_set_dermatologist_status, name='admin_derm_status'),
    path('api/admin/partnerships/', views.api_admin_partnership_queue, name='admin_partnership_queue'),
    path('api/admin/partnerships/<int:request_id>/status/', views.api_admin_set_partnership_status, name='admin_partnership_status'),
]