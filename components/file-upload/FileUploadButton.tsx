'use client'

import { useRef } from 'react'

import { Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void
  acceptedFileTypes?: string
  disabled?: boolean
  maxFiles?: number
}

export function FileUploadButton({
  onFilesSelected,
  acceptedFileTypes = '*',
  disabled = false,
  maxFiles = 10
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles)
      onFilesSelected(filesArray)
      // Reset input so the same file can be selected again
      event.target.value = ''
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled}
        className="rounded-full"
        aria-label="Upload files"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        disabled={disabled}
        {...(maxFiles && { max: maxFiles })}
      />
    </>
  )
}
