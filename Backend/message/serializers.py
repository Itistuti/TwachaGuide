from rest_framework import serializers
from .models import ChatMessage, SkinCareRoutine

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'


class SkinCareRoutineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkinCareRoutine
        fields = ['id', 'routine_data', 'created_at', 'updated_at']
