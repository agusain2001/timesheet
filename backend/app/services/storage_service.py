"""
Storage Service - File storage with multiple backend support.
Supports local filesystem, S3/MinIO, and Google Cloud Storage.
"""
import os
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, BinaryIO, Union
from pathlib import Path
import logging
import mimetypes
import hashlib

logger = logging.getLogger(__name__)


class StorageProvider:
    """Base storage provider interface."""
    
    async def upload(self, file_content: bytes, path: str, content_type: str = None) -> Dict[str, Any]:
        raise NotImplementedError
    
    async def download(self, path: str) -> bytes:
        raise NotImplementedError
    
    async def delete(self, path: str) -> bool:
        raise NotImplementedError
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        raise NotImplementedError
    
    async def exists(self, path: str) -> bool:
        raise NotImplementedError
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        raise NotImplementedError


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider."""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def upload(self, file_content: bytes, path: str, content_type: str = None) -> Dict[str, Any]:
        """Upload file to local storage."""
        full_path = self.base_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, full_path.write_bytes, file_content)
        
        return {
            'path': path,
            'size': len(file_content),
            'content_type': content_type or mimetypes.guess_type(path)[0],
            'etag': hashlib.md5(file_content).hexdigest()
        }
    
    async def download(self, path: str) -> bytes:
        """Download file from local storage."""
        full_path = self.base_path / path
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, full_path.read_bytes)
    
    async def delete(self, path: str) -> bool:
        """Delete file from local storage."""
        full_path = self.base_path / path
        
        if full_path.exists():
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, full_path.unlink)
            return True
        return False
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get URL for file access (returns local path for local storage)."""
        return f"/files/{path}"
    
    async def exists(self, path: str) -> bool:
        """Check if file exists."""
        return (self.base_path / path).exists()
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in a directory."""
        search_path = self.base_path / prefix
        files = []
        
        if search_path.exists():
            for item in search_path.rglob("*"):
                if item.is_file():
                    rel_path = str(item.relative_to(self.base_path))
                    stat = item.stat()
                    files.append({
                        'path': rel_path,
                        'size': stat.st_size,
                        'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        
        return files


class S3StorageProvider(StorageProvider):
    """AWS S3 / MinIO storage provider."""
    
    def __init__(
        self,
        bucket: str,
        region: str = "us-east-1",
        access_key: str = None,
        secret_key: str = None,
        endpoint_url: str = None  # For MinIO
    ):
        self.bucket = bucket
        self.region = region
        self.access_key = access_key or os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = secret_key or os.getenv("AWS_SECRET_ACCESS_KEY")
        self.endpoint_url = endpoint_url or os.getenv("S3_ENDPOINT_URL")
        self._client = None
    
    def _get_client(self):
        """Get or create S3 client."""
        if self._client is None:
            try:
                import boto3
                
                config = {
                    'region_name': self.region,
                    'aws_access_key_id': self.access_key,
                    'aws_secret_access_key': self.secret_key
                }
                
                if self.endpoint_url:
                    config['endpoint_url'] = self.endpoint_url
                
                self._client = boto3.client('s3', **config)
            except ImportError:
                raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
        
        return self._client
    
    async def upload(self, file_content: bytes, path: str, content_type: str = None) -> Dict[str, Any]:
        """Upload file to S3."""
        client = self._get_client()
        
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        loop = asyncio.get_event_loop()
        
        from io import BytesIO
        file_obj = BytesIO(file_content)
        
        await loop.run_in_executor(
            None,
            lambda: client.upload_fileobj(file_obj, self.bucket, path, ExtraArgs=extra_args)
        )
        
        return {
            'path': path,
            'size': len(file_content),
            'content_type': content_type,
            'etag': hashlib.md5(file_content).hexdigest(),
            'bucket': self.bucket
        }
    
    async def download(self, path: str) -> bytes:
        """Download file from S3."""
        client = self._get_client()
        
        loop = asyncio.get_event_loop()
        
        from io import BytesIO
        file_obj = BytesIO()
        
        await loop.run_in_executor(
            None,
            lambda: client.download_fileobj(self.bucket, path, file_obj)
        )
        
        file_obj.seek(0)
        return file_obj.read()
    
    async def delete(self, path: str) -> bool:
        """Delete file from S3."""
        client = self._get_client()
        
        loop = asyncio.get_event_loop()
        
        try:
            await loop.run_in_executor(
                None,
                lambda: client.delete_object(Bucket=self.bucket, Key=path)
            )
            return True
        except Exception as e:
            logger.error(f"S3 delete error: {e}")
            return False
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for file access."""
        client = self._get_client()
        
        loop = asyncio.get_event_loop()
        
        url = await loop.run_in_executor(
            None,
            lambda: client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': path},
                ExpiresIn=expires_in
            )
        )
        
        return url
    
    async def exists(self, path: str) -> bool:
        """Check if file exists in S3."""
        client = self._get_client()
        
        loop = asyncio.get_event_loop()
        
        try:
            await loop.run_in_executor(
                None,
                lambda: client.head_object(Bucket=self.bucket, Key=path)
            )
            return True
        except:
            return False
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in S3 bucket."""
        client = self._get_client()
        
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        )
        
        files = []
        for obj in response.get('Contents', []):
            files.append({
                'path': obj['Key'],
                'size': obj['Size'],
                'modified_at': obj['LastModified'].isoformat(),
                'etag': obj['ETag'].strip('"')
            })
        
        return files


class GCSStorageProvider(StorageProvider):
    """Google Cloud Storage provider."""
    
    def __init__(self, bucket: str, credentials_path: str = None):
        self.bucket_name = bucket
        self.credentials_path = credentials_path
        self._client = None
        self._bucket = None
    
    def _get_bucket(self):
        """Get or create GCS bucket reference."""
        if self._bucket is None:
            try:
                from google.cloud import storage
                
                if self.credentials_path:
                    self._client = storage.Client.from_service_account_json(self.credentials_path)
                else:
                    self._client = storage.Client()
                
                self._bucket = self._client.bucket(self.bucket_name)
            except ImportError:
                raise ImportError("google-cloud-storage is required. Install with: pip install google-cloud-storage")
        
        return self._bucket
    
    async def upload(self, file_content: bytes, path: str, content_type: str = None) -> Dict[str, Any]:
        """Upload file to GCS."""
        bucket = self._get_bucket()
        blob = bucket.blob(path)
        
        loop = asyncio.get_event_loop()
        
        await loop.run_in_executor(
            None,
            lambda: blob.upload_from_string(file_content, content_type=content_type)
        )
        
        return {
            'path': path,
            'size': len(file_content),
            'content_type': content_type,
            'bucket': self.bucket_name
        }
    
    async def download(self, path: str) -> bytes:
        """Download file from GCS."""
        bucket = self._get_bucket()
        blob = bucket.blob(path)
        
        loop = asyncio.get_event_loop()
        
        return await loop.run_in_executor(None, blob.download_as_bytes)
    
    async def delete(self, path: str) -> bool:
        """Delete file from GCS."""
        bucket = self._get_bucket()
        blob = bucket.blob(path)
        
        loop = asyncio.get_event_loop()
        
        try:
            await loop.run_in_executor(None, blob.delete)
            return True
        except Exception as e:
            logger.error(f"GCS delete error: {e}")
            return False
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Generate signed URL for file access."""
        bucket = self._get_bucket()
        blob = bucket.blob(path)
        
        loop = asyncio.get_event_loop()
        
        url = await loop.run_in_executor(
            None,
            lambda: blob.generate_signed_url(expiration=timedelta(seconds=expires_in))
        )
        
        return url
    
    async def exists(self, path: str) -> bool:
        """Check if file exists in GCS."""
        bucket = self._get_bucket()
        blob = bucket.blob(path)
        
        loop = asyncio.get_event_loop()
        
        return await loop.run_in_executor(None, blob.exists)
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in GCS bucket."""
        bucket = self._get_bucket()
        
        loop = asyncio.get_event_loop()
        
        blobs = await loop.run_in_executor(
            None,
            lambda: list(bucket.list_blobs(prefix=prefix))
        )
        
        return [
            {
                'path': blob.name,
                'size': blob.size,
                'modified_at': blob.updated.isoformat() if blob.updated else None,
                'content_type': blob.content_type
            }
            for blob in blobs
        ]


class StorageService:
    """
    Main storage service with pluggable backends.
    Handles file uploads, downloads, and URL generation.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.provider = self._create_provider()
    
    def _create_provider(self) -> StorageProvider:
        """Create storage provider based on configuration."""
        provider_type = os.getenv("STORAGE_PROVIDER", "local")
        
        if provider_type == "s3":
            return S3StorageProvider(
                bucket=os.getenv("S3_BUCKET", "lightidea-files"),
                region=os.getenv("AWS_REGION", "us-east-1"),
                endpoint_url=os.getenv("S3_ENDPOINT_URL")
            )
        elif provider_type == "gcs":
            return GCSStorageProvider(
                bucket=os.getenv("GCS_BUCKET", "lightidea-files"),
                credentials_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            )
        else:
            # Default to local storage
            base_path = os.getenv("STORAGE_PATH", "./uploads")
            return LocalStorageProvider(base_path)
    
    async def upload_file(
        self,
        file_content: Union[bytes, BinaryIO],
        filename: str,
        folder: str = "uploads",
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to storage.
        Returns file info including path and URL.
        """
        # Generate unique filename
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4()}{ext}"
        path = f"{folder}/{unique_name}"
        
        # Get content bytes
        if hasattr(file_content, 'read'):
            content = file_content.read()
        else:
            content = file_content
        
        # Detect content type
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        
        # Upload to provider
        result = await self.provider.upload(content, path, content_type)
        
        # Log to database
        if self.db:
            await self._log_upload(
                path=path,
                original_name=filename,
                size=len(content),
                content_type=content_type,
                user_id=user_id,
                metadata=metadata
            )
        
        return {
            'path': path,
            'original_name': filename,
            'size': len(content),
            'content_type': content_type,
            'url': await self.get_url(path),
            **result
        }
    
    async def download_file(self, path: str) -> bytes:
        """Download a file from storage."""
        return await self.provider.download(path)
    
    async def delete_file(self, path: str) -> bool:
        """Delete a file from storage."""
        return await self.provider.delete(path)
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get URL for file access."""
        return await self.provider.get_url(path, expires_in)
    
    async def file_exists(self, path: str) -> bool:
        """Check if file exists."""
        return await self.provider.exists(path)
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files with prefix."""
        return await self.provider.list_files(prefix)
    
    async def _log_upload(
        self,
        path: str,
        original_name: str,
        size: int,
        content_type: str,
        user_id: Optional[str],
        metadata: Optional[Dict]
    ):
        """Log file upload to database."""
        try:
            from app.models.task_collaboration import TaskAttachment
            
            # This is handled by the caller when creating TaskAttachment
            # Just for logging purposes
            logger.info(f"File uploaded: {path} ({size} bytes) by user {user_id}")
        except Exception as e:
            logger.error(f"Failed to log upload: {e}")
    
    # ==================== Specialized Upload Methods ====================
    
    async def upload_avatar(self, file_content: bytes, user_id: str) -> Dict[str, Any]:
        """Upload user avatar."""
        return await self.upload_file(
            file_content,
            f"avatar_{user_id}.png",
            folder="avatars",
            user_id=user_id
        )
    
    async def upload_task_attachment(
        self,
        file_content: bytes,
        filename: str,
        task_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Upload task attachment."""
        return await self.upload_file(
            file_content,
            filename,
            folder=f"tasks/{task_id}",
            user_id=user_id
        )
    
    async def upload_project_file(
        self,
        file_content: bytes,
        filename: str,
        project_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Upload project file."""
        return await self.upload_file(
            file_content,
            filename,
            folder=f"projects/{project_id}",
            user_id=user_id
        )


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service(db=None) -> StorageService:
    """Get or create storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService(db)
    elif db is not None:
        _storage_service.db = db
    return _storage_service
