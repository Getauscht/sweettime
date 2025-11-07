'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface Genre {
    id: string
    name: string
}

interface Author {
    id: string
    name: string
}

export default function CreateWebtoonPage() {
    const router = useRouter()
    const { toast, ToastContainer } = useToast()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [genres, setGenres] = useState<Genre[]>([])
    const [authors, setAuthors] = useState<Author[]>([])

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        authorId: '',
        genreIds: [] as string[],
        coverImage: '',
        bannerImage: '',
        status: 'ongoing',
    })

    useEffect(() => {
        fetchGenres()
        fetchAuthors()
    }, [])

    const fetchGenres = async () => {
        try {
            const response = await fetch('/api/admin/genres')
            if (response.ok) {
                const data = await response.json()
                setGenres(data.genres || [])
            }
        } catch (error) {
            console.error('Error fetching genres:', error)
        }
    }

    const fetchAuthors = async () => {
        try {
            const response = await fetch('/api/admin/authors')
            if (response.ok) {
                const data = await response.json()
                setAuthors(data.authors || [])
            }
        } catch (error) {
            console.error('Error fetching authors:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'cover')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, coverImage: data.url }))
            } else {
                toast('Failed to upload image', 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast('Failed to upload image', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'banner')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, bannerImage: data.url }))
            } else {
                toast('Failed to upload image', 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast('Failed to upload image', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // API expects `authorIds` as an array. Ensure we send it.
            if (!formData.authorId) {
                toast('Select an author before submitting', 'error')
                setLoading(false)
                return
            }

            const payload = {
                title: formData.title,
                description: formData.description || undefined,
                authorIds: [formData.authorId],
                genreIds: formData.genreIds && formData.genreIds.length > 0 ? formData.genreIds : undefined,
                coverImage: formData.coverImage || undefined,
                bannerImage: formData.bannerImage || undefined,
                status: formData.status || undefined,
                // scanlationGroupId intentionally omitted here (admin UI can add later)
            }

            const response = await fetch('/api/admin/webtoons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                const data = await response.json()
                router.push(`/admin/webtoons/${data.webtoon.id}/edit`)
            } else {
                const error = await response.json()
                toast(error.error || 'Failed to create webtoon', 'error')
            }
        } catch (error) {
            console.error('Error creating webtoon:', error)
            toast('Failed to create webtoon', 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleGenre = (genreId: string) => {
        setFormData(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(genreId)
                ? prev.genreIds.filter(id => id !== genreId)
                : [...prev.genreIds, genreId]
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-white hover:bg-white/10"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold text-white">Create New Series</h1>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Series Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-white">Series Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., The Crimson Knight"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            />
                        </div>

                        {/* Genre */}
                        <div className="space-y-2">
                            <Label className="text-white">Genre</Label>
                            <div className="flex flex-wrap gap-2">
                                {genres.map((genre) => (
                                    <button
                                        key={genre.id}
                                        type="button"
                                        onClick={() => toggleGenre(genre.id)}
                                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${formData.genreIds.includes(genre.id)
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {genre.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Synopsis */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Synopsis</Label>
                        <textarea
                            id="description"
                            placeholder="Provide a brief, enticing overview of your series."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* Author/Artist Credits */}
                    <div className="space-y-2">
                        <Label htmlFor="authorId" className="text-white">Author/Artist Credits</Label>
                        <select
                            id="authorId"
                            value={formData.authorId}
                            onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="">Select an author</option>
                            {authors.map((author) => (
                                <option key={author.id} value={author.id}>
                                    {author.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Series Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-white">Series Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                                <option value="hiatus">Hiatus</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Language (placeholder) */}
                        <div className="space-y-2">
                            <Label htmlFor="language" className="text-white">Language</Label>
                            <select
                                id="language"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-2">
                        <Label className="text-white">Banner Image (16:9)</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 mb-4">
                            {formData.bannerImage ? (
                                <div className="relative text-center">
                                    <img
                                        src={formData.bannerImage}
                                        alt="Banner preview"
                                        className="w-full max-h-44 object-cover rounded-lg mx-auto"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setFormData({ ...formData, bannerImage: '' })}
                                        className="mt-4 text-white hover:bg-white/10"
                                    >
                                        Remove Banner
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                    <label className="cursor-pointer">
                                        <span className="text-purple-400 hover:text-purple-300">
                                            {uploading ? 'Uploading...' : 'Upload a banner'}
                                        </span>
                                        <span className="text-white/60"> or drag and drop</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-white/40 text-sm mt-2">PNG, JPG up to 10MB (recommended 16:9)</p>
                                </div>
                            )}
                        </div>

                        <Label className="text-white">Cover Image</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8">
                            {formData.coverImage ? (
                                <div className="relative">
                                    <img
                                        src={formData.coverImage}
                                        alt="Cover preview"
                                        className="w-48 h-64 object-cover rounded-lg mx-auto"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setFormData({ ...formData, coverImage: '' })}
                                        className="mt-4 text-white hover:bg-white/10"
                                    >
                                        Remove Image
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                    <label className="cursor-pointer">
                                        <span className="text-purple-400 hover:text-purple-300">
                                            {uploading ? 'Uploading...' : 'Upload a file'}
                                        </span>
                                        <span className="text-white/60"> or drag and drop</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-white/40 text-sm mt-2">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-4 justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.back()}
                            className="text-white hover:bg-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || uploading}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {loading ? 'Creating...' : 'Submit Series'}
                        </Button>
                    </div>
                </form>
            </Card>
            {/* Toast container */}
            <ToastContainer />
        </div>
    )
}
