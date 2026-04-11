import React, { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'dark' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium leading-5 rounded-full focus:outline-none transition-all poppins-medium'
  
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  }

  const variantStyles = {
    default:
      'text-white bg-emerald-600 border border-transparent hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 shadow-sm',
    secondary:
      'text-gray-700 bg-gray-200 border border-gray-300 hover:bg-gray-300 hover:text-gray-900 focus:ring-4 focus:ring-gray-300 shadow-sm',
    tertiary:
      'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 focus:ring-4 focus:ring-gray-200 shadow-sm',
    success:
      'text-white bg-green-600 border border-transparent hover:bg-green-700 focus:ring-4 focus:ring-green-200 shadow-sm',
    danger:
      'text-white bg-red-600 border border-transparent hover:bg-red-700 focus:ring-4 focus:ring-red-200 shadow-sm',
    warning:
      'text-white bg-amber-600 border border-transparent hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 shadow-sm',
    dark: 'text-white bg-gray-900 border border-transparent hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 shadow-sm',
    ghost:
      'text-gray-900 bg-transparent border border-transparent hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 shadow-sm',
  }

  const widthStyles = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
