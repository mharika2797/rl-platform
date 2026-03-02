import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#0d1422] border border-[#1e2d45] rounded-lg p-5
        ${onClick ? 'cursor-pointer hover:border-cyan-500/30 transition-colors duration-150' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}