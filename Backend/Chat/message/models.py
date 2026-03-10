from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# User Profile to store role information
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('dermatologist', 'Dermatologist'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    name = models.CharField(max_length=255, blank=True, default='')
    address = models.TextField(blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.user.email} - {self.role}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return self.user.email + ": " + self.message[:50]
    
