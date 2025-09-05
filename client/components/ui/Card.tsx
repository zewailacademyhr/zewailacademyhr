import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
}

export default function Card({ 
  children, 
  className = '',
  padding = 'md',
  shadow = 'md',
  rounded = 'lg',
  border = true
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  }
  
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg'
  }
  
  const borderClass = border ? 'border border-gray-200' : ''
  
  const classes = `bg-white ${paddingClasses[padding]} ${shadowClasses[shadow]} ${roundedClasses[rounded]} ${borderClass} ${className}`

  return (
    <div className={classes}>
      {children}
    </div>
  )
}