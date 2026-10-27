import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Link as LinkIcon, HardDrive, Check, Image as ImageIcon, 
  Video, Loader2, Search, AlertCircle
} from 'lucide-react';
import { storageService, formatStorageBytes } from '../../services/storageService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { securityUtils } from '../../utils/security';
import { extractDirectImageUrl } from '../../utils/imageUrlResolver';
import { useApp } from '../../context/AppContext';
import type { StorageFile } from '../../db/schema';

export type MediaSourceTab = 'gallery' | 'link' | 'vault';
export type MediaType = 'image' | 'video' | 'all';

export interface MediaPickerResult {
  url: string;
  file?: File;
  name?: string;
  source: MediaSourceTab;
}

export interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: MediaPickerResult) => void;
  title?: string;
  description?: string;
  mediaType?: MediaType;
  initialTab?: MediaSourceTab;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media',
  description = 'Choose a file from your device gallery, enter a direct web link, or pick from your Storage Vault.',
  mediaType = 'image',
  initialTab = 'gallery',
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<MediaSourceTab>(initialTab);

  // Tab 1: Gallery / Device Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingUploadRef = useRef(false);

  // Tab 2: Direct Link State
  const [directLinkInput, setDirectLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPreviewSuccess, setLinkPreviewSuccess] = useState<boolean | null>(null);

  // Tab 3: Storage Vault State
  const [vaultFiles, setVaultFiles] = useState<StorageFile[]>([]);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [vaultSearch, setVaultSearch] = useState('');
  const [selectedVaultFile, setSelectedVaultFile] = useState<StorageFile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedFile(null);
      setLocalPreviewUrl(null);
      setIsUploading(false);
      setUploadProgress(null);
      setDirectLinkInput('');
      setLinkError(null);
      setLinkPreviewSuccess(null);
      setSelectedVaultFile(null);
      storageService.getAuthToken().then(setAuthToken);
    }
  }, [isOpen, initialTab]);

  // Load Storage Vault files when Vault tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'vault') {
      setIsVaultLoading(true);
      storageService.listFiles()
        .then((res) => {
          setVaultFiles(res.files || []);
        })
        .catch((err) => {
          console.warn('[MediaPickerModal] Failed to list vault files:', err);
        })
        .finally(() => {
          setIsVaultLoading(false);
        });
    }
  }, [isOpen, activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  // Handle local file selection
  const handleFilePicked = async (file: File) => {
    if (!file) return;

    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(fileName);
    const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName);

    if (mediaType === 'image' && !isImage) {
      showToast('Please select an image file (PNG, JPG, WEBP, GIF, SVG).', 'error');
      return;
    }
    if (mediaType === 'video' && !isVideo) {
      showToast('Please select a video file (MP4, WEBM, MOV).', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
  };

  const handleConfirmGalleryUpload = async () => {
    if (!selectedFile || isUploading || isSubmittingUploadRef.current) return;
    isSubmittingUploadRef.current = true;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      let fileToUpload = selectedFile;

      // Automatically compress oversized images for instant loading
      if ((selectedFile.type || '').startsWith('image/') && selectedFile.size > 1024 * 1024) {
        try {
          fileToUpload = await cloudinaryService.compressImage(selectedFile, 1600, 1600, 0.88);
        } catch {
          // If compression fails, fall back to original file
          fileToUpload = selectedFile;
        }
      }

      setUploadProgress(45);

      // Upload to Storage Vault (Google Drive / persistent store)
      const uploaded = await storageService.uploadFile(fileToUpload, {
        category: 'uploads',
        visibility: 'public',
        onProgress: (p) => setUploadProgress(p),
      });

      setUploadProgress(100);

      // Resolve URL: either Google Drive proxy streaming URL or direct URL
      const finalUrl = uploaded.id && !uploaded.id.startsWith('vault_')
        ? `/api/storage-file?id=${encodeURIComponent(uploaded.id)}`
        : (localPreviewUrl || '');

      onSelect({
        url: finalUrl,
        file: fileToUpload,
        name: uploaded.originalName || fileToUpload.name,
        source: 'gallery',
      });
      onClose();
    } catch (err: any) {
      console.warn('[MediaPickerModal] Cloud upload warning, using local preview fallback:', err);
      // Fallback: return data URL or blob URL if cloud upload is unreachable
      if (localPreviewUrl) {
        onSelect({
          url: localPreviewUrl,
          file: selectedFile,
          name: selectedFile.name,
          source: 'gallery',
        });
        onClose();
      }
    } finally {
      isSubmittingUploadRef.current = false;
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle Direct Link confirmation
  const handleConfirmDirectLink = () => {
    const raw = directLinkInput.trim();
    if (!raw) {
      setLinkError('Please enter a valid URL.');
      return;
    }

    const clean = mediaType === 'image'
      ? (extractDirectImageUrl(raw) || raw)
      : raw;

    const isValid = mediaType === 'video'
      ? securityUtils.validateUrl(clean, true)
      : securityUtils.validateImageUrl(clean);

    if (!isValid) {
      setLinkError(
        mediaType === 'video'
          ? 'Invalid video link. Use HTTP, HTTPS, or a safe relative path.'
          : 'Invalid image link. Use HTTP, HTTPS, or a safe relative path.'
      );
      return;
    }

    setLinkError(null);
    onSelect({
      url: clean,
      name: clean.split('/').pop()?.split('?')[0] || 'Web Link',
      source: 'link',
    });
    onClose();
  };

  // Handle Storage Vault file selection
  const handleConfirmVaultFile = () => {
    if (!selectedVaultFile) return;

    const streamUrl = authToken
      ? `/api/storage-file?id=${encodeURIComponent(selectedVaultFile.id)}&token=${encodeURIComponent(authToken)}`
      : `/api/storage-file?id=${encodeURIComponent(selectedVaultFile.id)}`;

    onSelect({
      url: streamUrl,
      name: selectedVaultFile.originalName,
      source: 'vault',
    });
    onClose();
  };

  // Filter vault files by mediaType and search
  const filteredVaultFiles = vaultFiles.filter((f) => {
    const mime = (typeof f?.mimeType === 'string' ? f.mimeType : '').toLowerCase();
    const name = (typeof f?.originalName === 'string' ? f.originalName : '').toLowerCase();

    if (mediaType === 'image') {
      const isImg = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(name);
      if (!isImg) return false;
    } else if (mediaType === 'video') {
      const isVid = mime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(name);
      if (!isVid) return false;
    }

    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase().trim();
      return name.includes(q) || mime.includes(q);
    }
    return true;
  });

  if (!isOpen) return null;

  const isAcceptVideo = mediaType === 'video';
  const isAcceptAll = mediaType === 'all';
  const acceptAttribute = isAcceptVideo 
    ? 'video/mp4,video/webm,video/quicktime' 
    : isAcceptAll 
    ? 'image/*,video/*' 
    : 'image/png,image/jpeg,image/webp,image/gif';

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center">
                {mediaType === 'video' ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary font-display">
                  {title}
                </h3>
                <p className="text-[11px] text-text-secondary line-clamp-1">
                  {description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close media selector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Unified Media Source Tabs */}
          <div className="flex border-b border-border-default bg-bg-tertiary/40 px-6 pt-2 shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'gallery'
                  ? 'border-brand-primary text-brand-primary bg-bg-secondary rounded-t-lg'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Gallery / Device</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'link'
                  ? 'border-brand-primary text-brand-primary bg-bg-secondary rounded-t-lg'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Direct Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'vault'
                  ? 'border-brand-primary text-brand-primary bg-bg-secondary rounded-t-lg'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage Vault</span>
              {vaultFiles.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">
                  {vaultFiles.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* TAB 1: Gallery / Device Upload */}
            {activeTab === 'gallery' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttribute}
                  disabled={isUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFilePicked(f);
                  }}
                  className="hidden"
                />

                {localPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border-default bg-bg-primary flex items-center justify-center">
                      {((selectedFile?.type || '').startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(selectedFile?.name || '')) ? (
                        <video 
                          src={localPreviewUrl} 
                          controls 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img 
                          src={localPreviewUrl} 
                          alt="Local preview" 
                          className="w-full h-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setLocalPreviewUrl(null);
                        }}
                        disabled={isUploading}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-medium rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted font-mono px-1">
                      <span className="truncate max-w-[280px] text-text-primary font-medium">{selectedFile?.name}</span>
                      <span>{selectedFile ? formatStorageBytes(selectedFile.size) : ''}</span>
                    </div>

                    {isUploading && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs text-text-secondary">
                          <span>Uploading to Storage Vault...</span>
                          <span className="font-mono">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-primary transition-all duration-300"
                            style={{ width: `${uploadProgress || 10}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFilePicked(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-brand-primary bg-brand-primary-light/50 ring-2 ring-brand-primary/20'
                        : 'border-border-default hover:border-brand-primary/60 bg-bg-tertiary/30 hover:bg-bg-tertiary/60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-text-primary mb-1">
                      Choose from Gallery or Drag &amp; Drop
                    </h4>
                    <p className="text-xs text-text-secondary max-w-sm mb-4 leading-relaxed">
                      {mediaType === 'video' 
                        ? 'Supports MP4, WEBM, MOV up to 50MB' 
                        : 'Supports PNG, JPG, WEBP, GIF up to 15MB'}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px]"
                    >
                      Browse Device
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Direct Web Link */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Direct Media URL</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="url"
                      value={directLinkInput}
                      onChange={(e) => {
                        setDirectLinkInput(e.target.value);
                        setLinkError(null);
                        setLinkPreviewSuccess(null);
                      }}
                      placeholder={mediaType === 'video' ? 'https://example.com/demo.mp4' : 'https://images.unsplash.com/... or /api/storage-file?id=...'}
                      className="flex-1 bg-bg-tertiary border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setDirectLinkInput(text.trim());
                            setLinkError(null);
                          }
                        } catch {}
                      }}
                      className="px-3 py-2 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border-default rounded-xl text-xs font-medium text-text-secondary transition-colors cursor-pointer min-h-[44px]"
                    >
                      Paste
                    </button>
                  </div>
                  {linkError && (
                    <p className="text-xs text-rose-600 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{linkError}</span>
                    </p>
                  )}
                </div>

                {/* Live Link Preview */}
                {directLinkInput.trim() && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Live Preview
                    </span>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border-default bg-bg-primary flex items-center justify-center">
                      {mediaType === 'video' || directLinkInput.includes('.mp4') ? (
                        <video
                          src={directLinkInput}
                          controls
                          className="w-full h-full object-contain"
                          onLoadedData={() => setLinkPreviewSuccess(true)}
                          onError={() => {
                            setLinkPreviewSuccess(false);
                            setLinkError('Unable to load video from this URL.');
                          }}
                        />
                      ) : (
                        <img
                          src={directLinkInput}
                          alt="Direct link preview"
                          className="w-full h-full object-contain"
                          onLoad={() => setLinkPreviewSuccess(true)}
                          onError={() => {
                            setLinkPreviewSuccess(false);
                            setLinkError('Unable to load image preview from this URL. Verify the link is accessible.');
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Storage Vault */}
            {activeTab === 'vault' && (
              <div className="space-y-3">
                {/* Search in Vault */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Search files in your Storage Vault..."
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>

                {/* Vault File List */}
                {isVaultLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                    <span className="text-xs">Loading Storage Vault files...</span>
                  </div>
                ) : filteredVaultFiles.length === 0 ? (
                  <div className="py-12 text-center rounded-xl bg-bg-tertiary/40 border border-border-default space-y-2">
                    <HardDrive className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-text-primary">No matching files found in Vault</p>
                    <p className="text-[11px] text-text-secondary max-w-xs mx-auto">
                      {vaultSearch ? 'No files match your query.' : 'Upload media to your Storage Vault to quickly pick it here anytime.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto custom-scrollbar p-1">
                    {filteredVaultFiles.map((f) => {
                      const isSelected = selectedVaultFile?.id === f.id;
                      const fileMime = (typeof f?.mimeType === 'string' ? f.mimeType : '').toLowerCase();
                      const fileName = (typeof f?.originalName === 'string' ? f.originalName : '').toLowerCase();
                      const isImg = fileMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(fileName);
                      const isVid = fileMime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName);
                      const streamUrl = authToken
                        ? `/api/storage-file?id=${encodeURIComponent(f.id)}&token=${encodeURIComponent(authToken)}`
                        : `/api/storage-file?id=${encodeURIComponent(f.id)}`;

                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedVaultFile(f)}
                          className={`group relative rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary-light ring-2 ring-brand-primary/20'
                              : 'border-border-default bg-bg-primary hover:border-brand-primary/50'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-full aspect-video rounded-lg overflow-hidden bg-bg-tertiary flex items-center justify-center mb-1.5 relative">
                            {isImg ? (
                              <img
                                src={streamUrl}
                                alt={f.originalName}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : isVid ? (
                              <Video className="w-6 h-6 text-brand-primary" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-text-muted" />
                            )}

                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] font-semibold text-text-primary truncate block">
                            {f.originalName}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {formatStorageBytes(f.sizeBytes)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border-default bg-bg-secondary shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>

            {activeTab === 'gallery' && (
              <button
                type="button"
                onClick={handleConfirmGalleryUpload}
                disabled={!selectedFile || isUploading}
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs min-h-[44px] flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Use Selected File</span>
                )}
              </button>
            )}

            {activeTab === 'link' && (
              <button
                type="button"
                onClick={handleConfirmDirectLink}
                disabled={!directLinkInput.trim() || linkPreviewSuccess === false}
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs min-h-[44px]"
              >
                Use Direct Link
              </button>
            )}

            {activeTab === 'vault' && (
              <button
                type="button"
                onClick={handleConfirmVaultFile}
                disabled={!selectedVaultFile}
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs min-h-[44px]"
              >
                Select from Vault
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
