import { useCallback, useState } from 'react'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  content?: string
  status: 'uploading' | 'completed' | 'error'
  error?: string
  language?: string
}

interface UseFileUploadOptions {
  maxFileSize?: number // in bytes
  maxFiles?: number
  acceptedFileTypes?: string[]
  onError?: (error: string) => void
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_FILES = 10

const ACCEPTED_FILE_TYPES = [
  // Code files
  '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.bash',
  // Config files
  '.json', '.xml', '.yaml', '.yml', '.env', '.config', '.toml', '.ini',
  // Docs
  '.md', '.txt', '.rst', '.adoc', '.pdf',
  // Web
  '.html', '.css', '.scss', '.sass', '.less',
  // Other
  '.sql', '.graphql', '.proto', '.xls', '.xlsx', '.csv'
]

const LANGUAGE_MAP: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  py: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  php: 'PHP',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  swift: 'Swift',
  kt: 'Kotlin',
  scala: 'Scala',
  sh: 'Shell',
  bash: 'Shell',
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  txt: 'Text',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL'
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function detectLanguage(filename: string): string {
  const ext = getFileExtension(filename)
  return LANGUAGE_MAP[ext] || 'Unknown'
}

function isBinaryLikeExtension(ext: string) {
  return ['pdf', 'xls', 'xlsx'].includes(ext)
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxFiles = DEFAULT_MAX_FILES,
    acceptedFileTypes = ACCEPTED_FILE_TYPES,
    onError
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`
    }

    // Check file type
    const fileName = file.name.toLowerCase()
    const hasValidExtension = acceptedFileTypes.some(ext =>
      fileName.endsWith(ext.toLowerCase())
    )

    if (!hasValidExtension) {
      return `File type not supported for "${file.name}". Supported types: ${acceptedFileTypes.join(', ')}`
    }

    return null
  }, [maxFileSize, acceptedFileTypes])

  const readFileContent = useCallback(async (file: File): Promise<string | undefined> => {
    const ext = getFileExtension(file.name).toLowerCase()

    if (isBinaryLikeExtension(ext)) {
      // Don’t attempt to read binary formats as plain text
      return undefined
    }

    return await file.text()
  }, [])

  const addFiles = useCallback(async (newFiles: File[]) => {
    // Check max files limit
    if (files.length + newFiles.length > maxFiles) {
      const error = `Cannot upload more than ${maxFiles} files at once.`
      onError?.(error)
      return
    }

    const validatedFiles: UploadedFile[] = []

    for (const file of newFiles) {
      const error = validateFile(file)

      if (error) {
        onError?.(error)
        continue
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        status: 'uploading',
        language: detectLanguage(file.name)
      }

      validatedFiles.push(uploadedFile)
    }

    // Add files with uploading status
    setFiles(prev => [...prev, ...validatedFiles])

    // Read file contents
    for (const uploadedFile of validatedFiles) {
      try {
        const content = await readFileContent(uploadedFile.file)

        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, content, status: 'completed' as const }
            : f
        ))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to read file'

        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        ))

        onError?.(errorMessage)
      }
    }
  }, [files.length, maxFiles, validateFile, readFileContent, onError])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const getAcceptString = useCallback(() => {
    return acceptedFileTypes.join(',')
  }, [acceptedFileTypes])

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    getAcceptString,
    hasFiles: files.length > 0,
    completedFiles: files.filter(f => f.status === 'completed')
  }
}
