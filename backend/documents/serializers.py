from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)
    borrower_id_str = serializers.CharField(source='borrower.borrower_id', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'borrower', 'borrower_name', 'borrower_id_str',
            'document_type', 'file_name', 'file_size', 'mime_type',
            'verification_status', 'upload_date', 'notes'
        ]
        read_only_fields = ['id', 'borrower', 'file_size', 'mime_type', 'verification_status', 'upload_date']
