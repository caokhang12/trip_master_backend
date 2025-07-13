# TripMaster Frontend Authentication Implementation Guide

## Tổng quan tính năng xác thực Backend

### Phân tích API Authentication đã triển khai

Backend TripMaster sử dụng kiến trúc xác thực JWT với các tính năng bảo mật cao:

#### **Các endpoint chính:**
- `POST /auth/register` - Đăng ký tài khoản
- `POST /auth/login` - Đăng nhập 
- `POST /auth/refresh` - Làm mới token
- `POST /auth/verify-email` - Xác minh email
- `POST /auth/resend-verification` - Gửi lại email xác minh
- `POST /auth/forgot-password` - Quên mật khẩu
- `POST /auth/reset-password` - Đặt lại mật khẩu
- `POST /auth/logout` - Đăng xuất
- `POST /auth/logout-all` - Đăng xuất tất cả thiết bị
- `GET /auth/sessions` - Lấy danh sách phiên đăng nhập
- `DELETE /auth/sessions/:sessionId` - Thu hồi phiên đăng nhập

#### **Cơ chế bảo mật:**
- **JWT Access Token**: Lưu trong memory/state, thời hạn ngắn (15 phút)
- **Refresh Token**: Lưu trong HTTP-only cookie, thời hạn dài (7 ngày)
- **Rate Limiting**: 5 lần đăng nhập/phút, 10 lần refresh/phút
- **Email Verification**: Bắt buộc xác minh email trước khi đăng nhập
- **Multi-device Session Management**: Quản lý phiên đăng nhập nhiều thiết bị
- **CSRF Protection**: SameSite cookie + secure headers

#### **Response Format chuẩn:**
```typescript
interface BaseResponse<T> {
  result: 'OK' | 'NG';
  status: number;
  data: T;
}

interface AuthResponseData {
  access_token: string;
  user_profile: UserProfileData;
  // refresh_token được gửi qua HTTP-only cookie
}
```

---

## Hướng dẫn triển khai Frontend Next.js

### 1. Cài đặt Dependencies

```bash
# Next.js App Router với TypeScript
npx create-next-app@latest tripmaster-frontend --typescript --tailwind --eslint --app

cd tripmaster-frontend

# State Management & API
npm install zustand
npm install @tanstack/react-query
npm install axios

# UI Components
npm install @radix-ui/react-slot
npm install @radix-ui/react-toast
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label
npm install @radix-ui/react-avatar
npm install class-variance-authority
npm install clsx
npm install tailwind-merge
npm install lucide-react

# Form Validation
npm install react-hook-form
npm install @hookform/resolvers
npm install zod

# Dev Dependencies
npm install -D @types/js-cookie
npm install js-cookie
```

### 2. Cấu trúc thư mục dự án

```
src/
├── app/                          # Next.js App Router
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── verify/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   └── reset-password-form.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── navigation.tsx
│   └── providers/
│       ├── query-provider.tsx
│       ├── auth-provider.tsx
│       └── toast-provider.tsx
├── lib/
│   ├── api/
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   └── client.ts
│   ├── stores/
│   │   ├── auth.store.ts
│   │   └── user.store.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-auth-mutation.ts
│   │   └── use-user.ts
│   ├── utils/
│   │   ├── auth.utils.ts
│   │   ├── validation.utils.ts
│   │   └── storage.utils.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   └── constants/
│       ├── api.constants.ts
│       └── app.constants.ts
├── middleware.ts                 # Next.js middleware cho auth
└── next.config.js
```

### 3. Cấu hình cơ bản

#### Environment Variables (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Next.js Config
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
```

### 4. Thiết lập API Client với Axios

#### Base API Client
```typescript
// lib/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/lib/stores/auth.store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface ApiResponse<T = any> {
  result: 'OK' | 'NG'
  status: number
  data: T
}

