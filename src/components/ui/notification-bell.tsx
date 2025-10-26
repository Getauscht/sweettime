'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link?: string
    isRead: boolean
    createdAt: string
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications)
                setUnreadCount(data.unreadCount)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            })

            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
                )
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllAsRead: true })
            })

            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
            }
        } catch (error) {
            console.error('Error marking all as read:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteNotification = async (notificationId: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            })

            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId))
            }
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_chapter':
                return '📖'
            case 'comment':
                return '💬'
            case 'follow':
                return '👤'
            case 'admin_action':
                return '⚠️'
            case 'system':
                return '🔔'
            default:
                return '📢'
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-purple-600/20 rounded-lg transition-colors"
            >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-pink-500 rounded-full text-xs flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-[#1a1625] border border-purple-600/20 rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-purple-600/20 flex items-center justify-between">
                            <h3 className="font-semibold text-white">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={loading}
                                    className="text-sm text-purple-400 hover:text-purple-300"
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-white/60">
                                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50 text-white/40" />
                                    <p>Nenhuma notificação</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-purple-600/10 hover:bg-purple-600/10 transition-colors ${!notification.isRead ? 'bg-purple-600/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl flex-shrink-0">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-medium text-sm text-white">{notification.title}</h4>
                                                    {!notification.isRead && (
                                                        <div className="h-2 w-2 bg-pink-500 rounded-full flex-shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/80 mt-1">{notification.message}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-white/60">
                                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                                            addSuffix: true,
                                                            locale: ptBR
                                                        })}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        {notification.link && (
                                                            <Link
                                                                href={notification.link}
                                                                onClick={() => {
                                                                    markAsRead(notification.id)
                                                                    setIsOpen(false)
                                                                }}
                                                                className="text-xs text-purple-400 hover:text-purple-300"
                                                            >
                                                                Ver
                                                            </Link>
                                                        )}
                                                        {!notification.isRead && (
                                                            <button
                                                                onClick={() => markAsRead(notification.id)}
                                                                className="text-xs text-purple-400 hover:text-purple-300"
                                                            >
                                                                Marcar lida
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteNotification(notification.id)}
                                                            className="text-xs text-red-400 hover:text-red-300"
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-purple-600/20 text-center">
                                <Link
                                    href="/profile#tab=notifications"
                                    onClick={() => setIsOpen(false)}
                                    className="text-sm text-purple-400 hover:text-purple-300"
                                >
                                    Ver todas
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
