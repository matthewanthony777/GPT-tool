'use client'

import { DragEvent,useCallback, useState } from 'react'

import { Code2, File,FileText, Image as ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void
  acceptedFileTypes?: string[]
  className?: string
  children?: React.ReactNode
}

const CODE_EXTENSIONS = [
  'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'cs',
  'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash'
]

const TEXT_EXTENSIONS = ['txt', 'md', 'rst', 'adoc', 'log']

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (CODE_EXTENSIONS.includes(ext)) {
    return <Code2 className="h-12 w-12" />
  } else if (TEXT_EXTENSIONS.includes(ext)) {
    return <FileText className="h-12 w-12" />
  } else if (IMAGE_EXTENSIONS.includes(ext)) {
    return <ImageIcon className="h-12 w-12" />
  }

  return <File className="h-12 w-12" />
}

export function FileDropZone({
  onFilesDropped,
  acceptedFileTypes,
  className,
  children
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [droppedFileType, setDroppedFileType] = useState<string>('')

  const validateFileType = useCallback((file: File): boolean => {
    if (!acceptedFileTypes || acceptedFileTypes.length === 0) {
      return true
    }

    const fileName = file.name.toLowerCase()
    return acceptedFileTypes.some(type =>
      fileName.endsWith(type.toLowerCase())
    )
  }, [acceptedFileTypes])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => prev + 1)

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)

      // Try to detect file type from drag event
      const item = e.dataTransfer.items[0]
      if (item.type) {
        setDroppedFileType(item.type)
      }
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragging(false)
        setDroppedFileType('')
      }
      return newCounter
    })
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    setDragCounter(0)
    setDroppedFileType('')

    const droppedFiles = Array.from(e.dataTransfer.files)

    if (droppedFiles.length > 0) {
      const validFiles = droppedFiles.filter(validateFileType)

      if (validFiles.length > 0) {
        onFilesDropped(validFiles)
      } else if (droppedFiles.length > 0) {
        console.warn('No valid files to upload')
      }
    }
  }, [onFilesDropped, validateFileType])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn('relative', className)}
    >
      {children}

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4 rounded-lg border-2 border-dashed border-primary bg-background/95 p-12 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="rounded-full bg-primary/10 p-6">
              {getFileIcon(droppedFileType)}
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">Drop files here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Release to upload your files
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
