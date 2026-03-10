from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.api_register, name='register'),
    path('login/', views.api_login, name='login'),
    path('logout/', views.api_logout, name='logout'),
    path('profile/', views.api_get_profile, name='get_profile'),
    path('api/messages/', views.api_get_messages, name='get_messages'),
    path('api/send_message/', views.api_send_message, name='api_send_message'),
]