interface ApiError {
  result: 'NG'
  status: number
  data: {
    message: string
    details?: string[]
    code?: string
  }
}

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true, // Quan trọng: để gửi HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor - thêm access token
    this.instance.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - xử lý token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Thử refresh token
            const refreshResponse = await this.refreshToken()
            const newToken = refreshResponse.data.access_token

            // Cập nhật token mới
            useAuthStore.getState().setAccessToken(newToken)
            
            // Retry request gốc với token mới
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.instance(originalRequest)
          } catch (refreshError) {
            // Refresh failed, redirect to login
            useAuthStore.getState().logout()
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login'
            }
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<AxiosResponse<ApiResponse<{access_token: string}>>> {
    return this.instance.post('/auth/refresh')
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
```

### 5. Định nghĩa Types

#### Auth Types
```typescript
// lib/types/auth.types.ts
export interface RegisterRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
  homeCountry?: string
  preferredLanguage?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
  hasAvatar?: boolean
  role: 'user' | 'admin'
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  access_token: string
  user_profile: UserProfile
}

export interface VerifyEmailRequest {
  token: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface SessionData {
  id: string
  deviceInfo: {
    deviceType?: 'web' | 'mobile' | 'tablet'
    deviceName?: string
  }
  createdAt: string
  lastUsedAt?: string
  expiresAt: string
  isCurrent: boolean
}
```

#### API Types
```typescript
// lib/types/api.types.ts
export interface ApiResponse<T = any> {
  result: 'OK' | 'NG'
  status: number
  data: T
}

export interface ApiError {
  result: 'NG'
  status: number
  data: {
    message: string
    details?: string[]
    code?: string
  }
}
```

### 6. Auth API Functions

```typescript
// lib/api/auth.api.ts
import { apiClient } from './client'
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SessionData,
} from '@/lib/types/auth.types'

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  async refresh(): Promise<{access_token: string}> {
    const response = await apiClient.post<{access_token: string}>('/auth/refresh')
    return response.data
  },

  async verifyEmail(data: VerifyEmailRequest): Promise<{verified: boolean}> {
    const response = await apiClient.post<{verified: boolean}>('/auth/verify-email', data)
    return response.data
  },

  async resendVerification(email: string): Promise<{sent: boolean}> {
    const response = await apiClient.post<{sent: boolean}>('/auth/resend-verification', { email })
    return response.data
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<{sent: boolean}> {
    const response = await apiClient.post<{sent: boolean}>('/auth/forgot-password', data)
    return response.data
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{reset: boolean}> {
    const response = await apiClient.post<{reset: boolean}>('/auth/reset-password', data)
    return response.data
  },

  async logout(): Promise<{logout: boolean}> {
    const response = await apiClient.post<{logout: boolean}>('/auth/logout')
    return response.data
  },

  async logoutAll(): Promise<{logout: boolean}> {
    const response = await apiClient.post<{logout: boolean}>('/auth/logout-all')
    return response.data
  },

  async getSessions(): Promise<SessionData[]> {
    const response = await apiClient.get<SessionData[]>('/auth/sessions')
    return response.data
  },

  async revokeSession(sessionId: string): Promise<{success: boolean}> {
    const response = await apiClient.delete<{success: boolean}>(`/auth/sessions/${sessionId}`)
    return response.data
  },
}
```

### 7. Zustand Auth Store

```typescript
// lib/stores/auth.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { UserProfile } from '@/lib/types/auth.types'

interface AuthState {
  // State
  isAuthenticated: boolean
  accessToken: string | null
  user: UserProfile | null
  isLoading: boolean
  
  // Actions
  setAuth: (token: string, user: UserProfile) => void
  setAccessToken: (token: string) => void
  setUser: (user: UserProfile) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  
  // Computed
  isEmailVerified: () => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      accessToken: null,
      user: null,
      isLoading: false,

      // Actions
      setAuth: (token: string, user: UserProfile) => {
        set({
          isAuthenticated: true,
          accessToken: token,
          user,
        })
      },

      setAccessToken: (token: string) => {
        set({ accessToken: token, isAuthenticated: true })
      },

      setUser: (user: UserProfile) => {
        set({ user })
      },

      logout: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      // Computed
      isEmailVerified: () => {
        const { user } = get()
        return user?.emailVerified ?? false
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Chỉ persist user, không persist accessToken vì lý do bảo mật
        user: state.user,
        isAuthenticated: false, // Luôn false để force check khi reload
      }),
    }
  )
)
```

### 8. React Query Hooks cho Auth

```typescript
// lib/hooks/use-auth-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import { authApi } from '@/lib/api/auth.api'
import { useAuthStore } from '@/lib/stores/auth.store'
import {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/lib/types/auth.types'

export const useRegisterMutation = () => {
  const router = useRouter()
  
  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      toast({
        title: 'Đăng ký thành công!',
        description: 'Vui lòng kiểm tra email để xác minh tài khoản.',
      })
      router.push('/auth/verify')
    },
    onError: (error: any) => {
      toast({
        title: 'Đăng ký thất bại',
        description: error.response?.data?.data?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      })
    },
  })
}

