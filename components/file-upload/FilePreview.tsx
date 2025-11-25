'use client'

import { AlertCircle, Code2,FileText, Loader2, X } from 'lucide-react'

import type { UploadedFile } from '@/lib/hooks/useFileUpload'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

interface FilePreviewProps {
  files: UploadedFile[]
  onRemove: (fileId: string) => void
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content

  return content.substring(0, maxLength) + '...'
}

interface FileItemProps {
  file: UploadedFile
  onRemove: (fileId: string) => void
}

function FileItem({ file, onRemove }: FileItemProps) {
  const isError = file.status === 'error'
  const isUploading = file.status === 'uploading'
  const isCompleted = file.status === 'completed'

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-3 transition-all',
        isError && 'border-destructive bg-destructive/5',
        isCompleted && 'border-border bg-muted/30',
        isUploading && 'border-muted bg-muted/20'
      )}
    >
      {/* File Icon */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
        isError ? 'bg-destructive/10' : 'bg-primary/10'
      )}>
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : isError ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : (
          <Code2 className="h-5 w-5 text-primary" />
        )}
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{file.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(file.size)}</span>
              {file.language && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {file.language}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Preview or Error */}
        {isError && file.error && (
          <p className="text-xs text-destructive">{file.error}</p>
        )}

        {isCompleted && file.content && (
          <div className="mt-2 rounded border bg-background/50 p-2">
            <pre className="overflow-x-auto text-xs text-muted-foreground">
              <code>{truncateContent(file.content, 200)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export function FilePreview({ files, onRemove, className }: FilePreviewProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {files.length} {files.length === 1 ? 'file' : 'files'} attached
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {files.map(file => (
          <FileItem key={file.id} file={file} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}
