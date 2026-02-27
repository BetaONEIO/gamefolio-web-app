import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, avatarUrl, username, ...props }) {
        return (
          <Toast key={id} {...props} onClick={() => dismiss(id)} className="cursor-pointer">
            <div className="flex items-start gap-3">
              {avatarUrl && (
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={avatarUrl} alt={username || "User"} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {username?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