export const useLoginMutation = () => {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  
  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      setAuth(response.access_token, response.user_profile)
      
      if (!response.user_profile.emailVerified) {
        toast({
          title: 'Email chưa được xác minh',
          description: 'Vui lòng xác minh email trước khi tiếp tục.',
        })
        router.push('/auth/verify')
      } else {
        toast({
          title: 'Đăng nhập thành công!',
          description: `Chào mừng ${response.user_profile.firstName || 'bạn'} trở lại!`,
        })
        router.push('/dashboard')
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Đăng nhập thất bại',
        description: error.response?.data?.data?.message || 'Email hoặc mật khẩu không đúng',
        variant: 'destructive',
      })
    },
  })
}

export const useVerifyEmailMutation = () => {
  const router = useRouter()
  const { setUser, user } = useAuthStore()
  
  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, emailVerified: true })
      }
      
      toast({
        title: 'Xác minh email thành công!',
        description: 'Tài khoản của bạn đã được kích hoạt.',
      })
      router.push('/dashboard')
    },
    onError: (error: any) => {
      toast({
        title: 'Xác minh thất bại',
        description: error.response?.data?.data?.message || 'Token không hợp lệ hoặc đã hết hạn',
        variant: 'destructive',
      })
    },
  })
}

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    onSuccess: () => {
      toast({
        title: 'Email đã được gửi!',
        description: 'Vui lòng kiểm tra email để đặt lại mật khẩu.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Gửi email thất bại',
        description: error.response?.data?.data?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      })
    },
  })
}

export const useResetPasswordMutation = () => {
  const router = useRouter()
  
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: () => {
      toast({
        title: 'Đặt lại mật khẩu thành công!',
        description: 'Bạn có thể đăng nhập với mật khẩu mới.',
      })
      router.push('/auth/login')
    },
    onError: (error: any) => {
      toast({
        title: 'Đặt lại mật khẩu thất bại',
        description: error.response?.data?.data?.message || 'Token không hợp lệ hoặc đã hết hạn',
        variant: 'destructive',
      })
    },
  })
}

export const useLogoutMutation = () => {
  const router = useRouter()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
      router.push('/auth/login')
      toast({
        title: 'Đăng xuất thành công',
        description: 'Hẹn gặp lại bạn!',
      })
    },
    onError: () => {
      // Nếu API logout fail, vẫn logout locally
      logout()
      queryClient.clear()
      router.push('/auth/login')
    },
  })
}
```

### 9. Custom Auth Hook

```typescript
// lib/hooks/use-auth.ts
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth.store'
import { authApi } from '@/lib/api/auth.api'

export const useAuth = () => {
  const authStore = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Thử refresh token khi app khởi động
        const response = await authApi.refresh()
        authStore.setAccessToken(response.access_token)
      } catch (error) {
        // Nếu refresh fail, clear auth state
        authStore.logout()
      } finally {
        setIsInitialized(true)
      }
    }

    if (!isInitialized) {
      initializeAuth()
    }
  }, [authStore, isInitialized])

  return {
    ...authStore,
    isInitialized,
  }
}

