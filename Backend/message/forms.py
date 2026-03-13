from django import forms
from .models import ChatMessage

class ChatMessageForm(forms.ModelForm):
    class Meta:
        model = ChatMessage
        fields = ['message']
        widget = {
            'message': forms.TextInput(attrs={
                'class':'form-control',
                'placeholder': 'type your message',
                'autocomplete':'off'
            })
        }