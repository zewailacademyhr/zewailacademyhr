import { ButtonHTMLAttributes, forwardRef } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    loadingText = 'جاري التحميل...',
    fullWidth = false,
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
      secondary: 'bg-secondary-200 hover:bg-secondary-300 text-secondary-800 focus:ring-secondary-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-primary-500'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="ml-2" />
            {loadingText}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button