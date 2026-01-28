import './ErrorMessage.css'

interface ErrorMessageProps {
  message: string
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="error-message">
      ❌ {message}
    </div>
  )
}
