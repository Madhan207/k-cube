import hashlib
from pathlib import Path
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document, document_upload_path
from .serializers import DocumentSerializer
from borrowers.models import Borrower
from accounts.permissions import IsOwnerOrAdmin
from audit.utils import log_action

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if self.request.user.is_admin:
            return Document.objects.all().order_by('-upload_date')
        return Document.objects.filter(borrower__user=self.request.user).order_by('-upload_date')

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=400)
            
        borrower_id = request.data.get('borrower_id')
        try:
            borrower = Borrower.objects.get(borrower_id=borrower_id, user=request.user) \
                if not request.user.is_admin else Borrower.objects.get(borrower_id=borrower_id)
        except Borrower.DoesNotExist:
            return Response({'error': 'Borrower not found.'}, status=404)

        doc_type = request.data.get('document_type')
        if not doc_type:
            return Response({'error': 'Document type is required.'}, status=400)

        # Mark older documents of same type as not current
        Document.objects.filter(borrower=borrower, document_type=doc_type).update(is_current=False)

        doc = Document(
            borrower=borrower,
            document_type=doc_type,
            file_name=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            notes=request.data.get('notes', '')
        )
        doc.save()
        
        # Save file securely
        rel_path = document_upload_path(doc, file_obj.name)
        full_path = Path(settings.MEDIA_ROOT) / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_content = file_obj.read()
        with open(full_path, 'wb') as f:
            f.write(file_content)
            
        doc.storage_key = rel_path
        doc.file_hash = hashlib.sha256(file_content).hexdigest()
        doc.save()

        log_action(request.user, 'DOCUMENT_UPLOADED', 'document', doc.id, request, target_repr=file_obj.name)
        
        serializer = self.get_serializer(doc)
        return Response(serializer.data, status=201)

    from rest_framework.decorators import action
    from django.http import FileResponse, Http404

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        # Strict authorization: check user ID
        if not request.user.is_admin and doc.borrower.user_id != request.user.id:
            return Response({'error': 'Unauthorized. Access restricted to document owner or compliance admins.'}, status=403)
        
        full_path = Path(settings.MEDIA_ROOT) / doc.storage_key
        if not full_path.exists():
            return Response({'error': 'Document file not found.'}, status=404)
        
        log_action(request.user, 'DOCUMENT_DOWNLOADED', 'document', doc.id, request, target_repr=doc.file_name)
        response = FileResponse(open(full_path, 'rb'), content_type=doc.mime_type or 'application/octet-stream')
        response['Content-Disposition'] = f'inline; filename="{doc.file_name}"'
        return response
