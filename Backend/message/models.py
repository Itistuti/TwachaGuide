from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# User Profile to store role information
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('dermatologist', 'Dermatologist'),
        ('partner', 'Partner'),
        ('admin', 'Admin'),
    ]

    VERIFICATION_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    name = models.CharField(max_length=255, blank=True, default='')
    address = models.TextField(blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    nmc_certificate = models.ImageField(upload_to='dermatologist_docs/nmc/', blank=True, null=True)
    pan_card = models.ImageField(upload_to='dermatologist_docs/pan/', blank=True, null=True)
    partner_pan_card = models.ImageField(upload_to='partner_docs/pan/', blank=True, null=True)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='approved')
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.user.email} - {self.role}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_messages')
    message = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.email}: {self.message[:50]}"

class PartnershipRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='partnership_requests')
    company_name = models.CharField(max_length=255)
    address = models.TextField()
    contact_number = models.CharField(max_length=20)
    email = models.EmailField()
    description = models.TextField()
    product_suggestion = models.TextField()
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.company_name} - {self.email}"
    