export const useRequireAuth = () => {
  const { isAuthenticated, isEmailVerified, user, isInitialized } = useAuth()
  
  return {
    isAuthenticated,
    isEmailVerified: isEmailVerified(),
    user,
    isInitialized,
    requireAuth: isAuthenticated && isEmailVerified(),
  }
}
```

### 10. Next.js Middleware để bảo vệ routes

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Danh sách routes cần xác thực
const protectedRoutes = ['/dashboard', '/profile', '/trips']

// Danh sách routes chỉ dành cho user chưa đăng nhập
const authRoutes = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Kiểm tra xem có refresh token không
  const hasRefreshToken = request.cookies.has('refreshToken')
  
  // Nếu user đã đăng nhập nhưng cố truy cập auth routes
  if (hasRefreshToken && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Nếu user chưa đăng nhập nhưng cố truy cập protected routes
  if (!hasRefreshToken && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/trips/:path*', '/auth/:path*']
}
```

### 11. Login Form Component với Shadcn UI

```typescript
// components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLoginMutation } from '@/lib/hooks/use-auth-mutation'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Đăng nhập</CardTitle>
        <CardDescription className="text-center">
          Nhập email và mật khẩu để truy cập tài khoản
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>

          <div className="text-center text-sm">
            Chưa có tài khoản?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 12. Register Form Component

```typescript
// components/auth/register-form.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRegisterMutation } from '@/lib/hooks/use-auth-mutation'

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  homeCountry: z.string().max(100).optional(),
  preferredLanguage: z.enum(['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es']).optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Bạn phải đồng ý với điều khoản sử dụng',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const countries = [
  { value: 'VN', label: 'Việt Nam' },
  { value: 'US', label: 'United States' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'TH', label: 'Thailand' },
  { value: 'SG', label: 'Singapore' },
]

