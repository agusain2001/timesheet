'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, FileText, Loader2 } from 'lucide-react';

interface ReceiptUploadProps {
    onUpload: (files: File[]) => void;
    existingReceipts?: { url: string; name: string }[];
    onRemove?: (url: string) => void;
    disabled?: boolean;
    maxFiles?: number;
}

export function ReceiptUpload({
    onUpload,
    existingReceipts = [],
    onRemove,
    disabled = false,
    maxFiles = 5
}: ReceiptUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const files = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('image/') || file.type === 'application/pdf'
        );
        handleFiles(files);
    }, [disabled]);

    const handleFiles = (files: File[]) => {
        const validFiles = files.slice(0, maxFiles - existingReceipts.length - previewFiles.length);

        // Create previews
        const newPreviews = validFiles.map(file => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        }));

        setPreviewFiles(prev => [...prev, ...newPreviews]);
        onUpload(validFiles);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const removePreview = (index: number) => {
        setPreviewFiles(prev => {
            const updated = [...prev];
            if (updated[index].preview) {
                URL.revokeObjectURL(updated[index].preview);
            }
            updated.splice(index, 1);
            return updated;
        });
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return <FileText className="w-8 h-8 text-red-400" />;
        return <FileImage className="w-8 h-8 text-blue-400" />;
    };

    return (
        <div className="receipt-upload space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && inputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                    ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-foreground/20 hover:border-foreground/40'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={disabled}
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <p className="text-sm text-foreground/60">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-foreground/40" />
                        <p className="text-sm text-foreground/60">
                            Drag & drop receipts here, or <span className="text-blue-400">browse</span>
                        </p>
                        <p className="text-xs text-foreground/40">
                            Supports: JPG, PNG, PDF (max {maxFiles} files)
                        </p>
                    </div>
                )}
            </div>

            {/* Preview Grid */}
            {(existingReceipts.length > 0 || previewFiles.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Existing Receipts */}
                    {existingReceipts.map((receipt, idx) => (
                        <div
                            key={`existing-${idx}`}
                            className="relative group bg-foreground/5 rounded-lg overflow-hidden aspect-square"
                        >
                            {receipt.url.endsWith('.pdf') ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    {getFileIcon(receipt.name)}
                                </div>
                            ) : (
                                <img
                                    src={receipt.url}
                                    alt={receipt.name}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {onRemove && (
                                <button
                                    onClick={() => onRemove(receipt.url)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                <p className="text-xs truncate">{receipt.name}</p>
                            </div>
                        </div>
                    ))}

                    {/* Preview Files */}
                    {previewFiles.map((item, idx) => (
                        <div
                            key={`preview-${idx}`}
                            className="relative group bg-foreground/5 rounded-lg overflow-hidden aspect-square"
                        >
                            {item.preview ? (
                                <img
                                    src={item.preview}
                                    alt={item.file.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    {getFileIcon(item.file.name)}
                                </div>
                            )}
                            <button
                                onClick={() => removePreview(idx)}
                                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                <p className="text-xs truncate">{item.file.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
