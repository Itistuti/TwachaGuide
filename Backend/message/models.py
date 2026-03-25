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
    about_suggested_product = models.TextField(blank=True, default='')
    product_picture = models.FileField(upload_to='partnership_products/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.company_name} - {self.email}"


class SuggestedProduct(models.Model):
    CATEGORY_CHOICES = [
        ('skincare', 'Skincare'),
        ('haircare', 'Haircare'),
        ('bodycare', 'Bodycare'),
        ('supplements', 'Supplements'),
        ('tools', 'Tools & Devices'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suggested_products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='skincare')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='suggested_products/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.user.email}"

    class Meta:
        ordering = ['-created_at']


class SkinCareRoutine(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='skincare_routine')
    routine_data = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Routine for {self.user.email}"
    