const languages = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
]

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const registerMutation = useRegisterMutation()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...submitData } = data
    registerMutation.mutate(submitData)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Đăng ký</CardTitle>
        <CardDescription className="text-center">
          Tạo tài khoản mới để khám phá TripMaster
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Họ</Label>
              <Input
                id="firstName"
                placeholder="Nguyễn"
                {...register('firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Tên</Label>
              <Input
                id="lastName"
                placeholder="Văn A"
                {...register('lastName')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeCountry">Quốc gia</Label>
            <Select onValueChange={(value) => setValue('homeCountry', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn quốc gia" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">Ngôn ngữ</Label>
            <Select onValueChange={(value) => setValue('preferredLanguage', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center">
            <input
              id="acceptTerms"
              type="checkbox"
              {...register('acceptTerms')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
              Tôi đồng ý với{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                điều khoản sử dụng
              </Link>{' '}
              và{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                chính sách bảo mật
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-500">
              {errors.acceptTerms.message as string}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>

          <div className="text-center text-sm">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 13. Email Verification Component

```typescript
// components/auth/email-verification.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useVerifyEmailMutation } from '@/lib/hooks/use-auth-mutation'
import { useAuthStore } from '@/lib/stores/auth.store'

const verificationSchema = z.object({
  token: z.string().min(1, 'Mã xác minh không được để trống'),
})

type VerificationFormData = z.infer<typeof verificationSchema>

export function EmailVerification() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const verifyMutation = useVerifyEmailMutation()
  const { user } = useAuthStore()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  })

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl)
      // Tự động verify nếu có token trong URL
      verifyMutation.mutate({ token: tokenFromUrl })
    }
  }, [tokenFromUrl, setValue, verifyMutation])

  const onSubmit = (data: VerificationFormData) => {
    verifyMutation.mutate(data)
  }

  if (user?.emailVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">✅ Email đã được xác minh</CardTitle>
          <CardDescription>
            Tài khoản của bạn đã được kích hoạt thành công!
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Xác minh Email</CardTitle>
        <CardDescription className="text-center">
          Nhập mã xác minh đã được gửi đến email của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!tokenFromUrl && (
          <Alert className="mb-4">
            <AlertDescription>
              Chúng tôi đã gửi mã xác minh đến email{' '}
              <span className="font-semibold">{user?.email}</span>. 
              Vui lòng kiểm tra hộp thư và nhập mã bên dưới.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Mã xác minh</Label>
            <Input
              id="token"
              placeholder="Nhập mã xác minh"
              {...register('token')}
            />
            {errors.token && (
              <p className="text-sm text-red-500">{errors.token.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? 'Đang xác minh...' : 'Xác minh'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <ResendVerificationButton />
        </div>
      </CardContent>
    </Card>
  )
}

function ResendVerificationButton() {
  const { user } = useAuthStore()
  const [resendMutation] = useResendVerificationMutation()

  const handleResend = () => {
    if (user?.email) {
      resendMutation.mutate({ email: user.email })
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleResend}
      disabled={resendMutation.isPending}
      className="text-sm"
    >
      {resendMutation.isPending ? 'Đang gửi...' : 'Gửi lại mã xác minh'}
    </Button>
  )
}
```

### 14. Protected Route Component

```typescript
// components/auth/protected-route.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/hooks/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireEmailVerification?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireEmailVerification = true 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isEmailVerified, isInitialized } = useRequireAuth()

  useEffect(() => {
    if (!isInitialized) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (requireEmailVerification && !isEmailVerified) {
      router.push('/auth/verify')
      return
    }
  }, [isAuthenticated, isEmailVerified, isInitialized, requireEmailVerification, router])

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (requireEmailVerification && !isEmailVerified)) {
    return null
  }

  return <>{children}</>
}
```

### 15. Layout với Auth Provider

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { QueryProvider } from '@/components/providers/query-provider'
import { ToastProvider } from '@/components/providers/toast-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TripMaster - AI Travel Planning',
  description: 'Plan your perfect trip with AI-powered itinerary generation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <QueryProvider>
          <ToastProvider>
            {children}
            <Toaster />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
```

### 16. Query Provider Setup

```typescript
// components/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Không retry cho lỗi 401, 403, 404
              if (error?.response?.status === 401) return false
              if (error?.response?.status === 403) return false
              if (error?.response?.status === 404) return false
              return failureCount < 3
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### 17. Login Page

```typescript
// app/auth/login/page.tsx
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TripMaster
          </h1>
          <p className="text-gray-600">
            Khám phá thế giới với AI
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
```

### 18. Dashboard Page với Protection

```typescript
// app/dashboard/page.tsx
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  return (
    <ProtectedRoute requireEmailVerification={true}>
      <DashboardContent />
    </ProtectedRoute>
  )
}
```

---

## Các tính năng bảo mật đã được triển khai

### 1. **JWT Token Security**
- Access token lưu trong memory (Zustand store)
- Refresh token lưu trong HTTP-only cookie
- Automatic token refresh khi access token hết hạn
- Logout clear tất cả tokens

### 2. **Rate Limiting**
- Login: 5 lần/phút
- Refresh: 10 lần/phút
- API calls được throttle ở backend

### 3. **Email Verification**
- Bắt buộc verify email trước khi access app
- Resend verification với rate limiting
- Token có thời hạn

### 4. **Password Security**
- Minimum 6 ký tự
- bcrypt hashing ở backend
- Password reset với secure token

### 5. **Session Management**
- Multi-device support
- Session tracking và revocation
- Device information logging

### 6. **CSRF Protection**
- SameSite cookie setting
- Secure cookie cho production
- HTTP-only cookie cho refresh token

---

## Best Practices được áp dụng

### 1. **Performance**
- React Query caching
- Axios interceptors
- Lazy loading components
- Optimistic updates

### 2. **UX/UI**
- Loading states
- Error handling với toast
- Form validation
- Responsive design với Tailwind

### 3. **Code Quality**
- TypeScript strict mode
- Zod validation
- ESLint + Prettier
- Component reusability

### 4. **Security**
- No sensitive data in localStorage
- Proper error handling
- Input validation
- HTTPS enforcement

---

## Triển khai Production

### 1. Environment Variables
```env
# Production
NEXT_PUBLIC_API_URL=https://api.tripmaster.com/api/v1
NEXT_PUBLIC_APP_URL=https://tripmaster.com
```

### 2. Build & Deploy
```bash
npm run build
npm start
```

### 3. Monitoring
- Error tracking với Sentry
- Performance monitoring
- User analytics
- API monitoring

Hướng dẫn này cung cấp một framework hoàn chỉnh để triển khai frontend Next.js với authentication system an toàn và hiệu quả, tương thích hoàn toàn với backend NestJS đã có.

---

## Advanced React Hook Form + Zod Patterns

### 1. Centralized Validation Schemas

```typescript
// lib/validations/auth.schemas.ts
import * as z from 'zod'

// Base schemas cho reusability
const emailSchema = z.string()
  .email('Email không hợp lệ')
  .max(255, 'Email quá dài')

const passwordSchema = z.string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .max(128, 'Mật khẩu quá dài')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số')

const nameSchema = z.string()
  .min(1, 'Không được để trống')
  .max(50, 'Tên quá dài')
  .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'Tên chỉ được chứa chữ cái và dấu cách')

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  homeCountry: z.string().max(100).optional(),
  preferredLanguage: z.enum(['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es']).optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Bạn phải đồng ý với điều khoản sử dụng',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
})

export const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, 'Mã xác minh không được để trống')
    .length(32, 'Mã xác minh không hợp lệ'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token không được để trống'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "Mật khẩu mới phải khác mật khẩu hiện tại",
  path: ["newPassword"],
})

// Type inference
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
```

### 2. Custom Form Hooks

```typescript
// lib/hooks/use-form-with-mutation.ts
import { useForm, UseFormProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UseMutationResult } from '@tanstack/react-query'
import { z } from 'zod'
import { useEffect } from 'react'

interface UseFormWithMutationProps<T extends z.ZodSchema> extends Omit<UseFormProps<z.infer<T>>, 'resolver'> {
  schema: T
  mutation: UseMutationResult<any, any, z.infer<T>, any>
  onSuccess?: (data: any, formData: z.infer<T>) => void
  resetOnSuccess?: boolean
}

export function useFormWithMutation<T extends z.ZodSchema>({
  schema,
  mutation,
  onSuccess,
  resetOnSuccess = false,
  ...formProps
}: UseFormWithMutationProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    ...formProps,
  })

  const handleSubmit = form.handleSubmit((data) => {
    mutation.mutate(data)
  })

  useEffect(() => {
    if (mutation.isSuccess) {
      if (resetOnSuccess) {
        form.reset()
      }
      if (onSuccess) {
        onSuccess(mutation.data, form.getValues())
      }
    }
  }, [mutation.isSuccess, mutation.data, form, onSuccess, resetOnSuccess])

  // Set server errors to form
  useEffect(() => {
    if (mutation.error) {
      const error = mutation.error as any
      const serverErrors = error?.response?.data?.data?.details

      if (serverErrors && Array.isArray(serverErrors)) {
        serverErrors.forEach((serverError: string) => {
          // Parse server error format: "field: error message"
          const [field, message] = serverError.split(': ')
          if (field && message) {
            form.setError(field as any, {
              type: 'server',
              message,
            })
          }
        })
      }
    }
  }, [mutation.error, form])

  return {
    ...form,
    handleSubmit,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}
```

### 3. Advanced Form Components

```typescript
// components/forms/form-field.tsx
import { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormFieldProps {
  name: string
  label: string
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  children?: ReactNode
}

export function FormField({ 
  name, 
  label, 
  type = 'text', 
  placeholder, 
  required = false,
  options = [],
  children 
}: FormFieldProps) {
  const { 
    register, 
    formState: { errors }, 
    setValue,
    watch 
  } = useFormContext()

  const error = errors[name]
  const value = watch(name)

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            placeholder={placeholder}
            {...register(name)}
            className={error ? 'border-red-500' : ''}
          />
        )
      
      case 'select':
        return (
          <Select 
            value={value || ''} 
            onValueChange={(val) => setValue(name, val)}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            {...register(name)}
            className={error ? 'border-red-500' : ''}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {children ? (
        <div className="relative">
          {renderInput()}
          {children}
        </div>
      ) : (
        renderInput()
      )}
      
      {error && (
        <p className="text-sm text-red-500">
          {error.message as string}
        </p>
      )}
    </div>
  )
}
```

### 4. Enhanced Login Form với Advanced Features

```typescript
// components/auth/enhanced-login-form.tsx
'use client'

import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/forms/form-field'
import { useFormWithMutation } from '@/lib/hooks/use-form-with-mutation'
import { useLoginMutation } from '@/lib/hooks/use-auth-mutation'
import { loginSchema, LoginFormData } from '@/lib/validations/auth.schemas'

export function EnhancedLoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const loginMutation = useLoginMutation()
  
  const form = useFormWithMutation({
    schema: loginSchema,
    mutation: loginMutation,
    defaultValues: {
      email: '',
      password: '',
    },
  })

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Đăng nhập</CardTitle>
        <CardDescription className="text-center">
          Nhập thông tin để truy cập tài khoản TripMaster
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit} className="space-y-4">
            <FormField
              name="email"
              label="Email"
              type="email"
              placeholder="example@email.com"
              required
            />

            <FormField
              name="password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <Label htmlFor="remember" className="text-sm">
                  Ghi nhớ đăng nhập
                </Label>
              </div>
              
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={form.isLoading}
            >
              {form.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            <div className="text-center text-sm">
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
```

### 5. Multi-step Registration Form

```typescript
// components/auth/multi-step-register-form.tsx
'use client'

import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FormField } from '@/components/forms/form-field'
import { useFormWithMutation } from '@/lib/hooks/use-form-with-mutation'
import { useRegisterMutation } from '@/lib/hooks/use-auth-mutation'
import { registerSchema, RegisterFormData } from '@/lib/validations/auth.schemas'

const steps = [
  { title: 'Thông tin cơ bản', fields: ['email', 'password', 'confirmPassword'] },
  { title: 'Thông tin cá nhân', fields: ['firstName', 'lastName'] },
  { title: 'Tùy chọn', fields: ['homeCountry', 'preferredLanguage', 'acceptTerms'] },
]

const countries = [
  { value: 'VN', label: 'Việt Nam' },
  { value: 'US', label: 'United States' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'TH', label: 'Thailand' },
  { value: 'SG', label: 'Singapore' },
]

const languages = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
]

export function MultiStepRegisterForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const registerMutation = useRegisterMutation()
  
  const form = useFormWithMutation({
    schema: registerSchema,
    mutation: registerMutation,
    mode: 'onChange',
  })

  const { trigger, getValues, formState: { errors } } = form

  const nextStep = async () => {
    const currentFields = steps[currentStep].fields
    const isValid = await trigger(currentFields as any)
    
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = (stepIndex: number) => {
    const stepFields = steps[stepIndex].fields
    return stepFields.every(field => !errors[field as keyof typeof errors])
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <FormField
              name="email"
              label="Email"
              type="email"
              placeholder="example@email.com"
              required
            />

            <FormField
              name="password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </FormField>

            <FormField
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </FormField>
          </>
        )

      case 1:
        return (
          <>
            <FormField
              name="firstName"
              label="Họ"
              placeholder="Nguyễn"
            />

            <FormField
              name="lastName"
              label="Tên"
              placeholder="Văn A"
            />
          </>
        )

      case 2:
        return (
          <>
            <FormField
              name="homeCountry"
              label="Quốc gia"
              type="select"
              placeholder="Chọn quốc gia"
              options={countries}
            />

            <FormField
              name="preferredLanguage"
              label="Ngôn ngữ"
              type="select"
              placeholder="Chọn ngôn ngữ"
              options={languages}
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptTerms"
                {...form.register('acceptTerms')}
              />
              <Label htmlFor="acceptTerms" className="text-sm">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  điều khoản sử dụng
                </Link>{' '}
                và{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  chính sách bảo mật
                </Link>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-500">
                {errors.acceptTerms.message as string}
              </p>
            )}
          </>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Đăng ký TripMaster
        </CardTitle>
        
        {/* Progress indicator */}
        <div className="space-y-2">
          <Progress value={(currentStep + 1) / steps.length * 100} />
          <div className="flex justify-between text-xs text-gray-500">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                {index < currentStep ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : index === currentStep ? (
                  <div className="h-4 w-4 rounded-full bg-blue-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                )}
                <span className="ml-1">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit} className="space-y-4">
            {renderStep()}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Trở lại
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  disabled={form.isLoading}
                >
                  {form.isLoading ? 'Đang tạo tài khoản...' : 'Hoàn thành'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  Tiếp theo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
```

### 6. Form Field Validation Utilities

```typescript
// lib/utils/form-validation.utils.ts
import { UseFormSetError, FieldPath, FieldValues } from 'react-hook-form'

// Set server validation errors to form
export function setServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  serverErrors: string[] | { [key: string]: string }
) {
  if (Array.isArray(serverErrors)) {
    serverErrors.forEach((error) => {
      const [field, message] = error.split(': ')
      if (field && message) {
        setError(field as FieldPath<T>, {
          type: 'server',
          message,
        })
      }
    })
  } else if (typeof serverErrors === 'object') {
    Object.entries(serverErrors).forEach(([field, message]) => {
      setError(field as FieldPath<T>, {
        type: 'server',
        message,
      })
    })
  }
}

// Validate password strength
export function validatePasswordStrength(password: string) {
  const checks = {
    length: password.length >= 6,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length
  const strength = score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'

  return { checks, score, strength }
}

// Real-time form validation
export function useRealTimeValidation<T extends FieldValues>(
  schema: any,
  watch: any,
  setError: UseFormSetError<T>,
  clearErrors: any
) {
  const watchedValues = watch()

  useEffect(() => {
    const validate = async () => {
      try {
        await schema.parseAsync(watchedValues)
        // Clear all errors if validation passes
        clearErrors()
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            const field = err.path[0] as FieldPath<T>
            setError(field, {
              type: 'validation',
              message: err.message,
            })
          })
        }
      }
    }

    const debounceTimer = setTimeout(validate, 300)
    return () => clearTimeout(debounceTimer)
  }, [watchedValues, schema, setError, clearErrors])
}
```

### 7. Password Strength Indicator Component

```typescript
// components/forms/password-strength-indicator.tsx
import { validatePasswordStrength } from '@/lib/utils/form-validation.utils'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { checks, strength } = validatePasswordStrength(password)

  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  }

  const strengthTexts = {
    weak: 'Yếu',
    medium: 'Trung bình',
    strong: 'Mạnh',
  }

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${strengthColors[strength]}`}
            style={{
              width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%`,
            }}
          />
        </div>
        <span className={`text-sm font-medium ${
          strength === 'weak' ? 'text-red-500' : 
          strength === 'medium' ? 'text-yellow-500' : 
          'text-green-500'
        }`}>
          {strengthTexts[strength]}
        </span>
      </div>

      <div className="text-xs space-y-1">
        <div className={checks.length ? 'text-green-500' : 'text-gray-400'}>
          ✓ Ít nhất 6 ký tự
        </div>
        <div className={checks.lowercase ? 'text-green-500' : 'text-gray-400'}>
          ✓ Chứa chữ thường
        </div>
        <div className={checks.uppercase ? 'text-green-500' : 'text-gray-400'}>
          ✓ Chứa chữ hoa
        </div>
        <div className={checks.number ? 'text-green-500' : 'text-gray-400'}>
          ✓ Chứa số
        </div>
      </div>
    </div>
  )
}
```
